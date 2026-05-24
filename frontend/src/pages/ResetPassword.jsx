import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Lock, CheckCircle2 } from 'lucide-react'
import api from '../api/axios'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [token, setToken]     = useState('')
  const [password, setPassword]               = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setEmail(params.get('email') || '')
    setToken(params.get('token') || '')
  }, [params])

  const { run, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      t.error('Les mots de passe ne correspondent pas'); return
    }
    try {
      await api.post('/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirm,
      })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(m => t.error(m))
      else t.error(err.response?.data?.message || 'Erreur')
    }
  })

  return (
    <div className="max-w-sm mx-auto pt-10 page-enter">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center mb-3">
          <KeyRound size={26} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        <p className="text-gray-500 text-sm mt-1">Choisissez un nouveau mot de passe sécurisé.</p>
      </div>

      {!done ? (
        <form onSubmit={run} className="card flex flex-col gap-4 animate-slide-up">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="password" required minLength={8} className="input pl-9" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caractères" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Confirmer</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="password" required className="input pl-9" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Mise à jour...' : 'Réinitialiser'}
          </button>
        </form>
      ) : (
        <div className="card text-center py-8 animate-scale-in">
          <CheckCircle2 size={36} className="mx-auto text-green-500 mb-3" />
          <p className="text-sm text-gray-600">Mot de passe réinitialisé ! Redirection vers la connexion...</p>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link to="/login" className="text-orange-500 font-medium">Retour à la connexion</Link>
      </p>
    </div>
  )
}
