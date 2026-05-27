<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'status', 'uuid',
        'device_type', 'device_os', 'device_browser', 'last_login_at', 'last_ip',
        'latent_at', 'last_reminder_at',
    ];

    // 'id' (BIGINT FK interne) caché en JSON — on n'expose que 'uuid'
    protected $hidden = ['password', 'remember_token', 'id'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'latent_at'         => 'datetime',
        'last_reminder_at'  => 'datetime',
        'password'          => 'hashed',
    ];

    /**
     * Auto-génère un UUID à la création du compte.
     */
    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Route model binding : /admin/users/{user} matche le uuid au lieu de l'id.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Sérialisation : expose le 'uuid' sous la clé 'id' pour le frontend.
     */
    public function toArray()
    {
        $array = parent::toArray();
        if (isset($array['uuid'])) {
            $array['id'] = $array['uuid'];
        }
        return $array;
    }

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
