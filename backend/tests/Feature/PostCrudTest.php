<?php

namespace Tests\Feature;

use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Couvre POST /posts (store), PATCH /posts/{post}/recover, DELETE /posts/{post}.
 * Le listing (GET /posts) et la consultation (GET /posts/{post}) sont couverts
 * par PostVisibilityTest.php et PostShowAndSearchTest.php.
 *
 * NB GD : store() délègue à ImageOptimizer::optimizeAndStore() dès qu'au moins
 * une photo passe la validation, et cette méthode appelle des fonctions GD
 * (imagecreatefromjpeg, etc.). On utilise UploadedFile::fake()->create() (mime
 * deviné depuis l'extension, pas de décodage réel, pas besoin de GD) pour les
 * tests de validation qui échouent avant d'atteindre ImageOptimizer (ex. trop
 * de photos). Seul test_store_creates_post_with_photos_and_optimizes_them va
 * jusqu'à l'exécution réelle de l'optimisation et restera bloqué sans GD — ce
 * n'est pas un défaut du test mais une limite de l'environnement (voir rapport
 * QA). Les autres tests (sans photos, validations, recover, destroy) n'en
 * dépendent pas.
 */
class PostCrudTest extends TestCase
{
    use RefreshDatabase;

    private function validPayload(): array
    {
        return [
            'name_on_cards'   => 'Jean Kouamé',
            'location'        => 'Cocody',
            'documents'       => ['cni', 'permis'],
            'secret_question' => 'Couleur préférée ?',
            'secret_answer'   => 'bleu',
            'pickup_address'  => 'Rue des Jardins, Cocody',
        ];
    }

    /* ───────────────────────── store ───────────────────────── */

    public function test_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/posts', $this->validPayload());

        $response->assertStatus(401);
        $this->assertDatabaseCount('posts', 0);
    }

    public function test_store_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name_on_cards', 'location', 'documents', 'pickup_address']);
    }

    public function test_store_rejects_unknown_document_type(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts', [
            ...$this->validPayload(),
            'documents' => ['type_invalide'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['documents.0']);
    }

    public function test_store_creates_post_without_photos(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts', $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'name_on_cards', 'location', 'photos'])
            ->assertJson(['name_on_cards' => 'Jean Kouamé', 'status' => 'active']);

        $this->assertDatabaseHas('posts', ['name_on_cards' => 'Jean Kouamé', 'location' => 'Cocody']);

        // 'id' exposé doit être l'uuid, jamais le BIGINT interne.
        $post = Post::where('name_on_cards', 'Jean Kouamé')->first();
        $this->assertSame($post->uuid, $response->json('id'));
        $this->assertEmpty($response->json('photos'));
    }

    public function test_store_creates_post_with_photos_and_optimizes_them(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts', [
            ...$this->validPayload(),
            'photos' => [UploadedFile::fake()->image('wallet.jpg', 2000, 1500)],
        ]);

        $response->assertStatus(201);
        $post = Post::where('name_on_cards', 'Jean Kouamé')->first();
        $this->assertDatabaseHas('post_photos', ['post_id' => $post->id, 'position' => 0]);
        $this->assertCount(1, $response->json('photos'));
    }

    public function test_store_rejects_more_than_five_photos(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts', [
            ...$this->validPayload(),
            'photos' => array_fill(0, 6, UploadedFile::fake()->create('wallet.jpg', 50)),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['photos']);
    }

    public function test_store_clears_latent_flag_of_the_author(): void
    {
        $user = User::factory()->create(['latent_at' => now()->subDays(10)]);

        $this->actingAsUser($user)->postJson('/api/posts', $this->validPayload())
            ->assertStatus(201);

        $this->assertNull($user->fresh()->latent_at);
    }

    /* ───────────────────────── recover ───────────────────────── */

    public function test_recover_requires_authentication(): void
    {
        $post = Post::factory()->create();

        $response = $this->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(401);
    }

    public function test_owner_can_recover_their_post(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id, 'status' => 'active']);

        $response = $this->actingAsUser($owner)->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(200)->assertJson(['status' => 'recovered']);
        $this->assertSame('recovered', $post->fresh()->status);
    }

    public function test_approved_requester_can_recover_the_post(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $cr    = ContactRequest::factory()->approved()->create(['post_id' => $post->id]);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(200);
        $this->assertSame('recovered', $post->fresh()->status);
    }

    public function test_stranger_cannot_recover_the_post(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAsUser($stranger)->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(403);
        $this->assertSame('active', $post->fresh()->status);
    }

    public function test_pending_requester_cannot_recover_the_post(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $cr    = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(403);
    }

    public function test_admin_can_recover_any_post(): void
    {
        $admin = User::factory()->admin()->create();
        $post  = Post::factory()->create();

        $response = $this->actingAsUser($admin)->patchJson("/api/posts/{$post->uuid}/recover");

        $response->assertStatus(200);
        $this->assertSame('recovered', $post->fresh()->status);
    }

    public function test_recover_returns_404_for_unknown_post(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->patchJson('/api/posts/uuid-inexistant/recover');

        $response->assertStatus(404);
    }

    /* ───────────────────────── destroy ───────────────────────── */

    public function test_destroy_requires_authentication(): void
    {
        $post = Post::factory()->create();

        $response = $this->deleteJson("/api/posts/{$post->uuid}");

        $response->assertStatus(401);
        $this->assertDatabaseHas('posts', ['id' => $post->id]);
    }

    public function test_owner_can_delete_their_post(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAsUser($owner)->deleteJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_stranger_cannot_delete_a_post(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAsUser($stranger)->deleteJson("/api/posts/{$post->uuid}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('posts', ['id' => $post->id]);
    }

    public function test_admin_can_delete_any_post(): void
    {
        $admin = User::factory()->admin()->create();
        $post  = Post::factory()->create();

        $response = $this->actingAsUser($admin)->deleteJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_destroy_returns_404_for_unknown_post(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->deleteJson('/api/posts/uuid-inexistant');

        $response->assertStatus(404);
    }
}
