import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPost, submitContact, approveContact, getContactRequests, markRecovered } from '../api/posts'
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
  const [answer, setAnswer]   = useState('')
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

  const submitContactRequest = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await submitContact(id, { answer })
      setMyReq(res.data)
      toast.success('Demande envoyée ! Le retrouveur va vérifier votre réponse.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Réponse incorrecte ou erreur')
    } finally {
      setSending(false)
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
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700">
        <ChevronLeft size={16} /> Retour
      </button>

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
            <form onSubmit={submitContactRequest}>
              <p className="text-xs text-gray-500 mb-3 bg-orange-50 p-3 rounded-xl">
                <strong>Question du retrouveur :</strong> {post.secret_question}
              </p>
              <input
                type="text"
                className="input mb-3"
                placeholder="Votre réponse..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full" disabled={sending}>
                {sending ? 'Envoi...' : 'Envoyer ma demande'}
              </button>
            </form>
          )}

          {myRequest?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
              Demande envoyée. En attente de validation par le retrouveur...
            </div>
          )}

          {myRequest?.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Réponse incorrecte. Vous pouvez réessayer.
            </div>
          )}
        </div>
      )}

      {/* Owner: incoming contact requests */}
      {isOwner && requests.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Demandes reçues</h2>
          {requests.map(req => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{req.user?.name}</p>
                  <p className="text-xs text-gray-500">Réponse : <em>{req.answer}</em></p>
                </div>
                {req.status === 'pending' && (
                  <button onClick={() => handleApprove(req.id)} className="btn-primary text-xs py-1 px-3">
                    Valider
                  </button>
                )}
                {req.status === 'approved' && (
                  <span className="badge bg-green-100 text-green-700">Approuvé</span>
                )}
              </div>
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
    </div>
  )
}
