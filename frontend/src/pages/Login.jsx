import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form)
      toast.success('Bienvenue !')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-orange-500 font-bold text-xl mb-1">
          <Wallet size={24} /> LostCards
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
        <p className="text-gray-500 text-sm mt-1">Content de vous revoir</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
          <input
            type="email"
            className="input"
            placeholder="votre@email.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Mot de passe</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
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
