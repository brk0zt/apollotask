<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'status',
        'estimated_completion',
        'risk_score',
        'metadata',
    ];

    protected $casts = [
        'estimated_completion' => 'date',
        'risk_score' => 'float',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function eventStreams()
    {
        return $this->hasMany(EventStream::class);
    }
}
