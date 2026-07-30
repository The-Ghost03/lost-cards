<?php

return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        // Utilisée uniquement par la suite de tests (backend/phpunit.xml,
        // DB_CONNECTION=sqlite + DB_DATABASE=:memory:). Absente jusqu'ici :
        // sans cette entrée, Laravel lève "Database connection [sqlite]
        // not configured." dès qu'on tente de lancer les tests (story P1-S7).
        'sqlite' => [
            'driver'                  => 'sqlite',
            'database'                => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix'                  => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
        ],
        'mysql' => [
            'driver'    => 'mysql',
            'host'      => env('DB_HOST', '127.0.0.1'),
            'port'      => env('DB_PORT', '3306'),
            'database'  => env('DB_DATABASE', 'lostcards'),
            'username'  => env('DB_USERNAME', 'root'),
            'password'  => env('DB_PASSWORD', ''),
            'charset'   => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix'    => '',
            'strict'    => true,
            'engine'    => null,
        ],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
    'redis'      => ['client' => 'phpredis', 'default' => ['host' => '127.0.0.1', 'port' => 6379, 'database' => 0]],
];
