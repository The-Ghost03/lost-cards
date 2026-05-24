import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, ChevronLeft, Search, Handshake, Trash2, Lock, ShieldAlert } from 'lucide-react'
import api from '../api/axios'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm } from '../components/ConfirmDialog'

const STATUS_CARDS = [
  { key: 'chercheur',  Icon: Search,    label: 'Chercheur',  desc: "J'ai perdu mes pièces" },
  { key: 'retrouveur', Icon: Handshake, label: 'Retrouveur', desc: "J'aide à retrouver"   },
]

export default function Profile() {
  const { user, updateStatus, logout } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword]     = useState('')

  const { run: handleStatus, loading: savingStatus } = useAsyncAction(async (newStatus) => {
    if (newStatus === user.status) return
    try { await updateStatus(newStatus); t.success('Statut mis à jour !') } catch { t.error('Erreur') }
  })

  const { run: handleDelete, loading: deleting } = useAsyncAction(async () => {
    if (!password) { t.error('Mot de passe requis'); return }
    if (!(await confirm({
      title: 'Supprimer définitivement votre compte ?',
      message: 'Toutes vos annonces, messages et alertes seront perdus. Cette action est irréversible.',
      danger: true,
      confirmLabel: 'Supprimer mon compte',
    }))) return

    try {
      await api.delete('/me', { data: { password } })
      t.success('Compte supprimé')
      await logout()
      navigate('/')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(m => t.error(m))
      else t.error(err.response?.data?.message || 'Erreur')
    }
  })

  const isAdmin = user.role === 'admin'

  return (
    <div className="pt-6 max-w-sm mx-auto page-enter">
      <Link to="/dashboard" className="flex items-center gap-1 text-gray-400 text-sm mb-5 hover:text-gray-600 transition-colors">
        <ChevronLeft size={15} /> Retour
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-5 animate-slide-down">Mon profil</h1>

      {/* Infos */}
      <div className="card mb-4 animate-slide-up">
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
      <div className="card mb-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="font-semibold text-gray-800 text-sm mb-1">Mon statut</h2>
        <p className="text-xs text-gray-400 mb-4">
          Statut <strong>Chercheur</strong> = vous recevez les alertes automatiquement si votre nom apparaît dans une annonce.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {STATUS_CARDS.map(({ key, Icon, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleStatus(key)}
              disabled={savingStatus}
              className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95 ${
                user.status === key
                  ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Icon size={26} className={`mx-auto mb-1.5 ${user.status === key ? 'text-orange-500' : 'text-gray-400'}`} />
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs mt-0.5 opacity-70">{desc}</p>
              {user.status === key && (
                <span className="inline-block mt-2 text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">Actuel</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sécurité */}
      <div className="card mb-4 animate-slide-up" style={{ animationDelay: '160ms' }}>
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <Lock size={14} className="text-orange-500" /> Sécurité
        </h2>
        <Link to="/forgot-password" className="btn-secondary text-sm w-full flex items-center justify-center gap-2">
          <Lock size={14} /> Modifier mon mot de passe
        </Link>
      </div>

      {/* Zone dangereuse */}
      {!isAdmin && (
        <div className="card border-red-100 animate-slide-up" style={{ animationDelay: '240ms' }}>
          <h2 className="font-semibold text-red-600 text-sm mb-3 flex items-center gap-1.5">
            <ShieldAlert size={14} /> Zone dangereuse
          </h2>

          {!deleteOpen ? (
            <button onClick={() => setDeleteOpen(true)} className="text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors rounded-xl px-4 py-2 w-full flex items-center justify-center gap-2 active:scale-95">
              <Trash2 size={14} /> Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3 animate-slide-down">
              <p className="text-xs text-gray-500">
                Pour confirmer la suppression, entrez votre mot de passe.
              </p>
              <input
                type="password"
                className="input"
                placeholder="Votre mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => { setDeleteOpen(false); setPassword('') }} className="btn-secondary flex-1 text-sm">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleting || !password} className="flex-1 text-sm py-2 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all active:scale-95 disabled:opacity-50">
                  {deleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
