<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;

class ApiRateLimiter extends BaseRateLimiter
{
    /**
     * API bucket capacity (allows burst up to 60 requests to preserve UX).
     */
    protected float $capacity = 60.0;

    /**
     * API bucket fill rate (refills 1 token every second -> 60 tokens/min).
     */
    protected float $fillRate = 1.0;

    /**
     * Target database column for token count on the users table.
     */
    protected ?string $tokenCountCol = 'api_token_count';

    /**
     * Target database column for last request timestamp on the users table.
     */
    protected ?string $lastRequestCol = 'api_last_request_at';

    /**
     * Resolve the request key for unauthenticated users on standard API routes.
     */
    protected function resolveRequestKey(Request $request): string
    {
        return 'api_limit:ip:' . $request->ip();
    }
}
