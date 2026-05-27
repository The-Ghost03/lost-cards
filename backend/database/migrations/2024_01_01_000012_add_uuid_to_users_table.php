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
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        // Backfill : génère un UUID pour chaque compte existant
        DB::table('users')->orderBy('id')->each(function ($u) {
            DB::table('users')
                ->where('id', $u->id)
                ->update(['uuid' => (string) Str::uuid()]);
        });

        // Maintenant qu'ils sont tous remplis : rends la colonne NOT NULL + UNIQUE
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
