<?php

namespace Tests\Feature;

use App\Models\AlertSubscription;
use App\Models\ContactRequest;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre /admin/stats, /admin/posts, /admin/users, PATCH/DELETE /admin/users/{user}
 * et /admin/analytics (Admin\DashboardController + AnalyticsController::stats).
 * Vérifie systématiquement qu'un non-admin est refusé (403) et qu'un visiteur
 * non authentifié est refusé (401) avant même l'évaluation du middleware admin.
 */
class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private const ROUTES = [
        ['GET', '/api/admin/stats'],
        ['GET', '/api/admin/posts'],
        ['GET', '/api/admin/users'],
        ['GET', '/api/admin/analytics'],
    ];

    /* ───────────────────────── accès refusé ───────────────────────── */

    public function test_unauthenticated_visitor_is_rejected_on_every_admin_route(): void
    {
        foreach (self::ROUTES as [$method, $uri]) {
            $this->json($method, $uri)->assertStatus(401);
        }
    }

    public function test_non_admin_user_is_rejected_on_every_admin_route(): void
    {
        $user = User::factory()->create();

        foreach (self::ROUTES as [$method, $uri]) {
            $this->actingAsUser($user)->json($method, $uri)
                ->assertStatus(403)
                ->assertJson(['message' => 'Accès réservé aux administrateurs.']);
        }
    }

    public function test_non_admin_cannot_update_another_user(): void
    {
        $user   = User::factory()->create();
        $target = User::factory()->create();

        $response = $this->actingAsUser($user)
            ->patchJson("/api/admin/users/{$target->uuid}", ['role' => 'admin']);

        $response->assertStatus(403);
        $this->assertSame('user', $target->fresh()->role);
    }

    public function test_non_admin_cannot_delete_another_user(): void
    {
        $user   = User::factory()->create();
        $target = User::factory()->create();

        $response = $this->actingAsUser($user)->deleteJson("/api/admin/users/{$target->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    /* ───────────────────────── stats ───────────────────────── */

    public function test_admin_can_read_stats(): void
    {
        $admin = User::factory()->admin()->create();
        Post::factory()->count(2)->create(['status' => 'active']);
        Post::factory()->recovered()->create();

        $response = $this->actingAsUser($admin)->getJson('/api/admin/stats');

        $response->assertStatus(200)->assertJsonStructure([
            'totals' => ['posts', 'posts_active', 'posts_recovered', 'users', 'contact_requests', 'messages', 'alerts'],
            'last_7_days' => ['new_posts', 'new_users', 'recoveries'],
        ]);
        $this->assertSame(3, $response->json('totals.posts'));
        $this->assertSame(2, $response->json('totals.posts_active'));
        $this->assertSame(1, $response->json('totals.posts_recovered'));
    }

    /* ───────────────────────── posts ───────────────────────── */

    public function test_admin_can_list_all_posts_including_non_active_ones(): void
    {
        $admin     = User::factory()->admin()->create();
        $active    = Post::factory()->create(['status' => 'active']);
        $recovered = Post::factory()->recovered()->create();

        $response = $this->actingAsUser($admin)->getJson('/api/admin/posts');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($active->uuid, $ids);
        $this->assertContains($recovered->uuid, $ids);
    }

    /* ───────────────────────── users ───────────────────────── */

    public function test_admin_can_list_and_search_users(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['name' => 'Jean Kouamé']);
        User::factory()->create(['name' => 'Awa Traoré']);

        $response = $this->actingAsUser($admin)->getJson('/api/admin/users?q=Kouamé');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Jean Kouamé', $names);
        $this->assertNotContains('Awa Traoré', $names);
    }

    public function test_admin_users_listing_includes_related_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $user  = User::factory()->create();
        Post::factory()->count(2)->create(['user_id' => $user->id]);

        $response = $this->actingAsUser($admin)->getJson('/api/admin/users');

        $response->assertStatus(200);
        $row = collect($response->json('data'))->firstWhere('id', $user->uuid);
        $this->assertSame(2, $row['posts_count']);
    }

    /* ───────────────────────── updateUser ───────────────────────── */

    public function test_admin_can_promote_a_user_to_admin(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->create();

        $response = $this->actingAsUser($admin)
            ->patchJson("/api/admin/users/{$target->uuid}", ['role' => 'admin']);

        $response->assertStatus(200)->assertJson(['role' => 'admin']);
        $this->assertSame('admin', $target->fresh()->role);
    }

    public function test_admin_can_change_a_users_status(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->chercheur()->create();

        $response = $this->actingAsUser($admin)
            ->patchJson("/api/admin/users/{$target->uuid}", ['status' => 'retrouveur']);

        $response->assertStatus(200)->assertJson(['status' => 'retrouveur']);
    }

    public function test_update_user_validates_allowed_enum_values(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->create();

        $response = $this->actingAsUser($admin)
            ->patchJson("/api/admin/users/{$target->uuid}", ['role' => 'superadmin']);

        $response->assertStatus(422)->assertJsonValidationErrors(['role']);
    }

    public function test_update_user_returns_404_for_unknown_uuid(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAsUser($admin)
            ->patchJson('/api/admin/users/uuid-inexistant', ['role' => 'admin']);

        $response->assertStatus(404);
    }

    /* ───────────────────────── deleteUser ───────────────────────── */

    public function test_admin_cannot_delete_another_admin(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->admin()->create();

        $response = $this->actingAsUser($admin)->deleteJson("/api/admin/users/{$target->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_admin_can_delete_a_regular_user_and_cascades_related_data(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->create();
        $post   = Post::factory()->create(['user_id' => $target->id]);
        $cr     = ContactRequest::factory()->create(['user_id' => $target->id]);
        AlertSubscription::factory()->for($target)->create();
        Message::factory()->create(['sender_id' => $target->id]);

        $response = $this->actingAsUser($admin)->deleteJson("/api/admin/users/{$target->uuid}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertDatabaseMissing('contact_requests', ['id' => $cr->id]);
        $this->assertDatabaseCount('alert_subscriptions', 0);
    }

    /* ───────────────────────── analytics (admin) ───────────────────────── */

    public function test_admin_can_read_analytics_stats(): void
    {
        $admin = User::factory()->admin()->create();
        \App\Models\AnalyticsPageview::create([
            'session_id' => 'sess-1',
            'path'       => '/',
            'source'     => 'direct',
            'device_type'=> 'desktop',
            'device_os'  => 'Windows',
            'device_browser' => 'Chrome',
            'created_at' => now(),
        ]);

        $response = $this->actingAsUser($admin)->getJson('/api/admin/analytics');

        $response->assertStatus(200)->assertJsonStructure([
            'period_days', 'total_views', 'unique_visitors', 'avg_duration_seconds',
            'bounce_rate', 'daily', 'top_pages', 'sources', 'referrers', 'devices', 'os',
        ]);
        $this->assertSame(1, $response->json('total_views'));
    }
}
