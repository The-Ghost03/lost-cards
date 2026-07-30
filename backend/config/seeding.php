<?php

// Mots de passe de provisioning des comptes seedés.
// Passer par config() (et non env() directement dans le seeder) pour que
// les valeurs restent lisibles quand la config est mise en cache
// (php artisan config:cache est exécuté au boot du conteneur).
return [
    'admin_password' => env('SEED_ADMIN_PASSWORD'),
    'demo_password'  => env('SEED_DEMO_PASSWORD'),
];
