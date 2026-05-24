<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin account
        User::updateOrCreate(
            ['email' => 'admin@lostcards.ci'],
            [
                'name'     => 'Admin LostCards',
                'phone'    => '+225 00 00 00 00 00',
                'password' => Hash::make('Admin@1234'),
                'role'     => 'admin',
            ]
        );

        // Demo user
        User::updateOrCreate(
            ['email' => 'demo@lostcards.ci'],
            [
                'name'     => 'Jean Kouamé',
                'phone'    => '+225 07 12 34 56 78',
                'password' => Hash::make('Demo@1234'),
                'role'     => 'user',
            ]
        );
    }
}
