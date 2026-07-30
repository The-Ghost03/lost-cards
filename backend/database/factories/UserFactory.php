<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * Mot de passe en clair utilisé par défaut par la factory — pratique
     * pour les tests de login (User::factory()->create() puis login avec
     * ce mot de passe connu).
     */
    public const DEFAULT_PASSWORD = 'Password123';

    public function definition(): array
    {
        return [
            'name'           => $this->faker->name(),
            'email'          => $this->faker->unique()->safeEmail(),
            'phone'          => '07'.$this->faker->numerify('########'),
            'password'       => Hash::make(self::DEFAULT_PASSWORD),
            'status'         => $this->faker->randomElement(['chercheur', 'retrouveur']),
            'device_type'    => 'desktop',
            'device_os'      => 'Windows',
            'device_browser' => 'Chrome',
            'last_login_at'  => now(),
            'last_ip'        => '127.0.0.1',
        ];
    }

    public function chercheur(): static
    {
        return $this->state(fn () => ['status' => 'chercheur']);
    }

    public function retrouveur(): static
    {
        return $this->state(fn () => ['status' => 'retrouveur']);
    }

    /**
     * 'role' est volontairement exclu de $fillable (voir User::class) —
     * on le force après création, comme le fait AuthController::register().
     */
    public function admin(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->forceFill(['role' => 'admin'])->save();
        });
    }
}
