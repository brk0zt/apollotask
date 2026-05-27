<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

abstract class BaseRateLimiter
{
    /**
     * Capacity of the leaky bucket.
     */
    protected float $capacity;

    /**
     * Fill rate of the leaky bucket (tokens per second).
     */
    protected float $fillRate;

    /**
     * Target database column for token count (if using users table).
     */
    protected ?string $tokenCountCol = null;

    /**
     * Target database column for last request timestamp (if using users table).
     */
    protected ?string $lastRequestCol = null;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $key = $this->resolveRequestKey($request);
        $userId = $this->resolveUserId($request);

        if ($userId && $this->tokenCountCol && $this->lastRequestCol) {
            // Authenticated user rate limiting directly on the users table (O(1) memory)
            $allowed = $this->checkUserBucket($userId);
        } else {
            // Unauthenticated IP / general key rate limiting in the rate_limits table
            $allowed = $this->checkIpBucket($key);
        }

        if (!$allowed) {
            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Rate limit exceeded. Please leak some tokens first.',
                'retry_after' => ceil(1.0 / $this->fillRate)
            ], 429);
        }

        return $next($request);
    }

    /**
     * Resolve the unique key for the request (e.g. client IP or route).
     */
    protected function resolveRequestKey(Request $request): string
    {
        return sha1($request->ip() . '|' . $request->path());
    }

    /**
     * Resolve the user ID if authenticated.
     */
    protected function resolveUserId(Request $request): ?int
    {
        return $request->user()?->id;
    }

    /**
     * Atomically check and update the leaky bucket for a specific user on the users table.
     */
    protected function checkUserBucket(int $userId): bool
    {
        // Discretized differential Leaky Bucket calculation performed atomically in PostgreSQL.
        // It locks the user row for update, calculates the refilled tokens based on time elapsed,
        // decrements 1 token if refilled tokens >= 1.0, and returns a boolean indicating if it was allowed.
        $query = "
            UPDATE users
            SET 
                {$this->tokenCountCol} = CASE 
                    WHEN sub.tokens_refilled >= 1.0 THEN sub.tokens_refilled - 1.0
                    ELSE users.{$this->tokenCountCol}
                END,
                {$this->lastRequestCol} = CASE 
                    WHEN sub.tokens_refilled >= 1.0 THEN NOW()
                    ELSE users.{$this->lastRequestCol}
                END
            FROM (
                SELECT LEAST(?, {$this->tokenCountCol} + ? * EXTRACT(EPOCH FROM (NOW() - {$this->lastRequestCol}))) AS tokens_refilled
                FROM users
                WHERE id = ?
                FOR UPDATE
            ) AS sub
            WHERE id = ?
            RETURNING (sub.tokens_refilled >= 1.0) AS allowed
        ";

        $bindings = [
            $this->capacity,
            $this->fillRate,
            $userId,
            $userId
        ];

        try {
            $result = DB::selectOne($query, $bindings);
            return $result && (bool) $result->allowed;
        } catch (\Exception $e) {
            // Fallback for local environments or testing where migrations haven't run
            return true;
        }
    }

    /**
     * Atomically check and update the leaky bucket for an IP key on the rate_limits table.
     */
    protected function checkIpBucket(string $key): bool
    {
        // Set rate limits with O(1) space. If it's a new client, we insert the initial record.
        // If it's an existing client, we update the token state atomically using a row-level lock.
        try {
            // Ensure record exists (UPSERT)
            $initialTokens = max(0.0, $this->capacity - 1.0);
            DB::statement("
                INSERT INTO rate_limits (key, token_count, last_request_at, created_at, updated_at)
                VALUES (?, ?, NOW(), NOW(), NOW())
                ON CONFLICT (key) DO NOTHING
            ", [$key, $initialTokens]);

            // Atomic Leaky Bucket check and update with FOR UPDATE row locking
            $query = "
                UPDATE rate_limits
                SET 
                    token_count = CASE 
                        WHEN sub.tokens_refilled >= 1.0 THEN sub.tokens_refilled - 1.0
                        ELSE rate_limits.token_count
                    END,
                    last_request_at = CASE 
                        WHEN sub.tokens_refilled >= 1.0 THEN NOW()
                        ELSE rate_limits.last_request_at
                    END,
                    updated_at = NOW()
                FROM (
                    SELECT LEAST(?, token_count + ? * EXTRACT(EPOCH FROM (NOW() - last_request_at))) AS tokens_refilled
                    FROM rate_limits
                    WHERE key = ?
                    FOR UPDATE
                ) AS sub
                WHERE key = ?
                RETURNING (sub.tokens_refilled >= 1.0) AS allowed
            ";

            $bindings = [
                $this->capacity,
                $this->fillRate,
                $key,
                $key
            ];

            $result = DB::selectOne($query, $bindings);
            return $result && (bool) $result->allowed;

        } catch (\Exception $e) {
            // Fallback to avoid blocking API if DB table is missing during migrations/tests
            return true;
        }
    }
}
