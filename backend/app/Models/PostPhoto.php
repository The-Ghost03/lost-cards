<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PostPhoto extends Model
{
    public $timestamps = false;
    protected $fillable = ['post_id', 'uuid', 'path', 'position', 'created_at'];
    protected $hidden   = ['id', 'post_id', 'path'];
    protected $appends  = ['url'];
    protected $casts    = ['created_at' => 'datetime'];

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->uuid)) $m->uuid = (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string { return 'uuid'; }

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    /** URL publique servie par PostController::photo() — utilise les UUIDs */
    public function getUrlAttribute(): string
    {
        $postUuid = $this->relationLoaded('post') && $this->post
            ? $this->post->uuid
            : Post::where('id', $this->post_id)->value('uuid');
        return url("/api/posts/{$postUuid}/photos/{$this->uuid}");
    }

    public function toArray()
    {
        $array = parent::toArray();
        if (isset($array['uuid'])) {
            $array['id'] = $array['uuid'];
        }
        return $array;
    }
}
