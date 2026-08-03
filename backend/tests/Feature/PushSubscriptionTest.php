<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre GET /push/public-key (public), POST /push/subscribe, POST /push/unsubscribe
 * et POST /push/test. Hors périmètre prioritaire de la mission mais gardé pour
 * viser l'exhaustivité de la matrice — voir docs/MATRICE-TESTS-ENDPOINTS.md.
 */
class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_key_endpoint_is_public(): void
    {
        $response = $this->getJson('/api/push/public-key');

        $response->assertStatus(200)->assertJsonStructure(['public_key']);
    }

    /* ───────────────────────── subscribe ───────────────────────── */

    public function test_subscribe_requires_authentication(): void
    {
        $response = $this->postJson('/api/push/subscribe', [
            'endpoint' => 'https://push.example/abc',
            'keys'     => ['p256dh' => 'key-p256dh', 'auth' => 'key-auth'],
        ]);

        $response->assertStatus(401);
    }

    public function test_subscribe_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/push/subscribe', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['endpoint', 'keys.p256dh', 'keys.auth']);
    }

    public function test_subscribe_creates_a_subscription_for_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/push/subscribe', [
            'endpoint' => 'https://push.example/abc',
            'keys'     => ['p256dh' => 'key-p256dh', 'auth' => 'key-auth'],
        ]);

        $response->assertStatus(201)->assertJson(['ok' => true]);
        $this->assertDatabaseHas('push_subscriptions', [
            'user_id'  => $user->id,
            'endpoint' => 'https://push.example/abc',
        ]);
    }

    public function test_subscribe_upserts_by_endpoint_instead_of_duplicating(): void
    {
        $user = User::factory()->create();
        $payload = ['endpoint' => 'https://push.example/abc', 'keys' => ['p256dh' => 'key-1', 'auth' => 'auth-1']];

        $this->actingAsUser($user)->postJson('/api/push/subscribe', $payload)->assertStatus(201);
        $this->actingAsUser($user)->postJson('/api/push/subscribe', [
            'endpoint' => 'https://push.example/abc',
            'keys'     => ['p256dh' => 'key-2', 'auth' => 'auth-2'],
        ])->assertStatus(201);

        $this->assertDatabaseCount('push_subscriptions', 1);
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => 'https://push.example/abc', 'p256dh' => 'key-2']);
    }

    /* ───────────────────────── unsubscribe ───────────────────────── */

    public function test_unsubscribe_requires_authentication(): void
    {
        $response = $this->postJson('/api/push/unsubscribe', ['endpoint' => 'https://push.example/abc']);

        $response->assertStatus(401);
    }

    public function test_unsubscribe_removes_the_users_own_subscription(): void
    {
        $user = User::factory()->create();
        PushSubscription::create([
            'user_id' => $user->id, 'endpoint' => 'https://push.example/abc',
            'p256dh' => 'k', 'auth' => 'a',
        ]);

        $response = $this->actingAsUser($user)->postJson('/api/push/unsubscribe', ['endpoint' => 'https://push.example/abc']);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => 'https://push.example/abc']);
    }

    /** IDOR : un utilisateur ne peut pas désabonner l'endpoint d'un autre. */
    public function test_unsubscribe_does_not_remove_another_users_subscription(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        PushSubscription::create([
            'user_id' => $owner->id, 'endpoint' => 'https://push.example/victim',
            'p256dh' => 'k', 'auth' => 'a',
        ]);

        $response = $this->actingAsUser($stranger)
            ->postJson('/api/push/unsubscribe', ['endpoint' => 'https://push.example/victim']);

        $response->assertStatus(200); // pas d'erreur, mais rien n'est supprimé
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => 'https://push.example/victim']);
    }

    /* ───────────────────────── test (envoi push à soi-même) ───────────────────────── */

    public function test_push_test_requires_authentication(): void
    {
        $response = $this->postJson('/api/push/test');

        $response->assertStatus(401);
    }

    public function test_push_test_reports_zero_sent_when_user_has_no_subscription(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/push/test');

        $response->assertStatus(200)->assertJson(['sent' => 0]);
    }
}
