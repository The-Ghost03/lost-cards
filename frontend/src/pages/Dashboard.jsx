import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPosts, markRecovered, deletePost } from '../api/posts'
import { useAuth }        from '../context/AuthContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm }     from '../components/ConfirmDialog'
import { t }              from '../lib/toast'
import PostCard           from '../components/PostCard'
import {
  PlusCircle, Wallet, CheckCircle, Trash2, Eye,
  Bell, MessageCircle, User, Search, Handshake,
  Shield, ChevronRight, Hand, Zap, Sparkles, X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr }                  from 'date-fns/locale'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  recovered: 'bg-gray-100 text-gray-500',
}

/* ── Quick-action card (gradient icon + hover arrow) ───────────────── */
function QuickAction({ to, onClick, icon, label, desc, color, wide }) {
  const cls = `group card-hover flex items-center gap-3 p-3.5 ${wide ? 'col-span-2' : ''}`
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800 group-hover:text-orange-600 transition-colors">{label}</p>
        <p className="text-xs text-gray-400 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0" />
    </>
  )
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <button onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const confirm    = useConfirm()

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const firstName    = user?.name?.split(' ')[0]

  const [myPosts,   setMyPosts]   = useState([])
  const [recent,    setRecent]    = useState([])
  const [results,   setResults]   = useState(null)
  const [query,     setQuery]     = useState('')
  const [searching, setSearching] = useState(false)
  const [loading,   setLoading]   = useState(true)

  const loadAll = () => {
    if (!isRetrouveur) { setLoading(false); return }
    Promise.all([
      getPosts({ my: 1 }).then(r => r.data.data ?? r.data).catch(() => []),
      getPosts({ limit: 6 }).then(r => r.data.data ?? r.data).catch(() => []),
    ]).then(([mine, all]) => {
      setMyPosts(mine)
      setRecent(all.filter(p => p.user_id !== user?.id && p.status !== 'recovered'))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [user?.status])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) { setResults(null); return }
    setSearching(true)
    try {
      const res = await getPosts({ name: query })
      const data = res.data.data ?? res.data
      setResults(data.filter(p => p.status !== 'recovered'))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => { setQuery(''); setResults(null) }

  /* ── Recover ─────────────────────────────────────────────────────── */
  const { run: handleRecover } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title:        'Marquer comme récupéré ?',
      message:      "Le propriétaire a récupéré ses pièces. L'annonce sera archivée.",
      confirmLabel: 'Confirmer',
      cancelLabel:  'Annuler',
    })
    if (!ok) return
    try { await markRecovered(id); t.success('Marqué comme récupéré'); loadAll() }
    catch { t.error('Erreur') }
  })

  /* ── Delete ──────────────────────────────────────────────────────── */
  const { run: handleDelete } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title:        "Supprimer l'annonce ?",
      message:      'Cette annonce sera retirée définitivement.',
      danger:       true,
      confirmLabel: 'Supprimer',
      cancelLabel:  'Annuler',
    })
    if (!ok) return
    try { await deletePost(id); t.success('Annonce supprimée'); loadAll() }
    catch { t.error('Erreur') }
  })

  /* ══════════════════════════════════════════════════════════════════
     CHERCHEUR VIEW
  ══════════════════════════════════════════════════════════════════ */
  if (!isRetrouveur) {
    return (
      <div className="pt-6 space-y-5 page-enter">
        {/* Header */}
        <div className="animate-slide-down">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1.5 mb-1">
            Bonjour, {firstName}
            <Hand size={20} className="animate-wiggle inline-block text-orange-500" />
          </h1>
          <div className="inline-flex items-center gap-1.5 text-xs bg-orange-100 text-orange-600 font-semibold px-3 py-1 rounded-full">
            <Search size={12} /> Mode Chercheur
          </div>
        </div>

        {/* Quick actions */}
        <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Zap size={12} className="text-orange-500" /> Actions
          </p>
          <div className="flex flex-col gap-2.5">
            <QuickAction
              to="/alerts"
              icon={<Bell size={18} />}
              label="Créer une alerte"
              desc="Soyez notifié dès qu'un portefeuille vous correspond"
              color="from-orange-500 to-orange-600"
            />
            <QuickAction
              to="/"
              icon={<Search size={18} />}
              label="Rechercher"
              desc="Chercher votre nom dans les annonces publiées"
              color="from-blue-500 to-blue-600"
            />
            <QuickAction
              to="/messages"
              icon={<MessageCircle size={18} />}
              label="Mes messages"
              desc="Discussions avec des retrouveurs"
              color="from-purple-500 to-purple-600"
            />
            <QuickAction
              to="/profile"
              icon={<Handshake size={18} />}
              label="Passer en mode Retrouveur"
              desc="Vous avez trouvé un portefeuille ? Changez de profil"
              color="from-green-500 to-green-600"
            />
          </div>
        </div>

        {/* Info card */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '160ms' }}>
          <p className="text-sm font-semibold text-orange-700 mb-1">Comment retrouver votre portefeuille ?</p>
          <ol className="text-xs text-orange-600 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Recherchez votre nom dans la barre de recherche</li>
            <li>Créez une alerte pour être prévenu automatiquement</li>
            <li>Contactez le retrouveur via la messagerie sécurisée</li>
          </ol>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════
     RETROUVEUR VIEW
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="pt-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-slide-down">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
            Bonjour, {firstName}
            <Hand size={20} className="animate-wiggle inline-block text-orange-500" />
          </h1>
          <div className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full mt-1">
            <Handshake size={12} /> Mode Retrouveur
          </div>
        </div>
        <Link to="/posts/create" className="btn-primary flex items-center gap-1.5 text-sm shrink-0">
          <PlusCircle size={15} /> Signaler
        </Link>
      </div>

      {/* Quick search */}
      <form onSubmit={handleSearch} className="mb-5 animate-slide-up" style={{ animationDelay: '60ms' }}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un nom sur les pièces..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-9 pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button type="button" onClick={clearSearch} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="btn-primary text-xs px-3 py-1.5" disabled={searching}>
              {searching ? '...' : 'OK'}
            </button>
          </div>
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger" style={{ animationDelay: '120ms' }}>
        <div className="card text-center hover:shadow-md transition-all" style={{ animationDelay: '140ms' }}>
          <p className="text-3xl font-bold bg-gradient-to-br from-orange-500 to-orange-600 bg-clip-text text-transparent">
            {myPosts.filter(p => p.status === 'active').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Annonces actives</p>
        </div>
        <div className="card text-center hover:shadow-md transition-all" style={{ animationDelay: '200ms' }}>
          <p className="text-3xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent">
            {myPosts.filter(p => p.status === 'recovered').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Portefeuilles rendus</p>
        </div>
      </div>

      {/* Quick actions */}
      <section className="mb-6 animate-slide-up" style={{ animationDelay: '230ms' }}>
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <Zap size={14} className="text-orange-500" /> Actions rapides
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction to="/alerts"  icon={<Bell size={18} />}   label="Mes alertes"    desc="Gérer vos alertes"     color="from-blue-500 to-blue-600" />
          <QuickAction to="/profile" icon={<User size={18} />}   label="Mon profil"     desc="Statut & infos"        color="from-purple-500 to-purple-600" />
          {user?.role === 'admin' && (
            <QuickAction to="/admin" icon={<Shield size={18} />} label="Administration" desc="Tableau de bord admin" color="from-red-500 to-red-600" wide />
          )}
        </div>
      </section>

      {/* Search results OR Recent posts */}
      <section className="mb-6 animate-slide-up" style={{ animationDelay: '260ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            {results !== null
              ? <><Search size={14} className="text-orange-500" /> Résultats pour "{query}"</>
              : <><Sparkles size={14} className="text-orange-500" /> Annonces récentes</>
            }
          </h2>
          {results === null && recent.length > 0 && (
            <Link to="/" className="text-xs text-orange-500 hover:underline">Tout voir →</Link>
          )}
        </div>

        {!loading && !searching && (results !== null ? results : recent).length === 0 && (
          <div className="card text-center py-8 animate-fade-in">
            <Search size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {results !== null ? 'Aucun résultat pour cette recherche' : 'Aucune annonce récente pour le moment'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {(results !== null ? results : recent).slice(0, 6).map((post, i) => (
            <div key={post.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-slide-up">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* My posts */}
      <section className="animate-slide-up" style={{ animationDelay: '340ms' }}>
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
          <Wallet size={14} className="text-orange-500" /> Mes annonces
        </h2>

        {loading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
          </div>
        )}

        {!loading && myPosts.length === 0 && (
          <div className="card text-center py-10 animate-scale-in">
            <Wallet size={32} className="mx-auto text-gray-300 mb-3 animate-float" />
            <p className="text-gray-600 font-medium text-sm">Aucune annonce publiée</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Vous avez trouvé un portefeuille ? Signalez-le ici.</p>
            <Link to="/posts/create" className="btn-primary text-sm inline-flex">Publier une annonce</Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {myPosts.map((post, i) => (
            <div key={post.id} className="card animate-slide-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{post.name_on_cards}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {post.location} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`badge ${STATUS_BADGE[post.status]} shrink-0`}>
                  {post.status === 'active' ? 'Active' : '✓ Récupéré'}
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1 justify-center"
                >
                  <Eye size={13} /> Voir
                </button>
                {post.status === 'active' && (
                  <button
                    onClick={() => handleRecover(post.id)}
                    className="btn-secondary text-xs flex items-center gap-1 flex-1 justify-center text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle size={13} /> Récupéré
                  </button>
                )}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100 hover:bg-red-50 px-3"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
