<?php

return [
    'default'  => env('MAIL_MAILER', 'smtp'),
    'mailers'  => [
        'smtp' => [
            'transport'  => 'smtp',
            'host'       => env('MAIL_HOST', 'softskills.ci'),
            'port'       => env('MAIL_PORT', 465),
            'encryption' => env('MAIL_ENCRYPTION', 'ssl'),
            'username'   => env('MAIL_USERNAME'),
            'password'   => env('MAIL_PASSWORD'),
            'timeout'    => null,
        ],
        'log' => ['transport' => 'log', 'channel' => env('MAIL_LOG_CHANNEL')],
    ],
    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'workwith@softskills.ci'),
        'name'    => env('MAIL_FROM_NAME', 'LostCards Abidjan'),
    ],
];
