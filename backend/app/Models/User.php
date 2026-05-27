<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'status',
        'device_type', 'device_os', 'device_browser', 'last_login_at', 'last_ip',
        'latent_at', 'last_reminder_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'latent_at'         => 'datetime',
        'last_reminder_at'  => 'datetime',
        'password'          => 'hashed',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSearcher(): bool
    {
        return $this->status === 'chercheur';
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function contactRequests()
    {
        return $this->hasMany(ContactRequest::class);
    }

    public function alertSubscriptions()
    {
        return $this->hasMany(AlertSubscription::class);
    }
}
