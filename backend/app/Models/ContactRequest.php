<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactRequest extends Model
{
    use HasFactory;

    protected $fillable = ['post_id', 'user_id', 'answer', 'selfie_path', 'status'];

    public function post()  { return $this->belongsTo(Post::class); }
    public function user()  { return $this->belongsTo(User::class); }

    public function toArray()
    {
        $array = parent::toArray();

        if (array_key_exists('user_id', $array)) {
            $hasUuid = $this->relationLoaded('user') && $this->user && $this->user->uuid;
            $array['user_id'] = $hasUuid
                ? $this->user->uuid
                : User::where('id', $this->user_id)->value('uuid');
        }

        return $array;
    }
}
