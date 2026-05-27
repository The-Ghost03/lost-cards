<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushService
{
    private ?WebPush $client = null;

    private function client(): WebPush
    {
        if ($this->client) return $this->client;

        $this->client = new WebPush([
            'VAPID' => [
                'subject'    => env('VAPID_SUBJECT', 'mailto:admin@lostcards.ci'),
                'publicKey'  => env('VAPID_PUBLIC_KEY'),
                'privateKey' => env('VAPID_PRIVATE_KEY'),
            ],
        ]);

        $this->client->setDefaultOptions([
            'TTL'     => 86400,   // 24 h
            'urgency' => 'normal',
        ]);

        return $this->client;
    }

    /**
     * Envoie une notification à tous les abonnements push d'un utilisateur.
     * Supprime les subscriptions expirées (410 Gone, 404 Not Found).
     */
    public function sendToUser(User $user, string $title, string $body, ?string $url = null): int
    {
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();
        if ($subscriptions->isEmpty()) return 0;

        $payload = json_encode([
            'title' => $title,
            'body'  => $body,
            'url'   => $url ?? '/',
            'icon'  => '/icons/pwa-192.png',
            'badge' => '/icons/pwa-192.png',
        ]);

        $client = $this->client();

        foreach ($subscriptions as $sub) {
            try {
                $webSub = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->p256dh,
                    'authToken'       => $sub->auth,
                    'contentEncoding' => 'aes128gcm',
                ]);
                $client->queueNotification($webSub, $payload);
            } catch (\Throwable) {
                // ignore les subscriptions malformées
            }
        }

        $sent = 0;
        foreach ($client->flush() as $report) {
            $endpoint = $report->getEndpoint();
            if ($report->isSuccess()) {
                $sent++;
                PushSubscription::where('endpoint', $endpoint)->update(['last_used_at' => now()]);
            } elseif (in_array($report->getResponse()?->getStatusCode(), [404, 410])) {
                // Endpoint mort → on supprime
                PushSubscription::where('endpoint', $endpoint)->delete();
            }
        }

        return $sent;
    }
}
