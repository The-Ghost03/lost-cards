<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // ── contact_requests ──
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });
        DB::table('contact_requests')->orderBy('id')->each(function ($r) {
            DB::table('contact_requests')
                ->where('id', $r->id)
                ->update(['uuid' => (string) Str::uuid()]);
        });
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });

        // ── post_photos ──
        Schema::table('post_photos', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });
        DB::table('post_photos')->orderBy('id')->each(function ($r) {
            DB::table('post_photos')
                ->where('id', $r->id)
                ->update(['uuid' => (string) Str::uuid()]);
        });
        Schema::table('post_photos', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });

        // ── alert_subscriptions ──
        Schema::table('alert_subscriptions', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });
        DB::table('alert_subscriptions')->orderBy('id')->each(function ($r) {
            DB::table('alert_subscriptions')
                ->where('id', $r->id)
                ->update(['uuid' => (string) Str::uuid()]);
        });
        Schema::table('alert_subscriptions', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        foreach (['contact_requests', 'post_photos', 'alert_subscriptions'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropUnique(['uuid']);
                $t->dropColumn('uuid');
            });
        }
    }
};
