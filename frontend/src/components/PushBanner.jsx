import { BellRing, BellOff, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePush } from '../lib/usePush'

/** Bandeau d'activation/désactivation des notifications push */
export default function PushBanner() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePush()

  if (!supported) {
    return (
      <div className="card mb-4 bg-gray-50 dark:bg-gray-800 border-gray-200">
        <div className="flex items-start gap-3">
          <BellOff size={18} className="text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">Notifications push non disponibles</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sur iPhone : ajoutez l'app à votre écran d'accueil (📤 Partager → "Sur l'écran d'accueil")
              puis relancez depuis l'icône.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleEnable = async () => {
    try {
      const r = await subscribe()
      if (r.ok) toast.success('Notifications activées 🔔')
      else if (r.reason === 'denied') toast.error('Permission refusée — autorisez-les dans les réglages du navigateur')
      else toast.error('Erreur d\'activation')
    } catch {
      toast.error('Erreur lors de l\'activation')
    }
  }

  const handleDisable = async () => {
    try {
      await unsubscribe()
      toast.success('Notifications désactivées')
    } catch {
      toast.error('Erreur')
    }
  }

  if (subscribed) {
    return (
      <div className="card mb-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
        <div className="flex items-start gap-3">
          <BellRing size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Notifications push activées</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Vous recevrez une notification instantanée pour chaque alerte.
            </p>
          </div>
          <button
            onClick={handleDisable}
            disabled={loading}
            className="text-xs text-green-700 dark:text-green-400 underline hover:no-underline shrink-0"
          >
            Désactiver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card mb-4 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900">
      <div className="flex items-start gap-3 mb-2">
        <Smartphone size={18} className="text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
            Activez les notifications push
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
            Recevez une alerte instantanée sur votre téléphone, sans avoir à consulter vos emails.
          </p>
        </div>
      </div>
      <button
        onClick={handleEnable}
        disabled={loading || permission === 'denied'}
        className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
      >
        <BellRing size={13} />
        {loading ? 'Activation...'
          : permission === 'denied' ? 'Refusé — autorisez dans les réglages'
          : 'Activer les notifications'}
      </button>
    </div>
  )
}
