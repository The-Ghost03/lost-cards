import { useState }             from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword }  from '../api/auth'
import { useAsyncAction } from '../lib/useAsyncAction'
import { t }              from '../lib/toast'
import { KeyRound, CheckCircle } from 'lucide-react'

export default function ResetPassword() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const [form, setForm] = useState({
    password:              '',
    password_confirmation: '',
  })
  const [done, setDone] = useState(false)

  const { run: submit, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      t.error('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      await resetPassword({
        token:                 params.get('token'),
        email:                 params.get('email'),
        password:              form.password,
        password_confirmation: form.password_confirmation,
      })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      t.error(err?.response?.data?.message || 'Lien invalide ou expiré.')
    }
  })

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card text-center max-w-sm w-full py-10">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="font-bold text-gray-900 mb-2">Mot de passe modifié !</h2>
          <p className="text-sm text-gray-500">Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="card">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <KeyRound size={24} className="text-orange-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500 mb-5">Choisissez un mot de passe sécurisé.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password_confirmation}
                onChange={e => setForm(f => ({ ...f, password_confirmation: e.target.value }))}
                className="input"
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
