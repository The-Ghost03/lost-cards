<?php

namespace App\Http\Controllers;

use App\Models\ContactRequest;
use App\Models\Post;
use Illuminate\Http\Request;

class ContactRequestController extends Controller
{
    public function index(Request $request, Post $post)
    {
        if ($request->user()->id === $post->user_id) {
            return response()->json(
                $post->contactRequests()->with('user:id,name,email,phone')->get()
            );
        }

        return response()->json(
            $post->contactRequests()->where('user_id', $request->user()->id)->get()
        );
    }

    public function store(Request $request, Post $post)
    {
        $request->validate(['answer' => 'required|string|max:255']);

        abort_if($request->user()->id === $post->user_id, 422, 'Vous ne pouvez pas réclamer votre propre annonce.');
        abort_if($post->status === 'recovered', 422, 'Ce portefeuille a déjà été récupéré.');

        $existing = $post->contactRequests()->where('user_id', $request->user()->id)->first();

        // Already approved → return as-is
        if ($existing?->status === 'approved') {
            return response()->json($existing);
        }

        // Already pending → return as-is
        if ($existing?->status === 'pending') {
            return response()->json($existing);
        }

        // Rejected → allow retry: delete old and create fresh
        if ($existing?->status === 'rejected') {
            $existing->delete();
        }

        $correct = strtolower(trim($request->answer)) === strtolower(trim($post->secret_answer));

        $contactRequest = ContactRequest::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'answer'  => $request->answer,
            'status'  => $correct ? 'pending' : 'rejected',
        ]);

        if (! $correct) {
            return response()->json(
                ['message' => 'Réponse incorrecte. Vérifiez et réessayez.', 'status' => 'rejected'],
                422
            );
        }

        return response()->json($contactRequest, 201);
    }

    public function approve(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');

        $contactRequest->update(['status' => 'approved']);

        return response()->json($contactRequest);
    }
}
