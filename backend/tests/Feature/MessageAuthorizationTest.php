<?php

namespace Tests\Feature;

use App\Models\ContactRequest;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function makeConversation(): array
    {
        $owner    = User::factory()->create();
        $post     = Post::factory()->create(['user_id' => $owner->id]);
        $approved = ContactRequest::factory()->approved()->create(['post_id' => $post->id]);
        $requester = User::find($approved->user_id);

        Message::factory()->create([
            'post_id'     => $post->id,
            'sender_id'   => $requester->id,
            'receiver_id' => $owner->id,
            'content'     => 'Bonjour, où récupérer le portefeuille ?',
        ]);

        return compact('owner', 'post', 'requester');
    }

    public function test_unauthenticated_user_cannot_access_conversations(): void
    {
        ['post' => $post] = $this->makeConversation();

        $response = $this->getJson("/api/conversations/{$post->uuid}/messages");

        $response->assertStatus(401);
    }

    public function test_stranger_cannot_read_conversation_messages(): void
    {
        ['post' => $post] = $this->makeConversation();
        $stranger = User::factory()->create();

        $response = $this->actingAsUser($stranger)
            ->getJson("/api/conversations/{$post->uuid}/messages");

        $response->assertStatus(403);
    }

    public function test_stranger_cannot_post_message(): void
    {
        ['post' => $post] = $this->makeConversation();
        $stranger = User::factory()->create();

        $response = $this->actingAsUser($stranger)
            ->postJson("/api/conversations/{$post->uuid}/messages", ['content' => 'Salut, laisse-moi voir ça.']);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('messages', ['content' => 'Salut, laisse-moi voir ça.']);
    }

    public function test_pending_requester_cannot_read_or_post_messages(): void
    {
        // Une demande encore en attente (non approuvée) ne donne pas accès au chat.
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);
        $pending = ContactRequest::factory()->create(['post_id' => $post->id, 'status' => 'pending']);
        $pendingRequester = User::find($pending->user_id);

        $this->actingAsUser($pendingRequester)
            ->getJson("/api/conversations/{$post->uuid}/messages")
            ->assertStatus(403);

        $this->actingAsUser($pendingRequester)
            ->postJson("/api/conversations/{$post->uuid}/messages", ['content' => 'Coucou'])
            ->assertStatus(403);
    }

    public function test_owner_can_read_conversation_messages(): void
    {
        ['owner' => $owner, 'post' => $post] = $this->makeConversation();

        $response = $this->actingAsUser($owner)->getJson("/api/conversations/{$post->uuid}/messages");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    public function test_approved_requester_can_read_conversation_messages(): void
    {
        ['requester' => $requester, 'post' => $post] = $this->makeConversation();

        $response = $this->actingAsUser($requester)->getJson("/api/conversations/{$post->uuid}/messages");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    public function test_approved_requester_can_post_message(): void
    {
        ['requester' => $requester, 'post' => $post, 'owner' => $owner] = $this->makeConversation();

        $response = $this->actingAsUser($requester)
            ->postJson("/api/conversations/{$post->uuid}/messages", ['content' => 'Je peux venir demain matin.']);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'post_id'     => $post->id,
            'sender_id'   => $requester->id,
            'receiver_id' => $owner->id,
            'content'     => 'Je peux venir demain matin.',
        ]);
    }

    public function test_owner_can_post_message_once_a_request_is_approved(): void
    {
        ['owner' => $owner, 'post' => $post, 'requester' => $requester] = $this->makeConversation();

        $response = $this->actingAsUser($owner)
            ->postJson("/api/conversations/{$post->uuid}/messages", ['content' => 'Venez demain 10h.']);

        $response->assertStatus(201);
        $this->assertDatabaseHas('messages', [
            'sender_id'   => $owner->id,
            'receiver_id' => $requester->id,
            'content'     => 'Venez demain 10h.',
        ]);
    }

    public function test_owner_cannot_post_message_without_an_approved_request(): void
    {
        $owner = User::factory()->create();
        $post  = Post::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAsUser($owner)
            ->postJson("/api/conversations/{$post->uuid}/messages", ['content' => 'Bonjour ?']);

        $response->assertStatus(422);
    }
}
