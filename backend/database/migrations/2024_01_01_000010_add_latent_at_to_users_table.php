<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // NULL = actif, timestamp = passé en latent (retrouveur sans annonce active depuis >14j)
            $table->timestamp('latent_at')->nullable()->after('last_ip');
            // Dernière fois qu'on a envoyé un rappel hebdo
            $table->timestamp('last_reminder_at')->nullable()->after('latent_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['latent_at', 'last_reminder_at']);
        });
    }
};
