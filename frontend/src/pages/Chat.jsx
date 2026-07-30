import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMessages, sendMessage } from '../api/messages'
import { getPost } from '../api/posts'
import { useAuth }   from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import { useAsyncAction } from '../lib/useAsyncAction'
import { t }  from '../lib/toast'
import { ChevronLeft, Send, Wallet, CheckCircle } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtTime(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Hier ' + format(d, 'HH:mm')
  return format(d, 'd MMM HH:mm', { locale: fr })
}

function needsSeparator(msgs, i) {
  if (i === 0) return true
  const prev = new Date(msgs[i - 1].created_at)
  const curr = new Date(msgs[i].created_at)
  return curr - prev > 10 * 60 * 1000 // 10 min gap
}

/* ── Component ────────────────────────────────────────────────────── */
export default function Chat() {
  const { postId }              = useParams()
  const { user }                = useAuth()
  const { refresh: refreshBadge } = useUnread()
  const navigate                = useNavigate()

  const [post,     setPost]     = useState(null)
  const [messages, setMessages] = useState([])
  const [text,     setText]     = useState('')
  const [loading,  setLoading]  = useState(true)

  const bottomRef        = useRef(null)
  const textareaRef      = useRef(null)
  const lastCountRef     = useRef(0)
  const scrollContainerRef = useRef(null)
  const isAtBottomRef    = useRef(true)   // l'utilisateur lit-il en bas ?

  /* ── Load messages (also marks as read on backend) ────────────────*/
  const loadMessages = useCallback(async (silent = false) => {
    try {
      const res = await getMessages(postId)
      const serverMsgs = res.data
      // Préserve les messages optimistes (en attente) qui n'ont pas encore
      // été remplacés par leur version serveur
      setMessages(prev => {
        const pending = prev.filter(m => m._pending)
        return [...serverMsgs, ...pending]
      })
      if (serverMsgs.length !== lastCountRef.current) {
        lastCountRef.current = serverMsgs.length
        refreshBadge()
      }
    } catch {
      if (!silent) t.error('Erreur de chargement')
    }
  }, [postId, refreshBadge])

  /* ── Initial load ─────────────────────────────────────────────────*/
  useEffect(() => {
    Promise.all([getPost(postId), getMessages(postId)])
      .then(([p, m]) => {
        setPost(p.data)
        setMessages(m.data)
        lastCountRef.current = m.data.length
        refreshBadge()
      })
      .catch(() => t.error('Conversation introuvable'))
      .finally(() => setLoading(false))
  }, [postId])

  /* ── Auto-scroll bas SEULEMENT si l'utilisateur est déjà près du bas
     (sinon il est en train de lire en haut, on ne le bouge pas)
  */
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  /* Track si l'utilisateur est en bas (à 80px près) */
  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = gap < 80
  }

  /* ── Poll for new messages every 5 s ─────────────────────────────*/
  useEffect(() => {
    const timer = setInterval(() => loadMessages(true), 5000)
    return () => clearInterval(timer)
  }, [loadMessages])

  /* ── Auto-grow textarea ───────────────────────────────────────────*/
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  /* ── Send (optimistic UI) ─────────────────────────────────────────
     Le message s'affiche INSTANTANÉMENT avec un ID temporaire (négatif).
     L'API call part en parallèle ; au retour on remplace l'optimiste par
     le vrai message (ou on le retire en cas d'erreur).
  */
  const handleSend = () => {
    const content = text.trim()
    if (!content) return

    // ID temporaire négatif pour distinguer du backend
    const tmpId = -Date.now()
    const optimistic = {
      id:         tmpId,
      post_id:    Number(postId),
      sender_id:  user?.id,
      content,
      created_at: new Date().toISOString(),
      _pending:   true,   // flag pour ajuster l'affichage si on veut
    }

    setMessages(prev => [...prev, optimistic])
    setText('')

    // Envoi non bloquant — résultat traité en arrière-plan
    sendMessage(postId, content)
      .then(res => {
        // Remplace l'optimiste par le vrai message du serveur
        setMessages(prev => prev.map(m => m.id === tmpId ? res.data : m))
      })
      .catch(() => {
        // Retire l'optimiste, restaure le texte
        setMessages(prev => prev.filter(m => m.id !== tmpId))
        setText(content)
        t.error("Erreur d'envoi")
      })
  }
  const sending = false   // gardé pour compat avec l'attribut disabled

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Render ───────────────────────────────────────────────────────*/
  if (loading) {
    return (
      <div className="flex justify-center pt-20 text-orange-500">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    /* Fixed overlay between top-nav (3.5rem) and bottom-tabs (4rem)
       → header et input bar restent toujours visibles, seul le centre scrolle.
    */
    <div
      className="fixed left-0 right-0 flex flex-col bg-white dark:bg-gray-950 z-20"
      style={{ top: '3.5rem', bottom: '4rem' }}
    >
      {/* ── Chat header (sticky en haut du conteneur) ──────────── */}
      <div className="flex-none flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => navigate('/messages')}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Retour aux conversations"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <Wallet size={16} className="text-orange-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
            {post?.name_partial}
          </p>
          <p className="text-meta text-gray-400 truncate">{post?.location}</p>
        </div>

        <span className={`shrink-0 text-meta font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
          post?.status === 'recovered'
            ? 'bg-gray-100 text-gray-500'
            : 'bg-green-100 text-green-700'
        }`}>
          {post?.status === 'recovered'
            ? 'Clôturé'
            : <><CheckCircle size={11} /> Actif</>
          }
        </span>
      </div>

      {/* ── Messages ────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 bg-gray-50 dark:bg-gray-950 space-y-1"
      >
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm pt-10">
            Démarrez la conversation
          </p>
        )}

        {messages.map((msg, i) => {
          const mine = msg.sender_id === user?.id
          const showSep = needsSeparator(messages, i)

          return (
            <div key={msg.id}>
              {showSep && (
                <p className="text-center text-meta text-gray-400 py-3">
                  {fmtTime(msg.created_at)}
                </p>
              )}

              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed transition-opacity ${
                    mine
                      ? 'bg-orange-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-2xl rounded-bl-sm'
                  } ${msg._pending ? 'opacity-70' : ''}`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar (sticky en bas du conteneur) ──────────────── */}
      <div className="flex-none px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Votre message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 input resize-none py-2.5 text-sm overflow-hidden"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="shrink-0 w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Envoyer le message"
          >
            {sending ? <Spinner size={16} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
