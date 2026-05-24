import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateStatus } = useAuth()
  const [saving, setSaving] = useState(false)

  const handleStatus = async (newStatus) => {
    if (newStatus === user.status || saving) return
    setSaving(true)
    try {
      await updateStatus(newStatus)
      toast.success('Statut mis à jour !')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pt-6 max-w-sm mx-auto">
      <Link to="/" className="flex items-center gap-1 text-gray-400 text-sm mb-5 hover:text-gray-600">
        <ChevronLeft size={15} /> Retour
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-5">Mon profil</h1>

      {/* Infos */}
      <div className="card mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <User size={22} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <p className="text-xs text-gray-400">{user.phone}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 text-sm mb-1">Mon statut</h2>
        <p className="text-xs text-gray-400 mb-4">
          Statut <strong>Chercheur</strong> = vous recevez les alertes automatiquement si votre nom apparaît dans une annonce.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'chercheur',  emoji: '🔍', label: 'Chercheur',  desc: "J'ai perdu mes pièces" },
            { key: 'retrouveur', emoji: '🤝', label: 'Retrouveur', desc: "J'aide à retrouver"   },
          ].map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => handleStatus(s.key)}
              disabled={saving}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                user.status === s.key
                  ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1.5">{s.emoji}</div>
              <p className="font-semibold text-sm">{s.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{s.desc}</p>
              {user.status === s.key && (
                <span className="inline-block mt-2 text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Actuel
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
