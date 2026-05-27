<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'status',
        'priority',
        'estimated_hours',
        'actual_hours',
        'due_date',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'priority' => 'integer',
        'estimated_hours' => 'float',
        'actual_hours' => 'float',
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function eventStreams()
    {
        return $this->hasMany(EventStream::class);
    }
}
