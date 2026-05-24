import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet, MessageCircle, LayoutDashboard, PlusCircle, LogOut, Search, Handshake } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  chercheur:  { label: 'Chercheur',  Icon: Search,    cls: 'bg-blue-50 text-blue-600'   },
  retrouveur: { label: 'Retrouveur', Icon: Handshake, cls: 'bg-green-50 text-green-600' },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnecté')
    navigate('/')
  }

  const is = (path) => location.pathname === path
  const badge = user?.status ? STATUS_BADGE[user.status] : null

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-orange-500 text-lg shrink-0">
          <Wallet size={22} />
          <span className="hidden sm:inline">LostCards</span>
        </Link>

        {/* Main nav — Signaler, Messages, Dashboard */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center sm:justify-end">
            <NavLink to="/posts/create" icon={<PlusCircle size={16} />} label="Signaler"  active={is('/posts/create')} />
            <NavLink to="/messages"     icon={<MessageCircle size={16} />} label="Messages" active={is('/messages')} />
            <NavLink to="/dashboard"    icon={<LayoutDashboard size={16} />} label="Tableau" active={is('/dashboard')} />

            {/* Status badge → /profile */}
            <Link
              to="/profile"
              className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full font-medium transition-transform hover:scale-105 ${badge?.cls ?? 'bg-gray-100 text-gray-500'}`}
            >
              {badge ? <span className="inline-flex items-center gap-1"><badge.Icon size={12} />{badge.label}</span> : 'Profil'}
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Link to="/login" className="text-gray-600 hover:text-orange-500 transition-colors">Connexion</Link>
            <Link to="/register" className="btn-primary text-sm py-1.5 px-3">S'inscrire</Link>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
        active
          ? 'text-orange-600 bg-orange-50'
          : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
