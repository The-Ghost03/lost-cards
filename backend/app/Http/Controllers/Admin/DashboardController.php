<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json([
            'total_posts'  => Post::count(),
            'active'       => Post::where('status', 'active')->count(),
            'recovered'    => Post::where('status', 'recovered')->count(),
            'total_users'  => User::count(),
        ]);
    }

    public function posts()
    {
        return response()->json(
            Post::with('user:id,name,email')
                ->latest()
                ->paginate(25)
        );
    }
}
