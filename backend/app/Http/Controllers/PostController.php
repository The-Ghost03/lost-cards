<?php

namespace App\Http\Controllers;

use App\Models\AlertSubscription;
use App\Models\Post;
use App\Models\User;
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
            $query->where('status', 'active');
        }

        return response()->json($query->paginate($request->input('limit', 12)));
    }

    public function show(Request $request, Post $post)
    {
        $post->load('user:id,name,phone');
        $data = $post->toArray();

        if ($request->user() && $post->canRevealAddress($request->user())) {
            $data['pickup_address'] = $post->pickup_address;
        }

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
            'secret_question'=> 'nullable|string|max:255',
            'secret_answer'  => 'nullable|string|max:255',
            'pickup_address' => 'required|string|max:500',
        ]);

        $post = Post::create([
            ...$data,
            'user_id' => $request->user()->id,
            'status'  => 'active',
        ]);

        $this->notifySubscribers($post);

        return response()->json($post->load('user:id,name,phone'), 201);
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

    private function notifySubscribers(Post $post): void
    {
        // Split post name into significant words (accent-folded, min 2 chars)
        $postWords = $this->extractWords($post->name_on_cards);

        if (empty($postWords)) return;

        $notifiedIds = collect();

        // 1. Alert subscribers — word-level match (accent-insensitive)
        AlertSubscription::with('user')
            ->get()
            ->filter(function ($sub) use ($postWords) {
                $subWords = $this->extractWords($sub->name);
                return !empty(array_intersect($postWords, $subWords));
            })
            ->each(function ($sub) use ($post, $notifiedIds) {
                try {
                    Mail::to($sub->user->email)->send(new WalletFoundNotification($post, $sub->user));
                    $notifiedIds->push($sub->user_id);
                } catch (\Exception) {}
            });

        // 2. Chercheur users without explicit alert whose name matches
        User::where('status', 'chercheur')
            ->where('id', '!=', $post->user_id)
            ->whereNotIn('id', $notifiedIds->all())
            ->get()
            ->filter(function ($user) use ($postWords) {
                $nameWords = $this->extractWords($user->name);
                return !empty(array_intersect($postWords, $nameWords));
            })
            ->each(function ($user) use ($post) {
                try {
                    Mail::to($user->email)->send(new WalletFoundNotification($post, $user));
                } catch (\Exception) {}
            });
    }

    /**
     * Lowercase + accent-fold a string, then split into significant words.
     * "KOUAMÉ Jean-Marc" → ["kouame", "jean", "marc"]
     */
    private function extractWords(string $input): array
    {
        $normalized = $this->normalize($input);
        return array_values(array_filter(
            preg_split('/[\s\-\.]+/', $normalized),
            fn ($w) => mb_strlen($w) >= 2
        ));
    }

    /**
     * Lowercase and strip diacritics so "Kouamé" matches "kouame".
     * Covers French/Ivorian common accents.
     */
    private function normalize(string $s): string
    {
        $s = mb_strtolower($s, 'UTF-8');
        $from = ['à','á','â','ã','ä','å','ā','ç','è','é','ê','ë','ē','ì','í','î','ï','ī',
                'ñ','ò','ó','ô','õ','ö','ø','ō','ù','ú','û','ü','ū','ý','ÿ','œ','æ'];
        $to   = ['a','a','a','a','a','a','a','c','e','e','e','e','e','i','i','i','i','i',
                'n','o','o','o','o','o','o','o','u','u','u','u','u','y','y','oe','ae'];
        return str_replace($from, $to, $s);
    }
}
