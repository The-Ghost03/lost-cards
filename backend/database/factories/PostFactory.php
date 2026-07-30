<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        return [
            'user_id'         => User::factory(),
            // 'name_partial' est recalculé depuis 'name_on_cards' par Post::booted() —
            // pas besoin de le fournir ici.
            'name_on_cards'   => $this->faker->name(),
            'location'        => $this->faker->randomElement(['Cocody', 'Yopougon', 'Marcory', 'Abobo', 'Treichville']),
            'documents'       => ['cni'],
            'secret_question' => 'Quelle est votre couleur préférée ?',
            'secret_answer'   => 'bleu',
            'pickup_address'  => $this->faker->address(),
            'status'          => 'active',
        ];
    }

    public function recovered(): static
    {
        return $this->state(fn () => ['status' => 'recovered']);
    }
}
