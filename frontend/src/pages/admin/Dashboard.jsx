import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { deletePost } from '../../api/posts'
import { Shield, Trash2, CheckCircle, Users, FileText, Eye, BarChart3, Search, TrendingUp, MessageSquare, Bell, UserCog, Smartphone, Monitor, Tablet } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { t } from '../../lib/toast'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { useConfirm } from '../../components/ConfirmDialog'

const TABS = [
  { key: 'stats', label: 'Statistiques', icon: BarChart3 },
  { key: 'posts', label: 'Annonces',     icon: FileText },
  { key: 'users', label: 'Utilisateurs', icon: Users },
]

export default function AdminDashboard() {
  const [tab, setTab]           = useState('stats')
  const [stats, setStats]       = useState(null)
  const [posts, setPosts]       = useState([])
  const [users, setUsers]       = useState([])
  const [userQ, setUserQ]       = useState('')
  const [loading, setLoading]   = useState(true)
  const confirm = useConfirm()
  const navigate = useNavigate()

  const loadStats = () => api.get('/admin/stats').then(r => setStats(r.data)).catch(() => t.error('Erreur stats'))
  const loadPosts = () => api.get('/admin/posts').then(r => setPosts(r.data.data ?? r.data)).catch(() => t.error('Erreur annonces'))
  const loadUsers = (q = '') => api.get('/admin/users', { params: q ? { q } : {} }).then(r => setUsers(r.data.data ?? r.data)).catch(() => t.error('Erreur users'))

  useEffect(() => {
    Promise.all([loadStats(), loadPosts(), loadUsers()]).finally(() => setLoading(false))
  }, [])

  const { run: handleDeletePost } = useAsyncAction(async (id) => {
    if (!(await confirm({ title: 'Supprimer cette annonce ?', message: 'Action irréversible.', danger: true, confirmLabel: 'Supprimer' }))) return
    try { await deletePost(id); t.success('Supprimée'); loadPosts(); loadStats() } catch { t.error('Erreur') }
  })

  const { run: handleRecover } = useAsyncAction(async (id) => {
    try { await api.patch(`/posts/${id}/recover`); t.success('Marqué récupéré'); loadPosts(); loadStats() } catch { t.error('Erreur') }
  })

  const { run: handleDeleteUser } = useAsyncAction(async (id, name) => {
    if (!(await confirm({ title: `Supprimer ${name} ?`, message: 'Toutes ses annonces, messages et alertes seront aussi supprimés.', danger: true, confirmLabel: 'Supprimer' }))) return
    try { await api.delete(`/admin/users/${id}`); t.success('Utilisateur supprimé'); loadUsers(userQ); loadStats() } catch { t.error('Erreur') }
  })

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (!(await confirm({ title: `Changer en ${newRole} ?`, message: `${user.name} aura les droits ${newRole}.` }))) return
    try { await api.patch(`/admin/users/${user.id}`, { role: newRole }); t.success('Rôle modifié'); loadUsers(userQ) } catch { t.error('Erreur') }
  }

  if (loading) return (
    <div className="flex justify-center pt-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  )

  return (
    <div className="pt-6 page-enter">
      <div className="flex items-center gap-2 mb-5 animate-slide-down">
        <Shield size={20} className="text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl animate-slide-up">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium py-2 px-2 rounded-lg transition-all ${
              tab === key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="space-y-4 animate-fade-in">
          {/* 7 derniers jours */}
          <div className="card">
            <h2 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-orange-500" /> 7 derniers jours
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Nv. annonces" value={stats.last_7_days.new_posts} color="text-orange-500" />
              <Metric label="Nv. comptes"  value={stats.last_7_days.new_users} color="text-blue-500" />
              <Metric label="Récupérés"    value={stats.last_7_days.recoveries} color="text-green-500" />
            </div>
          </div>

          {/* Totaux annonces */}
          <div className="card">
            <h2 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
              <FileText size={15} className="text-orange-500" /> Annonces
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Total"     value={stats.totals.posts} color="text-gray-700" />
              <Metric label="Actives"   value={stats.totals.posts_active} color="text-green-500" />
              <Metric label="Récupérées" value={stats.totals.posts_recovered} color="text-blue-500" />
            </div>
          </div>

          {/* Utilisateurs */}
          <div className="card">
            <h2 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
              <Users size={15} className="text-orange-500" /> Utilisateurs
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Total"      value={stats.totals.users} color="text-gray-700" />
              <Metric label="Chercheurs" value={stats.totals.users_chercheur} color="text-blue-500" />
              <Metric label="Retrouveurs" value={stats.totals.users_retrouveur} color="text-green-500" />
            </div>
          </div>

          {/* Engagement */}
          <div className="card">
            <h2 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
              <MessageSquare size={15} className="text-orange-500" /> Engagement
            </h2>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Metric label="Vérifications" value={stats.totals.contact_requests} color="text-purple-500" />
              <Metric label="Approuvées"    value={stats.totals.contact_approved} color="text-green-500" />
              <Metric label="Messages"      value={stats.totals.messages} color="text-blue-500" />
              <Metric label="Alertes"       value={stats.totals.alerts} color="text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div className="flex flex-col gap-2 animate-fade-in">
          {posts.length === 0 && <div className="card text-center py-8 text-sm text-gray-500">Aucune annonce</div>}
          {posts.map((post, i) => (
            <div key={post.id} className="card animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{post.name_on_cards}</p>
                  <p className="text-xs text-gray-400">
                    {post.location} · par {post.user?.name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`badge shrink-0 ${post.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
                <button onClick={() => handleDeletePost(post.id)} className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100">
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="animate-fade-in">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher (nom, email, téléphone)..."
              className="input pl-9"
              value={userQ}
              onChange={e => { setUserQ(e.target.value); loadUsers(e.target.value) }}
            />
          </div>

          <div className="flex flex-col gap-2">
            {users.length === 0 && <div className="card text-center py-8 text-sm text-gray-500">Aucun utilisateur</div>}
            {users.map((u, i) => (
              <div key={u.id} className="card animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm truncate">{u.name}</p>
                      {u.role === 'admin' && (
                        <span className="badge bg-red-100 text-red-700"><Shield size={9} /> Admin</span>
                      )}
                      <span className={`badge ${u.status === 'chercheur' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {u.status === 'chercheur' ? 'Chercheur' : 'Retrouveur'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400">{u.phone}</p>
                  </div>
                  {/* Device icon */}
                  <DeviceIcon type={u.device_type} />
                </div>

                {/* Activity counts */}
                <div className="flex gap-3 text-xs text-gray-500 mb-2.5 flex-wrap">
                  <span><span className="font-semibold text-gray-700">{u.posts_count}</span> annonce(s)</span>
                  <span><span className="font-semibold text-gray-700">{u.contact_requests_count}</span> demande(s)</span>
                  <span><span className="font-semibold text-gray-700">{u.alert_subscriptions_count}</span> alerte(s)</span>
                </div>

                {/* Device / connection info */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <InfoRow label="OS"       value={<OsBadge os={u.device_os} />} />
                  <InfoRow label="Navigateur" value={u.device_browser || '—'} />
                  <InfoRow label="Dernière connexion" value={
                    u.last_login_at
                      ? formatDistanceToNow(new Date(u.last_login_at), { addSuffix: true, locale: fr })
                      : '—'
                  } />
                  <InfoRow label="Inscrit le" value={format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })} />
                  <InfoRow label="IP" value={
                    u.last_ip
                      ? <span className="font-mono text-gray-600">{u.last_ip}</span>
                      : '—'
                  } />
                  <InfoRow label="Appareil" value={
                    u.device_type === 'mobile' ? '📱 Mobile'
                    : u.device_type === 'tablet' ? '📟 Tablette'
                    : u.device_type === 'desktop' ? '💻 Desktop'
                    : '—'
                  } />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => toggleRole(u)} className="btn-secondary text-xs flex items-center gap-1">
                    <UserCog size={12} /> {u.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                  </button>
                  <button onClick={() => handleDeleteUser(u.id, u.name)} className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100" disabled={u.role === 'admin'}>
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="p-2">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function DeviceIcon({ type }) {
  if (type === 'mobile')  return <Smartphone size={18} className="text-blue-400 shrink-0 mt-0.5" />
  if (type === 'tablet')  return <Tablet      size={18} className="text-purple-400 shrink-0 mt-0.5" />
  if (type === 'desktop') return <Monitor     size={18} className="text-gray-400 shrink-0 mt-0.5" />
  return null
}

function OsBadge({ os }) {
  const map = {
    'iOS':     { emoji: '🍎', cls: 'bg-gray-100 text-gray-700' },
    'Android': { emoji: '🤖', cls: 'bg-green-50 text-green-700' },
    'Windows': { emoji: '🪟', cls: 'bg-blue-50 text-blue-700' },
    'macOS':   { emoji: '🍎', cls: 'bg-gray-100 text-gray-700' },
    'Linux':   { emoji: '🐧', cls: 'bg-yellow-50 text-yellow-700' },
  }
  if (!os || !map[os]) return <span className="text-gray-400">—</span>
  const { emoji, cls } = map[os]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {emoji} {os}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <>
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 truncate">{value}</span>
    </>
  )
}
