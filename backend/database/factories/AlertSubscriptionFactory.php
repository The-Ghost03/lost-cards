<?php

namespace Database\Factories;

use App\Models\AlertSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AlertSubscription>
 */
class AlertSubscriptionFactory extends Factory
{
    protected $model = AlertSubscription::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name'    => $this->faker->lastName(),
        ];
    }
}
