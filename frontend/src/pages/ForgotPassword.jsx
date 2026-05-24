import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, KeyRound, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)

  const { run, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    try {
      await api.post('/forgot-password', { email })
      setSent(true)
    } catch {
      t.error('Une erreur est survenue')
    }
  })

  return (
    <div className="max-w-sm mx-auto pt-10 page-enter">
      <Link to="/login" className="inline-flex items-center gap-1 text-gray-400 text-sm mb-5 hover:text-gray-600 transition-colors">
        <ArrowLeft size={14} /> Retour
      </Link>

      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center mb-3 animate-float">
          <KeyRound size={26} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié ?</h1>
        <p className="text-gray-500 text-sm mt-1">
          {sent
            ? 'Vérifiez votre boîte mail pour le lien de réinitialisation.'
            : 'Entrez votre email, on vous envoie un lien pour le réinitialiser.'
          }
        </p>
      </div>

      {!sent && (
        <form onSubmit={run} className="card flex flex-col gap-4 animate-slide-up">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="email"
                required
                className="input pl-9"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      {sent && (
        <div className="card text-center py-8 animate-scale-in">
          <Mail size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-sm text-gray-600 mb-4">Si un compte existe avec cet email, vous recevrez un lien sous peu.</p>
          <Link to="/login" className="btn-primary inline-flex text-sm">Retour à la connexion</Link>
        </div>
      )}
    </div>
  )
}
