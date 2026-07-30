<?php

namespace App\Http\Controllers;

use App\Mail\NewMessageNotification;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MessageController extends Controller
{
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $postIds = Post::where('user_id', $userId)->pluck('id')
            ->merge(
                \App\Models\ContactRequest::where('user_id', $userId)
                    ->where('status', 'approved')
                    ->pluck('post_id')
            )
            ->unique();

        $conversations = Post::whereIn('id', $postIds)
            ->with(['messages' => fn ($q) => $q->latest()->limit(1)])
            ->get()
            ->map(function ($post) use ($userId) {
                $lastMsg = $post->messages->first();
                return [
                    'post_id'      => $post->uuid,
                    'post'         => $post->only(['name_partial', 'location', 'status']),
                    'last_message' => $lastMsg,
                    'unread_count' => $post->messages()
                        ->where('receiver_id', $userId)
                        ->whereNull('read_at')
                        ->count(),
                ];
            })
            ->sortByDesc(fn ($c) => optional($c['last_message'])->created_at)
            ->values();

        return response()->json($conversations);
    }

    public function index(Request $request, Post $post)
    {
        $isAdmin = $request->user()->isAdmin();

        if (!$isAdmin) {
            $this->authorizeAccess($request, $post);

            // Mark messages as read only for actual participants, not admin observers
            $post->messages()
                ->where('receiver_id', $request->user()->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json(
            $post->messages()->with('sender:id,name')->orderBy('created_at')->get()
        );
    }

    public function store(Request $request, Post $post)
    {
        $this->authorizeAccess($request, $post);

        $request->validate(['content' => 'required|string|max:2000']);

        if ($post->user_id === $request->user()->id) {
            $receiverId = $post->contactRequests()
                ->where('status', 'approved')
                ->latest()
                ->value('user_id');

            abort_if(
                is_null($receiverId),
                422,
                'Aucune demande approuvée sur cette annonce. Approuvez d\'abord une demande pour ouvrir le chat.'
            );
        } else {
            $receiverId = $post->user_id;
        }

        $message = Message::create([
            'post_id'     => $post->id,
            'sender_id'   => $request->user()->id,
            'receiver_id' => $receiverId,
            'content'     => $request->content,
        ]);

        // Notif (email + push) dispatchée en queue — réponse instantanée
        $senderId = $request->user()->id;
        $postId   = $post->id;
        $preview  = mb_strimwidth($request->content, 0, 120, '…');
        dispatch(function () use ($receiverId, $senderId, $postId, $preview) {
            $receiver = User::find($receiverId);
            $sender   = User::find($senderId);
            $post     = Post::find($postId);
            if (!$receiver || !$sender || !$post) return;
            try {
                Mail::to($receiver->email)->send(new NewMessageNotification($post, $sender, $receiver, $preview));
            } catch (\Throwable $e) {
                Log::warning('Échec envoi mail "nouveau message"', ['post_id' => $postId, 'receiver_id' => $receiverId, 'exception' => $e]);
            }
            try {
                app(PushService::class)->sendToUser(
                    $receiver,
                    "💬 {$sender->name}",
                    $preview,
                    "/messages/{$post->uuid}"
                );
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push "nouveau message"', ['post_id' => $postId, 'receiver_id' => $receiverId, 'exception' => $e]);
            }
        });

        return response()->json($message->load('sender:id,name'), 201);
    }

    private function authorizeAccess(Request $request, Post $post): void
    {
        $userId     = $request->user()->id;
        $isOwner    = $post->user_id === $userId;
        $isApproved = $post->contactRequests()
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->exists();

        abort_unless($isOwner || $isApproved, 403, 'Accès non autorisé.');
    }
}
