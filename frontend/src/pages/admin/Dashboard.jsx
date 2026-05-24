import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { deletePost } from '../../api/posts'
import { Shield, Trash2, CheckCircle, Users, FileText, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [posts, setPosts]   = useState([])
  const [tab, setTab]       = useState('posts')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/posts'),
    ]).then(([s, p]) => {
      setStats(s.data)
      setPosts(p.data)
    }).catch(() => toast.error('Erreur de chargement'))
     .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    try {
      await deletePost(id)
      toast.success('Annonce supprimée')
      load()
    } catch { toast.error('Erreur') }
  }

  const handleRecover = async (id) => {
    try {
      await api.patch(`/posts/${id}/recover`)
      toast.success('Marqué comme récupéré')
      load()
    } catch { toast.error('Erreur') }
  }

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>

  return (
    <div className="pt-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield size={20} className="text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.total_posts}</p>
            <p className="text-xs text-gray-500 mt-1">Annonces total</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-500">{stats.recovered}</p>
            <p className="text-xs text-gray-500 mt-1">Récupérés</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.total_users}</p>
            <p className="text-xs text-gray-500 mt-1">Utilisateurs</p>
          </div>
        </div>
      )}

      {/* Posts table */}
      <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
        <FileText size={15} /> Toutes les annonces
      </h2>

      <div className="flex flex-col gap-2">
        {posts.map(post => (
          <div key={post.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{post.name_on_cards}</p>
                <p className="text-xs text-gray-400">
                  {post.location} · par {post.user?.name} ·{' '}
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <span className={`badge ${post.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {post.status === 'active' ? 'Active' : 'Récupéré'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/posts/${post.id}`)} className="btn-secondary text-xs flex items-center gap-1">
                <Eye size={12} /> Voir
              </button>
              {post.status === 'active' && (
                <button onClick={() => handleRecover(post.id)} className="btn-secondary text-xs flex items-center gap-1 text-green-600 border-green-200">
                  <CheckCircle size={12} /> Récupéré
                </button>
              )}
              <button onClick={() => handleDelete(post.id)} className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100">
                <Trash2 size={12} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
