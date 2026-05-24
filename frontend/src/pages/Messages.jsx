import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConversations } from '../api/messages'
import { MessageCircle, Wallet, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Messages() {
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getConversations()
      .then(r => setConvos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>

  return (
    <div className="pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Messages</h1>
      <p className="text-gray-500 text-sm mb-6">Vos échanges avec les retrouveurs et propriétaires</p>

      {convos.length === 0 ? (
        <div className="card text-center py-12">
          <MessageCircle size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">Aucune conversation</p>
          <p className="text-gray-400 text-xs mt-1">Vos messages apparaîtront ici après qu'une demande de contact est approuvée.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {convos.map(convo => (
            <button
              key={convo.post_id}
              onClick={() => navigate(`/posts/${convo.post_id}`)}
              className="card flex items-center gap-3 text-left hover:shadow-md transition-shadow"
            >
              <div className="bg-orange-100 rounded-full p-2.5 shrink-0">
                <Wallet size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{convo.post?.name_partial}</p>
                <p className="text-xs text-gray-400 truncate">{convo.last_message?.content || 'Pas encore de message'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">
                  {convo.last_message ? formatDistanceToNow(new Date(convo.last_message.created_at), { addSuffix: true, locale: fr }) : ''}
                </p>
                {convo.unread_count > 0 && (
                  <span className="inline-block bg-orange-500 text-white text-xs rounded-full w-5 h-5 leading-5 text-center mt-1">
                    {convo.unread_count}
                  </span>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
