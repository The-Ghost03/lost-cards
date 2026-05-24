<?php

namespace App\Http\Controllers;

use App\Models\AlertSubscription;
use App\Models\Post;
use App\Mail\WalletFoundNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

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
            // Public listing only shows active posts by default
            if (! $request->boolean('my')) {
                $query->where('status', 'active');
            }
        }

        return response()->json($query->paginate($request->input('limit', 12)));
    }

    public function show(Request $request, Post $post)
    {
        $post->load('user:id,name,phone');

        $data = $post->toArray();

        // Reveal sensitive info if user is owner or approved
        if ($request->user() && $post->canRevealAddress($request->user())) {
            $data['pickup_address'] = $post->pickup_address;
        }

        // Reveal secret question (needed for contact form)
        $data['secret_question'] = $post->secret_question;

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name_on_cards'  => 'required|string|max:150',
            'location'       => 'required|string|max:100',
            'documents'      => 'required|array|min:1',
            'documents.*'    => 'string|in:cni,permis,bancaire,assurance,passeport,sejour,electeur,autre',
            'secret_question'=> 'required|string|max:255',
            'secret_answer'  => 'required|string|max:255',
            'pickup_address' => 'required|string|max:500',
        ]);

        $post = Post::create([
            ...$data,
            'user_id' => $request->user()->id,
            'status'  => 'active',
        ]);

        // Notify alert subscribers whose name matches
        $this->notifySubscribers($post);

        return response()->json($post->load('user:id,name,phone'), 201);
    }

    public function recover(Request $request, Post $post)
    {
        abort_unless(
            $request->user()->id === $post->user_id || $request->user()->isAdmin(),
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

    private function notifySubscribers(Post $post): void
    {
        $name = strtolower($post->name_on_cards);

        AlertSubscription::with('user')
            ->get()
            ->filter(fn ($sub) => str_contains(strtolower($post->name_on_cards), strtolower($sub->name))
                               || str_contains(strtolower($sub->name), strtolower($name)))
            ->each(function ($sub) use ($post) {
                try {
                    Mail::to($sub->user->email)
                        ->send(new WalletFoundNotification($post, $sub->user));
                } catch (\Exception) {
                    // Fail silently — email sending must not break the request
                }
            });
    }
}
