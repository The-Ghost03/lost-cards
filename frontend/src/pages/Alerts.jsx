import { useState, useEffect } from 'react'
import { getAlerts, createAlert, deleteAlert } from '../api/alerts'
import { Bell, Trash2, PlusCircle, BellRing, BellOff, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePush } from '../lib/usePush'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)

  const load = () => {
    getAlerts()
      .then(r => setAlerts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      await createAlert({ name })
      toast.success(`Alerte créée pour "${name}"`)
      setName('')
      load()
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Alerte supprimée')
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div className="pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={20} className="text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">Mes alertes</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Vous serez notifié par email si quelqu'un signale un portefeuille avec ce nom.
      </p>

      <PushBanner />

      {/* Add alert form */}
      <form onSubmit={handleAdd} className="card mb-6 flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Ex: KOUAMÉ Jean (votre nom tel qu'écrit sur vos cartes)"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary flex items-center gap-1.5 shrink-0" disabled={adding}>
          <PlusCircle size={15} />
          {adding ? '...' : 'Ajouter'}
        </button>
      </form>

      {/* Alert list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-10">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium text-sm">Aucune alerte configurée</p>
          <p className="text-gray-400 text-xs mt-1">Ajoutez votre nom pour être notifié automatiquement.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map(alert => (
            <div key={alert.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <Bell size={14} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{alert.name}</p>
                  <p className="text-xs text-gray-400">Alerte active · notifications email</p>
                </div>
              </div>
              <button onClick={() => handleDelete(alert.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Push notifications banner ─────────────────────────────────────────── */
function PushBanner() {
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
              Vous recevrez une notification instantanée à chaque match.
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
