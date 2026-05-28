<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations are allowed
    | to execute in web browsers. You are free to adjust these settings.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://apollotask-a1gk6t6wh-1brkozt-gmailcoms-projects.vercel.app',
        'http://localhost:5173' // Lokal testlerin için
    ],

    'allowed_origins_patterns' => [
        '#^https://.*\.vercel\.app$#'
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true, // Frontend'den header ve token gelişini doğrulamak için true olmalı

];
