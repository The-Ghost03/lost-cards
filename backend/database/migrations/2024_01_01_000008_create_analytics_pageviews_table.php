<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_pageviews', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 64)->index();   // anonymous session (sessionStorage)
            $table->string('path', 500);
            $table->string('referrer', 500)->nullable(); // raw referrer URL
            $table->string('source', 30)->nullable();    // direct|organic|social|referral
            $table->string('device_type', 20)->nullable();
            $table->string('device_os', 30)->nullable();
            $table->string('device_browser', 30)->nullable();
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_pageviews');
    }
};
