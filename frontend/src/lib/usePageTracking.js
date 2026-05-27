import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'

/** Returns (or creates) a persistent anonymous session ID stored in sessionStorage */
function getSessionId() {
  try {
    let id = sessionStorage.getItem('_sid')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('_sid', id)
    }
    return id
  } catch {
    return 'anon'
  }
}

function send(path, referrer, duration) {
  const payload = { session_id: getSessionId(), path }
  if (referrer) payload.referrer = referrer
  if (duration != null) payload.duration = duration

  // Use sendBeacon when available (survives page unload)
  // IMPORTANT: wrap JSON in a Blob with type "application/json" so Laravel
  //            parses the body. Plain strings default to text/plain.
  const url = (import.meta.env.VITE_API_URL ?? '/api') + '/analytics/track'
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
  } else {
    api.post('/analytics/track', payload).catch(() => {})
  }
}

/**
 * Tracks every route change and reports duration when navigating away.
 * Mount once at the App level.
 */
export function usePageTracking() {
  const location   = useLocation()
  const prevPath   = useRef(null)
  const enterTime  = useRef(Date.now())
  const referrer   = useRef(document.referrer || null)

  useEffect(() => {
    const path = location.pathname

    if (prevPath.current === null) {
      // First page load — track it with the true referrer
      send(path, referrer.current, null)
    } else if (prevPath.current !== path) {
      // Navigating away — report duration of the previous page
      const duration = Math.round((Date.now() - enterTime.current) / 1000)
      send(prevPath.current, null, duration)
      // Track the new page (no external referrer for SPA navigation)
      send(path, null, null)
    }

    prevPath.current = path
    enterTime.current = Date.now()
    // After the first page, subsequent referrers are internal — ignore
    referrer.current = null
  }, [location.pathname])

  // Track duration on tab close / background
  useEffect(() => {
    const onHide = () => {
      if (prevPath.current) {
        const duration = Math.round((Date.now() - enterTime.current) / 1000)
        send(prevPath.current, null, duration)
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide()
    })
    window.addEventListener('beforeunload', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onHide)
    }
  }, [])
}
