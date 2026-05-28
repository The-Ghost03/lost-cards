<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = ['post_id', 'sender_id', 'receiver_id', 'content', 'read_at'];

    protected $casts = ['read_at' => 'datetime'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    /**
     * Traduit sender_id, receiver_id (users) et post_id en UUIDs dans le JSON.
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Caches locaux pour éviter les requêtes en boucle
        static $userCache = [];
        static $postCache = [];
        $resolveUser = function ($intId) use (&$userCache) {
            if ($intId === null) return null;
            if (!isset($userCache[$intId])) {
                $userCache[$intId] = User::where('id', $intId)->value('uuid');
            }
            return $userCache[$intId];
        };
        $resolvePost = function ($intId) use (&$postCache) {
            if ($intId === null) return null;
            if (!isset($postCache[$intId])) {
                $postCache[$intId] = Post::where('id', $intId)->value('uuid');
            }
            return $postCache[$intId];
        };

        if (array_key_exists('sender_id', $array)) {
            $hasUuid = $this->relationLoaded('sender') && $this->sender && $this->sender->uuid;
            $array['sender_id'] = $hasUuid ? $this->sender->uuid : $resolveUser($this->sender_id);
        }
        if (array_key_exists('receiver_id', $array)) {
            $hasUuid = $this->relationLoaded('receiver') && $this->receiver && $this->receiver->uuid;
            $array['receiver_id'] = $hasUuid ? $this->receiver->uuid : $resolveUser($this->receiver_id);
        }
        if (array_key_exists('post_id', $array)) {
            $hasUuid = $this->relationLoaded('post') && $this->post && $this->post->uuid;
            $array['post_id'] = $hasUuid ? $this->post->uuid : $resolvePost($this->post_id);
        }

        return $array;
    }
}
