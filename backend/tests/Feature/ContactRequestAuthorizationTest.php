<?php

namespace Tests\Feature;

use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Coeur du correctif IDOR (commit 7e06cfc "security: corrige IDOR
 * approve/reject + throttle endpoints auth") : seul le propriétaire de
 * l'annonce peut approuver/rejeter une demande de contact sur cette annonce.
 */
class ContactRequestAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /* ───────────────────── approve / reject : IDOR ───────────────────── */

    public function test_owner_can_approve_contact_request(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $cr    = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);

        $response = $this->actingAsUser($owner)
            ->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/approve");

        $response->assertStatus(200)->assertJson(['status' => 'approved']);
        $this->assertSame('approved', $cr->fresh()->status);
    }

    public function test_stranger_cannot_approve_contact_request(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);
        $cr       = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);

        $response = $this->actingAsUser($stranger)
            ->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/approve");

        $response->assertStatus(403);
        $this->assertSame('pending', $cr->fresh()->status);
    }

    public function test_requester_cannot_approve_their_own_contact_request(): void
    {
        // Le demandeur lui-même ne doit pas pouvoir s'auto-approuver.
        $owner    = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);
        $cr       = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)
            ->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/approve");

        $response->assertStatus(403);
        $this->assertSame('pending', $cr->fresh()->status);
    }

    public function test_owner_can_reject_contact_request(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $cr    = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);

        $response = $this->actingAsUser($owner)
            ->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/reject");

        $response->assertStatus(200)->assertJson(['status' => 'rejected']);
    }

    public function test_stranger_cannot_reject_contact_request(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);
        $cr       = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);

        $response = $this->actingAsUser($stranger)
            ->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/reject");

        $response->assertStatus(403);
        $this->assertSame('pending', $cr->fresh()->status);
    }

    public function test_approve_returns_404_when_contact_request_does_not_belong_to_post(): void
    {
        // Le owner de postA essaie d'approuver une contact request qui appartient
        // en réalité à postB (mismatch post_id/contactRequest) : doit être 404,
        // pas un vrai enregistrement affecté par erreur d'aiguillage de route.
        $ownerA = User::factory()->create();
        $postA  = Post::factory()->create(['user_id' => $ownerA->id]);
        $postB  = Post::factory()->create();
        $crOfB  = ContactRequest::factory()->create(['post_id' => $postB->id, 'status' => 'pending']);

        $response = $this->actingAsUser($ownerA)
            ->patchJson("/api/posts/{$postA->uuid}/contact/{$crOfB->uuid}/approve");

        $response->assertStatus(404);
        $this->assertSame('pending', $crOfB->fresh()->status);
    }

    public function test_unauthenticated_user_cannot_approve(): void
    {
        $post = Post::factory()->create();
        $cr   = ContactRequest::factory()->create(['post_id' => $post->id]);

        $response = $this->patchJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/approve");

        $response->assertStatus(401);
    }

    /* ───────────────────── révélation de pickup_address ───────────────────── */

    public function test_anonymous_visitor_never_sees_pickup_address(): void
    {
        $post = Post::factory()->create(['pickup_address' => 'Rue 12, Cocody']);

        $response = $this->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('pickup_address', $response->json());
    }

    public function test_requester_does_not_see_pickup_address_before_approval(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id, 'pickup_address' => 'Rue 12, Cocody']);
        $cr    = ContactRequest::factory()->create([
            'post_id' => $post->id,
            'status'  => 'pending',
        ]);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('pickup_address', $response->json());
    }

    public function test_requester_sees_pickup_address_after_approval(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id, 'pickup_address' => 'Rue 12, Cocody']);
        $cr    = ContactRequest::factory()->approved()->create(['post_id' => $post->id]);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $response->assertJson(['pickup_address' => 'Rue 12, Cocody']);
    }

    public function test_owner_always_sees_pickup_address(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id, 'pickup_address' => 'Rue 12, Cocody']);

        $response = $this->actingAsUser($owner)->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $response->assertJson(['pickup_address' => 'Rue 12, Cocody']);
    }

    public function test_rejected_requester_does_not_see_pickup_address(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id, 'pickup_address' => 'Rue 12, Cocody']);
        $cr    = ContactRequest::factory()->rejected()->create(['post_id' => $post->id]);
        $requester = User::find($cr->user_id);

        $response = $this->actingAsUser($requester)->getJson("/api/posts/{$post->uuid}");

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('pickup_address', $response->json());
    }

    /* ───────────────────── listing des demandes (index) ───────────────────── */

    public function test_owner_sees_all_contact_requests_on_their_post(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        ContactRequest::factory()->count(2)->create(['post_id' => $post->id]);

        $response = $this->actingAsUser($owner)->getJson("/api/posts/{$post->uuid}/contact");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_non_owner_only_sees_their_own_contact_request_in_index(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $mine  = ContactRequest::factory()->create(['post_id' => $post->id]);
        ContactRequest::factory()->create(['post_id' => $post->id]); // un autre demandeur

        $requester = User::find($mine->user_id);

        $response = $this->actingAsUser($requester)->getJson("/api/posts/{$post->uuid}/contact");

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('id')->all();
        $this->assertEquals([$mine->uuid], $ids);
    }

    /* ───────────────────── selfie ───────────────────── */

    public function test_stranger_cannot_view_selfie(): void
    {
        $owner    = User::factory()->create();
        $stranger = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);
        $cr       = ContactRequest::factory()->create(['post_id' => $post->id]);

        $response = $this->actingAsUser($stranger)
            ->getJson("/api/posts/{$post->uuid}/contact/{$cr->uuid}/selfie");

        $response->assertStatus(403);
    }

    public function test_owner_can_view_selfie_when_file_exists(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $cr    = ContactRequest::factory()->create(['post_id' => $post->id]);

        Storage::disk('local')->put($cr->selfie_path, 'contenu-image-factice');

        $response = $this->actingAsUser($owner)
            ->get("/api/posts/{$post->uuid}/contact/{$cr->uuid}/selfie");

        $response->assertStatus(200);
    }
}
