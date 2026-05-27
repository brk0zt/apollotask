<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventStream extends Model
{
    use HasFactory;

    protected $table = 'event_stream';

    // Event stream is append-only, timestamps are event_ts, disable default timestamps
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'project_id',
        'task_id',
        'event_type',
        'event_ts',
        'event_value',
        'metadata',
    ];

    protected $casts = [
        'event_ts' => 'datetime',
        'event_value' => 'float',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
