import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
})

// Attach Bearer token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      // Don't redirect if already on a public page — avoids infinite reload loop
      const pub = ['/login', '/register', '/forgot-password', '/reset-password']
      const onPublic = pub.some(p => window.location.pathname.startsWith(p))
      if (!onPublic) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
