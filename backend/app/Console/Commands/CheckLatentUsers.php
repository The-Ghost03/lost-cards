<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CheckLatentUsers extends Command
{
    protected $signature = 'latent:check';
    protected $description = 'Mark inactive retrouveurs as latent and send weekly reminders';

    public function handle(PushService $push): int
    {
        $now = now();
        $twoWeeksAgo = $now->copy()->subDays(14);

        // ── 1. Marquer comme latents les retrouveurs sans annonce active depuis >14j
        $candidates = User::where('status', 'retrouveur')
            ->whereNull('latent_at')
            ->where('created_at', '<', $twoWeeksAgo)
            ->get();

        $newLatent = 0;
        foreach ($candidates as $user) {
            $hasActivePost = Post::where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
            if ($hasActivePost) continue;

            $lastPost = Post::where('user_id', $user->id)->latest()->first();
            if ($lastPost && $lastPost->created_at->gt($twoWeeksAgo)) continue;

            $user->update(['latent_at' => $now]);
            $newLatent++;
        }
        $this->info("→ $newLatent nouveau(x) compte(s) marqué(s) latent(s)");

        // ── 2. Envoyer le rappel hebdo à tous les latents (max 1× par semaine)
        $oneWeekAgo = $now->copy()->subDays(7);
        $toRemind = User::where('status', 'retrouveur')
            ->whereNotNull('latent_at')
            ->where(function ($q) use ($oneWeekAgo) {
                $q->whereNull('last_reminder_at')
                  ->orWhere('last_reminder_at', '<', $oneWeekAgo);
            })
            ->get();

        $emailsSent = 0;
        $pushesSent = 0;
        foreach ($toRemind as $user) {
            // Email
            try {
                Mail::raw(
                    "Bonjour {$user->name},\n\n".
                    "Vous n'avez pas publié d'annonce depuis un moment.\n".
                    "Avez-vous retrouvé un portefeuille cette semaine ? Si oui, signalez-le pour aider quelqu'un à retrouver ses pièces !\n\n".
                    "Publier une annonce : https://lost-card.softskills.ci/posts/create\n\n".
                    "Merci pour votre engagement,\n".
                    "L'équipe LostCards 🔑",
                    function ($m) use ($user) {
                        $m->to($user->email)
                          ->subject('🔑 Avez-vous retrouvé un portefeuille cette semaine ?');
                    }
                );
                $emailsSent++;
            } catch (\Throwable $e) {
                Log::warning('Échec envoi mail de rappel utilisateur latent', ['user_id' => $user->id, 'exception' => $e]);
            }

            // Push
            try {
                $count = $push->sendToUser(
                    $user,
                    '🔑 Avez-vous retrouvé quelque chose ?',
                    "Si vous avez trouvé un portefeuille, signalez-le pour aider quelqu'un.",
                    '/posts/create'
                );
                if ($count > 0) $pushesSent += $count;
            } catch (\Throwable $e) {
                Log::warning('Échec envoi push de rappel utilisateur latent', ['user_id' => $user->id, 'exception' => $e]);
            }

            $user->update(['last_reminder_at' => $now]);
        }

        $this->info("→ Rappels: $emailsSent email(s), $pushesSent push(es) envoyé(s)");
        return 0;
    }
}
