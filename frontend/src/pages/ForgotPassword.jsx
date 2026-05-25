import { useState } from 'react'
import { Link }     from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import { useAsyncAction } from '../lib/useAsyncAction'
import { t }              from '../lib/toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent,  setSent]  = useState(false)

  const { run: submit, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      t.error(err?.response?.data?.message || 'Erreur, réessayez.')
    }
  })

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card text-center max-w-sm w-full py-10">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="font-bold text-gray-900 mb-2">Email envoyé !</h2>
          <p className="text-sm text-gray-500 mb-6">
            Vérifiez votre boîte mail. Le lien expire dans 60 minutes.
          </p>
          <Link to="/login" className="btn-primary text-sm">Retour à la connexion</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={15} /> Retour
        </Link>

        <div className="card">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <Mail size={24} className="text-orange-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500 mb-5">
            Entrez votre email et nous vous enverrons un lien de réinitialisation.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                placeholder="vous@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
