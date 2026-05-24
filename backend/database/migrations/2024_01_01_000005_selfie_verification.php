<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Make secret fields optional on posts (backward compat)
        DB::statement('ALTER TABLE posts MODIFY secret_question VARCHAR(255) NULL');
        DB::statement('ALTER TABLE posts MODIFY secret_answer   VARCHAR(255) NULL');

        // Make answer optional + add selfie_path on contact_requests
        DB::statement('ALTER TABLE contact_requests MODIFY answer VARCHAR(255) NULL');
        DB::statement('ALTER TABLE contact_requests ADD COLUMN selfie_path VARCHAR(500) NULL AFTER answer');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE contact_requests DROP COLUMN selfie_path');
    }
};
