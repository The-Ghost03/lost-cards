<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Régression du fix (non commité au moment de l'écriture de ce test) :
 * GET /api/posts?my=1 sans authentification renvoyait un 500
 * (PostController::index() appelait $request->user()->id sur null).
 * Il doit désormais renvoyer 401 "Non authentifié."
 */
class PostVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_my_posts_without_auth_returns_401_not_500(): void
    {
        $response = $this->getJson('/api/posts?my=1');

        $response->assertStatus(401)->assertJson(['message' => 'Non authentifié.']);
    }

    public function test_my_posts_with_auth_returns_only_own_posts(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $ownPosts    = Post::factory()->count(3)->create(['user_id' => $userA->id]);
        $otherPosts  = Post::factory()->count(2)->create(['user_id' => $userB->id]);

        $response = $this->actingAsUser($userA)->getJson('/api/posts?my=1');

        $response->assertStatus(200);

        $returnedIds = collect($response->json('data'))->pluck('id')->sort()->values();
        $expectedIds = $ownPosts->pluck('uuid')->sort()->values();

        $this->assertEquals($expectedIds->all(), $returnedIds->all());

        foreach ($otherPosts as $post) {
            $this->assertNotContains($post->uuid, $returnedIds->all());
        }
    }

    public function test_my_posts_includes_non_active_posts_of_the_owner(): void
    {
        // Contrairement au flux public (qui ne montre que status=active),
        // "mes annonces" doit montrer toutes les annonces du propriétaire,
        // y compris celles déjà récupérées.
        $user = User::factory()->create();
        $recovered = Post::factory()->recovered()->create(['user_id' => $user->id]);

        $response = $this->actingAsUser($user)->getJson('/api/posts?my=1');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($recovered->uuid, $ids);
    }

    public function test_public_listing_without_my_only_returns_active_posts(): void
    {
        $active    = Post::factory()->create(['status' => 'active']);
        $recovered = Post::factory()->recovered()->create();

        $response = $this->getJson('/api/posts');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($active->uuid, $ids);
        $this->assertNotContains($recovered->uuid, $ids);
    }
}
