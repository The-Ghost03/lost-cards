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
 * Couvre POST /posts/{post}/contact (soumission du selfie de vérification).
 * L'autorisation d'approve/reject/selfie/index est couverte par
 * ContactRequestAuthorizationTest.php ; ce fichier se concentre sur le cycle
 * de vie de la création (store).
 *
 * NB GD : on utilise volontairement UploadedFile::fake()->create() (mime deviné
 * depuis l'extension, pas de décodage réel) plutôt que ->image() (qui nécessite
 * l'extension GD d'après la documentation Laravel) partout où le contenu réel
 * de l'image n'est pas pertinent pour le test — ça suffit à satisfaire la règle
 * de validation 'image'. Seuls les tests qui vont jusqu'à l'exécution effective
 * de ImageOptimizer::optimizeAndStore() (lequel appelle imagecreatefromjpeg()
 * et consorts) restent dépendants de GD : voir le rapport QA pour le détail.
 */
class ContactRequestStoreTest extends TestCase
{
    use RefreshDatabase;

    private function fakeSelfie(): UploadedFile
    {
        return UploadedFile::fake()->create('selfie.jpg', 100);
    }

    public function test_store_requires_authentication(): void
    {
        $post = Post::factory()->create();

        $response = $this->postJson("/api/posts/{$post->uuid}/contact", ['selfie' => $this->fakeSelfie()]);

        $response->assertStatus(401);
    }

    public function test_store_requires_a_selfie_image(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", []);

        $response->assertStatus(422)->assertJsonValidationErrors(['selfie']);
    }

    public function test_owner_cannot_request_contact_on_their_own_post(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAsUser($owner)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('contact_requests', 0);
    }

    public function test_cannot_request_contact_on_an_already_recovered_post(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $post = Post::factory()->recovered()->create();

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('contact_requests', 0);
    }

    public function test_store_returns_404_for_unknown_post(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)->postJson('/api/posts/uuid-inexistant/contact', [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(404);
    }

    public function test_store_creates_a_pending_contact_request_with_selfie(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(201)->assertJson(['status' => 'pending']);
        $this->assertDatabaseHas('contact_requests', [
            'post_id' => $post->id,
            'user_id' => $user->id,
            'status'  => 'pending',
        ]);

        $cr = ContactRequest::where('post_id', $post->id)->where('user_id', $user->id)->first();
        Storage::disk('local')->assertExists($cr->selfie_path);
    }

    public function test_store_returns_existing_request_without_duplicating_when_already_pending(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $post = Post::factory()->create();
        $existing = ContactRequest::factory()->create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'status'  => 'pending',
        ]);

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(200)->assertJson(['id' => $existing->uuid, 'status' => 'pending']);
        $this->assertDatabaseCount('contact_requests', 1);
    }

    public function test_store_returns_existing_request_without_duplicating_when_already_approved(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $post = Post::factory()->create();
        $existing = ContactRequest::factory()->approved()->create([
            'post_id' => $post->id,
            'user_id' => $user->id,
        ]);

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(200)->assertJson(['id' => $existing->uuid, 'status' => 'approved']);
        $this->assertDatabaseCount('contact_requests', 1);
    }

    public function test_rejected_request_can_be_retried_and_replaces_the_old_selfie(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $post = Post::factory()->create();
        $rejected = ContactRequest::factory()->rejected()->create([
            'post_id'     => $post->id,
            'user_id'     => $user->id,
            'selfie_path' => 'selfies/old-selfie.jpg',
        ]);
        Storage::disk('local')->put($rejected->selfie_path, 'ancien-selfie');

        $response = $this->actingAsUser($user)->postJson("/api/posts/{$post->uuid}/contact", [
            'selfie' => $this->fakeSelfie(),
        ]);

        $response->assertStatus(201)->assertJson(['status' => 'pending']);

        // L'ancienne demande rejetée est remplacée, pas conservée en doublon.
        $this->assertDatabaseMissing('contact_requests', ['id' => $rejected->id]);
        $this->assertDatabaseCount('contact_requests', 1);
        Storage::disk('local')->assertMissing($rejected->selfie_path);
    }
}
