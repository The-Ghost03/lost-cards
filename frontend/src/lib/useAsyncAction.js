import { useState, useRef, useCallback } from 'react'

/**
 * Prevents double-clicks / double-submissions.
 * While a call is in-flight, subsequent calls are silently dropped.
 */
export function useAsyncAction(fn) {
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)

  const run = useCallback(async (...args) => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      return await fn(...args)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [fn])

  return { run, loading }
}
