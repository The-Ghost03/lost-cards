<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ContactRequest extends Model
{
    use HasFactory;

    protected $fillable = ['post_id', 'user_id', 'uuid', 'answer', 'selfie_path', 'status'];
    protected $hidden   = ['id'];

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->uuid)) $m->uuid = (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string { return 'uuid'; }

    public function post()  { return $this->belongsTo(Post::class); }
    public function user()  { return $this->belongsTo(User::class); }

    public function toArray()
    {
        $array = parent::toArray();

        // Expose uuid sous la clé 'id' si présent (à venir avec migration)
        if (isset($array['uuid'])) {
            $array['id'] = $array['uuid'];
        }

        if (array_key_exists('user_id', $array)) {
            $hasUuid = $this->relationLoaded('user') && $this->user && $this->user->uuid;
            $array['user_id'] = $hasUuid
                ? $this->user->uuid
                : User::where('id', $this->user_id)->value('uuid');
        }

        if (array_key_exists('post_id', $array)) {
            $hasUuid = $this->relationLoaded('post') && $this->post && $this->post->uuid;
            $array['post_id'] = $hasUuid
                ? $this->post->uuid
                : Post::where('id', $this->post_id)->value('uuid');
        }

        return $array;
    }
}
