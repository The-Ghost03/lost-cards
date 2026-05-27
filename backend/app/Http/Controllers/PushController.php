<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\PushService;
use Illuminate\Http\Request;

class PushController extends Controller
{
    /**
     * Retourne la clé VAPID publique au frontend (pour pushManager.subscribe()).
     * Public — pas besoin d'auth.
     */
    public function publicKey()
    {
        return response()->json([
            'public_key' => config('webpush.public_key'),
        ]);
    }

    /**
     * Enregistre / met à jour une subscription pour l'utilisateur connecté.
     */
    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint'  => 'required|string|max:600',
            'keys.p256dh' => 'required|string|max:255',
            'keys.auth'   => 'required|string|max:255',
        ]);

        $sub = PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id'    => $request->user()->id,
                'p256dh'     => $data['keys']['p256dh'],
                'auth'       => $data['keys']['auth'],
                'user_agent' => mb_substr($request->header('User-Agent', ''), 0, 500),
            ]
        );

        return response()->json(['ok' => true, 'id' => $sub->id], 201);
    }

    /**
     * Supprime la subscription par endpoint (l'utilisateur clique "désactiver").
     */
    public function unsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string|max:600']);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Test endpoint — envoie un push à soi-même.
     */
    public function test(Request $request, PushService $push)
    {
        $sent = $push->sendToUser(
            $request->user(),
            '🔔 Test LostCards',
            'Les notifications fonctionnent !',
            '/'
        );
        return response()->json(['sent' => $sent]);
    }
}
