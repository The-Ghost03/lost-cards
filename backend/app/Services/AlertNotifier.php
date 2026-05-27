<?php

namespace App\Services;

use App\Mail\WalletFoundNotification;
use App\Models\AlertSubscription;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class AlertNotifier
{
    public function __construct(private PushService $push) {}

    /**
     * Notifie (email + push) tous les utilisateurs dont le nom matche
     * un mot de l'annonce. Insensible à la casse et aux accents.
     */
    public function notifyMatching(Post $post): void
    {
        $postWords = $this->extractWords($post->name_on_cards);
        if (empty($postWords)) return;

        $notifiedIds = collect();

        $sendAlert = function (User $user) use ($post) {
            try {
                Mail::to($user->email)->send(new WalletFoundNotification($post, $user));
            } catch (\Throwable) {}
            try {
                $this->push->sendToUser(
                    $user,
                    "🔑 Un portefeuille à votre nom a été trouvé",
                    "Un retrouveur a signalé un portefeuille à {$post->location}. Vérifiez si c'est le vôtre.",
                    "/posts/{$post->id}"
                );
            } catch (\Throwable) {}
        };

        // 1. Abonnés explicites
        AlertSubscription::with('user')
            ->get()
            ->filter(fn ($sub) => !empty(array_intersect($postWords, $this->extractWords($sub->name))))
            ->each(function ($sub) use ($sendAlert, $notifiedIds) {
                $sendAlert($sub->user);
                $notifiedIds->push($sub->user_id);
            });

        // 2. Chercheurs dont le nom de compte matche
        User::where('status', 'chercheur')
            ->where('id', '!=', $post->user_id)
            ->whereNotIn('id', $notifiedIds->all())
            ->get()
            ->filter(fn ($u) => !empty(array_intersect($postWords, $this->extractWords($u->name))))
            ->each(fn ($u) => $sendAlert($u));
    }

    /** "KOUAMÉ Jean-Marc" → ["kouame", "jean", "marc"] */
    private function extractWords(string $input): array
    {
        return array_values(array_filter(
            preg_split('/[\s\-\.]+/', $this->normalize($input)),
            fn ($w) => mb_strlen($w) >= 2
        ));
    }

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
