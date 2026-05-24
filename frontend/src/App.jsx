import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home        from './pages/Home'
import Login       from './pages/Login'
import Register    from './pages/Register'
import PostCreate  from './pages/PostCreate'
import PostDetail  from './pages/PostDetail'
import Messages    from './pages/Messages'
import Dashboard   from './pages/Dashboard'
import Alerts      from './pages/Alerts'
import AdminDash   from './pages/admin/Dashboard'
import Profile     from './pages/Profile'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pb-20">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/posts/:id"   element={<PostDetail />} />

          <Route path="/posts/create" element={
            <ProtectedRoute><PostCreate /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute><Alerts /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminDash /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}
