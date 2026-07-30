<?php

namespace App\Http\Controllers;

use App\Mail\ContactApprovedNotification;
use App\Mail\ContactRejectedNotification;
use App\Mail\SelfieSubmittedNotification;
use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use App\Services\ImageOptimizer;
use App\Services\PushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

    /**
     * Liste les demandes de l'utilisateur connecté (toutes annonces confondues).
     * Utilisé pour afficher "Mes demandes en cours" sur le dashboard chercheur.
     */
    public function myContacts(Request $request)
    {
        $userId = $request->user()->id;
        $rows = ContactRequest::where('user_id', $userId)
            ->with(['post' => fn($q) => $q->select('id','uuid','name_partial','location','status','pickup_address','user_id','created_at')])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($r) use ($userId) {
                $unread = 0;
                if ($r->status === 'approved' && $r->post) {
                    $unread = $r->post->messages()
                        ->where('receiver_id', $userId)
                        ->whereNull('read_at')
                        ->count();
                }
                return [
                    'id'         => $r->uuid,
                    'status'     => $r->status,
                    'created_at' => $r->created_at,
                    'post'       => $r->post,
                    'unread'     => $unread,
                ];
            });

        return response()->json($rows);
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

        // Selfie : on optimise aussi (vérification visuelle, 1200px suffisent largement)
        $path = app(ImageOptimizer::class)->optimizeAndStore(
            $request->file('selfie'),
            'selfies',
            1200,
            82
        );

        $contactRequest = ContactRequest::create([
            'post_id'     => $post->id,
            'user_id'     => $request->user()->id,
            'selfie_path' => $path,
            'status'      => 'pending',
        ]);

        // Notif finder en queue — la requête répond immédiatement
        $finderId    = $post->user_id;
        $requesterId = $request->user()->id;
        $crId        = $contactRequest->id;
        $postId      = $post->id;
        dispatch(function () use ($finderId, $requesterId, $crId, $postId) {
            $finder    = User::find($finderId);
            $requester = User::find($requesterId);
            $cr        = ContactRequest::find($crId);
            $post      = Post::find($postId);
            if (!$finder || !$post) return;
            try {
                Mail::to($finder->email)->send(new SelfieSubmittedNotification($post, $finder, $requester, $cr));
            } catch (\Throwable $e) {
                Log::warning('Échec envoi mail "selfie soumis" au retrouveur', ['post_id' => $postId, 'user_id' => $finderId, 'exception' => $e]);
            }
            try {
                app(PushService::class)->sendToUser(
                    $finder,
                    "📸 Nouvelle demande sur votre annonce",
                    "{$requester->name} a envoyé un selfie pour vérifier l'identité.",
                    "/posts/{$post->uuid}"
                );
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push "selfie soumis" au retrouveur', ['post_id' => $postId, 'user_id' => $finderId, 'exception' => $e]);
            }
        });

        return response()->json($contactRequest, 201);
    }

    public function selfie(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($request->user()->id === $post->user_id, 403, 'Accès non autorisé.');
        abort_unless($contactRequest->post_id === $post->id, 404);
        abort_unless($contactRequest->selfie_path, 404);

        $path = Storage::disk('local')->path($contactRequest->selfie_path);
        abort_unless(file_exists($path), 404, 'Selfie introuvable.');

        // Cache privé court (1h) — le selfie peut être supprimé/réessayé
        return response()->file($path, ['Cache-Control' => 'private, max-age=3600, must-revalidate']);
    }

    public function approve(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($contactRequest->post_id === $post->id, 404);
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');
        $contactRequest->update(['status' => 'approved']);

        // Notif en queue — réponse immédiate
        $requesterId = $contactRequest->user_id;
        $postId      = $post->id;
        dispatch(function () use ($requesterId, $postId) {
            $requester = User::find($requesterId);
            $post      = Post::find($postId);
            if (!$requester || !$post) return;
            try {
                Mail::to($requester->email)->send(new ContactApprovedNotification($post, $requester));
            } catch (\Throwable $e) {
                Log::warning('Échec envoi mail "demande approuvée" au chercheur', ['post_id' => $postId, 'user_id' => $requesterId, 'exception' => $e]);
            }
            try {
                app(PushService::class)->sendToUser(
                    $requester,
                    "✅ Votre identité a été vérifiée",
                    "Vous pouvez maintenant discuter avec le retrouveur.",
                    "/messages/{$post->uuid}"
                );
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push "demande approuvée" au chercheur', ['post_id' => $postId, 'user_id' => $requesterId, 'exception' => $e]);
            }
        });

        return response()->json($contactRequest);
    }

    public function reject(Request $request, Post $post, ContactRequest $contactRequest)
    {
        abort_unless($contactRequest->post_id === $post->id, 404);
        abort_unless($request->user()->id === $post->user_id, 403, 'Action non autorisée.');
        $contactRequest->update(['status' => 'rejected']);

        // Notif en queue — réponse immédiate
        $requesterId = $contactRequest->user_id;
        $postId      = $post->id;
        dispatch(function () use ($requesterId, $postId) {
            $requester = User::find($requesterId);
            $post      = Post::find($postId);
            if (!$requester || !$post) return;
            try {
                Mail::to($requester->email)->send(new ContactRejectedNotification($post, $requester));
            } catch (\Throwable $e) {
                Log::warning('Échec envoi mail "demande rejetée" au chercheur', ['post_id' => $postId, 'user_id' => $requesterId, 'exception' => $e]);
            }
            try {
                app(PushService::class)->sendToUser(
                    $requester,
                    "ℹ️ Votre selfie n'a pas été validé",
                    "Le retrouveur n'a pas reconnu votre visage. Vous pouvez réessayer.",
                    "/posts/{$post->uuid}"
                );
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push "demande rejetée" au chercheur', ['post_id' => $postId, 'user_id' => $requesterId, 'exception' => $e]);
            }
        });

        return response()->json($contactRequest);
    }
}
