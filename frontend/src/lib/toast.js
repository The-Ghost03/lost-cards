import { toast } from 'react-hot-toast'

/**
 * Deduplicated toast — same message can't appear twice within COOLDOWN ms.
 */
const recent = new Map()
const COOLDOWN = 3000

function show(type, message, options = {}) {
  const key = `${type}:${message}`
  const last = recent.get(key)
  if (last && Date.now() - last < COOLDOWN) return
  recent.set(key, Date.now())
  setTimeout(() => recent.delete(key), COOLDOWN)
  return toast[type](message, options)
}

export const t = {
  success: (msg, opts) => show('success', msg, opts),
  error:   (msg, opts) => show('error',   msg, opts),
}
