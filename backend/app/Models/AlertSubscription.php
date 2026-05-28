<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AlertSubscription extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'uuid', 'name'];
    protected $hidden   = ['id'];

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->uuid)) $m->uuid = (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string { return 'uuid'; }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function toArray()
    {
        $array = parent::toArray();
        if (isset($array['uuid'])) {
            $array['id'] = $array['uuid'];
        }
        if (array_key_exists('user_id', $array)) {
            $hasUuid = $this->relationLoaded('user') && $this->user && $this->user->uuid;
            $array['user_id'] = $hasUuid
                ? $this->user->uuid
                : User::where('id', $this->user_id)->value('uuid');
        }
        return $array;
    }
}
