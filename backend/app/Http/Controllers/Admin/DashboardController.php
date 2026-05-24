<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AlertSubscription;
use App\Models\ContactRequest;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json([
            'totals' => [
                'posts'          => Post::count(),
                'posts_active'   => Post::where('status', 'active')->count(),
                'posts_recovered'=> Post::where('status', 'recovered')->count(),
                'users'          => User::count(),
                'users_chercheur'=> User::where('status', 'chercheur')->count(),
                'users_retrouveur'=> User::where('status', 'retrouveur')->count(),
                'contact_requests'    => ContactRequest::count(),
                'contact_approved'    => ContactRequest::where('status', 'approved')->count(),
                'contact_pending'     => ContactRequest::where('status', 'pending')->count(),
                'messages'       => Message::count(),
                'alerts'         => AlertSubscription::count(),
            ],
            'last_7_days' => [
                'new_posts'   => Post::where('created_at', '>=', now()->subDays(7))->count(),
                'new_users'   => User::where('created_at', '>=', now()->subDays(7))->count(),
                'recoveries'  => Post::where('status', 'recovered')->where('updated_at', '>=', now()->subDays(7))->count(),
            ],
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

    public function users(Request $request)
    {
        $q = User::query()->orderByDesc('created_at');
        if ($search = $request->query('q')) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%");
            });
        }
        return response()->json(
            $q->withCount(['posts', 'contactRequests', 'alertSubscriptions'])
              ->paginate(25)
        );
    }

    public function deleteUser(Request $request, User $user)
    {
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Impossible de supprimer un admin.'], 403);
        }

        Message::where('sender_id', $user->id)->orWhere('receiver_id', $user->id)->delete();
        ContactRequest::where('user_id', $user->id)->delete();
        AlertSubscription::where('user_id', $user->id)->delete();
        Post::where('user_id', $user->id)->delete();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'role'   => 'sometimes|in:admin,user',
            'status' => 'sometimes|in:chercheur,retrouveur',
        ]);
        $user->update($data);
        return response()->json($user->fresh());
    }
}
