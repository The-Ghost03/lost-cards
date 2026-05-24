<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
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

    protected $hidden = ['secret_answer', 'pickup_address'];

    protected static function booted(): void
    {
        static::creating(function (Post $post) {
            $post->name_partial = $post->name_on_cards;
        });
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
