import toast from 'react-hot-toast'

const recent = new Map()
const COOLDOWN = 3000 // ms

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
  loading: (msg, opts) => toast.loading(msg, opts),
  dismiss: (id) => toast.dismiss(id),
}

export default t
