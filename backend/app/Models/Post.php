<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'uuid',
        'name_on_cards',
        'name_partial',
        'location',
        'documents',
        'secret_question',
        'secret_answer',
        'pickup_address',
        'status',
    ];

    protected $casts = [
        'documents' => 'array',
    ];

    // 'id' (BIGINT FK interne) caché en JSON — on expose 'uuid' à la place
    protected $hidden = ['secret_answer', 'pickup_address', 'id'];

    protected static function booted(): void
    {
        static::creating(function (Post $post) {
            $post->name_partial = $post->name_on_cards;
            if (empty($post->uuid)) {
                $post->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Route model binding : /posts/{post} matche le uuid au lieu de l'id.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contactRequests()
    {
        return $this->hasMany(ContactRequest::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function photos()
    {
        return $this->hasMany(PostPhoto::class)->orderBy('position');
    }

    /**
     * Sérialisation JSON :
     *  - 'id' → uuid du post
     *  - 'user_id' → uuid du propriétaire
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Expose uuid sous la clé 'id'
        if (isset($array['uuid'])) {
            $array['id'] = $array['uuid'];
        }

        // Traduit user_id (BIGINT FK) en UUID
        if (array_key_exists('user_id', $array)) {
            $loaded = $this->relationLoaded('user') && $this->user && $this->user->uuid;
            $array['user_id'] = $loaded
                ? $this->user->uuid
                : User::where('id', $this->user_id)->value('uuid');
        }

        return $array;
    }

    // Reveal pickup address only to approved requesters or the post owner
    public function canRevealAddress(User $user): bool
    {
        if ($user->id === $this->user_id) {
            return true;
        }

        return $this->contactRequests()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->exists();
    }
}
