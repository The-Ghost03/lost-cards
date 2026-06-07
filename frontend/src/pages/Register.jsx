import { usePageMeta } from '../lib/usePageMeta'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet, Search, Handshake } from 'lucide-react'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'

export default function Register() {
  usePageMeta({ title: 'Créer un compte' })
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '', status: '',
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.status) { t.error('Choisissez votre statut'); return }
    if (form.password !== form.password_confirmation) {
      t.error('Les mots de passe ne correspondent pas'); return
    }
    setLoading(true)
    try {
      await register(form)
      t.success('Compte créé avec succès !')
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(msg => t.error(msg))
      else t.error(err.response?.data?.message || "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="max-w-sm mx-auto pt-10 pb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-orange-500 font-bold text-xl mb-1">
          <Wallet size={24} /> LostCards
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="text-gray-500 text-sm mt-1">Rejoignez la communauté d'entraide</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Statut — step 1 visually */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vous êtes…</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'chercheur',  Icon: Search,    label: 'Chercheur',  desc: "J'ai perdu mes pièces" },
              { key: 'retrouveur', Icon: Handshake, label: 'Retrouveur', desc: "J'aide à retrouver"   },
            ].map(({ key, Icon, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, status: key })}
                className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95 ${
                  form.status === key
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon size={26} className={`mx-auto mb-1.5 ${form.status === key ? 'text-orange-500' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card flex flex-col gap-4">
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
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
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
