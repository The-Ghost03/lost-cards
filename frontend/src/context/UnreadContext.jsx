import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getConversations } from '../api/messages'
import { useAuth } from './AuthContext'

const UnreadContext = createContext({ total: 0, refresh: () => {} })

export function UnreadProvider({ children }) {
  const { user } = useAuth()
  const [total, setTotal] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const res = await getConversations()
      const sum = (res.data || []).reduce((acc, c) => acc + (c.unread_count || 0), 0)
      setTotal(sum)
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) { setTotal(0); return }
    refresh()
    // Poll every 30s to keep badge fresh
    const timer = setInterval(refresh, 30_000)
    return () => clearInterval(timer)
  }, [user, refresh])

  return (
    <UnreadContext.Provider value={{ total, refresh }}>
      {children}
    </UnreadContext.Provider>
  )
}

export const useUnread = () => useContext(UnreadContext)
