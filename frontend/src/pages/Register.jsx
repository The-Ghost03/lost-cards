import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Compte créé avec succès !')
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription')
      }
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="max-w-sm mx-auto pt-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-orange-500 font-bold text-xl mb-1">
          <Wallet size={24} /> LostCards
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="text-gray-500 text-sm mt-1">Rejoignez la communauté d'entraide</p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Nom complet</label>
          <input type="text" className="input" placeholder="Jean Kouamé" value={form.name} onChange={set('name')} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
          <input type="email" className="input" placeholder="votre@email.com" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Téléphone (WhatsApp de préférence)</label>
          <input type="tel" className="input" placeholder="+225 07 00 00 00 00" value={form.phone} onChange={set('phone')} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Mot de passe</label>
          <input type="password" className="input" placeholder="Min. 8 caractères" value={form.password} onChange={set('password')} required minLength={8} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Confirmer le mot de passe</label>
          <input type="password" className="input" placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} required />
        </div>
        <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Déjà inscrit ?{' '}
        <Link to="/login" className="text-orange-500 font-medium">Se connecter</Link>
      </p>
    </div>
  )
}
