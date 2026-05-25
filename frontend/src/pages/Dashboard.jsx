import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPosts, markRecovered, deletePost } from '../api/posts'
import { useAuth }        from '../context/AuthContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm }     from '../components/ConfirmDialog'
import { t }              from '../lib/toast'
import {
  PlusCircle, Wallet, CheckCircle, Trash2, Eye,
  Bell, MessageCircle, User, Search, Handshake,
  LayoutDashboard, Shield,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr }                  from 'date-fns/locale'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  recovered: 'bg-gray-100 text-gray-500',
}

/* ── Quick-action card ──────────────────────────────────────────────── */
function QuickAction({ to, onClick, icon: Icon, label, desc, color }) {
  const cls = `card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[.98] select-none`
  const inner = (
    <>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="font-semibold text-sm text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 leading-snug">{desc}</p>
      </div>
    </>
  )
  return to
    ? <Link   to={to}      className={cls}>{inner}</Link>
    : <button onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const confirm    = useConfirm()
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const isChercheur  = user?.status === 'chercheur'
  const firstName    = user?.name?.split(' ')[0]

  const load = () => {
    if (!isRetrouveur) { setLoading(false); return }
    getPosts({ my: 1 })
      .then(r => setPosts(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user?.status])

  /* ── Recover ────────────────────────────────────────────────────── */
  const { run: handleRecover } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title:        'Marquer comme récupéré ?',
      message:      'Le propriétaire a récupéré ses pièces.',
      confirmLabel: 'Confirmer',
      cancelLabel:  'Annuler',
    })
    if (!ok) return
    await markRecovered(id)
    t.success('Marqué comme récupéré')
    load()
  })

  /* ── Delete ─────────────────────────────────────────────────────── */
  const { run: handleDelete } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title:        'Supprimer l\'annonce ?',
      message:      'Cette annonce sera retirée définitivement.',
      danger:       true,
      confirmLabel: 'Supprimer',
      cancelLabel:  'Annuler',
    })
    if (!ok) return
    await deletePost(id)
    t.success('Annonce supprimée')
    load()
  })

  /* ── Chercheur view ─────────────────────────────────────────────── */
  if (isChercheur) {
    return (
      <div className="pt-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">Bonjour, {firstName} 👋</h1>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs bg-orange-100 text-orange-600 font-semibold px-3 py-1 rounded-full">
            <Search size={12} /> Mode Chercheur
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>
          <div className="flex flex-col gap-3">
            <QuickAction
              to="/alerts"
              icon={Bell}
              label="Créer une alerte"
              desc="Soyez notifié dès qu'un portefeuille vous correspond"
              color="bg-orange-500"
            />
            <QuickAction
              to="/"
              icon={Search}
              label="Rechercher"
              desc="Chercher votre nom dans les annonces publiées"
              color="bg-blue-500"
            />
            <QuickAction
              to="/messages"
              icon={MessageCircle}
              label="Mes messages"
              desc="Discussions avec des retrouveurs"
              color="bg-purple-500"
            />
            <QuickAction
              to="/profile"
              icon={Handshake}
              label="Passer en mode Retrouveur"
              desc="Vous avez trouvé un portefeuille ? Changez de profil"
              color="bg-green-500"
            />
          </div>
        </div>

        {/* Info card */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
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

  /* ── Retrouveur view ────────────────────────────────────────────── */
  const active    = posts.filter(p => p.status === 'active').length
  const recovered = posts.filter(p => p.status === 'recovered').length

  return (
    <div className="pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bonjour, {firstName} 👋</h1>
          <div className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full mt-1">
            <Handshake size={12} /> Mode Retrouveur
          </div>
        </div>
        <Link to="/posts/create" className="btn-primary flex items-center gap-1.5 text-sm shrink-0">
          <PlusCircle size={15} /> Signaler
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-orange-500">{active}</p>
          <p className="text-xs text-gray-400 mt-0.5">Annonces actives</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-green-500">{recovered}</p>
          <p className="text-xs text-gray-400 mt-0.5">Portefeuilles rendus</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions rapides</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            to="/posts/create"
            icon={PlusCircle}
            label="Signaler"
            desc="Publier une nouvelle annonce"
            color="bg-orange-500"
          />
          <QuickAction
            to="/messages"
            icon={MessageCircle}
            label="Messages"
            desc="Vos conversations"
            color="bg-purple-500"
          />
          <QuickAction
            to="/profile"
            icon={User}
            label="Profil"
            desc="Gérer votre compte"
            color="bg-gray-500"
          />
          {user?.role === 'admin' && (
            <QuickAction
              to="/admin"
              icon={Shield}
              label="Admin"
              desc="Tableau de bord admin"
              color="bg-red-500"
            />
          )}
        </div>
      </div>

      {/* Posts list */}
      <div>
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Mes annonces</h2>

        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
        )}

        {!loading && posts.length === 0 && (
          <div className="card text-center py-10">
            <Wallet size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium text-sm">Aucune annonce publiée</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">
              Vous avez trouvé un portefeuille ? Signalez-le ici.
            </p>
            <Link to="/posts/create" className="btn-primary text-sm">
              Publier une annonce
            </Link>
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
                <button
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1"
                >
                  <Eye size={13} /> Voir
                </button>
                {post.status === 'active' && (
                  <button
                    onClick={() => handleRecover(post.id)}
                    className="btn-secondary text-xs flex items-center gap-1 flex-1 text-green-600 border-green-200 hover:bg-green-50"
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
      </div>
    </div>
  )
}
