import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../api/posts'
import { MapPin, FileText, Phone, CheckSquare, Square } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { useAsyncAction } from '../lib/useAsyncAction'
import { t } from '../lib/toast'
import SharePostModal from '../components/SharePostModal'

const DOCUMENTS = [
  { key: 'cni',       label: "CNI (Carte Nationale d'Identité)" },
  { key: 'permis',    label: 'Permis de conduire' },
  { key: 'bancaire',  label: 'Carte bancaire' },
  { key: 'assurance', label: "Carte d'assurance" },
  { key: 'passeport', label: 'Passeport' },
  { key: 'sejour',    label: 'Carte de séjour' },
  { key: 'electeur',  label: "Carte d'électeur" },
  { key: 'autre',     label: 'Autre document' },
]

const COMMUNES = [
  'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi',
  'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
  'Bingerville', 'Songon', 'Autre',
]

export default function PostCreate() {
  const navigate = useNavigate()
  const [createdPost, setCreatedPost] = useState(null)   // open the share modal on success
  const [form, setForm] = useState({
    name_on_cards:   '',
    location:        '',
    documents:       [],
    pickup_address:  '',
  })

  const toggleDoc = (key) => {
    setForm(f => ({
      ...f,
      documents: f.documents.includes(key)
        ? f.documents.filter(d => d !== key)
        : [...f.documents, key],
    }))
  }

  const { run: handleSubmit, loading } = useAsyncAction(async (e) => {
    e.preventDefault()
    if (form.documents.length === 0) { t.error('Sélectionnez au moins un type de document'); return }
    try {
      const res = await createPost(form)
      t.success('Annonce publiée ! Merci pour votre geste.')
      setCreatedPost(res.data)   // open the share modal
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) Object.values(errors).flat().forEach(m => t.error(m))
      else t.error('Erreur lors de la publication')
    }
  })

  const closeShareModal = () => {
    const id = createdPost.id
    setCreatedPost(null)
    navigate(`/posts/${id}`)
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Signaler un portefeuille trouvé</h1>
      <p className="text-gray-500 text-sm mb-6">Remplissez ce formulaire pour aider le propriétaire à retrouver ses pièces.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Nom sur les cartes */}
        <div className="card">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <FileText size={16} className="text-orange-500" /> Nom sur les cartes
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ex: KOUAMÉ Jean (tel qu'écrit sur les cartes)"
            value={form.name_on_cards}
            onChange={set('name_on_cards')}
            required
          />
        </div>

        {/* Lieu */}
        <div className="card">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <MapPin size={16} className="text-orange-500" /> Commune / Lieu de trouvaille
          </label>
          <select className="input" value={form.location} onChange={set('location')} required>
            <option value="">Choisir une commune...</option>
            {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Documents */}
        <div className="card">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <FileText size={16} className="text-orange-500" /> Documents trouvés dans le portefeuille
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DOCUMENTS.map(doc => {
              const checked = form.documents.includes(doc.key)
              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => toggleDoc(doc.key)}
                  className={`flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border transition-colors ${
                    checked
                      ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {checked ? <CheckSquare size={14} /> : <Square size={14} className="text-gray-300" />}
                  {doc.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Adresse de récupération */}
        <div className="card">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <Phone size={16} className="text-orange-500" /> Adresse pour la récupération
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ex: Cocody Riviera 3, près de la pharmacie Soleil"
            value={form.pickup_address}
            onChange={set('pickup_address')}
            required
          />
          <p className="text-xs text-gray-400 mt-1.5">Visible uniquement après vérification de l'identité du propriétaire.</p>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? <><Spinner size={16} /> Publication en cours...</> : "Publier l'annonce"}
        </button>
      </form>

      {createdPost && <SharePostModal post={createdPost} onClose={closeShareModal} />}
    </div>
  )
}
