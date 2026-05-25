import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth }   from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import {
  Wallet, PlusCircle, MessageCircle, LayoutDashboard,
  Bell, Shield, User, LogOut, Search,
} from 'lucide-react'
import { t } from '../lib/toast'

/* ── Badge dot ──────────────────────────────────────────────────── */
function UnreadBadge({ count, small = false }) {
  if (!count) return null
  if (small) return <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none border border-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { total }        = useUnread()
  const location         = useLocation()
  const navigate         = useNavigate()

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const isAdmin      = user?.role === 'admin'

  const handleLogout = async () => {
    await logout()
    t.success('Déconnecté')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  /* ── Tab definitions ────────────────────────────────────────────── */
  const tabs = user ? [
    isRetrouveur
      ? { to: '/posts/create', icon: PlusCircle,      label: 'Signaler'   }
      : { to: '/',             icon: Search,           label: 'Rechercher' },
    { to: '/messages',  icon: MessageCircle,   label: 'Messages', badge: total },
    isRetrouveur
      ? { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau'    }
      : { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau'    },
    { to: '/profile',   icon: User,            label: 'Profil'     },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ] : []

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-orange-500 text-lg">
            <Wallet size={22} />
            <span>LostCards</span>
          </Link>

          {/* Desktop nav */}
          {user ? (
            <div className="hidden sm:flex items-center gap-5 text-sm">
              {tabs.map(({ to, icon: Icon, label, badge }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 transition-colors ${
                    isActive(to) ? 'text-orange-500 font-semibold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <div className="relative">
                    <Icon size={15} />
                    <UnreadBadge count={badge} small />
                  </div>
                  {label}
                  {/* Inline count for desktop */}
                  {badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-sm"
              >
                <LogOut size={15} /> Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/login"    className="text-gray-600 hover:text-orange-500">Connexion</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-3">S'inscrire</Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100">
          <div className="flex safe-area-pb">
            {tabs.map(({ to, icon: Icon, label, badge }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                    active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="relative">
                    <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                    <UnreadBadge count={badge} />
                  </div>
                  <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={21} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Sortir</span>
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
