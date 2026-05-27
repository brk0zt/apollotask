<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnalyticsTimeseries extends Model
{
    use HasFactory;

    protected $table = 'analytics_timeseries';

    protected $fillable = [
        'user_id',
        'metric_name',
        'bucket_ts',
        'bucket_size',
        'value',
    ];

    protected $casts = [
        'bucket_ts' => 'datetime',
        'value' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
