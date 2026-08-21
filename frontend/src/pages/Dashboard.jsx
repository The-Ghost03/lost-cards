import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPosts, markRecovered, deletePost } from '../api/posts'
import { useAuth }        from '../context/AuthContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm }     from '../components/ConfirmDialog'
import { t }              from '../lib/toast'
import api                from '../api/axios'
import { SkeletonCard }   from '../components/Spinner'
import {
  PlusCircle, Wallet, CheckCircle, Trash2, Eye,
  Bell, MessageCircle, User, Search, Handshake,
  LayoutDashboard, Shield, Clock, XCircle, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr }                  from 'date-fns/locale'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  recovered: 'bg-gray-100 text-gray-500',
}

/* ── Quick-action secondaire ────────────────────────────────────────────
   Liste discrète (texte + icône ink-400, sans puce de fond colorée) : une
   seule action primaire par vue reste en `.btn-primary`, le reste descend
   ici pour casser la parité stricte dénoncée par l'audit design. */
function QuickActionRow({ to, onClick, icon: Icon, label, desc }) {
  const cls = 'flex items-center gap-3 py-2.5 text-left select-none active:scale-[.99] transition-colors'
  const inner = (
    <>
      <Icon size={18} className="text-ink-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-gray-700">{label}</p>
        {desc && <p className="text-meta text-gray-400 leading-snug">{desc}</p>}
      </div>
      <ChevronRight size={16} className="text-ink-400 shrink-0" />
    </>
  )
  return to
    ? <Link   to={to}      className={cls}>{inner}</Link>
    : <button onClick={onClick} className={`${cls} w-full`}>{inner}</button>
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const confirm    = useConfirm()
  const [posts, setPosts]     = useState([])
  const [myContacts, setMyContacts] = useState([])
  const [loading, setLoading] = useState(true)

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const isChercheur  = user?.status === 'chercheur'
  const firstName    = user?.name?.split(' ')[0]

  const load = () => {
    if (isRetrouveur) {
      getPosts({ my: 1 })
        .then(r => setPosts(r.data.data ?? r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (isChercheur) {
      api.get('/me/contacts')
        .then(r => setMyContacts(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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
            <h1 className="text-xl font-bold text-gray-900">Bonjour, {firstName}</h1>
          </div>
          <div className="inline-flex items-center gap-1.5 text-meta bg-flame-50 text-flame-700 font-semibold px-3 py-1 rounded-full">
            <Search size={12} /> Mode Chercheur
          </div>
        </div>

        {/* Quick actions — une seule action primaire, le reste en liste discrète */}
        <div>
          <p className="text-meta font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>

          <Link to="/alerts" className="btn-primary w-full flex items-center justify-center gap-2">
            <Bell size={16} /> Créer une alerte
          </Link>
          <p className="text-meta text-gray-400 mt-2 mb-1">Soyez notifié dès qu'un portefeuille vous correspond.</p>

          <div className="flex flex-col divide-y divide-ink-100 mt-2">
            <QuickActionRow to="/" icon={Search} label="Rechercher" desc="Chercher votre nom dans les annonces publiées" />
            <QuickActionRow to="/messages" icon={MessageCircle} label="Mes messages" desc="Discussions avec des retrouveurs" />
            <QuickActionRow to="/profile" icon={Handshake} label="Passer en mode Retrouveur" desc="Vous avez trouvé un portefeuille ? Changez de profil" />
          </div>
        </div>

        {/* Mes demandes en cours */}
        <div>
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center justify-between">
            <span>Mes demandes</span>
            <span className="text-meta font-normal text-gray-400">{myContacts.length} annonce{myContacts.length > 1 ? 's' : ''}</span>
          </h2>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
            </div>
          ) : myContacts.length === 0 ? (
            <div className="card text-center py-8">
              <Search size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 font-medium">Aucune demande en cours</p>
              <p className="text-meta text-gray-400 mt-1 mb-3">
                Trouvez votre nom dans une annonce et envoyez votre selfie pour entrer en contact.
              </p>
              <Link to="/" className="btn-primary text-meta inline-flex items-center gap-1">
                <Search size={12} /> Chercher mon nom
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {myContacts.map(c => <ContactCard key={c.id} contact={c} navigate={navigate} />)}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="bg-flame-50 border border-flame-500/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-flame-700 mb-1">Comment retrouver votre portefeuille ?</p>
          <ol className="text-meta text-flame-700 space-y-1 list-decimal list-inside leading-relaxed">
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
          <h1 className="text-xl font-bold text-gray-900">Bonjour, {firstName}</h1>
          <div className="inline-flex items-center gap-1.5 text-meta bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full mt-1">
            <Handshake size={12} /> Mode Retrouveur
          </div>
        </div>
        <Link to="/posts/create" className="btn-primary flex items-center gap-1.5 text-sm shrink-0">
          <PlusCircle size={15} /> Signaler
        </Link>
      </div>

      {/* Stats — la stat actionnable (mène aux annonces actives ci-dessous) pèse plus */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-fiche bg-flame-50 border border-flame-500/30 text-center py-4">
          <p className="text-display text-flame-700">{active}</p>
          <p className="text-meta text-ink-600 mt-0.5">Annonces actives</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-ink-600">{recovered}</p>
          <p className="text-meta text-gray-400 mt-0.5">Portefeuilles rendus</p>
        </div>
      </div>

      {/* Quick actions — "Signaler" est déjà l'action primaire du header,
          le reste descend en liste secondaire discrète. */}
      <div>
        <p className="text-meta font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions rapides</p>
        <div className="flex flex-col divide-y divide-ink-100">
          <QuickActionRow to="/messages" icon={MessageCircle} label="Messages" desc="Vos conversations" />
          <QuickActionRow to="/profile" icon={User} label="Profil" desc="Gérer votre compte" />
          {user?.role === 'admin' && (
            <QuickActionRow to="/admin" icon={Shield} label="Admin" desc="Tableau de bord admin" />
          )}
        </div>
      </div>

      {/* Posts list */}
      <div>
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Mes annonces</h2>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="card text-center py-10">
            <Wallet size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium text-sm">Aucune annonce publiée</p>
            <p className="text-gray-400 text-meta mt-1 mb-4">
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
                  <p className="text-meta text-gray-400 mt-0.5">
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
                  className="btn-secondary text-meta flex items-center gap-1 flex-1"
                >
                  <Eye size={13} /> Voir
                </button>
                {post.status === 'active' && (
                  <button
                    onClick={() => handleRecover(post.id)}
                    className="btn-secondary text-meta flex items-center gap-1 flex-1 text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle size={13} /> Récupéré
                  </button>
                )}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="btn-secondary text-meta flex items-center gap-1 text-red-500 border-red-100 hover:bg-red-50 px-3"
                  aria-label="Supprimer l'annonce"
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

/* ── Carte d'une demande envoyée par le chercheur ──────────────────────── */
function ContactCard({ contact, navigate }) {
  const post = contact.post
  if (!post) return null

  const statusMeta = {
    pending:  { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700', icon: <Clock      size={11} /> },
    approved: { label: 'Approuvé ✓',  color: 'bg-green-100 text-green-700',   icon: <CheckCircle size={11} /> },
    rejected: { label: 'Refusé',      color: 'bg-red-100 text-red-600',       icon: <XCircle    size={11} /> },
  }[contact.status] ?? { label: contact.status, color: 'bg-gray-100 text-gray-500', icon: null }

  // Approved → chat ; sinon → fiche annonce
  const targetUrl = contact.status === 'approved' ? `/messages/${post.id}` : `/posts/${post.id}`

  return (
    <button
      onClick={() => navigate(targetUrl)}
      className="card text-left hover:shadow-md transition-shadow active:scale-[.99] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-gray-800 text-sm truncate">{post.name_partial}</p>
            <span className={`badge text-meta ${statusMeta.color}`}>
              {statusMeta.icon} {statusMeta.label}
            </span>
            {contact.unread > 0 && (
              <span className="badge bg-flame-700 text-white">
                {contact.unread} nouveau{contact.unread > 1 ? 'x' : ''}
              </span>
            )}
          </div>
          <p className="text-meta text-gray-400">
            {post.location} · Envoyé {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true, locale: fr })}
          </p>
          {contact.status === 'approved' && (
            <p className="text-meta text-green-600 mt-1.5 flex items-center gap-1">
              <MessageCircle size={11} /> Ouvrir la conversation
            </p>
          )}
          {contact.status === 'pending' && (
            <p className="text-meta text-yellow-700 mt-1.5">
              ⏳ Le retrouveur vérifie votre selfie
            </p>
          )}
          {contact.status === 'rejected' && (
            <p className="text-meta text-red-600 mt-1.5">
              Non reconnu — vous pouvez réessayer
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>
    </button>
  )
}
