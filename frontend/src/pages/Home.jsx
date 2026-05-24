import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Wallet, Shield, Bell, ArrowRight } from 'lucide-react'
import { getPosts } from '../api/posts'
import PostCard from '../components/PostCard'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const [query, setQuery]   = useState('')
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const search = useCallback(async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await getPosts({ name: q })
      setPosts(res.data.data ?? res.data)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    search(query)
  }

  // Recent posts on initial load
  useEffect(() => {
    getPosts({ limit: 6 })
      .then(r => setPosts(r.data.data ?? r.data))
      .catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="py-10 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          🇨🇮 Abidjan, Côte d'Ivoire
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Vous avez perdu<br />votre portefeuille ?
        </h1>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
          Cherchez ici si quelqu'un l'a retrouvé et signalé sur la plateforme.
          CNI, permis, cartes bancaires — on vous aide à les récupérer.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Votre nom sur les cartes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary px-5" disabled={loading}>
            {loading ? '...' : 'Chercher'}
          </button>
        </form>
      </div>

      {/* CTA strip */}
      {!user && (
        <div className="bg-orange-500 rounded-2xl p-4 mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white text-sm">Vous avez trouvé un portefeuille ?</p>
            <p className="text-orange-100 text-xs mt-0.5">Inscrivez-vous et aidez quelqu'un à retrouver ses pièces.</p>
          </div>
          <button onClick={() => navigate('/register')} className="shrink-0 bg-white text-orange-500 font-semibold text-sm px-3 py-2 rounded-xl flex items-center gap-1">
            Signaler <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: <Wallet size={20} className="text-orange-500" />, title: 'Quelqu\'un signale', desc: 'Le retrouveur publie l\'annonce avec les infos partielles du portefeuille.' },
          { icon: <Search size={20} className="text-orange-500" />, title: 'Le proprio cherche', desc: 'Il tape son nom et trouve l\'annonce correspondante.' },
          { icon: <Shield size={20} className="text-orange-500" />, title: 'Contact sécurisé', desc: 'Une question secrète vérifie l\'identité avant d\'ouvrir le chat.' },
        ].map((step, i) => (
          <div key={i} className="card text-center p-3">
            <div className="flex justify-center mb-2">{step.icon}</div>
            <p className="font-semibold text-xs text-gray-800 mb-1">{step.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Results / Recent */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 text-sm">
          {searched ? `Résultats pour "${query}"` : 'Annonces récentes'}
        </h2>

        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Recherche en cours...</div>
        )}

        {!loading && posts.length === 0 && searched && (
          <div className="card text-center py-10">
            <Bell size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium text-sm">Aucun portefeuille trouvé pour ce nom</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Créez une alerte pour être notifié si quelqu'un le signale.</p>
            <button onClick={() => navigate('/alerts')} className="btn-primary text-sm">
              Créer une alerte
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {posts
            .filter(p => p.status !== 'recovered')
            .map(post => <PostCard key={post.id} post={post} />)}
        </div>
      </div>
    </div>
  )
}
