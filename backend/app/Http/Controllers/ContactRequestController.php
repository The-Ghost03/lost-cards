<?php

namespace App\Http\Controllers;

use App\Mail\ContactApprovedNotification;
use App\Mail\ContactRejectedNotification;
use App\Mail\SelfieSubmittedNotification;
use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class ContactRequestController extends Controller
{
    public function index(Request $request, Post $post)
    {
        // Admin and post owner see all requests with full user info
        if ($request->user()->isAdmin() || $request->user()->id === $post->user_id) {
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
            'selfie' => 'required|image|max:8192',
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

        // Notify the finder (post owner)
        try {
            $finder    = User::find($post->user_id);
            $requester = $request->user();
            Mail::to($finder->email)->send(
                new SelfieSubmittedNotification($post, $finder, $requester, $contactRequest)
            );
        } catch (\Exception) {}

        return response()->json($contactRequest, 201);
    }

    public function selfie(Request $request, Post $post, ContactRequest $contactRequest)
    {
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

        // Notify the requester
        try {
            $requester = User::find($contactRequest->user_id);
            Mail::to($requester->email)->send(
                new ContactApprovedNotification($post, $requester)
            );
        } catch (\Exception) {}

        return response()->json($contactRequest);
    }

    public function reject(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');
        $contactRequest->update(['status' => 'rejected']);

        // Notify the requester
        try {
            $requester = User::find($contactRequest->user_id);
            Mail::to($requester->email)->send(
                new ContactRejectedNotification($post, $requester)
            );
        } catch (\Exception) {}

        return response()->json($contactRequest);
    }
}
