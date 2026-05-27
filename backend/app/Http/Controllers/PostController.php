<?php

namespace App\Http\Controllers;

use App\Models\AlertSubscription;
use App\Models\Post;
use App\Models\PostPhoto;
use App\Models\User;
use App\Mail\WalletFoundNotification;
use App\Services\AlertNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    public function index(Request $request)
    {
        $query = Post::with('user:id,name,phone')
            ->orderByDesc('created_at');

        if ($request->filled('name')) {
            $query->where('name_on_cards', 'like', '%'.$request->name.'%');
        }

        if ($request->boolean('my')) {
            $query->where('user_id', $request->user()->id);
        } else {
            $query->where('status', 'active');
        }

        return response()->json($query->paginate($request->input('limit', 12)));
    }

    public function show(Request $request, Post $post)
    {
        $post->load('user:id,name,phone', 'photos');
        $data = $post->toArray();

        if ($request->user() && $post->canRevealAddress($request->user())) {
            $data['pickup_address'] = $post->pickup_address;
        }

        $data['secret_question'] = $post->secret_question;
        return response()->json($data);
    }

    /**
     * Sert un fichier photo (public — toute personne qui voit l'annonce voit ses photos).
     */
    public function photo(Request $request, Post $post, PostPhoto $photo)
    {
        abort_unless($photo->post_id === $post->id, 404);
        $path = Storage::disk('local')->path($photo->path);
        abort_unless(file_exists($path), 404);

        return response()->file($path, ['Cache-Control' => 'public, max-age=86400']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name_on_cards'  => 'required|string|max:150',
            'location'       => 'required|string|max:100',
            'documents'      => 'required|array|min:1',
            'documents.*'    => 'string|in:cni,permis,bancaire,assurance,passeport,sejour,electeur,autre',
            'secret_question'=> 'nullable|string|max:255',
            'secret_answer'  => 'nullable|string|max:255',
            'pickup_address' => 'required|string|max:500',
            'photos'         => 'nullable|array|max:5',
            'photos.*'       => 'image|max:8192', // 8 Mo par photo
        ]);

        // Don't pass 'photos' to Post::create — c'est pas une colonne
        $photoFiles = $request->file('photos', []);
        unset($data['photos']);

        $post = Post::create([
            ...$data,
            'user_id' => $request->user()->id,
            'status'  => 'active',
        ]);

        // Stocker les photos
        foreach ($photoFiles as $i => $file) {
            $path = $file->store('post_photos', 'local');
            PostPhoto::create([
                'post_id'  => $post->id,
                'path'     => $path,
                'position' => $i,
            ]);
        }

        // L'utilisateur publie une annonce → il n'est plus latent
        $request->user()->update(['latent_at' => null]);

        // Notifications dispatchées en queue (worker en background) —
        // l'API répond immédiatement, les emails+push partent en parallèle
        dispatch(function () use ($post) {
            app(AlertNotifier::class)->notifyMatching($post);
        });

        return response()->json($post->load('user:id,name,phone', 'photos'), 201);
    }

    public function recover(Request $request, Post $post)
    {
        $userId = $request->user()->id;

        $isOwner = $userId === $post->user_id;
        $isApprovedRequester = $post->contactRequests()
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->exists();

        abort_unless(
            $isOwner || $isApprovedRequester || $request->user()->isAdmin(),
            403,
            'Action non autorisée.'
        );

        $post->update(['status' => 'recovered']);
        return response()->json($post);
    }

    public function destroy(Request $request, Post $post)
    {
        abort_unless(
            $request->user()->id === $post->user_id || $request->user()->isAdmin(),
            403,
            'Action non autorisée.'
        );

        $post->delete();
        return response()->json(['message' => 'Annonce supprimée.']);
    }

}
