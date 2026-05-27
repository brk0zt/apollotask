<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user, issue a Sanctum token, and log the event.
     */
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']), // Argon2id auto-used
            'auth_token_count' => 5.0, // default capacity
            'api_token_count' => 60.0, // default capacity
        ]);

        // Issue token
        $token = $user->createToken('apollo_auth_token')->plainTextToken;

        // L1 Event Stream Append: Register / Initial Login event
        DB::table('event_stream')->insert([
            'user_id' => $user->id,
            'event_type' => 'login',
            'event_ts' => now(),
            'event_value' => 1.0,
            'metadata' => json_encode(['method' => 'registration']),
        ]);

        return response()->json([
            'message' => 'User registered successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ], 201); // 201 Created
    }

    /**
     * Authenticate user, issue a Sanctum token, and log the event.
     */
    public function login(LoginRequest $request)
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Issue token
        $token = $user->createToken('apollo_auth_token')->plainTextToken;

        // L1 Event Stream Append: Login event
        DB::table('event_stream')->insert([
            'user_id' => $user->id,
            'event_type' => 'login',
            'event_ts' => now(),
            'event_value' => 1.0,
            'metadata' => json_encode(['ip' => $request->ip()]),
        ]);

        return response()->json([
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ], 200);
    }

    /**
     * Log out the user, revoke Sanctum token, and log the event.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        // L1 Event Stream Append: Logout event
        DB::table('event_stream')->insert([
            'user_id' => $user->id,
            'event_type' => 'logout',
            'event_ts' => now(),
            'event_value' => 1.0,
            'metadata' => json_encode(['token_id' => $user->currentAccessToken()->id]),
        ]);

        // Revoke token
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.'
        ], 200);
    }

    /**
     * Retrieve authenticated user information.
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()
        ], 200);
    }
}
