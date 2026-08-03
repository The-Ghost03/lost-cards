<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\PostPhoto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Couvre GET /posts (recherche/pagination), GET /posts/{post} (détail)
 * et GET /posts/{post}/photos/{photo} (fichier).
 * La visibilité par statut/propriétaire est couverte par PostVisibilityTest.php
 * et ContactRequestAuthorizationTest.php (révélation de pickup_address).
 */
class PostShowAndSearchTest extends TestCase
{
    use RefreshDatabase;

    /* ───────────────────────── index : recherche & pagination ───────────────────────── */

    public function test_index_filters_by_partial_name(): void
    {
        Post::factory()->create(['name_on_cards' => 'Jean Kouamé']);
        Post::factory()->create(['name_on_cards' => 'Awa Traoré']);

        $response = $this->getJson('/api/posts?name=Kouamé');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name_on_cards')->all();
        $this->assertEquals(['Jean Kouamé'], $names);
    }

    public function test_index_respects_limit_param(): void
    {
        Post::factory()->count(5)->create(['status' => 'active']);

        $response = $this->getJson('/api/posts?limit=2');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('per_page'));
    }

    public function test_index_default_page_size_is_twelve(): void
    {
        Post::factory()->count(15)->create(['status' => 'active']);

        $response = $this->getJson('/api/posts');

        $response->assertStatus(200);
        $this->assertSame(12, $response->json('per_page'));
        $this->assertCount(12, $response->json('data'));
    }

    /* ───────────────────────── show ───────────────────────── */

    public function test_show_returns_post_detail(): void
    {
        $post = Post::factory()->create(['name_on_cards' => 'Jean Kouamé']);

        $response = $this->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200)
            ->assertJson(['id' => $post->uuid, 'name_on_cards' => 'Jean Kouamé']);
    }

    /** secret_question fait partie du flux de vérification alternatif au selfie : toujours exposé. */
    public function test_show_always_exposes_the_secret_question(): void
    {
        $post = Post::factory()->create(['secret_question' => 'Votre ville de naissance ?']);

        $response = $this->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200)->assertJson(['secret_question' => 'Votre ville de naissance ?']);
        $this->assertArrayNotHasKey('secret_answer', $response->json());
    }

    public function test_show_returns_404_for_unknown_uuid(): void
    {
        $response = $this->getJson('/api/posts/uuid-inexistant');

        $response->assertStatus(404);
    }

    /* ───────────────────────── photo ───────────────────────── */

    public function test_photo_is_served_publicly_without_authentication(): void
    {
        Storage::fake('local');
        $post  = Post::factory()->create();
        $photo = PostPhoto::create(['post_id' => $post->id, 'path' => 'post_photos/test.jpg', 'position' => 0]);
        Storage::disk('local')->put($photo->path, 'contenu-image-factice');

        $response = $this->get("/api/posts/{$post->uuid}/photos/{$photo->uuid}");

        $response->assertStatus(200);
    }

    public function test_photo_returns_404_when_photo_does_not_belong_to_the_post(): void
    {
        Storage::fake('local');
        $postA = Post::factory()->create();
        $postB = Post::factory()->create();
        $photoOfB = PostPhoto::create(['post_id' => $postB->id, 'path' => 'post_photos/test.jpg', 'position' => 0]);
        Storage::disk('local')->put($photoOfB->path, 'contenu-image-factice');

        $response = $this->get("/api/posts/{$postA->uuid}/photos/{$photoOfB->uuid}");

        $response->assertStatus(404);
    }

    public function test_photo_returns_404_when_file_missing_on_disk(): void
    {
        Storage::fake('local');
        $post  = Post::factory()->create();
        $photo = PostPhoto::create(['post_id' => $post->id, 'path' => 'post_photos/absent.jpg', 'position' => 0]);
        // Pas de Storage::put() : le fichier référencé en base n'existe pas sur le disque.

        $response = $this->get("/api/posts/{$post->uuid}/photos/{$photo->uuid}");

        $response->assertStatus(404);
    }
}
