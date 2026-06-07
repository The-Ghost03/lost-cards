/**
 * Push notifications — DÉSACTIVÉ temporairement (web/PWA pas encore prêt)
 * Pour réactiver : retirer la ligne `supported = false` ci-dessous.
 */
import { useCallback } from 'react'

export function usePush() {
  const supported = false  // ← désactivé : réactiver quand push sera stable

  return {
    supported,
    permission: 'denied',
    subscribed: false,
    loading: false,
    subscribe:   useCallback(async () => ({ ok: false, reason: 'disabled' }), []),
    unsubscribe: useCallback(async () => {}, []),
    sendTest:    useCallback(async () => {}, []),
  }
}
