<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Post;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        // Get all posts where the user is the finder OR has an approved contact request
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

        // Mark messages to this user as read
        $post->messages()
            ->where('receiver_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(
            $post->messages()->with('sender:id,name')->orderBy('created_at')->get()
        );
    }

    public function store(Request $request, Post $post)
    {
        $this->authorizeAccess($request, $post);

        $request->validate(['content' => 'required|string|max:2000']);

        $receiverId = $post->user_id === $request->user()->id
            ? $post->contactRequests()->where('status', 'approved')->value('user_id')
            : $post->user_id;

        $message = Message::create([
            'post_id'     => $post->id,
            'sender_id'   => $request->user()->id,
            'receiver_id' => $receiverId,
            'content'     => $request->content,
        ]);

        return response()->json($message->load('sender:id,name'), 201);
    }

    private function authorizeAccess(Request $request, Post $post): void
    {
        $userId  = $request->user()->id;
        $isOwner = $post->user_id === $userId;
        $isApproved = $post->contactRequests()
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->exists();

        abort_unless($isOwner || $isApproved, 403, 'Accès non autorisé.');
    }
}
