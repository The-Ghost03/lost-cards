<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsPageview extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'session_id', 'path', 'referrer', 'source',
        'device_type', 'device_os', 'device_browser',
        'duration_seconds', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
