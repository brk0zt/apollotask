<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Explicit CORS middleware that injects Access-Control headers on every
 * API response, including OPTIONS preflight requests. This acts as a
 * reliable fallback regardless of whether Laravel's built-in HandleCors
 * middleware is active in the global middleware stack.
 *
 * Since the frontend uses Bearer token authentication (Authorization header)
 * rather than cookies, Access-Control-Allow-Origin: * is safe and sufficient.
 */
class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS requests immediately
        if ($request->isMethod('OPTIONS')) {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

        return $response;
    }
}
