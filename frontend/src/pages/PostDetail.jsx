import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPost, submitContact, approveContact, rejectContact, getContactRequests, markRecovered, getSelfie } from '../api/posts'
import { getMessages, sendMessage } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import { MapPin, FileText, Calendar, HelpCircle, Send, CheckCircle, MessageCircle, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const DOC_LABELS = {
  cni: 'CNI', permis: 'Permis', bancaire: 'Carte bancaire',
  assurance: 'Assurance', passeport: 'Passeport', sejour: 'Carte de séjour',
  electeur: "Carte d'électeur", autre: 'Autre',
}

export default function PostDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [post, setPost]       = useState(null)
  const [requests, setReqs]   = useState([])
  const [messages, setMsgs]   = useState([])
  const [selfie, setSelfie]         = useState(null)
  const [selfiePreview, setPreview]  = useState(null)
  const [selfieUrls, setSelfieUrls]  = useState({})
  const [enlargedSelfie, setEnlargedSelfie] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [loading, setLoading] = useState(true)
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
    }).catch(() => toast.error('Annonce introuvable'))
     .finally(() => setLoading(false))
  }, [id, user])

  const handleSelfieChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelfie(file)
    setPreview(URL.createObjectURL(file))
  }

  const submitContactRequest = async (e) => {
    e.preventDefault()
    if (!selfie) { toast.error('Veuillez prendre un selfie'); return }
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('selfie', selfie)
      const res = await submitContact(id, fd)
      setMyReq(res.data)
      toast.success('Selfie envoyé ! Le retrouveur va comparer avec la photo sur les pièces.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi')
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
      toast.error('Impossible de charger le selfie')
    }
  }

  const handleReject = async (requestId) => {
    try {
      await rejectContact(id, requestId)
      toast.success('Demande refusée.')
      const r = await getContactRequests(id)
      setReqs(r.data)
    } catch {
      toast.error('Erreur')
    }
  }

  const handleApprove = async (requestId) => {
    try {
      await approveContact(id, requestId)
      toast.success('Contact approuvé ! Le chat est maintenant ouvert.')
      const r = await getContactRequests(id)
      setReqs(r.data)
    } catch {
      toast.error('Erreur lors de l\'approbation')
    }
  }

  const handleSendMsg = async (e) => {
    e.preventDefault()
    if (!msgText.trim()) return
    setSending(true)
    try {
      const res = await sendMessage(id, msgText)
      setMsgs(prev => [...prev, res.data])
      setMsgText('')
    } catch {
      toast.error('Erreur d\'envoi')
    } finally {
      setSending(false)
    }
  }

  const handleRecover = async () => {
    if (!confirm('Marquer ce portefeuille comme récupéré ? L\'annonce sera archivée.')) return
    try {
      await markRecovered(id)
      toast.success('Portefeuille marqué comme récupéré !')
      navigate('/')
    } catch {
      toast.error('Erreur')
    }
  }

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
  if (!post)   return <div className="pt-10 text-center text-gray-500">Annonce introuvable</div>

  const isOwner   = user?.id === post.user_id
  const approved  = myRequest?.status === 'approved'
  const canChat   = isOwner || approved

  return (
    <div className="pt-6">
      <Link to="/" className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700">
        <ChevronLeft size={16} /> Toutes les annonces
      </Link>

      {/* Post card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{post.name_partial}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin size={12} /> {post.location}
              <span className="ml-3"><Calendar size={12} className="inline mr-1" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </span>
            </p>
          </div>
          {post.status === 'recovered' && (
            <span className="badge bg-green-100 text-green-700"><CheckCircle size={12} /> Récupéré</span>
          )}
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
        {isOwner && post.status !== 'recovered' && (
          <button onClick={handleRecover} className="btn-primary mt-3 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600">
            <CheckCircle size={16} /> Marquer comme récupéré
          </button>
        )}
      </div>

      {/* Contact section (non-owners) */}
      {!isOwner && user && post.status !== 'recovered' && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <HelpCircle size={16} className="text-orange-500" /> Réclamez ce portefeuille
          </h2>

          {!myRequest && (
            <form onSubmit={submitContactRequest} className="flex flex-col gap-3">
              <div className="bg-orange-50 p-3 rounded-xl text-xs text-gray-600">
                <p className="font-semibold text-orange-700 mb-1">📸 Vérification par selfie</p>
                <p>Prenez un selfie de votre visage. Le retrouveur le comparera avec la photo sur vos pièces d'identité trouvées.</p>
              </div>

              {/* Bouton capture / upload */}
              <input
                id="selfie-upload"
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleSelfieChange}
              />
              {selfiePreview && (
                <img src={selfiePreview} alt="Aperçu selfie" className="w-32 h-32 object-cover rounded-full border-4 border-orange-400 mx-auto" />
              )}
              <button
                type="button"
                onClick={() => document.getElementById('selfie-upload').click()}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-orange-400 text-orange-700 font-medium text-sm bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
              >
                🤳 {selfiePreview ? 'Changer le selfie' : 'Prendre un selfie'}
              </button>

              <button type="submit" className="btn-primary w-full" disabled={sending || !selfie}>
                {sending ? 'Envoi en cours...' : 'Envoyer mon selfie'}
              </button>
            </form>
          )}

          {myRequest?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
              📸 Selfie envoyé. Le retrouveur va vérifier que votre visage correspond aux pièces trouvées.
            </div>
          )}

          {myRequest?.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center justify-between gap-3">
              <span>Selfie non validé par le retrouveur.</span>
              <button
                className="text-red-700 underline text-xs font-medium shrink-0"
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
                  <p className="text-xs text-gray-400">{req.user?.phone}</p>
                </div>
                <span className={`badge text-xs ${
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
                        className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                        onClick={() => setEnlargedSelfie(selfieUrls[req.id])}
                      />
                    : <button
                        onClick={() => loadSelfie(req.id)}
                        className="text-xs bg-orange-50 border border-orange-300 text-orange-700 font-medium px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        📸 Voir le selfie
                      </button>
                  }
                </div>
              )}

              {/* Actions */}
              {req.status !== 'approved' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req.id)} className="btn-primary text-xs py-1 px-3 flex-1">
                    ✓ C'est bien lui / elle
                  </button>
                  {req.status === 'pending' && (
                    <button onClick={() => handleReject(req.id)} className="text-xs py-1 px-3 flex-1 rounded-xl border border-red-300 text-red-600 hover:bg-red-50">
                      ✗ Pas le bon
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 mb-3">
              Approuvez une demande ci-dessus pour pouvoir envoyer des messages.
            </div>
          )}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-3 pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Démarrez la conversation</p>
            )}
            {messages.map(msg => {
              const mine = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    mine ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'
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
            <button type="submit" className="btn-primary px-3" disabled={sending}>
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
          onClick={() => setEnlargedSelfie(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img
              src={enlargedSelfie}
              alt="Selfie agrandi"
              className="w-full rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setEnlargedSelfie(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-800 font-bold text-lg flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
