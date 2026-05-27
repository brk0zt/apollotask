<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // HandleCors MUST be in the global middleware stack so it can
        // intercept OPTIONS preflight requests before route matching.
        // Without this, browsers block all cross-origin requests.
        $middleware->prepend(HandleCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
