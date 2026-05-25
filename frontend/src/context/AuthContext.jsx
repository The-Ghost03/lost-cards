import { createContext, useContext, useState, useEffect } from 'react'
import {
  getMe,
  login          as apiLogin,
  logout         as apiLogout,
  register       as apiRegister,
  getCsrfCookie,
  updateStatus   as apiUpdateStatus,
  deleteAccount  as apiDeleteAccount,
} from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Verify token & refresh user on mount
  useEffect(() => {
    getMe()
      .then(r => { setUser(r.data); localStorage.setItem('user', JSON.stringify(r.data)) })
      .catch(() => { setUser(null); localStorage.removeItem('user') })
      .finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    await getCsrfCookie()
    const res = await apiLogin(credentials)
    setUser(res.data.user)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    return res.data.user
  }

  const register = async (data) => {
    await getCsrfCookie()
    const res = await apiRegister(data)
    setUser(res.data.user)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    return res.data.user
  }

  const logout = async () => {
    await apiLogout().catch(() => {})
    setUser(null)
    localStorage.removeItem('user')
  }

  /** PATCH /me/status — reactive: all consumers re-render instantly */
  const updateStatus = async (status) => {
    const res     = await apiUpdateStatus(status)
    const updated = res.data
    setUser(updated)
    localStorage.setItem('user', JSON.stringify(updated))
    return updated
  }

  /** DELETE /me — wipes local state */
  const deleteAccount = async (password) => {
    await apiDeleteAccount(password)
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateStatus, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
