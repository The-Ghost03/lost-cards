<?php

namespace Database\Factories;

use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactRequest>
 */
class ContactRequestFactory extends Factory
{
    protected $model = ContactRequest::class;

    public function definition(): array
    {
        return [
            'post_id'      => Post::factory(),
            'user_id'      => User::factory(),
            // Nullable en pratique (migration 2024_01_01_000005) — ContactRequestController::store()
            // ne renseigne jamais ce champ, seul 'selfie_path' est utilisé.
            'answer'       => null,
            'selfie_path'  => 'selfies/'.\Illuminate\Support\Str::uuid().'.jpg',
            'status'       => 'pending',
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => 'approved']);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => 'rejected']);
    }
}
