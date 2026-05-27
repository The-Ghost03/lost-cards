<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostPhoto extends Model
{
    public $timestamps = false;
    protected $fillable = ['post_id', 'path', 'position', 'created_at'];
    protected $casts = ['created_at' => 'datetime'];
    protected $appends = ['url'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    /** URL publique du fichier servie par PostController::photo() */
    public function getUrlAttribute(): string
    {
        return url("/api/posts/{$this->post_id}/photos/{$this->id}");
    }
}
