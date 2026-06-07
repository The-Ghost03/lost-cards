import { usePageMeta } from '../lib/usePageMeta'
import { useState, useEffect } from 'react'
import { getAlerts, createAlert, deleteAlert } from '../api/alerts'
import { Bell, Trash2, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Alerts() {
  usePageMeta({ title: 'Mes alertes' })
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

