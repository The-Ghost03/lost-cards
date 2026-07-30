<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAdmin();
        $this->seedDemoUser();
    }

    /**
     * Provisionne le compte admin uniquement si SEED_ADMIN_PASSWORD est défini.
     * Aucun mot de passe par défaut. Ne modifie jamais un compte existant.
     */
    private function seedAdmin(): void
    {
        $password = config('seeding.admin_password');

        if (empty($password)) {
            $this->command?->warn(
                'SEED_ADMIN_PASSWORD non défini : compte admin non créé/modifié. '
                . 'Définissez cette variable d\'environnement pour provisionner l\'admin.'
            );

            return;
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@lostcards.ci'],
            [
                'name'     => 'Admin LostCards',
                'phone'    => '+225 00 00 00 00 00',
                'password' => Hash::make($password),
                'role'     => 'admin',
            ]
        );

        if ($admin->wasRecentlyCreated) {
            $this->command?->info('Compte admin créé (admin@lostcards.ci).');
        } else {
            $this->command?->info('Compte admin déjà existant : aucun changement (mot de passe conservé).');
        }
    }

    /**
     * Compte de démonstration : jamais en production, et uniquement si
     * SEED_DEMO_PASSWORD est défini. Ne modifie jamais un compte existant.
     */
    private function seedDemoUser(): void
    {
        if (App::environment('production')) {
            return;
        }

        $password = config('seeding.demo_password');

        if (empty($password)) {
            $this->command?->warn('SEED_DEMO_PASSWORD non défini : compte démo non créé.');

            return;
        }

        User::firstOrCreate(
            ['email' => 'demo@lostcards.ci'],
            [
                'name'     => 'Jean Kouamé',
                'phone'    => '+225 07 12 34 56 78',
                'password' => Hash::make($password),
                'role'     => 'user',
            ]
        );
    }
}
