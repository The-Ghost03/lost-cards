import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow]         = useState(false)
  const [iosHint, setIosHint]   = useState(false)

  useEffect(() => {
    // Already installed in standalone mode?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (standalone) return
    if (localStorage.getItem('install-dismissed-at')) {
      // Re-prompt after 7 days
      const dismissed = parseInt(localStorage.getItem('install-dismissed-at'), 10)
      if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
      setTimeout(() => setShow(true), 1500)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS Safari fallback (no beforeinstallprompt support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) {
      setTimeout(() => { setIosHint(true); setShow(true) }, 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try {
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') setShow(false)
    } catch {}
    setDeferred(null)
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('install-dismissed-at', Date.now().toString())
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up">
      <div className="bg-white border-2 border-orange-300 shadow-2xl rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-xl shrink-0 animate-float">
          📱
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900">Installer LostCards</p>
          {iosHint ? (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              Appuyez sur <Share size={12} className="inline" /> puis "Sur l'écran d'accueil"
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">Accès rapide en un clic</p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="btn-primary text-xs py-2 px-3 shrink-0 flex items-center gap-1 animate-pulse-glow"
          >
            <Download size={14} /> Installer
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 p-1 shrink-0 transition-colors"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
