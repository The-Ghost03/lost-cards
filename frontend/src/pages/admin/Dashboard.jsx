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
import { Spinner } from '../../components/Spinner'

const TABS = [
  { key: 'stats',     label: 'Statistiques', icon: BarChart3 },
  { key: 'analytics', label: 'Analytiques',  icon: TrendingUp },
  { key: 'posts',     label: 'Annonces',     icon: FileText },
  { key: 'users',     label: 'Utilisateurs', icon: Users },
]

export default function AdminDashboard() {
  const [tab, setTab]               = useState('stats')
  const [stats, setStats]           = useState(null)
  const [posts, setPosts]           = useState([])
  const [users, setUsers]           = useState([])
  const [userQ, setUserQ]           = useState('')
  const [userFilters, setUserFilters] = useState({
    role:     'all',  // all | admin | user
    status:   'all',  // all | chercheur | retrouveur
    latent:   'all',  // all | latent | not-latent
    device:   'all',  // all | mobile | desktop | tablet
    os:       'all',  // all | iOS | Android | Windows | other
    activity: 'all',  // all | active | inactive
    login:    'all',  // all | recent | old | never
  })
  const [loading, setLoading]       = useState(true)
  const [analytics, setAnalytics]   = useState(null)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const confirm = useConfirm()
  const navigate = useNavigate()

  const loadStats     = () => api.get('/admin/stats').then(r => setStats(r.data)).catch(() => t.error('Erreur stats'))
  const loadPosts     = () => api.get('/admin/posts').then(r => setPosts(r.data.data ?? r.data)).catch(() => t.error('Erreur annonces'))
  const loadUsers     = (q = '') => api.get('/admin/users', { params: q ? { q } : {} }).then(r => setUsers(r.data.data ?? r.data)).catch(() => t.error('Erreur users'))
  const loadAnalytics = (days = analyticsDays) => {
    setAnalyticsLoading(true)
    return api.get('/admin/analytics', { params: { days } })
      .then(r => setAnalytics(r.data))
      .catch(() => t.error('Erreur analytics'))
      .finally(() => setAnalyticsLoading(false))
  }

  useEffect(() => {
    Promise.all([loadStats(), loadPosts(), loadUsers()]).finally(() => setLoading(false))
  }, [])

  // Load analytics lazily when tab is first opened
  useEffect(() => {
    if (tab === 'analytics' && !analytics) loadAnalytics()
  }, [tab])

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
    <div className="flex justify-center pt-20 text-orange-500">
      <Spinner size={32} />
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
            className={`flex-1 flex items-center justify-center gap-1.5 text-meta sm:text-sm font-medium py-2 px-2 rounded-lg transition-all ${
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

      {/* ── Analytics tab ─────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-4 animate-fade-in">
          {/* Period selector */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => { setAnalyticsDays(d); loadAnalytics(d) }}
                className={`flex-1 text-meta font-semibold py-1.5 rounded-lg transition-all ${
                  analyticsDays === d ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {d === 7 ? '7 jours' : d === 30 ? '30 jours' : '90 jours'}
              </button>
            ))}
          </div>

          {analyticsLoading && (
            <div className="flex justify-center py-10 text-orange-500">
              <Spinner size={32} />
            </div>
          )}

          {!analyticsLoading && analytics && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Pages vues"        value={analytics.total_views.toLocaleString('fr')}   color="text-orange-500" icon="👁" />
                <KpiCard label="Visiteurs uniques" value={analytics.unique_visitors.toLocaleString('fr')} color="text-blue-500"   icon="👤" />
                <KpiCard label="Durée moy."        value={fmtDuration(analytics.avg_duration_seconds)}   color="text-purple-500"  icon="⏱" />
                <KpiCard label="Taux de rebond"    value={`${analytics.bounce_rate}%`}                   color="text-red-400"     icon="↩" />
              </div>

              {/* Sparkline chart */}
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-orange-500" /> Évolution ({analyticsDays} jours)
                </h3>
                <Sparkline data={analytics.daily} />
                <div className="flex items-center gap-4 mt-2 text-meta text-gray-500 justify-center">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-orange-400 rounded" /> Pages vues</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-400 rounded" /> Visiteurs</span>
                </div>
              </div>

              {/* Top pages + Sources side by side on wider screens */}
              <div className="grid grid-cols-1 gap-3">
                {/* Top pages */}
                <div className="card">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                    <FileText size={14} className="text-orange-500" /> Pages les plus visitées
                  </h3>
                  {analytics.top_pages.length === 0
                    ? <p className="text-meta text-gray-400 text-center py-3">Aucune donnée</p>
                    : <div className="flex flex-col gap-1.5">
                        {analytics.top_pages.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-meta">
                            <span className="w-4 text-gray-400 text-center shrink-0">{i + 1}</span>
                            <span className="flex-1 text-gray-700 font-mono truncate">{p.path}</span>
                            <span className="shrink-0 font-semibold text-orange-500">{p.views} vues</span>
                            <span className="shrink-0 text-gray-400">{p.visitors} vis.</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Traffic sources */}
                <div className="card">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
                    <Bell size={14} className="text-orange-500" /> Sources de trafic
                  </h3>
                  {analytics.sources.length === 0
                    ? <p className="text-meta text-gray-400 text-center py-3">Aucune donnée</p>
                    : <BarList
                        items={analytics.sources.map(s => ({
                          label: SOURCE_LABELS[s.source] ?? s.source ?? 'Inconnu',
                          value: s.visitors,
                        }))}
                        total={analytics.unique_visitors}
                      />
                  }
                </div>

                {/* Referrers */}
                {analytics.referrers.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-sm text-gray-800 mb-3">🔗 Sites référents</h3>
                    <div className="flex flex-col gap-1.5">
                      {analytics.referrers.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-meta">
                          <span className="text-gray-700 truncate flex-1">{r.domain}</span>
                          <span className="shrink-0 font-semibold text-blue-500 ml-2">{r.visitors} vis.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Devices */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card">
                    <h3 className="font-semibold text-sm text-gray-800 mb-3">📱 Appareils</h3>
                    <BarList
                      items={analytics.devices.map(d => ({
                        label: d.device_type === 'mobile' ? '📱 Mobile' : d.device_type === 'tablet' ? '📟 Tablette' : '💻 Desktop',
                        value: d.visitors,
                      }))}
                      total={analytics.unique_visitors}
                    />
                  </div>
                  <div className="card">
                    <h3 className="font-semibold text-sm text-gray-800 mb-3">🖥 Systèmes</h3>
                    <BarList
                      items={analytics.os.map(o => ({ label: o.os ?? 'Inconnu', value: o.visitors }))}
                      total={analytics.unique_visitors}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
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
                  <p className="text-meta text-gray-400">
                    {post.location} · par {post.user?.name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`badge shrink-0 ${post.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {post.status === 'active' ? 'Active' : 'Récupéré'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/posts/${post.id}`)} className="btn-secondary text-meta flex items-center gap-1">
                  <Eye size={12} /> Voir
                </button>
                {post.status === 'active' && (
                  <button onClick={() => handleRecover(post.id)} className="btn-secondary text-meta flex items-center gap-1 text-green-600 border-green-200">
                    <CheckCircle size={12} /> Récupéré
                  </button>
                )}
                <button onClick={() => handleDeletePost(post.id)} className="btn-secondary text-meta flex items-center gap-1 text-red-500 border-red-100">
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (() => {
        const filtered = applyUserFilters(users, userFilters)
        const hasActiveFilter = Object.values(userFilters).some(v => v !== 'all')
        return (
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

          {/* ── Filtres ── */}
          <div className="card mb-3 space-y-2.5">
            <FilterRow label="Rôle" value={userFilters.role}
              onChange={v => setUserFilters(f => ({ ...f, role: v }))}
              options={[
                { v: 'all',   l: 'Tous' },
                { v: 'admin', l: '🛡 Admin' },
                { v: 'user',  l: 'Utilisateur' },
              ]} />
            <FilterRow label="Statut" value={userFilters.status}
              onChange={v => setUserFilters(f => ({ ...f, status: v }))}
              options={[
                { v: 'all',         l: 'Tous' },
                { v: 'chercheur',   l: 'Chercheur' },
                { v: 'retrouveur',  l: 'Retrouveur' },
              ]} />
            <FilterRow label="Latent" value={userFilters.latent}
              onChange={v => setUserFilters(f => ({ ...f, latent: v }))}
              options={[
                { v: 'all',        l: 'Tous' },
                { v: 'latent',     l: '💤 Latent' },
                { v: 'not-latent', l: 'Actif' },
              ]} />
            <FilterRow label="Appareil" value={userFilters.device}
              onChange={v => setUserFilters(f => ({ ...f, device: v }))}
              options={[
                { v: 'all',     l: 'Tous' },
                { v: 'mobile',  l: '📱 Mobile' },
                { v: 'desktop', l: '💻 Desktop' },
                { v: 'tablet',  l: '📟 Tablette' },
              ]} />
            <FilterRow label="OS" value={userFilters.os}
              onChange={v => setUserFilters(f => ({ ...f, os: v }))}
              options={[
                { v: 'all',     l: 'Tous' },
                { v: 'iOS',     l: '🍎 iOS' },
                { v: 'Android', l: '🤖 Android' },
                { v: 'Windows', l: '🪟 Windows' },
                { v: 'other',   l: 'Autres' },
              ]} />
            <FilterRow label="Activité" value={userFilters.activity}
              onChange={v => setUserFilters(f => ({ ...f, activity: v }))}
              options={[
                { v: 'all',      l: 'Tous' },
                { v: 'active',   l: '✓ Actifs' },
                { v: 'inactive', l: 'Inactifs' },
              ]} />
            <FilterRow label="Connexion" value={userFilters.login}
              onChange={v => setUserFilters(f => ({ ...f, login: v }))}
              options={[
                { v: 'all',    l: 'Tous' },
                { v: 'recent', l: '7j' },
                { v: 'old',    l: '>30j' },
                { v: 'never',  l: 'Jamais' },
              ]} />

            {hasActiveFilter && (
              <button
                onClick={() => setUserFilters({ role: 'all', status: 'all', latent: 'all', device: 'all', os: 'all', activity: 'all', login: 'all' })}
                className="text-meta text-orange-500 font-medium hover:underline mt-1"
              >
                ↻ Réinitialiser les filtres
              </button>
            )}
          </div>

          {/* Count */}
          <p className="text-meta text-gray-500 mb-2 px-1">
            {filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}
            {(hasActiveFilter || userQ) && users.length !== filtered.length && (
              <span className="text-gray-400"> · {users.length} au total</span>
            )}
          </p>

          <div className="flex flex-col gap-2">
            {filtered.length === 0 && <div className="card text-center py-8 text-sm text-gray-500">Aucun utilisateur ne correspond</div>}
            {filtered.map((u, i) => (
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
                      {u.latent_at && (
                        <span className="badge bg-yellow-100 text-yellow-700" title={`Latent depuis ${format(new Date(u.latent_at), 'd MMM', { locale: fr })}`}>
                          💤 Latent
                        </span>
                      )}
                    </div>
                    <p className="text-meta text-gray-400 truncate">{u.email}</p>
                    <p className="text-meta text-gray-400">{u.phone}</p>
                  </div>
                  {/* Device icon */}
                  <DeviceIcon type={u.device_type} />
                </div>

                {/* Activity counts */}
                <div className="flex gap-3 text-meta text-gray-500 mb-2.5 flex-wrap">
                  <span><span className="font-semibold text-gray-700">{u.posts_count}</span> annonce(s)</span>
                  <span><span className="font-semibold text-gray-700">{u.contact_requests_count}</span> demande(s)</span>
                  <span><span className="font-semibold text-gray-700">{u.alert_subscriptions_count}</span> alerte(s)</span>
                </div>

                {/* Device / connection info */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-meta">
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
                  <button onClick={() => toggleRole(u)} className="btn-secondary text-meta flex items-center gap-1">
                    <UserCog size={12} /> {u.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                  </button>
                  <button onClick={() => handleDeleteUser(u.id, u.name)} className="btn-secondary text-meta flex items-center gap-1 text-red-500 border-red-100" disabled={u.role === 'admin'}>
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )
      })()}
    </div>
  )
}

/* ── User filter helpers ────────────────────────────────────────────────── */

function applyUserFilters(users, f) {
  return users.filter(u => {
    if (f.role !== 'all' && (u.role || 'user') !== f.role) return false
    if (f.status !== 'all' && u.status !== f.status) return false
    if (f.latent === 'latent' && !u.latent_at) return false
    if (f.latent === 'not-latent' && u.latent_at) return false
    if (f.device !== 'all' && u.device_type !== f.device) return false
    if (f.os !== 'all') {
      if (f.os === 'other') {
        if (['iOS', 'Android', 'Windows'].includes(u.device_os)) return false
      } else if (u.device_os !== f.os) return false
    }
    if (f.activity !== 'all') {
      const isActive = (u.posts_count > 0) || (u.contact_requests_count > 0) || (u.alert_subscriptions_count > 0)
      if (f.activity === 'active' && !isActive) return false
      if (f.activity === 'inactive' && isActive) return false
    }
    if (f.login !== 'all') {
      if (f.login === 'never' && u.last_login_at) return false
      if (f.login === 'recent') {
        if (!u.last_login_at) return false
        const days = (Date.now() - new Date(u.last_login_at).getTime()) / 86400000
        if (days > 7) return false
      }
      if (f.login === 'old') {
        if (!u.last_login_at) return false
        const days = (Date.now() - new Date(u.last_login_at).getTime()) / 86400000
        if (days <= 30) return false
      }
    }
    return true
  })
}

function FilterRow({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-meta font-semibold text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex gap-1 overflow-x-auto flex-1 pb-0.5 -mb-0.5">
        {options.map(opt => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`shrink-0 text-meta px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
              value === opt.v
                ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="p-2">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-meta text-gray-500 mt-0.5">{label}</p>
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
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-meta font-medium ${cls}`}>
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

/* ── Analytics helpers ────────────────────────────────────────────────── */

const SOURCE_LABELS = {
  direct:   '🔗 Direct',
  organic:  '🔍 Recherche organique',
  social:   '📱 Réseaux sociaux',
  referral: '🌐 Sites référents',
}

function fmtDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

/** Simple inline SVG sparkline showing views (orange) and visitors (blue) */
function Sparkline({ data }) {
  if (!data || data.length === 0) return null

  const W = 600, H = 80, PAD = 4
  const maxViews    = Math.max(...data.map(d => d.views), 1)
  const maxVisitors = Math.max(...data.map(d => d.visitors), 1)
  const maxY = Math.max(maxViews, maxVisitors)

  const px = (i) => PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)
  const py = (v) => H - PAD - ((v / maxY) * (H - PAD * 2))

  const polyline = (key, color) => {
    const pts = data.map((d, i) => `${px(i)},${py(d[key])}`).join(' ')
    return <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  }

  // Labels: show first, middle, last date
  const labelIdxs = [0, Math.floor(data.length / 2), data.length - 1]

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={PAD} x2={W - PAD} y1={py(maxY * t)} y2={py(maxY * t)}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
        ))}
        {polyline('views',    '#f97316')}
        {polyline('visitors', '#60a5fa')}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between text-meta text-gray-400 mt-1 px-1">
        {labelIdxs.map(i => (
          <span key={i}>{new Date(data[i]?.date).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}</span>
        ))}
      </div>
    </div>
  )
}

/** Horizontal bar list with percentage fill */
function BarList({ items, total }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-meta mb-0.5">
            <span className="text-gray-700 truncate flex-1">{item.label}</span>
            <span className="text-gray-500 ml-2 shrink-0">
              {item.value} <span className="text-gray-400">({total ? Math.round(item.value / total * 100) : 0}%)</span>
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, color, icon }) {
  return (
    <div className="card text-center py-3">
      <p className="text-lg mb-0.5">{icon}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-meta text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
