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
     * Traduit sender_id/receiver_id (BIGINT FK) en UUID dans le JSON
     * pour rester cohérent avec User.id (qui est désormais un UUID en API).
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Lookup en cache local pour éviter les requêtes en boucle
        static $uuidCache = [];
        $resolve = function ($intId) use (&$uuidCache) {
            if ($intId === null) return null;
            if (!isset($uuidCache[$intId])) {
                $uuidCache[$intId] = User::where('id', $intId)->value('uuid');
            }
            return $uuidCache[$intId];
        };

        if (array_key_exists('sender_id', $array)) {
            $array['sender_id'] = $this->relationLoaded('sender') && $this->sender
                ? $this->sender->uuid
                : $resolve($this->sender_id);
        }
        if (array_key_exists('receiver_id', $array)) {
            $array['receiver_id'] = $this->relationLoaded('receiver') && $this->receiver
                ? $this->receiver->uuid
                : $resolve($this->receiver_id);
        }

        return $array;
    }
}
