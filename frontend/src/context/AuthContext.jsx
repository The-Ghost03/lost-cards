import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, updateStatus as apiUpdateStatus } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('token')) {
      getMe()
        .then(r => { setUser(r.data); localStorage.setItem('user', JSON.stringify(r.data)) })
        .catch(() => {
          setUser(null)
          localStorage.removeItem('user')
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [])

  const login = async (credentials) => {
    const res = await apiLogin(credentials)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (data) => {
    const res = await apiRegister(data)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  const updateStatus = async (status) => {
    const res = await apiUpdateStatus(status)
    const updated = res.data
    setUser(updated)
    localStorage.setItem('user', JSON.stringify(updated))
    return updated
  }

  const refreshUser = async () => {
    const res = await getMe()
    setUser(res.data)
    localStorage.setItem('user', JSON.stringify(res.data))
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateStatus, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
