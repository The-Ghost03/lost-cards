/* ═══════════════════════════════════════════════════════════════════
   LostCards — Service Worker (v4)
   Stratégies de cache par type :
   - App shell (HTML, manifest, icons)  → cache-first
   - Assets Vite (JS/CSS hashed)         → cache-first immutable
   - Photos /api/posts/*/photos/*       → stale-while-revalidate, LRU 100
   - API GET                             → network-first, fallback cache
   - API POST/PATCH/DELETE               → network only
   - Navigations (HTML)                  → network-first, shell fallback offline
   ═══════════════════════════════════════════════════════════════════ */

const VERSION       = 'v4'
const SHELL_CACHE   = `lostcards-shell-${VERSION}`
const ASSETS_CACHE  = `lostcards-assets-${VERSION}`
const IMAGES_CACHE  = `lostcards-images-${VERSION}`
const API_CACHE     = `lostcards-api-${VERSION}`

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/offline.html',
]

const MAX_IMAGES  = 100
const MAX_API     = 50

/* ── Install : pré-cache l'app shell ────────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

/* ── Activate : nettoie les anciens caches ─────────────────────── */
self.addEventListener('activate', e => {
  const valid = [SHELL_CACHE, ASSETS_CACHE, IMAGES_CACHE, API_CACHE]
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !valid.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/* ── Helpers de stratégie ──────────────────────────────────────── */

async function trimCache(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)))
  }
}

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(cacheName, req, max = null) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  const networkPromise = fetch(req).then(res => {
    if (res.ok) {
      cache.put(req, res.clone())
      if (max) trimCache(cacheName, max)
    }
    return res
  }).catch(() => cached || new Response('Offline', { status: 503 }))
  return cached || networkPromise
}

async function networkFirst(cacheName, req, max = null) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) {
      cache.put(req, res.clone())
      if (max) trimCache(cacheName, max)
    }
    return res
  } catch {
    return await cache.match(req) || new Response('Offline', { status: 503 })
  }
}

async function navigationWithShellFallback(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put('/index.html', res.clone())
    }
    return res
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    return (await cache.match('/index.html')) ||
           (await cache.match('/')) ||
           (await cache.match('/offline.html')) ||
           new Response('Offline', { status: 503 })
  }
}

/* ── Fetch dispatcher ──────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return // POST/PATCH/DELETE non interceptés

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // cross-origin

  // 1. Photos d'annonces → stale-while-revalidate avec LRU 100
  if (url.pathname.startsWith('/api/posts/') && url.pathname.includes('/photos/')) {
    e.respondWith(staleWhileRevalidate(IMAGES_CACHE, req, MAX_IMAGES))
    return
  }

  // 2. Autres API → network-first avec fallback cache (utile en offline)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) {
    // Ne cache pas les endpoints sensibles
    const skipCache = url.pathname.includes('/me') ||
                      url.pathname.includes('/conversations') ||
                      url.pathname.includes('/messages')
    if (skipCache) return // laisse passer sans cache
    e.respondWith(networkFirst(API_CACHE, req, MAX_API))
    return
  }

  // 3. Assets Vite hashed (immutables) → cache-first long terme
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheFirst(ASSETS_CACHE, req))
    return
  }

  // 4. Fichiers statiques (icons, fonts, etc.) → cache-first
  if (/\.(ico|svg|png|jpg|jpeg|webp|woff2?|ttf|json)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(SHELL_CACHE, req))
    return
  }

  // 5. Navigations (SPA) → network-first avec fallback shell pour offline
  if (req.mode === 'navigate') {
    e.respondWith(navigationWithShellFallback(req))
    return
  }

  // Default : cache-first
  e.respondWith(cacheFirst(SHELL_CACHE, req))
})

/* ═══════════════════════════════════════════════════════════════
   Web Push (inchangé)
   ═══════════════════════════════════════════════════════════════ */
self.addEventListener('push', event => {
  let data = { title: 'LostCards', body: 'Nouvelle notification', url: '/' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon  || '/icons/pwa-192.png',
      badge:   data.badge || '/icons/pwa-192.png',
      data:    { url: data.url || '/' },
      vibrate: [200, 100, 200],
      tag:     data.tag || 'lostcards',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url).catch(() => {})
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

/* ── Background sync (skeleton, pour futur usage) ──────────────── */
self.addEventListener('sync', event => {
  // Hook for queued offline actions (ex: messages envoyés hors ligne)
  if (event.tag === 'sync-pending-messages') {
    // TODO: replay les requêtes stockées en IndexedDB
  }
})

/* ── Message handler (pour communication SW ↔ page) ───────────── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    )
  }
})
