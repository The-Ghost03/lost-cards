import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import { AuthProvider }  from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)

/* ── Service Worker registration (PWA + détection mises à jour) ─────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] registered with scope:', reg.scope)
        reg.update?.()

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              import('react-hot-toast').then(({ default: toast }) => {
                toast(
                  (t) => {
                    const el = document.createElement('div')
                    el.innerHTML = `
                      <div style="display:flex; align-items:center; gap:12px;">
                        <span>🚀 Nouvelle version dispo</span>
                        <button id="reload-btn-${t.id}" style="background:#f97316;color:white;padding:6px 12px;border-radius:8px;border:0;font-weight:600;cursor:pointer">
                          Recharger
                        </button>
                      </div>
                    `
                    setTimeout(() => {
                      document.getElementById(`reload-btn-${t.id}`)?.addEventListener('click', () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      })
                    }, 50)
                    return el
                  },
                  { id: 'sw-update', duration: Infinity, style: { background: '#1f2937', color: '#fff' } }
                )
              })
            }
          })
        })
      })
      .catch(err => console.error('[SW] registration failed:', err))

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}
