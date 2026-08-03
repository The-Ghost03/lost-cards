<?php

namespace Tests\Feature;

use App\Models\AlertSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre GET/POST /alerts et DELETE /alerts/{uuid}.
 */
class AlertSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    /* ───────────────────────── index ───────────────────────── */

    public function test_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/alerts');

        $response->assertStatus(401);
    }

    public function test_index_returns_only_the_authenticated_users_alerts(): void
    {
        $me    = User::factory()->create();
        $other = User::factory()->create();
        $mine  = AlertSubscription::factory()->for($me)->create(['name' => 'Kouamé']);
        AlertSubscription::factory()->for($other)->create(['name' => 'Traoré']);

        $response = $this->actingAsUser($me)->getJson('/api/alerts');

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('id')->all();
        $this->assertEquals([$mine->uuid], $ids);
    }

    /* ───────────────────────── store ───────────────────────── */

    public function test_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/alerts', ['name' => 'Kouamé']);

        $response->assertStatus(401);
    }

    public function test_store_validates_required_name(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/alerts', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_store_creates_an_alert_subscription(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/alerts', ['name' => 'Kouamé']);

        $response->assertStatus(201)->assertJson(['name' => 'Kouamé']);
        $this->assertDatabaseHas('alert_subscriptions', ['user_id' => $user->id, 'name' => 'Kouamé']);
    }

    public function test_store_is_idempotent_for_the_same_name(): void
    {
        $user = User::factory()->create();

        $this->actingAsUser($user)->postJson('/api/alerts', ['name' => 'Kouamé'])->assertStatus(201);
        $this->actingAsUser($user)->postJson('/api/alerts', ['name' => 'Kouamé'])->assertStatus(201);

        $this->assertDatabaseCount('alert_subscriptions', 1);
    }

    /* ───────────────────────── destroy ───────────────────────── */

    public function test_destroy_requires_authentication(): void
    {
        $alert = AlertSubscription::factory()->create();

        $response = $this->deleteJson("/api/alerts/{$alert->uuid}");

        $response->assertStatus(401);
    }

    public function test_owner_can_delete_their_alert(): void
    {
        $user  = User::factory()->create();
        $alert = AlertSubscription::factory()->for($user)->create();

        $response = $this->actingAsUser($user)->deleteJson("/api/alerts/{$alert->uuid}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('alert_subscriptions', ['id' => $alert->id]);
    }

    /** IDOR : un utilisateur ne peut pas supprimer l'alerte d'un autre via son uuid. */
    public function test_stranger_cannot_delete_another_users_alert(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $alert    = AlertSubscription::factory()->for($owner)->create();

        $response = $this->actingAsUser($stranger)->deleteJson("/api/alerts/{$alert->uuid}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('alert_subscriptions', ['id' => $alert->id]);
    }

    public function test_destroy_returns_404_for_unknown_uuid(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->deleteJson('/api/alerts/uuid-inexistant');

        $response->assertStatus(404);
    }
}
