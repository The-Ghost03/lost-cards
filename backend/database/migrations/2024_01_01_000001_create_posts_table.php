<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name_on_cards');          // Full name (private)
            $table->string('name_partial');            // Obfuscated name (public)
            $table->string('location');                // Commune
            $table->json('documents');                 // Types of documents found
            $table->string('secret_question');
            $table->string('secret_answer');
            $table->text('pickup_address');            // Private until approved
            $table->string('status')->default('active'); // active | recovered
            $table->timestamps();

            $table->index('status');
            $table->index('name_on_cards');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
