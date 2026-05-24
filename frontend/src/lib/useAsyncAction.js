import { useState, useCallback, useRef } from 'react'

/**
 * Wraps an async function and exposes { run, loading }.
 * Calls are no-ops while the previous call is in flight.
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
