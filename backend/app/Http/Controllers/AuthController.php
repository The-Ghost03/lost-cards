<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users',
            'phone'    => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'status'   => 'required|in:chercheur,retrouveur',
        ]);

        $ua   = $request->header('User-Agent', '');
        $user = User::create([
            'name'           => $data['name'],
            'email'          => $data['email'],
            'phone'          => $data['phone'],
            'password'       => Hash::make($data['password']),
            'role'           => 'user',
            'status'         => $data['status'],
            'device_type'    => $this->detectDeviceType($ua),
            'device_os'      => $this->detectOS($ua),
            'device_browser' => $this->detectBrowser($ua),
            'last_login_at'  => now(),
            'last_ip'        => $request->ip(),
        ]);

        return response()->json([
            'user'  => $user,
            'token' => $user->createToken('web')->plainTextToken,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        $ua   = $request->header('User-Agent', '');
        $user = Auth::user();
        $user->update([
            'device_type'    => $this->detectDeviceType($ua),
            'device_os'      => $this->detectOS($ua),
            'device_browser' => $this->detectBrowser($ua),
            'last_login_at'  => now(),
            'last_ip'        => $request->ip(),
        ]);

        return response()->json([
            'user'  => $user->fresh(),
            'token' => $user->createToken('web')->plainTextToken,
        ]);
    }

    public function logout(Request $request)
    {
        try { $request->user()->currentAccessToken()->delete(); } catch (\Throwable) {}
        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateStatus(Request $request)
    {
        $data = $request->validate([
            'status' => 'required|in:chercheur,retrouveur',
        ]);
        $request->user()->update(['status' => $data['status']]);
        return response()->json($request->user()->fresh());
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Always return 200 so we don't leak whether the email exists
        if (!$user) {
            return response()->json(['message' => 'Si un compte existe, un email a été envoyé.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'email'      => $request->email,
                'token'      => Hash::make($token),
                'created_at' => now(),
            ]
        );

        $resetUrl = rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$token.'&email='.urlencode($request->email);

        try {
            Mail::to($user->email)->send(new PasswordResetNotification($user, $resetUrl));
        } catch (\Throwable) {}

        return response()->json(['message' => 'Si un compte existe, un email a été envoyé.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (!$row || !Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['Lien invalide ou expiré.']]);
        }

        // 60 minute expiration
        if (now()->diffInMinutes($row->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['Le lien a expiré. Veuillez en demander un nouveau.']]);
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages(['email' => ['Utilisateur introuvable.']]);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        // Invalidate all existing tokens
        $user->tokens()->delete();

        return response()->json(['message' => 'Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.']);
    }

    /* ── Device detection helpers ──────────────────────────────────── */

    private function detectDeviceType(string $ua): string
    {
        if (preg_match('/tablet|ipad/i', $ua)) return 'tablet';
        if (preg_match('/mobile|android|iphone|ipod/i', $ua)) return 'mobile';
        return 'desktop';
    }

    private function detectOS(string $ua): string
    {
        if (preg_match('/iphone|ipad|ipod/i', $ua)) return 'iOS';
        if (preg_match('/android/i', $ua))           return 'Android';
        if (preg_match('/windows/i', $ua))           return 'Windows';
        if (preg_match('/macintosh|mac os x/i', $ua)) return 'macOS';
        if (preg_match('/linux/i', $ua))             return 'Linux';
        return 'Inconnu';
    }

    private function detectBrowser(string $ua): string
    {
        if (preg_match('/SamsungBrowser/i', $ua)) return 'Samsung';
        if (preg_match('/Edg\//i', $ua))          return 'Edge';
        if (preg_match('/OPR\/|Opera/i', $ua))    return 'Opera';
        if (preg_match('/Firefox/i', $ua))        return 'Firefox';
        if (preg_match('/Chrome/i', $ua))         return 'Chrome';
        if (preg_match('/Safari/i', $ua))         return 'Safari';
        return 'Inconnu';
    }

    public function deleteAccount(Request $request)
    {
        $data = $request->validate(['password' => 'required|string']);

        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => ['Mot de passe incorrect.']]);
        }

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Le compte admin ne peut pas être supprimé.'], 403);
        }

        // Cascade deletes (FKs may not all be set; delete manually)
        \App\Models\Message::where('sender_id', $user->id)->orWhere('receiver_id', $user->id)->delete();
        \App\Models\ContactRequest::where('user_id', $user->id)->delete();
        \App\Models\AlertSubscription::where('user_id', $user->id)->delete();
        \App\Models\Post::where('user_id', $user->id)->delete();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Compte supprimé.']);
    }
}
