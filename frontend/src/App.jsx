import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import { useLenis } from './hooks/useLenis'
import ScrollProgress from './components/ScrollProgress'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/AdminLayout'
import Signup from './pages/Signup'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import CheckEmail from './pages/CheckEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import CompleteProfile from './pages/CompleteProfile'
import Profile from './pages/Profile'
import CreateTournament from './pages/CreateTournament'
import BrowseTournaments from './pages/BrowseTournaments'
import TournamentDetail from './pages/TournamentDetail'
import Bracket from './pages/Bracket'
import MatchDetail from './pages/MatchDetail'
import Notifications from './pages/Notifications'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminTournaments from './pages/admin/AdminTournaments'
import AdminDisputes from './pages/admin/AdminDisputes'
import AdminBranding from './pages/admin/AdminBranding'

function AppRoutes() {
  useLenis()

  return (
    <>
      <ScrollProgress />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/create-tournament" element={<ProtectedRoute><CreateTournament /></ProtectedRoute>} />
        <Route path="/browse-tournaments" element={<ProtectedRoute><BrowseTournaments /></ProtectedRoute>} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/bracket/:tournamentId" element={<ProtectedRoute><Bracket /></ProtectedRoute>} />
        <Route path="/match/:id" element={<ProtectedRoute><MatchDetail /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="branding" element={<AdminBranding />} />
        </Route>
        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrandingProvider>
          <Router>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </Router>
        </BrandingProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
