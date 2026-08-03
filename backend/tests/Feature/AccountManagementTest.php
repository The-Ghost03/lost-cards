<?php

namespace Tests\Feature;

use App\Models\AlertSubscription;
use App\Models\ContactRequest;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Couvre PATCH /me/status, POST /logout, DELETE /me (deleteAccount).
 * L'inscription/connexion/reset password sont couverts par AuthTest.php.
 */
class AccountManagementTest extends TestCase
{
    use RefreshDatabase;

    /* ───────────────────────── PATCH /me/status ───────────────────────── */

    public function test_update_status_requires_authentication(): void
    {
        $response = $this->patchJson('/api/me/status', ['status' => 'retrouveur']);

        $response->assertStatus(401);
    }

    public function test_update_status_validates_allowed_values(): void
    {
        $user = User::factory()->chercheur()->create();

        $response = $this->actingAsUser($user)->patchJson('/api/me/status', ['status' => 'autre_chose']);

        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_update_status_changes_the_users_status(): void
    {
        $user = User::factory()->chercheur()->create();

        $response = $this->actingAsUser($user)->patchJson('/api/me/status', ['status' => 'retrouveur']);

        $response->assertStatus(200)->assertJson(['status' => 'retrouveur']);
        $this->assertSame('retrouveur', $user->fresh()->status);
    }

    /* ───────────────────────── POST /logout ───────────────────────── */

    public function test_logout_requires_authentication(): void
    {
        $response = $this->postJson('/api/logout');

        $response->assertStatus(401);
    }

    /** Flux bout-en-bout réaliste : login -> token -> logout -> le même token n'ouvre plus /me. */
    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create([
            'email'    => 'jean@lostcards.ci',
            'password' => Hash::make('Password123'),
        ]);

        $token = $this->postJson('/api/login', [
            'email'    => 'jean@lostcards.ci',
            'password' => 'Password123',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertStatus(200);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertStatus(401);
    }

    /* ───────────────────────── DELETE /me ───────────────────────── */

    public function test_delete_account_requires_authentication(): void
    {
        $response = $this->deleteJson('/api/me', ['password' => 'Password123']);

        $response->assertStatus(401);
    }

    public function test_delete_account_requires_the_correct_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Password123')]);

        $response = $this->actingAsUser($user)->deleteJson('/api/me', ['password' => 'MauvaisMotDePasse1']);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_delete_account_validates_password_is_present(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->deleteJson('/api/me', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_admin_account_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create(['password' => Hash::make('Password123')]);

        $response = $this->actingAsUser($admin)->deleteJson('/api/me', ['password' => 'Password123']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_delete_account_removes_the_user_and_cascades_related_data(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Password123')]);
        $post = Post::factory()->create(['user_id' => $user->id]);
        $cr   = ContactRequest::factory()->create(['user_id' => $user->id]);
        AlertSubscription::factory()->for($user)->create();
        Message::factory()->create(['sender_id' => $user->id]);
        $token = $user->createToken('web')->plainTextToken;

        $response = $this->actingAsUser($user)->deleteJson('/api/me', ['password' => 'Password123']);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertDatabaseMissing('contact_requests', ['id' => $cr->id]);
        $this->assertDatabaseCount('alert_subscriptions', 0);
        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
