import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Menu, X, Wallet, MessageCircle, LayoutDashboard, Bell, Shield, PlusCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  chercheur:  { label: 'Chercheur',  emoji: '🔍', cls: 'bg-blue-50 text-blue-600'   },
  retrouveur: { label: 'Retrouveur', emoji: '🤝', cls: 'bg-green-50 text-green-600' },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnecté')
    navigate('/')
    setOpen(false)
  }

  const active = (path) =>
    location.pathname === path ? 'text-orange-500 font-semibold' : 'text-gray-600 hover:text-orange-500'

  const badge = user?.status ? STATUS_BADGE[user.status] : null

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-orange-500 text-lg">
          <Wallet size={22} />
          <span>LostCards</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-5 text-sm">
          {user && (
            <>
              <Link to="/posts/create" className={`flex items-center gap-1 ${active('/posts/create')}`}>
                <PlusCircle size={15} /> Signaler
              </Link>
              <Link to="/messages" className={`flex items-center gap-1 ${active('/messages')}`}>
                <MessageCircle size={15} /> Messages
              </Link>
              <Link to="/dashboard" className={`flex items-center gap-1 ${active('/dashboard')}`}>
                <LayoutDashboard size={15} /> Tableau
              </Link>
              <Link to="/alerts" className={`flex items-center gap-1 ${active('/alerts')}`}>
                <Bell size={15} /> Alertes
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className={`flex items-center gap-1 ${active('/admin')}`}>
                  <Shield size={15} /> Admin
                </Link>
              )}
              <Link to="/profile" className={`flex items-center gap-1.5 ${active('/profile')}`}>
                {badge
                  ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.emoji} {badge.label}</span>
                  : <><User size={15} /> Profil</>
                }
              </Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-sm">
                Déconnexion
              </button>
            </>
          )}
          {!user && (
            <>
              <Link to="/login" className="text-gray-600 hover:text-orange-500 text-sm">Connexion</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-3">S'inscrire</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden p-1" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3 text-sm">
          {user ? (
            <>
              {badge && (
                <span className={`self-start text-xs px-3 py-1 rounded-full font-medium ${badge.cls}`}>
                  {badge.emoji} {badge.label}
                </span>
              )}
              <Link to="/posts/create" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><PlusCircle size={16} /> Signaler un portefeuille</Link>
              <Link to="/messages"     onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><MessageCircle size={16} /> Messages</Link>
              <Link to="/dashboard"    onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><LayoutDashboard size={16} /> Mon tableau de bord</Link>
              <Link to="/alerts"       onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><Bell size={16} /> Mes alertes</Link>
              <Link to="/profile"      onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><User size={16} /> Mon profil</Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-700"><Shield size={16} /> Administration</Link>
              )}
              <button onClick={handleLogout} className="text-red-500 text-left">Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/login"    onClick={() => setOpen(false)} className="text-gray-700">Connexion</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-center">S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
