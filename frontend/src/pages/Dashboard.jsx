import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPosts, markRecovered, deletePost } from '../api/posts'
import { useAuth } from '../context/AuthContext'
import { PlusCircle, Wallet, CheckCircle, Trash2, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  recovered: 'bg-gray-100 text-gray-500',
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    getPosts({ my: 1 })
      .then(r => setPosts(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRecover = async (id) => {
    if (!confirm('Marquer comme récupéré ?')) return
    try {
      await markRecovered(id)
      toast.success('Marqué comme récupéré')
      load()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return
    try {
      await deletePost(id)
      toast.success('Annonce supprimée')
      load()
    } catch { toast.error('Erreur') }
  }

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon tableau de bord</h1>
          <p className="text-gray-500 text-sm">Bonjour, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <Link to="/posts/create" className="btn-primary flex items-center gap-1.5 text-sm">
          <PlusCircle size={15} /> Signaler
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-500">{posts.filter(p => p.status === 'active').length}</p>
          <p className="text-xs text-gray-500 mt-1">Annonces actives</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-500">{posts.filter(p => p.status === 'recovered').length}</p>
          <p className="text-xs text-gray-500 mt-1">Portefeuilles rendus</p>
        </div>
      </div>

      {/* Posts list */}
      <h2 className="font-semibold text-gray-800 text-sm mb-3">Mes annonces</h2>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>}

      {!loading && posts.length === 0 && (
        <div className="card text-center py-10">
          <Wallet size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium text-sm">Aucune annonce publiée</p>
          <p className="text-gray-400 text-xs mt-1 mb-4">Vous avez trouvé un portefeuille ? Signalez-le ici.</p>
          <Link to="/posts/create" className="btn-primary text-sm">Publier une annonce</Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {posts.map(post => (
          <div key={post.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{post.name_on_cards}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {post.location} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <span className={`badge ${STATUS_BADGE[post.status]}`}>
                {post.status === 'active' ? 'Active' : 'Récupéré'}
              </span>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate(`/posts/${post.id}`)} className="btn-secondary text-xs flex items-center gap-1 flex-1">
                <Eye size={13} /> Voir
              </button>
              {post.status === 'active' && (
                <button onClick={() => handleRecover(post.id)} className="btn-secondary text-xs flex items-center gap-1 flex-1 text-green-600 border-green-200 hover:bg-green-50">
                  <CheckCircle size={13} /> Récupéré
                </button>
              )}
              <button onClick={() => handleDelete(post.id)} className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100 hover:bg-red-50 px-3">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
