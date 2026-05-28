<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'active',
        'service' => 'Apollo Energy Asset Management API',
        'environment' => config('app.env'),
        'timestamp' => now()->toIso8601String()
    ]);
});
