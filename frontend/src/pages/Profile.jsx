import { usePageMeta } from '../lib/usePageMeta'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm }     from '../components/ConfirmDialog'
import { t }              from '../lib/toast'
import {
  Search, Handshake, User, Mail, Shield,
  KeyRound, Trash2, ChevronRight, CheckCircle,
} from 'lucide-react'
import PushBanner from '../components/PushBanner'

export default function Profile() {
  usePageMeta({ title: 'Mon profil' })
  const { user, updateStatus, deleteAccount, logout } = useAuth()
  const confirm  = useConfirm()
  const navigate = useNavigate()

  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteForm, setShowDeleteForm]  = useState(false)

  /* ── Status toggle ──────────────────────────────────────────────── */
  const { run: changeStatus, loading: statusLoading } = useAsyncAction(async (status) => {
    if (user.status === status) return
    await updateStatus(status)
    t.success(status === 'retrouveur' ? 'Mode Retrouveur activé' : 'Mode Chercheur activé')
    // No navigate needed — Navbar re-renders instantly via Context
  })

  /* ── Delete account ─────────────────────────────────────────────── */
  const { run: confirmDelete, loading: deleteLoading } = useAsyncAction(async () => {
    const ok = await confirm({
      title:        'Supprimer le compte',
      message:      'Cette action est irréversible. Toutes vos données seront effacées.',
      danger:       true,
      confirmLabel: 'Supprimer définitivement',
      cancelLabel:  'Annuler',
    })
    if (!ok) return
    try {
      await deleteAccount(deletePassword)
      t.success('Compte supprimé')
      navigate('/')
    } catch {
      t.error('Mot de passe incorrect')
    }
  })

  const isChercheur  = user?.status === 'chercheur'
  const isRetrouveur = user?.status === 'retrouveur'
  const isAdmin      = user?.role   === 'admin'

  return (
    <div className="pt-6 pb-10 space-y-5">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-ink-100 flex items-center justify-center">
          <User size={28} className="text-ink-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            <Mail size={12} /> {user?.email}
          </p>
          {isAdmin && (
            <span className="text-meta bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">
              Administrateur
            </span>
          )}
        </div>
      </div>

      {/* ── Mon statut ────────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="card">
          <p className="text-meta font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Mon profil
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Chercheur */}
            <button
              onClick={() => changeStatus('chercheur')}
              disabled={statusLoading}
              className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${
                isChercheur
                  ? 'border-flame-700 bg-flame-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {isChercheur && (
                <CheckCircle
                  size={16}
                  className="absolute top-2 right-2 text-flame-700"
                />
              )}
              <Search size={22} className={isChercheur ? 'text-flame-500' : 'text-gray-400'} />
              <span className={`font-semibold text-sm ${isChercheur ? 'text-flame-700' : 'text-gray-700'}`}>
                Chercheur
              </span>
              <span className="text-meta text-gray-500 leading-snug">
                J'ai perdu mon portefeuille et je le cherche.
              </span>
            </button>

            {/* Retrouveur */}
            <button
              onClick={() => changeStatus('retrouveur')}
              disabled={statusLoading}
              className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${
                isRetrouveur
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {isRetrouveur && (
                <CheckCircle
                  size={16}
                  className="absolute top-2 right-2 text-green-500"
                />
              )}
              <Handshake size={22} className={isRetrouveur ? 'text-green-600' : 'text-gray-400'} />
              <span className={`font-semibold text-sm ${isRetrouveur ? 'text-green-700' : 'text-gray-700'}`}>
                Retrouveur
              </span>
              <span className="text-meta text-gray-500 leading-snug">
                J'ai trouvé un portefeuille et je veux le rendre.
              </span>
            </button>
          </div>

          {statusLoading && (
            <p className="text-meta text-gray-400 text-center mt-3">Mise à jour...</p>
          )}
        </div>
      )}

      {/* ── Notifications push ────────────────────────────────────── */}
      <PushBanner />

      {/* ── Sécurité ──────────────────────────────────────────────── */}
      <div className="card">
        <p className="text-meta font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Sécurité
        </p>

        <button
          onClick={() => navigate('/forgot-password')}
          className="w-full flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-flame-700 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <KeyRound size={17} className="text-gray-400" />
            Changer le mot de passe
          </span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between py-2.5 text-sm text-gray-700 hover:text-flame-700 transition-colors border-t border-gray-50"
          >
            <span className="flex items-center gap-2.5">
              <Shield size={17} className="text-gray-400" />
              Tableau d'administration
            </span>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        )}
      </div>

      {/* ── Zone de danger ────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="card border border-red-100">
          <p className="text-meta font-semibold text-red-400 uppercase tracking-wide mb-3">
            Zone de danger
          </p>

          {!showDeleteForm ? (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="w-full flex items-center gap-2.5 py-2.5 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 size={17} />
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-meta text-gray-500">
                Confirmez avec votre mot de passe pour supprimer définitivement votre compte.
              </p>
              <input
                type="password"
                placeholder="Votre mot de passe"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="input text-sm"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={!deletePassword || deleteLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  {deleteLoading ? 'Suppression...' : 'Supprimer'}
                </button>
                <button
                  onClick={() => { setShowDeleteForm(false); setDeletePassword('') }}
                  className="text-sm text-ink-600 hover:text-ink-950 font-medium shrink-0 px-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
