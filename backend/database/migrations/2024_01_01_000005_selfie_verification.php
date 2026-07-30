<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            // Chemin MySQL historique conservé tel quel (déjà exécuté en prod).
            // Make secret fields optional on posts (backward compat)
            DB::statement('ALTER TABLE posts MODIFY secret_question VARCHAR(255) NULL');
            DB::statement('ALTER TABLE posts MODIFY secret_answer   VARCHAR(255) NULL');

            // Make answer optional + add selfie_path on contact_requests
            DB::statement('ALTER TABLE contact_requests MODIFY answer VARCHAR(255) NULL');
            DB::statement('ALTER TABLE contact_requests ADD COLUMN selfie_path VARCHAR(500) NULL AFTER answer');

            return;
        }

        // Chemin portable (SQLite pour les tests) : MODIFY/AFTER n'existent pas hors MySQL.
        Schema::table('posts', function (Blueprint $table) {
            $table->string('secret_question')->nullable()->change();
            $table->string('secret_answer')->nullable()->change();
        });

        Schema::table('contact_requests', function (Blueprint $table) {
            $table->string('answer')->nullable()->change();
            $table->string('selfie_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table) {
            $table->dropColumn('selfie_path');
        });
    }
};
