import { usePageMeta } from '../lib/usePageMeta'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../api/posts'
import { CheckSquare, Square, X, ImagePlus } from 'lucide-react'
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
  usePageMeta({ title: 'Signaler un document trouvé' })
  const navigate = useNavigate()
  const [createdPost, setCreatedPost] = useState(null)
  const [photos, setPhotos] = useState([])   // [{ file, previewUrl }]
  const [form, setForm] = useState({
    name_on_cards:   '',
    location:        '',
    documents:       [],
    pickup_address:  '',
  })

  const MAX_PHOTOS = 5

  const addPhotos = (files) => {
    const list = Array.from(files)
    if (photos.length + list.length > MAX_PHOTOS) {
      t.error(`Maximum ${MAX_PHOTOS} photos`)
      return
    }
    const next = list.map(file => ({ file, previewUrl: URL.createObjectURL(file) }))
    setPhotos(prev => [...prev, ...next])
  }

  const removePhoto = (idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx]?.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

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
      const payload = { ...form, photos: photos.map(p => p.file) }
      const res = await createPost(payload)
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
          <label htmlFor="post-name-on-cards" className="text-sm font-semibold text-gray-800 mb-3 block">
            Nom sur les cartes
          </label>
          <input
            id="post-name-on-cards"
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
          <label htmlFor="post-location" className="text-sm font-semibold text-gray-800 mb-3 block">
            Commune / Lieu de trouvaille
          </label>
          <select id="post-location" className="input" value={form.location} onChange={set('location')} required>
            <option value="">Choisir une commune...</option>
            {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Documents */}
        <div className="card">
          {/* En-tête de groupe (pas un <label> : il ne référence pas un champ unique) */}
          <p className="text-sm font-semibold text-gray-800 mb-3">
            Documents trouvés dans le portefeuille
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DOCUMENTS.map(doc => {
              const checked = form.documents.includes(doc.key)
              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => toggleDoc(doc.key)}
                  className={`flex items-center gap-2 text-left text-meta px-3 py-2.5 rounded-xl border transition-colors ${
                    checked
                      ? 'border-flame-700 bg-flame-50 text-flame-700 font-medium'
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

        {/* Photos (optionnel, max 5) */}
        <div className="card">
          {/* En-tête de groupe (le vrai <label> du champ fichier est plus bas) */}
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Photos du portefeuille (optionnel)
          </p>
          <p className="text-meta text-gray-400 mb-3">
            Ajoutez des photos floutées des pièces ou du portefeuille pour aider à l'identification ({photos.length}/{MAX_PHOTOS}).
          </p>

          {/* Grille de previews */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
                    aria-label="Supprimer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bouton ajouter */}
          {photos.length < MAX_PHOTOS && (
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { addPhotos(e.target.files); e.target.value = '' }}
              />
              <span className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-flame-500/30 text-flame-700 text-sm font-medium cursor-pointer hover:bg-flame-50 hover:border-flame-500 transition-colors">
                <ImagePlus size={16} /> Ajouter des photos
              </span>
            </label>
          )}
        </div>

        {/* Adresse de récupération */}
        <div className="card">
          <label htmlFor="post-pickup-address" className="text-sm font-semibold text-gray-800 mb-3 block">
            Adresse pour la récupération
          </label>
          <input
            id="post-pickup-address"
            type="text"
            className="input"
            placeholder="Ex: Cocody Riviera 3, près de la pharmacie Soleil"
            value={form.pickup_address}
            onChange={set('pickup_address')}
            required
          />
          <p className="text-meta text-gray-400 mt-1.5">Visible uniquement après vérification de l'identité du propriétaire.</p>
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
