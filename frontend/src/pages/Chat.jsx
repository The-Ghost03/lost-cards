import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMessages, sendMessage } from '../api/messages'
import { getPost, getContactRequests } from '../api/posts'
import { useAuth }   from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import { t }  from '../lib/toast'
import { ChevronLeft, Send, Wallet, CheckCircle, Lock } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
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
  return curr - prev > 10 * 60 * 1000
}

/* ── Component ────────────────────────────────────────────────────── */
export default function Chat() {
  const { postId }              = useParams()
  const { user }                = useAuth()
  const { refresh: refreshBadge } = useUnread()
  const navigate                = useNavigate()

  const [post,     setPost]     = useState(null)
  const [requests, setRequests] = useState([])
  const [messages, setMessages] = useState([])
  const [text,     setText]     = useState('')
  const [loading,  setLoading]  = useState(true)

  const bottomRef    = useRef(null)
  const textareaRef  = useRef(null)
  const lastCountRef = useRef(0)
  const isSending    = useRef(false)

  /* ── Load messages ────────────────────────────────────────────────*/
  const loadMessages = useCallback(async (silent = false) => {
    try {
      const res = await getMessages(postId)
      const msgs = res.data
      setMessages(prev => {
        // Keep any in-flight optimistic messages so they don't flicker
        const pending = prev.filter(m => m._pending)
        return pending.length > 0 ? [...msgs, ...pending] : msgs
      })
      if (msgs.length !== lastCountRef.current) {
        lastCountRef.current = msgs.length
        refreshBadge()
      }
    } catch {
      if (!silent) t.error('Erreur de chargement')
    }
  }, [postId, refreshBadge])

  /* ── Initial load ─────────────────────────────────────────────────*/
  useEffect(() => {
    Promise.all([
      getPost(postId),
      getMessages(postId),
      getContactRequests(postId).catch(() => ({ data: [] })),
    ])
      .then(([p, m, r]) => {
        setPost(p.data)
        setMessages(m.data)
        setRequests(r.data || [])
        lastCountRef.current = m.data.length
        refreshBadge()
      })
      .catch(() => t.error('Conversation introuvable'))
      .finally(() => setLoading(false))
  }, [postId])

  /* ── Scroll to bottom whenever messages update ────────────────────*/
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Poll every 5 s ───────────────────────────────────────────────*/
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

  /* ── Send — optimistic update ─────────────────────────────────────*/
  const handleSend = async () => {
    const content = text.trim()
    if (!content || isSending.current) return

    isSending.current = true

    // 1. Show message instantly in UI
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id:         tempId,
      content,
      sender_id:  user?.id,
      created_at: new Date().toISOString(),
      _pending:   true,
    }
    setText('')
    setMessages(prev => [...prev, tempMsg])

    // 2. Send to server in background
    try {
      const res = await sendMessage(postId, content)
      // Replace temp with real message (or drop if poll already got it)
      setMessages(prev => {
        const without = prev.filter(m => m.id !== tempId)
        if (without.some(m => m.id === res.data.id)) return without
        return [...without, res.data]
      })
    } catch (err) {
      // Roll back on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content)
      const msg = err.response?.data?.message || "Erreur d'envoi"
      t.error(msg)
    } finally {
      isSending.current = false
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Render ───────────────────────────────────────────────────────*/
  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col -mx-4"
      style={{ height: 'calc(100svh - 3.5rem - 4rem)' }}
    >
      {/* ── Chat header ─────────────────────────────────────────── */}
      <div className="flex-none flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <button
          onClick={() => navigate('/messages')}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
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
          <p className="text-xs text-gray-400 truncate">{post?.location}</p>
        </div>

        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
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
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm pt-10">
            Démarrez la conversation
          </p>
        )}

        {messages.map((msg, i) => {
          const mine    = msg.sender_id === user?.id
          const showSep = needsSeparator(messages, i)

          return (
            <div key={msg.id}>
              {showSep && (
                <p className="text-center text-xs text-gray-400 py-3">
                  {fmtTime(msg.created_at)}
                </p>
              )}

              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed transition-opacity ${
                    mine
                      ? 'bg-orange-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-2xl rounded-bl-sm'
                  } ${msg._pending ? 'opacity-60' : 'opacity-100'}`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────── */}
      {post?.status === 'recovered' ? (
        <div className="flex-none px-4 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-2">
          <Lock size={13} className="text-gray-400" />
          <p className="text-xs text-gray-400 font-medium">Cette conversation est clôturée</p>
        </div>
      ) : (post?.user_id === user?.id && !requests.some(r => ['pending','approved'].includes(r.status))) ? (
        <div className="flex-none px-4 py-4 bg-yellow-50 border-t border-yellow-200">
          <p className="text-xs text-yellow-800 font-medium text-center leading-relaxed">
            Aucun chercheur n'a encore envoyé son selfie pour cette annonce. Le chat s'ouvrira automatiquement à la première demande.
          </p>
          <button
            onClick={() => navigate(`/posts/${postId}`)}
            className="mt-2 w-full text-xs font-semibold text-yellow-900 bg-yellow-200 hover:bg-yellow-300 px-3 py-2 rounded-lg transition-colors"
          >
            Voir l'annonce →
          </button>
        </div>
      ) : (
        <div className="flex-none px-4 py-3 bg-white border-t border-gray-100">
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
              disabled={!text.trim()}
              className="shrink-0 w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
