import { usePageMeta } from '../lib/usePageMeta'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPost, submitContact, approveContact, rejectContact, getContactRequests, markRecovered, getSelfie, deletePost } from '../api/posts'
import { getMessages, sendMessage } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import { MapPin, FileText, Calendar, HelpCircle, Send, CheckCircle, XCircle, MessageCircle, ChevronLeft, Camera, Trash2, Shield, Share2 } from 'lucide-react'
import { sharePost } from '../lib/share'
import SelfieCapture from '../components/SelfieCapture'
import { Spinner } from '../components/Spinner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { t } from '../lib/toast'
import { useAsyncAction } from '../lib/useAsyncAction'
import { useConfirm } from '../components/ConfirmDialog'
import { ficheRef } from '../lib/ficheRef'

const DOC_LABELS = {
  cni: 'CNI', permis: 'Permis', bancaire: 'Carte bancaire',
  assurance: 'Assurance', passeport: 'Passeport', sejour: 'Carte de séjour',
  electeur: "Carte d'électeur", autre: 'Autre',
}

export default function PostDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const confirm  = useConfirm()

  const [post, setPost]       = useState(null)
  const [requests, setReqs]   = useState([])
  const [messages, setMsgs]   = useState([])
  const [selfie, setSelfie]         = useState(null)
  const [selfiePreview, setPreview]  = useState(null)
  const [selfieUrls, setSelfieUrls]  = useState({})
  const [enlargedSelfie, setEnlargedSelfie] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [loading, setLoading] = useState(true)
  const docLabel = post ? (DOC_LABELS[post.type_doc] || post.type_doc || 'Document') : ''
  usePageMeta(post ? {
    title: `${docLabel} perdu(e) — ${post.location || 'Abidjan'}`,
    description: `Quelqu'un a perdu son ${(docLabel || 'document').toLowerCase()} à ${post.location || 'Abidjan'}. Vous l'avez trouvé ? Contactez le propriétaire sur LostCards.`,
    url: `https://lost-card.softskills.ci/posts/${post.id}`,
  } : {})
  const [sending, setSending] = useState(false)
  const [myRequest, setMyReq] = useState(null)

  useEffect(() => {
    Promise.all([
      getPost(id),
      user ? getContactRequests(id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      user ? getMessages(id).catch(() => ({ data: [] }))       : Promise.resolve({ data: [] }),
    ]).then(([p, r, m]) => {
      setPost(p.data)
      setReqs(r.data)
      setMsgs(m.data)
      if (user) {
        setMyReq(r.data.find(req => req.user_id === user.id) || null)
      }
    }).catch(() => t.error('Annonce introuvable'))
     .finally(() => setLoading(false))
  }, [id, user])

  // Bouton retour Android (popstate) : ferme la lightbox au lieu de quitter la page.
  const lightboxClosedRef = useRef(false)
  useEffect(() => {
    if (!enlargedSelfie) return
    lightboxClosedRef.current = false
    window.history.pushState({ modal: true }, '')
    const handlePopState = () => {
      if (lightboxClosedRef.current) return
      lightboxClosedRef.current = true
      setEnlargedSelfie(null)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [enlargedSelfie])

  // Fermeture "normale" (clic backdrop / croix) : ferme puis consomme
  // l'entrée d'historique factice poussée à l'ouverture.
  const closeLightbox = () => {
    if (lightboxClosedRef.current) return
    lightboxClosedRef.current = true
    setEnlargedSelfie(null)
    window.history.back()
  }

  const handleSelfieCapture = (file, previewUrl) => {
    setSelfie(file)
    setPreview(previewUrl)
  }

  const submitContactRequest = async (e) => {
    e.preventDefault()
    if (!selfie) { t.error('Veuillez prendre un selfie'); return }
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('selfie', selfie)
      const res = await submitContact(id, fd)
      setMyReq(res.data)
      t.success('Selfie envoyé ! Le retrouveur va comparer avec la photo sur les pièces.')
    } catch (err) {
      t.error(err.response?.data?.message || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  const loadSelfie = async (reqId) => {
    if (selfieUrls[reqId]) return // already loaded
    try {
      const res = await getSelfie(id, reqId)
      const url = URL.createObjectURL(res.data)
      setSelfieUrls(prev => ({ ...prev, [reqId]: url }))
    } catch {
      t.error('Impossible de charger le selfie')
    }
  }

  const { run: handleReject, loading: rejecting } = useAsyncAction(async (requestId) => {
    try {
      await rejectContact(id, requestId)
      t.success('Demande refusée.')
      const r = await getContactRequests(id)
      setReqs(r.data)
    } catch {
      t.error('Erreur')
    }
  })

  const { run: handleApprove, loading: approving } = useAsyncAction(async (requestId) => {
    try {
      await approveContact(id, requestId)
      t.success('Contact approuvé ! Le chat est maintenant ouvert.')
      const r = await getContactRequests(id)
      setReqs(r.data)
    } catch {
      t.error('Erreur lors de l\'approbation')
    }
  })

  const { run: handleSendMsg, loading: sendingMsg } = useAsyncAction(async (e) => {
    e.preventDefault()
    if (!msgText.trim()) return
    try {
      const res = await sendMessage(id, msgText)
      setMsgs(prev => [...prev, res.data])
      setMsgText('')
    } catch {
      t.error('Erreur d\'envoi')
    }
  })

  const { run: handleRecover } = useAsyncAction(async () => {
    if (!(await confirm({ title: 'Marquer ce portefeuille comme récupéré ?', message: 'L\'annonce sera archivée.', confirmLabel: 'Confirmer' }))) return
    try {
      await markRecovered(id)
      t.success('Portefeuille marqué comme récupéré !')
      navigate('/')
    } catch {
      t.error('Erreur')
    }
  })

  const { run: handleDelete, loading: deleting } = useAsyncAction(async () => {
    if (!(await confirm({
      title: 'Supprimer cette annonce ?',
      message: 'Cette annonce sera retirée définitivement de la plateforme.',
      danger: true,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
    }))) return
    try {
      await deletePost(id)
      t.success('Annonce supprimée.')
      navigate('/')
    } catch {
      t.error('Erreur lors de la suppression')
    }
  })

  if (loading) return <div className="flex justify-center pt-20 text-orange-500"><Spinner size={32} /></div>
  if (!post)   return <div className="pt-10 text-center text-gray-500">Annonce introuvable</div>

  const isOwner       = user?.id === post.user_id
  const isAdmin       = user?.role === 'admin'
  const isAdminViewer = isAdmin && !isOwner   // admin reading someone else's post
  const approved      = myRequest?.status === 'approved'
  const canChat       = isOwner || approved

  return (
    <div className="pt-6">
      <Link to="/" className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700 active:opacity-60 transition-opacity duration-100">
        <ChevronLeft size={16} /> Toutes les annonces
      </Link>

      {/* Galerie photos (si présentes) */}
      {post.photos && post.photos.length > 0 && (
        <div className="mb-4">
          <div className={`grid gap-2 ${post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => setEnlargedSelfie(photo.url)}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
              >
                <img
                  src={photo.url}
                  alt="Photo de l'annonce"
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 active:scale-95 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{post.name_partial}</h1>
            <p className="font-mono text-ref text-ink-400 uppercase tracking-[0.06em] mt-0.5">FICHE {ficheRef(post.id)}</p>
            <p className="text-meta text-gray-400 flex items-center gap-1 mt-1">
              <MapPin size={12} /> {post.location}
              <span className="ml-3"><Calendar size={12} className="inline mr-1" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {post.status === 'recovered' && (
              <span className="badge bg-green-100 text-green-700"><CheckCircle size={12} /> Récupéré</span>
            )}
            <button
              onClick={() => sharePost(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors active:scale-95 transition-transform duration-100 text-meta font-semibold"
              aria-label="Partager cette annonce"
            >
              <Share2 size={14} />
              <span>Partager</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.documents.map(doc => (
            <span key={doc} className="badge bg-orange-50 text-orange-700">
              <FileText size={11} /> {DOC_LABELS[doc] || doc}
            </span>
          ))}
        </div>

        {/* Recovered address (shown only after approval) */}
        {canChat && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
            <p className="font-semibold text-green-800 mb-1">Adresse de récupération</p>
            <p className="text-green-700">{post.pickup_address}</p>
          </div>
        )}

        {/* Owner actions */}
        {(isOwner || approved) && post.status !== 'recovered' && (
          <button onClick={handleRecover} className="btn-primary mt-3 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600">
            <CheckCircle size={16} /> Marquer comme récupéré
          </button>
        )}
      </div>

      {/* ── Admin panel (read-only view for admin who is not the post owner) ── */}
      {isAdminViewer && (
        <div className="card mb-4 border border-ink-200 bg-ink-100">
          <p className="font-mono text-ref text-ink-400 uppercase tracking-[0.06em] mb-2">ADMIN · LECTURE SEULE</p>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <Shield size={16} /> Vue Administration
            </h2>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-secondary text-meta text-red-500 border-red-200 hover:bg-red-100 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={13} />
              {deleting ? 'Suppression...' : "Supprimer l'annonce"}
            </button>
          </div>

          {/* Contact requests — read only, no approve/reject */}
          {requests.length > 0 && (
            <div className="mb-4">
              <p className="text-meta font-semibold text-gray-400 uppercase tracking-wide mb-2">Demandes de contact</p>
              <div className="flex flex-col gap-2">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{req.user?.name}</p>
                      <p className="text-meta text-gray-400">{req.user?.phone}</p>
                    </div>
                    <span className={`badge text-meta ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {req.status === 'approved' ? '✓ Approuvé'
                        : req.status === 'rejected' ? '✗ Refusé'
                        : '⏳ En attente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages — read only, no send form */}
          <div>
            <p className="text-meta font-semibold text-gray-400 uppercase tracking-wide mb-2">Messagerie</p>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto overscroll-contain">
              {messages.length === 0 && (
                <p className="text-meta text-gray-400 text-center py-4">Aucun message sur cette annonce</p>
              )}
              {messages.map(msg => (
                <div key={msg.id} className="flex flex-col gap-0.5">
                  <p className="text-meta text-gray-400 px-1">{msg.sender?.name || 'Utilisateur'}</p>
                  <div className="bg-white dark:bg-gray-800 text-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%] shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact section (non-owners, non-admin) */}
      {!isOwner && !isAdminViewer && user && post.status !== 'recovered' && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <HelpCircle size={16} className="text-orange-500" /> Réclamez ce portefeuille
          </h2>

          {!myRequest && (
            <form onSubmit={submitContactRequest} className="flex flex-col gap-3">
              <div className="bg-orange-50 p-3 rounded-xl text-meta text-gray-600">
                <p className="font-semibold text-orange-700 mb-1 flex items-center gap-1.5"><Camera size={14} /> Vérification par selfie</p>
                <p>Prenez un selfie de votre visage. Le retrouveur le comparera avec la photo sur vos pièces d'identité trouvées.</p>
              </div>

              {/* Caméra selfie */}
              <SelfieCapture onCapture={handleSelfieCapture} preview={selfiePreview} />

              <button type="submit" className="btn-primary w-full" disabled={sending || !selfie}>
                {sending ? 'Envoi en cours...' : 'Envoyer mon selfie'}
              </button>
            </form>
          )}

          {myRequest?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
              Selfie envoyé. Le retrouveur va vérifier que votre visage correspond aux pièces trouvées.
            </div>
          )}

          {myRequest?.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center justify-between gap-3">
              <span>Selfie non validé par le retrouveur.</span>
              <button
                className="text-red-700 underline text-meta font-medium shrink-0"
                onClick={() => { setMyReq(null); setSelfie(null); setPreview(null) }}
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Owner: incoming contact requests */}
      {isOwner && requests.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Demandes reçues</h2>
          {requests.map(req => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3 mb-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{req.user?.name}</p>
                  <p className="text-meta text-gray-400">{req.user?.phone}</p>
                </div>
                <span className={`badge text-meta ${
                  req.status === 'approved' ? 'bg-green-100 text-green-700' :
                  req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {req.status === 'approved' ? '✓ Approuvé' : req.status === 'rejected' ? '✗ Refusé' : '⏳ En attente'}
                </span>
              </div>

              {/* Selfie viewer */}
              {req.selfie_path && (
                <div className="flex items-center gap-2">
                  {selfieUrls[req.id]
                    ? <img
                        src={selfieUrls[req.id]}
                        alt="Selfie"
                        className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 active:opacity-70 transition-opacity"
                        onClick={() => setEnlargedSelfie(selfieUrls[req.id])}
                      />
                    : <button
                        onClick={() => loadSelfie(req.id)}
                        className="text-meta bg-orange-50 border border-orange-300 text-orange-700 font-medium px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors active:scale-95 transition-transform duration-100"
                      >
                        Voir le selfie
                      </button>
                  }
                </div>
              )}

              {/* Actions */}
              {req.status !== 'approved' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req.id)} disabled={approving || rejecting} className="btn-primary text-meta py-1 px-3 flex-1">
                    {approving ? '...' : <><CheckCircle size={12} className="inline mr-1" /> C'est bien lui / elle</>}
                  </button>
                  {req.status === 'pending' && (
                    <button onClick={() => handleReject(req.id)} disabled={approving || rejecting} className="text-meta py-1 px-3 flex-1 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors active:scale-95">
                      {rejecting ? '...' : <><XCircle size={12} className="inline mr-1" /> Pas le bon</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      {canChat && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-orange-500" /> Messagerie
          </h2>

          {isOwner && !requests.some(r => r.status === 'approved') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-meta text-yellow-700 mb-3">
              Approuvez une demande ci-dessus pour pouvoir envoyer des messages.
            </div>
          )}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto overscroll-contain mb-3 pr-1">
            {messages.length === 0 && (
              <p className="text-meta text-gray-400 text-center py-4">Démarrez la conversation</p>
            )}
            {messages.map(msg => {
              const mine = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    mine ? 'bg-flame-700 text-white' : 'bg-ink-100 text-ink-950'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSendMsg} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Votre message..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
            />
            <button type="submit" className="btn-primary px-3" disabled={sendingMsg} aria-label="Envoyer le message">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {!user && post.status !== 'recovered' && (
        <div className="card text-center py-6">
          <p className="text-gray-600 text-sm mb-3">Connectez-vous pour réclamer ce portefeuille</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Se connecter</button>
        </div>
      )}

      {/* Lightbox */}
      {enlargedSelfie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img
              src={enlargedSelfie}
              alt="Selfie agrandi"
              className="w-full rounded-2xl shadow-2xl"
            />
            <button
              onClick={closeLightbox}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-800 font-bold text-lg flex items-center justify-center shadow-float hover:bg-gray-100 active:scale-95 transition-transform duration-100"
              aria-label="Fermer l'image agrandie"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
