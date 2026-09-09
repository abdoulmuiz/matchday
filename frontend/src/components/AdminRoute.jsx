import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Requires login + isAdmin. Non-admins are sent home. */
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!user.isAdmin) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default AdminRoute
