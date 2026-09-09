import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import AppShell from '../components/AppShell'
import Button from '../components/Button'
import BottomNav from '../components/BottomNav'

const EASE = [0.22, 1, 0.36, 1]

const platformLabel = (platform) => {
  switch (platform) {
    case 'PS':
      return 'PlayStation'
    case 'Xbox':
      return 'Xbox'
    case 'PC':
      return 'PC'
    case 'Mobile':
      return 'Mobile'
    default:
      return platform || 'Not set'
  }
}

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUnreadCount(response.data.count)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }
    fetchUnreadCount()
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setProfile(response.data.user)
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCopyCode = async () => {
    if (!profile?.userCode) return
    try {
      await navigator.clipboard.writeText(profile.userCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      alert('Failed to copy player ID')
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const initial = (user.username || '?').charAt(0).toUpperCase()
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ')

  return (
    <AppShell>
      <div className="pf-page">
        <motion.section
          className="pf-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            {user.isAdmin ? 'Admin' : 'Player card'}
          </p>

          <div className="pf-identity">
            <div className="pf-avatar" aria-hidden>
              {profile?.profilePictureUrl && !avatarFailed ? (
                <img
                  src={profile.profilePictureUrl}
                  alt=""
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <div className="pf-identity__text">
              <h1 className="pf-name">
                {user.username}
                {user.isAdmin && (
                  <span className="badge badge--lime" style={{ marginLeft: 10, verticalAlign: 'middle', fontSize: 11 }}>
                    Admin
                  </span>
                )}
              </h1>
              <p className="pf-platform">{platformLabel(profile?.platform)}</p>
              {location && <p className="pf-location">{location}</p>}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="pf-card surface"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: EASE }}
        >
          <div className="pf-row">
            <div>
              <p className="pf-label">In-game ID</p>
              <p className="pf-value mono">{profile?.inGameId || 'Not set'}</p>
            </div>
          </div>

          <div className="pf-row">
            <div>
              <p className="pf-label">Player ID</p>
              <p className="pf-value mono pf-value--accent">
                {profile?.userCode || 'Loading...'}
              </p>
            </div>
            {profile?.userCode && (
              <button type="button" className="td-chip-btn" onClick={handleCopyCode}>
                {codeCopied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {profile?.country && (
            <div className="pf-row">
              <div>
                <p className="pf-label">Country</p>
                <p className="pf-value">{profile.country}</p>
              </div>
            </div>
          )}

          {profile?.city && (
            <div className="pf-row pf-row--last">
              <div>
                <p className="pf-label">City</p>
                <p className="pf-value">{profile.city}</p>
              </div>
            </div>
          )}
        </motion.section>

        <motion.div
          className="pf-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
        >
          {user.isAdmin && (
            <Button fullWidth onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          )}
          <Button fullWidth variant={user.isAdmin ? 'secondary' : 'primary'} onClick={() => navigate('/complete-profile')}>
            Edit Profile
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/home')}>
            Back to Home
          </Button>
          <Button variant="danger" fullWidth onClick={handleLogout}>
            Log Out
          </Button>
        </motion.div>
      </div>

      <BottomNav unreadCount={unreadCount} />
    </AppShell>
  )
}

export default Profile
