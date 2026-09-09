import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUnreadCount(0)
      return
    }
    try {
      const response = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUnreadCount(response.data.count ?? 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios
        .get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => setUser(response.data.user))
        .catch(() => {
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return undefined
    }

    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user, refreshUnreadCount])

  const login = useCallback(async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password })
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
    return response.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    setUnreadCount(0)
    setRedirectAfterLogin(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      redirectAfterLogin,
      setRedirectAfterLogin,
      unreadCount,
      refreshUnreadCount,
      setUnreadCount,
    }),
    [user, login, logout, loading, redirectAfterLogin, unreadCount, refreshUnreadCount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
