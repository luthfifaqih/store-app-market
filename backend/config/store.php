<?php

return [
    'promo_ends_at' => env('STORE_PROMO_ENDS_AT'),
    'hours' => env('STORE_HOURS'),
    'info_bar' => env('STORE_INFO_BAR'),
    'seed_admin' => [
        'email' => env('SEED_ADMIN_EMAIL', 'admin@pasarsembako.test'),
        'password' => env('SEED_ADMIN_PASSWORD'),
    ],
    'transfer' => [
        'bank' => env('TRANSFER_BANK'),
        'account' => env('TRANSFER_ACCOUNT'),
        'holder' => env('TRANSFER_HOLDER'),
    ],
];
