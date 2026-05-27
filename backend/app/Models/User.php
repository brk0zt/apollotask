<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'auth_token_count',
        'auth_last_request_at',
        'api_token_count',
        'api_last_request_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed', // automatically uses Argon2id as configured in hashing.php
        'auth_token_count' => 'float',
        'auth_last_request_at' => 'datetime',
        'api_token_count' => 'float',
        'api_last_request_at' => 'datetime',
    ];

    /**
     * Relation with projects.
     */
    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Relation with event streams.
     */
    public function eventStreams()
    {
        return $this->hasMany(EventStream::class);
    }

    /**
     * Relation with analytics time-series.
     */
    public function analyticsTimeseries()
    {
        return $this->hasMany(AnalyticsTimeseries::class);
    }
}
