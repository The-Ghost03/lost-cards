const CACHE = 'lostcards-v3'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/') || e.request.url.includes('/sanctum/')) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      return cached || network
    })
  )
})

// ── Web Push ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'LostCards', body: 'Nouvelle notification', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

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

// Clic sur la notification → focus ou ouverture de l'app sur l'URL voulue
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // S'il y a déjà un onglet de l'app, on le focus + navigate
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url).catch(() => {})
          return c.focus()
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
