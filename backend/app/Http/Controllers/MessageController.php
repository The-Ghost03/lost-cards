<?php

namespace App\Http\Controllers;

use App\Mail\NewMessageNotification;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class MessageController extends Controller
{
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $postIds = Post::where('user_id', $userId)->pluck('id')
            ->merge(
                \App\Models\ContactRequest::where('user_id', $userId)
                    ->whereIn('status', ['pending', 'approved'])
                    ->pluck('post_id')
            )
            ->unique();

        $conversations = Post::whereIn('id', $postIds)
            ->with(['messages' => fn ($q) => $q->latest()->limit(1)])
            ->get()
            ->map(function ($post) use ($userId) {
                $lastMsg = $post->messages->first();
                return [
                    'post_id'      => $post->id,
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
        $this->authorizeAccess($request, $post);
        $userId  = $request->user()->id;
        $isOwner = $post->user_id === $userId;

        // Marquer comme lu les messages adressés à moi
        $post->messages()
            ->where('receiver_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $query = $post->messages()->with('sender:id,name');

        if (!$isOwner) {
            // Non-owner : isoler le fil "moi ↔ propriétaire"
            $query->where(function ($q) use ($userId, $post) {
                $q->where(function ($q2) use ($userId, $post) {
                    $q2->where('sender_id', $userId)
                       ->where('receiver_id', $post->user_id);
                })->orWhere(function ($q2) use ($userId, $post) {
                    $q2->where('sender_id', $post->user_id)
                       ->where('receiver_id', $userId);
                });
            });
        }

        return response()->json($query->orderBy('created_at')->get());
    }

    public function store(Request $request, Post $post)
    {
        $this->authorizeAccess($request, $post);

        $request->validate(['content' => 'required|string|max:2000']);

        if ($post->user_id === $request->user()->id) {
            // Owner peut écrire à un demandeur approuvé OU pending (relance pré-approbation)
            $receiverId = $post->contactRequests()
                ->whereIn('status', ['approved', 'pending'])
                ->latest()
                ->value('user_id');

            abort_if(
                is_null($receiverId),
                422,
                'Aucune demande de contact sur cette annonce. Attendez qu\'un chercheur envoie son selfie.'
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

        // Notify the receiver by email
        try {
            $receiver = User::find($receiverId);
            $sender   = $request->user();
            $preview  = mb_strimwidth($request->content, 0, 120, '…');
            Mail::to($receiver->email)->send(
                new NewMessageNotification($post, $sender, $receiver, $preview)
            );
        } catch (\Exception) {}

        return response()->json($message->load('sender:id,name'), 201);
    }

    private function authorizeAccess(Request $request, Post $post): void
    {
        $userId  = $request->user()->id;
        $isOwner = $post->user_id === $userId;
        $hasReq  = $post->contactRequests()
            ->where('user_id', $userId)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        abort_unless($isOwner || $hasReq, 403, 'Accès non autorisé.');
    }
}
