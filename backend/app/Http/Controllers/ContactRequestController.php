<?php

namespace App\Http\Controllers;

use App\Models\ContactRequest;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
        $request->validate([
            'selfie' => 'required|image|max:8192', // 8 MB max
        ]);

        abort_if($request->user()->id === $post->user_id, 422, 'Vous ne pouvez pas réclamer votre propre annonce.');
        abort_if($post->status === 'recovered', 422, 'Ce portefeuille a déjà été récupéré.');

        $existing = $post->contactRequests()->where('user_id', $request->user()->id)->first();

        if ($existing?->status === 'approved') return response()->json($existing);
        if ($existing?->status === 'pending')  return response()->json($existing);

        // Rejected → allow retry, delete old selfie
        if ($existing?->status === 'rejected') {
            if ($existing->selfie_path) {
                Storage::disk('local')->delete($existing->selfie_path);
            }
            $existing->delete();
        }

        $path = $request->file('selfie')->store('selfies', 'local');

        $contactRequest = ContactRequest::create([
            'post_id'     => $post->id,
            'user_id'     => $request->user()->id,
            'selfie_path' => $path,
            'status'      => 'pending',
        ]);

        return response()->json($contactRequest, 201);
    }

    public function selfie(Request $request, Post $post, ContactRequest $contactRequest)
    {
        // Only the post owner (finder) can view the selfie
        abort_unless($request->user()->id === $post->user_id, 403, 'Accès non autorisé.');
        abort_unless($contactRequest->post_id === $post->id, 404);
        abort_unless($contactRequest->selfie_path, 404);

        $path = Storage::disk('local')->path($contactRequest->selfie_path);
        abort_unless(file_exists($path), 404, 'Selfie introuvable.');

        return response()->file($path, ['Cache-Control' => 'private, max-age=3600']);
    }

    public function approve(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');
        $contactRequest->update(['status' => 'approved']);
        return response()->json($contactRequest);
    }

    public function reject(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');
        $contactRequest->update(['status' => 'rejected']);
        return response()->json($contactRequest);
    }
}
