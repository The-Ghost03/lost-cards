<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('device_type', 20)->nullable()->after('phone');    // mobile | desktop | tablet
            $table->string('device_os', 30)->nullable()->after('device_type'); // iOS | Android | Windows | macOS | Linux
            $table->string('device_browser', 30)->nullable()->after('device_os'); // Chrome | Safari | Firefox | ...
            $table->timestamp('last_login_at')->nullable()->after('device_browser');
            $table->string('last_ip', 45)->nullable()->after('last_login_at'); // supports IPv6
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['device_type', 'device_os', 'device_browser', 'last_login_at', 'last_ip']);
        });
    }
};
