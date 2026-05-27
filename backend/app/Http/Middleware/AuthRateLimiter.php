<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use App\Models\User;

class AuthRateLimiter extends BaseRateLimiter
{
    /**
     * Auth bucket capacity (mitigates brute-force/spraying with 5 attempts max burst).
     */
    protected float $capacity = 5.0;

    /**
     * Auth bucket fill rate (refills 1 token every 10 seconds).
     */
    protected float $fillRate = 0.1;

    /**
     * Target database column for token count on the users table.
     */
    protected ?string $tokenCountCol = 'auth_token_count';

    /**
     * Target database column for last request timestamp on the users table.
     */
    protected ?string $lastRequestCol = 'auth_last_request_at';

    /**
     * Resolve the user ID by checking the target account email to enable account-lockout protection.
     */
    protected function resolveUserId(Request $request): ?int
    {
        if ($request->has('email')) {
            $email = $request->input('email');
            if (is_string($email)) {
                return User::where('email', $email)->value('id');
            }
        }
        return parent::resolveUserId($request);
    }

    /**
     * Resolve the unauthenticated request key using the client's IP to prevent IP-based spam.
     */
    protected function resolveRequestKey(Request $request): string
    {
        return 'auth_limit:ip:' . $request->ip();
    }
}
