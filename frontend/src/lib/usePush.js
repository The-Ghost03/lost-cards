import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'

/* Convertit la clé VAPID base64-url en Uint8Array (requis par pushManager) */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function usePush() {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'denied'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)

  // Vérifie si on a déjà une subscription côté navigateur
  const refreshStatus = useCallback(async () => {
    if (!supported) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
      setPermission(Notification.permission)
    } catch {}
  }, [supported])

  useEffect(() => { refreshStatus() }, [refreshStatus])

  const subscribe = useCallback(async () => {
    if (!supported) throw new Error('Push non supporté sur ce navigateur')
    setLoading(true)
    try {
      // 1. Permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return { ok: false, reason: 'denied' }

      // 2. Service worker ready
      const reg = await navigator.serviceWorker.ready

      // 3. Récupère la clé publique VAPID
      const { data } = await api.get('/push/public-key')
      const applicationServerKey = urlBase64ToUint8Array(data.public_key)

      // 4. Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // 5. Envoie au backend
      const payload = sub.toJSON()
      await api.post('/push/subscribe', {
        endpoint: payload.endpoint,
        keys: payload.keys,
      })

      setSubscribed(true)
      return { ok: true }
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported])

  const sendTest = useCallback(async () => {
    return api.post('/push/test').then(r => r.data)
  }, [])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, sendTest }
}
