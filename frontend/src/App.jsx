import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster }       from 'react-hot-toast'
import Navbar            from './components/Navbar'
import ProtectedRoute    from './components/ProtectedRoute'
import PushPrompt        from './components/PushPrompt'
import ErrorBoundary     from './components/ErrorBoundary'
import { ConfirmProvider } from './components/ConfirmDialog'
import { UnreadProvider }  from './context/UnreadContext'
import { Spinner }         from './components/Spinner'
import { usePageTracking } from './lib/usePageTracking'
import { useOnlineStatus } from './lib/useOnlineStatus'

/* Eager : Home (landing, first paint critique en 3G) + Login/Register
   (funnel d'acquisition lié directement depuis Home). */
import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'

/* Lazy : le reste est chargé à la demande (code splitting par route). */
const PostCreate     = lazy(() => import('./pages/PostCreate'))
const PostDetail     = lazy(() => import('./pages/PostDetail'))
const Messages       = lazy(() => import('./pages/Messages'))
const Chat           = lazy(() => import('./pages/Chat'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Alerts         = lazy(() => import('./pages/Alerts'))
const Profile        = lazy(() => import('./pages/Profile'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const AdminDash      = lazy(() => import('./pages/admin/Dashboard'))

/* Fallback affiché pendant le chargement d'un chunk de page */
function PageFallback() {
  return (
    <div className="flex justify-center pt-20 text-orange-500">
      <Spinner size={32} />
    </div>
  )
}

function AppInner() {
  usePageTracking()
  useOnlineStatus()
  return (
    <ConfirmProvider>
      <UnreadProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-2xl mx-auto px-4 pb-24">
            <Suspense fallback={<PageFallback />}>
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
            </Suspense>
          </main>

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', fontSize: '14px' },
            }}
          />
          <PushPrompt />
        </div>
      </UnreadProvider>
    </ConfirmProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  )
}
