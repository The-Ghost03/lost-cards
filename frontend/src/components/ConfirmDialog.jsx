import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    setState({ ...options, resolve })
  }), [])

  const close = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => close(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 animate-scale-in relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => close(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              state.danger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
            }`}>
              <AlertTriangle size={22} />
            </div>

            <h3 className="font-bold text-lg text-gray-900 mb-1">{state.title}</h3>
            {state.message && (
              <p className="text-sm text-gray-500 mb-5">{state.message}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => close(false)}
                className="btn-secondary flex-1 text-sm py-2.5"
              >
                {state.cancelLabel || 'Annuler'}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 text-sm py-2.5 px-4 rounded-xl font-semibold transition-all active:scale-95 ${
                  state.danger
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {state.confirmLabel || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useConfirm = () => useContext(Ctx).confirm
