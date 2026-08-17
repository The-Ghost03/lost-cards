import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Copy, Check, Share2, X } from 'lucide-react'
import { sharePost, copyPostUrl } from '../lib/share'

/** Modal de partage qui apparaît après publication d'une annonce */
export default function SharePostModal({ post, onClose }) {
  const [copied, setCopied] = useState(false)
  // Empêche un double déclenchement popstate/clic (cf. ConfirmDialog).
  const closedRef = useRef(false)

  // Bouton retour Android (popstate) : ferme la modale comme un clic sur le backdrop.
  useEffect(() => {
    closedRef.current = false
    window.history.pushState({ modal: true }, '')
    const handlePopState = () => {
      if (closedRef.current) return
      closedRef.current = true
      onClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Fermeture "normale" (backdrop, croix, bouton) : ferme puis consomme
  // l'entrée d'historique factice poussée à l'ouverture.
  const handleClose = () => {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
    window.history.back()
  }

  const url = `${window.location.origin}/posts/${post.id}`
  const text = `Portefeuille trouvé pour ${post.name_partial || post.name_on_cards} à ${post.location}. Vérifie sur LostCards si ça correspond à toi ou à un proche.`

  const shareTo = (platform) => {
    const encodedUrl  = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text)
    const fullText    = encodeURIComponent(`${text}\n${url}`)

    const links = {
      whatsapp: `https://wa.me/?text=${fullText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      sms:      `sms:?body=${fullText}`,
      email:    `mailto:?subject=${encodeURIComponent('Portefeuille trouvé — LostCards')}&body=${fullText}`,
    }

    const link = links[platform]
    if (link) window.open(link, platform === 'sms' || platform === 'email' ? '_self' : '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    const ok = await copyPostUrl(post)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNative = () => sharePost(post)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-5 animate-slide-up relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors active:opacity-60"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Annonce publiée ! 🎉</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 px-2">
            Partagez-la pour aider le propriétaire à la retrouver plus vite.
          </p>
        </div>

        {/* Social grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <ShareIcon
            label="WhatsApp"
            onClick={() => shareTo('whatsapp')}
            bg="bg-[#25D366]"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M17.6 6.32A8 8 0 0 0 4.94 16l-1 4 4.1-1.08a8 8 0 0 0 12.18-6.72 7.95 7.95 0 0 0-2.62-5.88zm-5.6 12.36a6.65 6.65 0 0 1-3.4-.93l-.24-.14-2.43.64.65-2.37-.16-.25a6.66 6.66 0 1 1 5.58 3.05zm3.65-4.98c-.2-.1-1.18-.58-1.36-.65-.18-.07-.31-.1-.45.1s-.51.65-.63.78-.23.15-.43.05a5.46 5.46 0 0 1-2.71-2.37c-.2-.36.2-.33.59-1.11.06-.13.03-.24-.02-.34s-.45-1.08-.62-1.48c-.16-.39-.33-.34-.45-.34h-.39a.74.74 0 0 0-.55.26 2.27 2.27 0 0 0-.7 1.69 3.95 3.95 0 0 0 .82 2.1 9 9 0 0 0 3.44 3.04c.48.2.86.32 1.15.42.48.16.92.13 1.27.08.39-.06 1.18-.49 1.35-.96.17-.46.17-.86.12-.94s-.18-.13-.38-.23z" />
              </svg>
            }
          />
          <ShareIcon
            label="Facebook"
            onClick={() => shareTo('facebook')}
            bg="bg-[#1877F2]"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M13.5 21v-7.4h2.49l.37-2.9H13.5V8.85c0-.84.23-1.41 1.43-1.41h1.53V4.86a20.6 20.6 0 0 0-2.23-.11c-2.21 0-3.72 1.34-3.72 3.81v2.13H8v2.9h2.51V21h2.99z" />
              </svg>
            }
          />
          <ShareIcon
            label="X"
            onClick={() => shareTo('twitter')}
            bg="bg-black"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M18.244 3H21l-6.52 7.46L22.5 21h-6.41l-5.01-6.5L5.32 21H2.56l7-8L1.5 3h6.56l4.52 5.97L18.24 3zm-2.25 16.2h1.7L7.1 4.7H5.27l10.72 14.5z" />
              </svg>
            }
          />
          <ShareIcon
            label="Telegram"
            onClick={() => shareTo('telegram')}
            bg="bg-[#0088cc]"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
              </svg>
            }
          />
          <ShareIcon
            label="SMS"
            onClick={() => shareTo('sms')}
            bg="bg-blue-500"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 11H6v-2h12v2zm0-4H6V7h12v2z" />
              </svg>
            }
          />
          <ShareIcon
            label="Email"
            onClick={() => shareTo('email')}
            bg="bg-gray-500"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            }
          />
          <ShareIcon
            label="Autres"
            onClick={handleNative}
            bg="bg-orange-500"
            icon={<Share2 size={18} className="text-white" />}
          />
          <ShareIcon
            label={copied ? 'Copié !' : 'Copier'}
            onClick={handleCopy}
            bg={copied ? 'bg-green-500' : 'bg-gray-400'}
            icon={copied ? <Check size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
          />
        </div>

        {/* URL */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 mb-4 text-meta text-gray-500 dark:text-gray-400 font-mono truncate">
          {url}
        </div>

        <button
          onClick={handleClose}
          className="btn-secondary w-full text-sm"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

function ShareIcon({ label, onClick, bg, icon }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${bg} shadow-sm`}>
        {icon}
      </div>
      <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium leading-tight">{label}</span>
    </button>
  )
}
