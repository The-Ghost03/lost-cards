<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    public function definition(): array
    {
        return [
            'post_id'     => Post::factory(),
            'sender_id'   => User::factory(),
            'receiver_id' => User::factory(),
            'content'     => $this->faker->sentence(),
        ];
    }
}
