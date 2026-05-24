<?php

return [
    'name'            => env('APP_NAME', 'LostCards'),
    'env'             => env('APP_ENV', 'production'),
    'debug'           => (bool) env('APP_DEBUG', false),
    'url'             => env('APP_URL', 'http://localhost'),
    'frontend_url'    => env('FRONTEND_URL', 'http://localhost:3000'),
    'timezone'        => 'Africa/Abidjan',
    'locale'          => 'fr',
    'fallback_locale' => 'fr',
    'faker_locale'    => 'fr_FR',
    'cipher'          => 'AES-256-CBC',
    'key'             => env('APP_KEY'),
    'previous_keys'   => [],
    'providers'       => Illuminate\Support\ServiceProvider::defaultProviders()->merge([
        App\Providers\AppServiceProvider::class,
    ])->toArray(),
];
