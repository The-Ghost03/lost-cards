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

// Routes accessibles sans connexion — pas de redirect forcé sur 401
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password']
function isPublicRoute(pathname) {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/posts/')) return true
  return false
}

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')

      // Si l'utilisateur est sur une page publique (ex: home après expiration
      // de session au lancement de l'app), on le laisse là — pas de redirect.
      // Sinon (il était sur dashboard/messages/...), on l'envoie au login.
      if (!isPublicRoute(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
