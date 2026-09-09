import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'

const Notifications = () => {
  const navigate = useNavigate()
  const { refreshUnreadCount, setUnreadCount } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setError('')
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const list = response.data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n.is_read).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/notifications/${notification.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      if (!notification.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1))
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }

    if (notification.related_match_id) {
      navigate(`/match/${notification.related_match_id}`)
    } else if (notification.related_tournament_id) {
      navigate(`/tournament/${notification.related_tournament_id}`)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      refreshUnreadCount()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'tournament_joined':
        return '🎮'
      case 'match_assigned':
        return '⚔️'
      case 'result_submitted':
        return '📸'
      case 'match_won':
        return '🏆'
      case 'match_lost':
        return '💔'
      case 'advanced_round':
        return '🚀'
      case 'mismatch_flagged':
        return '⚠️'
      case 'tournament_started':
        return '🏁'
      case 'tournament_closing_soon':
        return '⏳'
      case 'score_manually_edited':
        return '✏️'
      case 'match_deadline_reached':
        return '⏰'
      default:
        return '🔔'
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <PageHeader title="Notifications" showBack={false}>
          {notifications.length > 0 && (
            <Button variant="ghost" onClick={handleMarkAllAsRead} size="small">
              Mark all read
            </Button>
          )}
        </PageHeader>

        {error ? (
          <Card className="empty-state">
            <h3 className="empty-state__title">Couldn’t load notifications</h3>
            <p className="empty-state__copy">{error}</p>
            <Button onClick={() => { setLoading(true); fetchNotifications(); }}>Retry</Button>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="empty-state">
            <div className="empty-state__icon">🔔</div>
            <h3 className="empty-state__title">No notifications</h3>
            <p className="empty-state__copy">You're all caught up!</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                hoverable
                padding="16px"
                style={{
                  background: notification.is_read
                    ? undefined
                    : 'rgba(212, 255, 61, 0.06)',
                  border: notification.is_read
                    ? undefined
                    : '1px solid var(--accent-lime)',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    flexShrink: 0,
                    marginTop: 4,
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    background: 'var(--accent-lime-soft)',
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between" style={{ marginBottom: 4, alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: 'var(--font-body)' }}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--accent-lime)',
                          flexShrink: 0,
                          marginTop: 6,
                          boxShadow: '0 0 8px var(--accent-lime-glow)',
                        }}
                      />
                    )}
                  </div>
                  <p className="text-muted" style={{ fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                    {notification.message}
                  </p>
                  <span className="text-muted" style={{ fontSize: 12, opacity: 0.7 }}>
                    {formatTime(notification.created_at)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  )
}

export default Notifications
