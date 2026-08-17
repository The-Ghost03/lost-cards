import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState]   = useState(null)
  const resolverRef         = useRef(null)
  // Empêche un double déclenchement quand la fermeture "normale" (clic) consomme
  // elle-même l'entrée d'historique factice, ce qui redéclenche `popstate`.
  const closedRef           = useRef(false)

  const confirm = (options = {}) =>
    new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        title:        options.title        || 'Confirmer',
        message:      options.message      || 'Êtes-vous sûr ?',
        danger:       options.danger       ?? false,
        confirmLabel: options.confirmLabel || 'Confirmer',
        cancelLabel:  options.cancelLabel  || 'Annuler',
      })
    })

  const answer = (result) => {
    setState(null)
    resolverRef.current?.(result)
    resolverRef.current = null
  }

  // Fermeture déclenchée par une action utilisateur normale (clic backdrop /
  // bouton) : on répond puis on consomme l'entrée d'historique factice.
  const close = (result) => {
    if (closedRef.current) return
    closedRef.current = true
    answer(result)
    window.history.back()
  }

  // Bouton retour Android (popstate) : la modale se ferme comme une annulation.
  useEffect(() => {
    if (!state) return
    closedRef.current = false
    window.history.pushState({ modal: true }, '')
    const handlePopState = () => {
      if (closedRef.current) return
      closedRef.current = true
      answer(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [state])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
               style={{ animation: 'slideUp 0.22s ease' }}>
            <div className="flex gap-3 mb-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                state.danger ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {state.danger
                  ? <AlertTriangle size={20} className="text-red-500" />
                  : <HelpCircle    size={20} className="text-orange-500" />
                }
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{state.title}</p>
                <p className="text-gray-500 text-meta mt-0.5 leading-relaxed">{state.message}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => close(false)}
                className="flex-1 btn-secondary text-sm py-2.5"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors active:scale-95 transition-transform duration-100 ${
                  state.danger
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
