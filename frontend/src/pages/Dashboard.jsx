import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPosts, markRecovered, deletePost, getMyContactRequests, getMyIncomingRequests } from '../api/posts'
import { useAuth }        from '../context/AuthContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm }     from '../components/ConfirmDialog'
import { t }              from '../lib/toast'
import {
  PlusCircle, Wallet, CheckCircle, Trash2, Eye,
  Bell, MessageCircle, User, Search, Handshake,
  Shield, Clock, XCircle, Inbox, Camera, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr }                  from 'date-fns/locale'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  recovered: 'bg-gray-100 text-gray-500',
}

const REQ_META = {
  pending:  { icon: Clock,       label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { icon: CheckCircle, label: 'Approuvée',  cls: 'bg-green-100 text-green-700' },
  rejected: { icon: XCircle,     label: 'Refusée',    cls: 'bg-red-100 text-red-600' },
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

/* ── Ligne demande (utilisée par Chercheur et Retrouveur) ───────────── */
function RequestRow({ req, side, onClick }) {
  const meta = REQ_META[req.status]
  return (
    <button
      onClick={onClick}
      className="card-hover w-full text-left flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
        <Wallet size={18} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">
          {req.post?.name_partial || 'Annonce supprimée'}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {side === 'incoming' && req.user ? `Demande de ${req.user.name} · ` : ''}
          {req.post?.location ? `${req.post.location} · ` : ''}
          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`badge ${meta.cls}`}>
          <meta.icon size={11} /> {meta.label}
        </span>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
    </button>
  )
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const confirm    = useConfirm()

  const [posts,     setPosts]     = useState([])
  const [myReqs,    setMyReqs]    = useState([])
  const [incoming,  setIncoming]  = useState([])
  const [loading,   setLoading]   = useState(true)

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const isChercheur  = user?.status === 'chercheur'
  const firstName    = user?.name?.split(' ')[0]

  const load = async () => {
    setLoading(true)
    try {
      if (isRetrouveur) {
        const [pRes, inRes] = await Promise.all([
          getPosts({ my: 1 }),
          getMyIncomingRequests().catch(() => ({ data: [] })),
        ])
        setPosts(pRes.data.data ?? pRes.data)
        setIncoming(inRes.data ?? [])
      } else if (isChercheur) {
        const myRes = await getMyContactRequests().catch(() => ({ data: [] }))
        setMyReqs(myRes.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user?.status) load() }, [user?.status])

  /* ── Recover ─────────────────────────────────────────────────────── */
  const { run: handleRecover } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title: 'Marquer comme récupéré ?', message: 'Le propriétaire a récupéré ses pièces.',
      confirmLabel: 'Confirmer', cancelLabel: 'Annuler',
    })
    if (!ok) return
    await markRecovered(id)
    t.success('Marqué comme récupéré')
    load()
  })

  /* ── Delete ─────────────────────────────────────────────────────── */
  const { run: handleDelete } = useAsyncAction(async (id) => {
    const ok = await confirm({
      title: "Supprimer l'annonce ?", message: 'Cette annonce sera retirée définitivement.',
      danger: true, confirmLabel: 'Supprimer', cancelLabel: 'Annuler',
    })
    if (!ok) return
    await deletePost(id)
    t.success('Annonce supprimée')
    load()
  })

  /* ═════════════════════════════════════════════════════════════════ */
  /*  VUE CHERCHEUR                                                     */
  /* ═════════════════════════════════════════════════════════════════ */
  if (isChercheur) {
    const pending  = myReqs.filter(r => r.status === 'pending').length
    const approved = myReqs.filter(r => r.status === 'approved').length
    const rejected = myReqs.filter(r => r.status === 'rejected').length

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

        {/* Stats demandes */}
        {myReqs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-yellow-600">{pending}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">En attente</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-green-600">{approved}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Approuvées</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-red-500">{rejected}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Refusées</p>
            </div>
          </div>
        )}

        {/* Mes demandes envoyées */}
        <div>
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <Camera size={16} className="text-orange-500" /> Mes demandes envoyées
          </h2>

          {loading && (
            <div className="text-center py-6 text-gray-400 text-sm">Chargement...</div>
          )}

          {!loading && myReqs.length === 0 && (
            <div className="card text-center py-10">
              <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium text-sm">Aucune demande envoyée</p>
              <p className="text-gray-400 text-xs mt-1 mb-4">
                Cherchez votre nom et envoyez un selfie pour réclamer un portefeuille.
              </p>
              <Link to="/" className="btn-primary text-sm">Rechercher</Link>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {myReqs.map(req => (
              <RequestRow
                key={req.id}
                req={req}
                side="outgoing"
                onClick={() => navigate(`/posts/${req.post_id}`)}
              />
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>
          <div className="flex flex-col gap-3">
            <QuickAction to="/alerts"    icon={Bell}          label="Créer une alerte"
              desc="Soyez notifié dès qu'un portefeuille vous correspond" color="bg-orange-500" />
            <QuickAction to="/"          icon={Search}        label="Rechercher"
              desc="Chercher votre nom dans les annonces" color="bg-blue-500" />
            <QuickAction to="/messages"  icon={MessageCircle} label="Mes messages"
              desc="Discussions approuvées" color="bg-purple-500" />
            <QuickAction to="/profile"   icon={Handshake}     label="Passer en mode Retrouveur"
              desc="Vous avez trouvé un portefeuille ?" color="bg-green-500" />
          </div>
        </div>
      </div>
    )
  }

  /* ═════════════════════════════════════════════════════════════════ */
  /*  VUE RETROUVEUR                                                    */
  /* ═════════════════════════════════════════════════════════════════ */
  const active     = posts.filter(p => p.status === 'active').length
  const recovered  = posts.filter(p => p.status === 'recovered').length
  const inPending  = incoming.filter(r => r.status === 'pending').length

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
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-orange-500">{active}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Actives</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-yellow-600">{inPending}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">À traiter</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-green-500">{recovered}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Rendus</p>
        </div>
      </div>

      {/* Demandes reçues à traiter */}
      {incoming.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <Inbox size={16} className="text-orange-500" /> Demandes reçues
            {inPending > 0 && (
              <span className="bg-yellow-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {inPending}
              </span>
            )}
          </h2>
          <div className="flex flex-col gap-2">
            {incoming.slice(0, 5).map(req => (
              <RequestRow
                key={req.id}
                req={req}
                side="incoming"
                onClick={() => navigate(`/posts/${req.post_id}`)}
              />
            ))}
            {incoming.length > 5 && (
              <p className="text-xs text-gray-400 text-center mt-1">
                + {incoming.length - 5} autres demandes (voir dans chaque annonce)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions rapides</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction to="/posts/create" icon={PlusCircle}    label="Signaler"
            desc="Nouvelle annonce" color="bg-orange-500" />
          <QuickAction to="/messages"     icon={MessageCircle} label="Messages"
            desc="Conversations" color="bg-purple-500" />
          <QuickAction to="/profile"      icon={User}          label="Profil"
            desc="Gérer votre compte" color="bg-gray-500" />
          {user?.role === 'admin' && (
            <QuickAction to="/admin"      icon={Shield}        label="Admin"
              desc="Tableau de bord admin" color="bg-red-500" />
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
            <Link to="/posts/create" className="btn-primary text-sm">Publier une annonce</Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {posts.map(post => {
            const postReqs    = incoming.filter(r => r.post_id === post.id)
            const postPending = postReqs.filter(r => r.status === 'pending').length
            return (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{post.name_on_cards}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {post.location} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge ${STATUS_BADGE[post.status]}`}>
                      {post.status === 'active' ? 'Active' : 'Récupéré'}
                    </span>
                    {postPending > 0 && (
                      <span className="badge bg-yellow-100 text-yellow-700">
                        <Clock size={10} /> {postPending} en attente
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate(`/posts/${post.id}`)}
                    className="btn-secondary text-xs flex items-center gap-1 flex-1">
                    <Eye size={13} /> Voir
                  </button>
                  {post.status === 'active' && (
                    <button onClick={() => handleRecover(post.id)}
                      className="btn-secondary text-xs flex items-center gap-1 flex-1 text-green-600 border-green-200 hover:bg-green-50">
                      <CheckCircle size={13} /> Récupéré
                    </button>
                  )}
                  <button onClick={() => handleDelete(post.id)}
                    className="btn-secondary text-xs flex items-center gap-1 text-red-500 border-red-100 hover:bg-red-50 px-3">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
