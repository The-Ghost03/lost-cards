import { usePageMeta } from '../lib/usePageMeta'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet, Mail, Lock } from 'lucide-react'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'

export default function Login() {
  usePageMeta({ title: 'Connexion' })
  const [form, setForm] = useState({ email: '', password: '' })
  const { login } = useAuth()
  const navigate = useNavigate()

  const { run: handleSubmit, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    try {
      await login(form)
      t.success('Connecté !')
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(m => t.error(m))
      } else {
        t.error(err.response?.data?.message || 'Erreur de connexion')
      }
    }
  })

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="max-w-sm mx-auto pt-10 page-enter">
      <div className="text-center mb-8 animate-slide-down">
        <div className="inline-flex items-center gap-2 text-orange-500 font-bold text-xl mb-1">
          <Wallet size={24} /> LostCards
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Content de vous revoir</h1>
        <p className="text-gray-500 text-sm mt-1">Connectez-vous à votre compte</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 animate-slide-up">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="email" required className="input pl-9" placeholder="votre@email.com" value={form.email} onChange={set('email')} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Mot de passe</label>
            <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline">Oublié ?</Link>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="password" required className="input pl-9" placeholder="••••••••" value={form.password} onChange={set('password')} />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Pas encore de compte ?{' '}
        <Link to="/register" className="text-orange-500 font-medium">S'inscrire</Link>
      </p>
    </div>
  )
}
