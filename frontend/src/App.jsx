import { Routes, Route } from 'react-router-dom'
import { Toaster }       from 'react-hot-toast'
import Navbar            from './components/Navbar'
import ProtectedRoute    from './components/ProtectedRoute'
import { ConfirmProvider } from './components/ConfirmDialog'
import { UnreadProvider }  from './context/UnreadContext'

import Home           from './pages/Home'
import Login          from './pages/Login'
import Register       from './pages/Register'
import PostCreate     from './pages/PostCreate'
import PostDetail     from './pages/PostDetail'
import Messages       from './pages/Messages'
import Chat           from './pages/Chat'
import Dashboard      from './pages/Dashboard'
import Alerts         from './pages/Alerts'
import Profile        from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import AdminDash      from './pages/admin/Dashboard'

export default function App() {
  return (
    <ConfirmProvider>
      <UnreadProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-2xl mx-auto px-4 pb-24">
            <Routes>
              {/* Public */}
              <Route path="/"                element={<Home />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/posts/:id"       element={<PostDetail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />

              {/* Protected */}
              <Route path="/posts/create" element={<ProtectedRoute><PostCreate /></ProtectedRoute>} />
              <Route path="/messages"     element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/messages/:postId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/alerts"       element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDash /></ProtectedRoute>} />
            </Routes>
          </main>

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', fontSize: '14px' },
            }}
          />
        </div>
      </UnreadProvider>
    </ConfirmProvider>
  )
}
