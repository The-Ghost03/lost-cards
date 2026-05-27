import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BellRing, X, Sparkles, Wallet, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { usePush } from '../lib/usePush'

const SNOOZE_KEY = 'push-prompt-snoozed-until'
const SNOOZE_MS  = 7 * 86400 * 1000   // 7 jours

const HIDDEN_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

function isSnoozed() {
  try {
    const until = localStorage.getItem(SNOOZE_KEY)
    return until && parseInt(until, 10) > Date.now()
  } catch {
    return false
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
  } catch {}
}

function markDone() {
  try {
    // Active = on ne re-demande plus jamais
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 365 * 86400 * 1000))
  } catch {}
}

export default function PushPrompt() {
  const { user }     = useAuth()
  const location     = useLocation()
  const { supported, permission, subscribed, subscribe, loading } = usePush()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return                                   // doit être connecté
    if (!supported) return                              // navigateur sans push
    if (permission === 'denied') return                 // refusé au niveau OS
    if (subscribed) return                              // déjà abonné
    if (isSnoozed()) return                             // snoozed récemment
    if (HIDDEN_ROUTES.includes(location.pathname)) return  // pas sur les pages d'auth

    // Petite latence pour ne pas s'afficher pile à l'arrivée
    const timer = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(timer)
  }, [user, supported, permission, subscribed, location.pathname])

  // Filet de sécurité : si l'abonnement est actif (après-activation OU
  // chargement initial), on ferme le modal et on marque le prompt comme fini
  useEffect(() => {
    if (subscribed) {
      setShow(false)
      markDone()
    }
  }, [subscribed])

  if (!show) return null

  const handleActivate = async () => {
    try {
      const r = await subscribe()
      if (r?.ok) {
        toast.success('Notifications activées 🔔')
        markDone()
      } else {
        const msg =
          r?.reason === 'denied'           ? 'Permission refusée — autorisez-les dans les réglages du navigateur'
          : r?.reason === 'unsupported'    ? 'Push non supporté sur ce navigateur'
          : r?.reason === 'sw-failed'      ? `Service worker indisponible (${r?.error || 'inconnu'})`
          : r?.reason === 'vapid-failed'   ? `Clé VAPID introuvable (${r?.error || 'inconnu'})`
          : r?.reason === 'subscribe-failed' ? `Échec navigateur : ${r?.error || 'inconnu'}`
          : r?.reason === 'backend-failed' ? `Échec serveur (HTTP ${r?.status || '?'}) : ${r?.error || 'inconnu'}`
          : 'Échec de l\'activation'
        toast.error(msg, { duration: 6000 })
        console.error('[push] subscription failed:', r)
        snooze()
      }
    } catch (e) {
      console.error('[push] handleActivate threw:', e)
      toast.error('Une erreur inattendue est survenue', { duration: 6000 })
      snooze()
    }
    setShow(false)
  }

  const handleLater = () => {
    snooze()
    setShow(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={handleLater}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-slide-up relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleLater}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Plus tard"
        >
          <X size={18} />
        </button>

        {/* Icône hero */}
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-4 relative">
          <BellRing size={28} className="text-orange-500" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-1.5">
          Activez les notifications
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 px-2">
          Soyez prévenu en temps réel, sans avoir à ouvrir l'app.
        </p>

        {/* Bénéfices */}
        <div className="space-y-2.5 mb-5">
          <Benefit
            icon={<Wallet size={16} className="text-orange-500" />}
            text="Si quelqu'un trouve un portefeuille à votre nom"
          />
          <Benefit
            icon={<MessageCircle size={16} className="text-blue-500" />}
            text="À chaque nouveau message reçu"
          />
          <Benefit
            icon={<Sparkles size={16} className="text-purple-500" />}
            text="Aucun spam, juste les alertes importantes"
          />
        </div>

        <button
          onClick={handleActivate}
          disabled={loading}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mb-2"
        >
          <BellRing size={15} />
          {loading ? 'Activation...' : 'Activer les notifications'}
        </button>

        <button
          onClick={handleLater}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

function Benefit({ icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{text}</p>
    </div>
  )
}
