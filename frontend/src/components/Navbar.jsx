import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth }   from '../context/AuthContext'
import { useUnread } from '../context/UnreadContext'
import { useTheme }  from '../context/ThemeContext'
import {
  PlusCircle, MessageCircle, LayoutDashboard,
  Bell, Shield, User, LogOut, Search, Moon, Sun, SunMoon,
} from 'lucide-react'
import { t } from '../lib/toast'
import LogoIcon from './LogoIcon'
import { useConfirm } from './ConfirmDialog'

/* ── Badge dot ──────────────────────────────────────────────────── */
function UnreadBadge({ count, small = false }) {
  if (!count) return null
  if (small) return (
    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
  )
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none border border-white dark:border-gray-900">
      {count > 9 ? '9+' : count}
    </span>
  )
}

/* ── Theme toggle button (3-state: auto → light → dark → auto) ───── */
function ThemeToggle() {
  const { mode, toggle } = useTheme()

  const icon =
    mode === 'auto'  ? <SunMoon size={17} />
    : mode === 'dark' ? <Sun     size={17} />
    :                   <Moon    size={17} />

  const label =
    mode === 'auto'  ? 'Mode auto (sombre la nuit) — cliquer pour forcer clair'
    : mode === 'light' ? 'Mode clair — cliquer pour forcer sombre'
    :                    'Mode sombre — cliquer pour repasser en auto'

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
      aria-label={label}
      title={label}
    >
      {icon}
      {mode === 'auto' && (
        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
      )}
    </button>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { total }        = useUnread()
  const location         = useLocation()
  const navigate         = useNavigate()
  const confirm          = useConfirm()

  const isRetrouveur = user?.status === 'retrouveur' || user?.role === 'admin'
  const isAdmin      = user?.role === 'admin'

  const handleLogout = async () => {
    const ok = await confirm({
      title:        'Se déconnecter ?',
      message:      `Vous quittez votre compte ${user?.name ? `(${user.name})` : ''}. Vous devrez vous reconnecter pour accéder à vos annonces et messages.`,
      confirmLabel: 'Se déconnecter',
      cancelLabel:  'Annuler',
      danger:       true,
    })
    if (!ok) return
    await logout()
    t.success('Déconnecté')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const tabs = user ? [
    isRetrouveur
      ? { to: '/posts/create', icon: PlusCircle,      label: 'Signaler'   }
      : { to: '/',             icon: Search,           label: 'Rechercher' },
    { to: '/messages',  icon: MessageCircle,   label: 'Messages', badge: total },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau'   },
    { to: '/profile',   icon: User,            label: 'Profil'    },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ] : []

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-orange-500 text-lg">
            <LogoIcon size={26} />
            <span>LostCards</span>
          </Link>

          {/* Desktop nav */}
          <div className="flex items-center gap-1">
            {user ? (
              <div className="hidden sm:flex items-center gap-4 text-sm mr-1">
                {tabs.map(({ to, icon: Icon, label, badge }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 transition-colors ${
                      isActive(to)
                        ? 'text-orange-500 font-semibold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="relative">
                      <Icon size={15} />
                      <UnreadBadge count={badge} small />
                    </div>
                    {label}
                    {badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm"
                >
                  <LogOut size={15} /> Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm mr-1">
                <Link to="/login"    className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors">Connexion</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-3">S'inscrire</Link>
              </div>
            )}
            {/* Theme toggle — always visible */}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
          <div className="flex safe-area-pb">
            {tabs.map(({ to, icon: Icon, label, badge }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                    active
                      ? 'text-orange-500'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
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
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
