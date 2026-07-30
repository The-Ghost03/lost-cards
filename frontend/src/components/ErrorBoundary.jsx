import { Component } from 'react'

/**
 * Catch les erreurs JS dans l'arbre React pour éviter les pages blanches.
 * Affiche le message d'erreur + bouton recharger.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info })
  }

  render() {
    if (!this.state.error) return this.props.children

    const message = this.state.error?.message || String(this.state.error)
    const stack   = this.state.error?.stack || ''
    const compStack = this.state.info?.componentStack || ''

    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950/30 p-4 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl shadow-float p-5">
          <h1 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
            ⚠️ Une erreur est survenue
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 break-words">
            {message}
          </p>
          <details className="text-meta text-gray-500 dark:text-gray-400 mb-4">
            <summary className="cursor-pointer font-medium">Détails techniques</summary>
            <pre className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
              {stack}
              {compStack && '\n--- Component stack ---\n' + compStack}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-sm flex-1"
            >
              Recharger la page
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="btn-secondary text-sm flex-1"
            >
              Retour accueil
            </button>
          </div>
        </div>
      </div>
    )
  }
}
