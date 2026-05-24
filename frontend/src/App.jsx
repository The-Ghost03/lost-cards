import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import InstallPrompt from './components/InstallPrompt'
import { ConfirmProvider } from './components/ConfirmDialog'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Register        from './pages/Register'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import PostCreate      from './pages/PostCreate'
import PostDetail      from './pages/PostDetail'
import Messages        from './pages/Messages'
import Dashboard       from './pages/Dashboard'
import Alerts          from './pages/Alerts'
import Profile         from './pages/Profile'
import AdminDash       from './pages/admin/Dashboard'

export default function App() {
  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pb-20">
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/posts/:id"       element={<PostDetail />} />

            <Route path="/posts/create" element={<ProtectedRoute><PostCreate /></ProtectedRoute>} />
            <Route path="/messages"     element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/alerts"       element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin"        element={<ProtectedRoute adminOnly><AdminDash /></ProtectedRoute>} />
          </Routes>
        </main>
        <InstallPrompt />
      </div>
    </ConfirmProvider>
  )
}
