<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /* ───────────────────────── register ───────────────────────── */

    public function test_register_fails_when_required_fields_are_missing(): void
    {
        $response = $this->postJson('/api/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'phone', 'password', 'status']);
    }

    public function test_register_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existe@lostcards.ci']);

        $response = $this->postJson('/api/register', [
            'name'                  => 'Jean Kouamé',
            'email'                 => 'existe@lostcards.ci',
            'phone'                 => '0700000000',
            'password'              => 'Password123',
            'password_confirmation' => 'Password123',
            'status'                => 'chercheur',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_register_fails_when_password_does_not_meet_complexity_rules(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Jean Kouamé',
            'email'                 => 'jean@lostcards.ci',
            'phone'                 => '0700000000',
            'password'              => 'password', // pas de majuscule ni de chiffre
            'password_confirmation' => 'password',
            'status'                => 'chercheur',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_register_succeeds_and_returns_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Jean Kouamé',
            'email'                 => 'jean@lostcards.ci',
            'phone'                 => '0700000000',
            'password'              => 'Password123',
            'password_confirmation' => 'Password123',
            'status'                => 'chercheur',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);

        $this->assertDatabaseHas('users', ['email' => 'jean@lostcards.ci']);

        // 'id' exposé au frontend doit être l'UUID, jamais le BIGINT interne.
        $user = User::where('email', 'jean@lostcards.ci')->first();
        $this->assertSame($user->uuid, $response->json('user.id'));
        $this->assertArrayNotHasKey('password', $response->json('user'));
    }

    /* ───────────────────────── login ───────────────────────── */

    public function test_login_succeeds_with_correct_credentials(): void
    {
        User::factory()->create([
            'email'    => 'jean@lostcards.ci',
            'password' => \Illuminate\Support\Facades\Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'jean@lostcards.ci',
            'password' => 'Password123',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['user', 'token']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email'    => 'jean@lostcards.ci',
            'password' => \Illuminate\Support\Facades\Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'jean@lostcards.ci',
            'password' => 'MauvaisMotDePasse1',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'inconnu@lostcards.ci',
            'password' => 'Password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    /* ───────────────────────── /me ───────────────────────── */

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401)->assertJson(['message' => 'Non authentifié.']);
    }

    public function test_me_returns_current_user_when_authenticated_via_real_token(): void
    {
        // Flux réaliste bout-en-bout : login -> token -> header Authorization -> /me
        $user = User::factory()->create([
            'email'    => 'jean@lostcards.ci',
            'password' => \Illuminate\Support\Facades\Hash::make('Password123'),
        ]);

        $login = $this->postJson('/api/login', [
            'email'    => 'jean@lostcards.ci',
            'password' => 'Password123',
        ])->assertStatus(200);

        $token = $login->json('token');
        $this->assertNotEmpty($token);

        $me = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/me');

        $me->assertStatus(200)->assertJson(['id' => $user->fresh()->uuid, 'email' => 'jean@lostcards.ci']);
    }

    public function test_me_rejects_invalid_token(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer token-invalide-inexistant')
            ->getJson('/api/me');

        $response->assertStatus(401);
    }

    /* ──────────────────── reset password (expiration) ──────────────────── */

    /**
     * Crée un utilisateur + une ligne password_reset_tokens dont l'âge est
     * contrôlé, et renvoie [user, tokenEnClair].
     *
     * @param  \Carbon\CarbonInterface|string|null  $createdAt
     */
    private function seedResetToken($createdAt): array
    {
        $user = User::factory()->create([
            'email'    => 'jean@lostcards.ci',
            'password' => \Illuminate\Support\Facades\Hash::make('AncienPass123'),
        ]);

        $token = \Illuminate\Support\Str::random(64);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->insert([
            'email'      => $user->email,
            'token'      => \Illuminate\Support\Facades\Hash::make($token),
            'created_at' => $createdAt,
        ]);

        return [$user, $token];
    }

    public function test_reset_password_succeeds_with_a_fresh_token(): void
    {
        [$user, $token] = $this->seedResetToken(now()->subMinutes(5));

        $response = $this->postJson('/api/reset-password', [
            'email'                 => $user->email,
            'token'                 => $token,
            'password'              => 'NouveauPass123',
            'password_confirmation' => 'NouveauPass123',
        ]);

        $response->assertStatus(200);

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('NouveauPass123', $user->fresh()->password),
            'Le mot de passe aurait dû être remplacé par le nouveau.'
        );

        // Le token à usage unique est consommé.
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    /**
     * Régression : `now()->diffInMinutes($createdAt)` est SIGNÉ en Carbon 3 et
     * renvoie une valeur négative pour une date passée — la condition « > 60 »
     * n'était donc jamais vraie et les liens de réinitialisation n'expiraient
     * jamais (un lien intercepté restait valable indéfiniment).
     */
    public function test_reset_password_fails_when_token_is_older_than_the_ttl(): void
    {
        [$user, $token] = $this->seedResetToken(now()->subMinutes(61));

        $response = $this->postJson('/api/reset-password', [
            'email'                 => $user->email,
            'token'                 => $token,
            'password'              => 'NouveauPass123',
            'password_confirmation' => 'NouveauPass123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['token']);

        // Le mot de passe ne doit PAS avoir changé.
        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('AncienPass123', $user->fresh()->password),
            'Un token expiré ne doit pas permettre de changer le mot de passe.'
        );

        // Le token expiré est purgé.
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_reset_password_fails_for_a_very_old_token(): void
    {
        [$user, $token] = $this->seedResetToken(now()->subDays(30));

        $this->postJson('/api/reset-password', [
            'email'                 => $user->email,
            'token'                 => $token,
            'password'              => 'NouveauPass123',
            'password_confirmation' => 'NouveauPass123',
        ])->assertStatus(422)->assertJsonValidationErrors(['token']);

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('AncienPass123', $user->fresh()->password)
        );
    }

    /** created_at nullable en base : l'absence de date doit échouer en sécurité. */
    public function test_reset_password_fails_when_created_at_is_null(): void
    {
        [$user, $token] = $this->seedResetToken(null);

        $this->postJson('/api/reset-password', [
            'email'                 => $user->email,
            'token'                 => $token,
            'password'              => 'NouveauPass123',
            'password_confirmation' => 'NouveauPass123',
        ])->assertStatus(422)->assertJsonValidationErrors(['token']);

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('AncienPass123', $user->fresh()->password)
        );
    }

    public function test_reset_password_fails_with_a_wrong_token(): void
    {
        [$user] = $this->seedResetToken(now());

        $this->postJson('/api/reset-password', [
            'email'                 => $user->email,
            'token'                 => \Illuminate\Support\Str::random(64),
            'password'              => 'NouveauPass123',
            'password_confirmation' => 'NouveauPass123',
        ])->assertStatus(422)->assertJsonValidationErrors(['token']);

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('AncienPass123', $user->fresh()->password)
        );
    }
}
