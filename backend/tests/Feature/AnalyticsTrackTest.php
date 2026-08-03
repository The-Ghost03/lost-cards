<?php

namespace Tests\Feature;

use App\Models\AnalyticsPageview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre POST /analytics/track (endpoint public, non authentifié, throttlé).
 * L'endpoint /admin/analytics (lecture) est couvert par AdminDashboardTest.php.
 */
class AnalyticsTrackTest extends TestCase
{
    use RefreshDatabase;

    public function test_track_does_not_require_authentication(): void
    {
        $response = $this->postJson('/api/analytics/track', [
            'session_id' => 'session-abc',
            'path'       => '/posts',
        ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertDatabaseHas('analytics_pageviews', ['session_id' => 'session-abc', 'path' => '/posts']);
    }

    public function test_track_validates_required_fields(): void
    {
        $response = $this->postJson('/api/analytics/track', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['session_id', 'path']);
        $this->assertDatabaseCount('analytics_pageviews', 0);
    }

    public function test_track_validates_duration_upper_bound(): void
    {
        $response = $this->postJson('/api/analytics/track', [
            'session_id' => 'session-abc',
            'path'       => '/posts',
            'duration'   => 999999,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['duration']);
    }

    public function test_track_accepts_optional_referrer_and_duration_and_classifies_source(): void
    {
        $response = $this->postJson('/api/analytics/track', [
            'session_id' => 'session-abc',
            'path'       => '/posts',
            'referrer'   => 'https://www.google.com/search?q=lostcards',
            'duration'   => 42,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('analytics_pageviews', [
            'session_id'       => 'session-abc',
            'source'           => 'organic',
            'duration_seconds' => 42,
        ]);
    }

    /** Les crawlers/bots ne doivent pas polluer les statistiques de fréquentation. */
    public function test_track_ignores_requests_from_known_bots(): void
    {
        $response = $this->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1)')
            ->postJson('/api/analytics/track', [
                'session_id' => 'session-bot',
                'path'       => '/posts',
            ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertDatabaseCount('analytics_pageviews', 0);
    }
}
