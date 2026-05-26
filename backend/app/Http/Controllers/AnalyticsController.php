<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsPageview;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    /* ── Public tracking endpoint (called by the React app) ─────────── */
    public function track(Request $request)
    {
        $ua = $request->header('User-Agent', '');

        // Ignore common bots/crawlers
        if (preg_match('/bot|crawl|spider|slurp|mediapartners|google|bing|duckduck|yahoo|baidu|yandex|lighthouse|pagespeed/i', $ua)) {
            return response()->json(['ok' => true]);
        }

        $data = $request->validate([
            'session_id' => 'required|string|max:64',
            'path'       => 'required|string|max:500',
            'referrer'   => 'nullable|string|max:500',
            'duration'   => 'nullable|integer|min:0|max:86400',
        ]);

        AnalyticsPageview::create([
            'session_id'      => $data['session_id'],
            'path'            => $data['path'],
            'referrer'        => $data['referrer'] ?? null,
            'source'          => $this->classifySource($data['referrer'] ?? null),
            'device_type'     => $this->detectDeviceType($ua),
            'device_os'       => $this->detectOS($ua),
            'device_browser'  => $this->detectBrowser($ua),
            'duration_seconds'=> isset($data['duration']) ? (int) $data['duration'] : null,
            'created_at'      => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /* ── Admin stats endpoint ────────────────────────────────────────── */
    public function stats(Request $request)
    {
        $days = (int) $request->input('days', 30);
        $days = in_array($days, [7, 30, 90]) ? $days : 30;
        $from = now()->subDays($days)->startOfDay();

        $base = AnalyticsPageview::where('created_at', '>=', $from);

        // ── Core KPIs ────────────────────────────────────────────────
        $totalViews      = (clone $base)->count();
        $uniqueVisitors  = (clone $base)->distinct('session_id')->count('session_id');
        $avgDuration     = (clone $base)->whereNotNull('duration_seconds')->avg('duration_seconds');

        // Bounce = sessions with only 1 page view
        $singlePageSessions = AnalyticsPageview::where('created_at', '>=', $from)
            ->selectRaw('session_id, COUNT(*) as cnt')
            ->groupBy('session_id')
            ->havingRaw('cnt = 1')
            ->get()->count();
        $bounceRate = $uniqueVisitors > 0 ? round($singlePageSessions / $uniqueVisitors * 100) : 0;

        // ── Daily breakdown ───────────────────────────────────────────
        $daily = AnalyticsPageview::where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Fill missing days with 0
        $dailyMap = $daily->keyBy('date');
        $filledDaily = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = now()->subDays($i)->format('Y-m-d');
            $filledDaily[] = [
                'date'     => $d,
                'views'    => $dailyMap->get($d)?->views    ?? 0,
                'visitors' => $dailyMap->get($d)?->visitors ?? 0,
            ];
        }

        // ── Top pages ─────────────────────────────────────────────────
        $topPages = (clone $base)
            ->selectRaw('path, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit(10)
            ->get();

        // ── Traffic sources ───────────────────────────────────────────
        $sources = (clone $base)
            ->selectRaw('source, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('source')
            ->orderByDesc('visitors')
            ->get();

        // ── Top referrers (only 'referral' type) ─────────────────────
        $referrers = (clone $base)
            ->where('source', 'referral')
            ->whereNotNull('referrer')
            ->selectRaw('referrer, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('referrer')
            ->orderByDesc('visitors')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'domain'   => $this->extractDomain($r->referrer),
                'visitors' => $r->visitors,
            ]);

        // ── Devices & OS ──────────────────────────────────────────────
        $devices = (clone $base)
            ->selectRaw('device_type, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('device_type')
            ->orderByDesc('visitors')
            ->get();

        $os = (clone $base)
            ->selectRaw('device_os as os, COUNT(DISTINCT session_id) as visitors')
            ->groupBy('device_os')
            ->orderByDesc('visitors')
            ->get();

        return response()->json([
            'period_days'          => $days,
            'total_views'          => $totalViews,
            'unique_visitors'      => $uniqueVisitors,
            'avg_duration_seconds' => (int) round($avgDuration ?? 0),
            'bounce_rate'          => $bounceRate,
            'daily'                => $filledDaily,
            'top_pages'            => $topPages,
            'sources'              => $sources,
            'referrers'            => $referrers,
            'devices'              => $devices,
            'os'                   => $os,
        ]);
    }

    /* ── Helpers ─────────────────────────────────────────────────────── */

    private function classifySource(?string $referrer): string
    {
        if (!$referrer) return 'direct';

        $domain = strtolower($this->extractDomain($referrer));

        $organic = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia', 'qwant', 'baidu', 'yandex'];
        $social  = ['facebook', 'twitter', 'instagram', 'tiktok', 'linkedin', 'youtube', 'whatsapp', 'telegram', 'snapchat', 'pinterest'];

        foreach ($organic as $engine) {
            if (str_contains($domain, $engine)) return 'organic';
        }
        foreach ($social as $net) {
            if (str_contains($domain, $net)) return 'social';
        }

        return 'referral';
    }

    private function extractDomain(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST) ?? $url;
        return preg_replace('/^www\./', '', $host);
    }

    private function detectDeviceType(string $ua): string
    {
        if (preg_match('/tablet|ipad/i', $ua))              return 'tablet';
        if (preg_match('/mobile|android|iphone|ipod/i', $ua)) return 'mobile';
        return 'desktop';
    }

    private function detectOS(string $ua): string
    {
        if (preg_match('/iphone|ipad|ipod/i', $ua))         return 'iOS';
        if (preg_match('/android/i', $ua))                   return 'Android';
        if (preg_match('/windows/i', $ua))                   return 'Windows';
        if (preg_match('/macintosh|mac os x/i', $ua))        return 'macOS';
        if (preg_match('/linux/i', $ua))                     return 'Linux';
        return 'Inconnu';
    }

    private function detectBrowser(string $ua): string
    {
        if (preg_match('/SamsungBrowser/i', $ua)) return 'Samsung';
        if (preg_match('/Edg\//i', $ua))           return 'Edge';
        if (preg_match('/OPR\/|Opera/i', $ua))     return 'Opera';
        if (preg_match('/Firefox/i', $ua))         return 'Firefox';
        if (preg_match('/Chrome/i', $ua))          return 'Chrome';
        if (preg_match('/Safari/i', $ua))          return 'Safari';
        return 'Inconnu';
    }
}
