import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Détecte hors-ligne / en-ligne et affiche un toast à chaque transition.
 * Retourne le statut courant.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      toast.success('Connexion rétablie 🟢', { id: 'net-status', duration: 2500 })
    }
    const handleOffline = () => {
      setOnline(false)
      toast.error('Hors ligne — mode dégradé 🔴', { id: 'net-status', duration: Infinity })
    }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
