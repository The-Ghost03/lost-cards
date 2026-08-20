import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConversations } from '../api/messages'
import { useUnread } from '../context/UnreadContext'
import { MessageCircle, Wallet, ChevronRight } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Messages() {
  const [convos,  setConvos]  = useState([])
  const [loading, setLoading] = useState(true)
  const { refresh: refreshBadge } = useUnread()
  const navigate = useNavigate()

  useEffect(() => {
    getConversations()
      .then(r => { setConvos(r.data); refreshBadge() })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center pt-20 text-flame-700">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="pt-6">
      <h1 className="text-xl font-bold text-ink-950 mb-1">Messages</h1>
      <p className="text-ink-400 text-sm mb-6">
        Vos échanges avec les retrouveurs et propriétaires
      </p>

      {convos.length === 0 ? (
        <div className="card text-center py-12">
          <MessageCircle size={36} className="mx-auto text-ink-200 mb-3" />
          <p className="text-ink-600 font-medium">Aucune conversation</p>
          <p className="text-ink-400 text-meta mt-1">
            Vos messages apparaîtront ici une fois qu'une demande de contact est approuvée.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {convos.map(convo => {
            const hasUnread = convo.unread_count > 0
            return (
              <button
                key={convo.post_id}
                onClick={() => navigate(`/messages/${convo.post_id}`)}
                className={`card flex items-center gap-3 text-left hover:shadow-md transition-shadow ${
                  hasUnread ? 'border-l-4 border-flame-500' : ''
                }`}
              >
                {/* Avatar — icône neutre : le type (portefeuille) n'est pas un statut,
                    seul le fond plein vs discret distingue "non lu" (vrai signal). */}
                <div className={`rounded-full p-2.5 shrink-0 ${
                  hasUnread ? 'bg-flame-700' : 'bg-ink-100'
                }`}>
                  <Wallet size={18} className={hasUnread ? 'text-white' : 'text-ink-400'} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    hasUnread ? 'font-bold text-ink-950' : 'font-semibold text-ink-950'
                  }`}>
                    {convo.post?.name_partial}
                  </p>
                  <p className={`text-meta truncate ${
                    hasUnread ? 'text-ink-600 font-medium' : 'text-ink-400'
                  }`}>
                    {convo.last_message?.content || 'Pas encore de message'}
                  </p>
                </div>

                {/* Meta */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {convo.last_message && (
                    <span className="text-meta text-ink-400">
                      {formatDistanceToNow(new Date(convo.last_message.created_at), {
                        addSuffix: false, locale: fr,
                      })}
                    </span>
                  )}
                  {hasUnread && (
                    <span className="bg-flame-700 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {convo.unread_count > 9 ? '9+' : convo.unread_count}
                    </span>
                  )}
                </div>

                <ChevronRight size={16} className="text-ink-200 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
