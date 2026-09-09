import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminUserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`/api/admin/users/${id}`, { headers: authHeaders() })
      setUser(res.data.user)
      setActivity(res.data.activity)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const toggleSuspend = async () => {
    if (!user) return
    const next = !user.isSuspended
    const ok = window.confirm(
      next
        ? `Suspend ${user.username}? They will not be able to log in or participate.`
        : `Restore ${user.username}?`
    )
    if (!ok) return

    setActionLoading(true)
    setError('')
    try {
      const res = await axios.post(
        `/api/admin/users/${id}/suspend`,
        { suspended: next },
        { headers: authHeaders() }
      )
      setUser(res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '40vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="alert alert--error">{error || 'User not found'}</div>
        <Button variant="secondary" onClick={() => navigate('/admin/users')}>
          Back to users
        </Button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <button type="button" className="admin-back" onClick={() => navigate('/admin/users')}>
        ← Users
      </button>

      <header className="admin-page__head" style={{ marginTop: 12 }}>
        <div className="admin-user-hero">
          <div className="admin-list__avatar admin-list__avatar--lg" aria-hidden>
            {user.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt="" />
            ) : (
              <span>{(user.username || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 style={{ marginBottom: 6 }}>
              {user.username}
              {user.isAdmin && <span className="badge badge--lime" style={{ marginLeft: 8 }}>Admin</span>}
              {user.isSuspended && (
                <span className="badge badge--muted" style={{ marginLeft: 8 }}>Suspended</span>
              )}
            </h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {user.email}
            </p>
            <p className="mono" style={{ color: 'var(--accent-lime)', marginTop: 6 }}>
              {user.userCode}
            </p>
          </div>
        </div>
      </header>

      {error && <div className="alert alert--error mb-4">{error}</div>}

      <section className="admin-panel">
        <h3 className="admin-panel__title">Profile</h3>
        <div className="admin-kv">
          <div><span>Platform</span><strong>{user.platform || '—'}</strong></div>
          <div><span>In-game ID</span><strong className="mono">{user.inGameId || '—'}</strong></div>
          <div><span>Location</span><strong>{[user.city, user.country].filter(Boolean).join(', ') || '—'}</strong></div>
          <div><span>Joined</span><strong>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</strong></div>
          <div><span>Email verified</span><strong>{user.emailVerified ? 'Yes' : 'No'}</strong></div>
        </div>

        {!user.isAdmin && (
          <div style={{ marginTop: 20 }}>
            <Button
              variant={user.isSuspended ? 'secondary' : 'danger'}
              onClick={toggleSuspend}
              loading={actionLoading}
              disabled={actionLoading}
            >
              {user.isSuspended ? 'Restore account' : 'Suspend account'}
            </Button>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">
          Tournaments created ({activity?.tournamentsCreated?.length || 0})
        </h3>
        {(activity?.tournamentsCreated || []).length === 0 ? (
          <p className="text-muted">None</p>
        ) : (
          <ul className="admin-simple-list">
            {activity.tournamentsCreated.map((t) => (
              <li key={t.id}>
                <Link to={`/tournament/${t.id}`}>{t.name}</Link>
                <span className="badge badge--muted">{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">
          Tournaments joined ({activity?.tournamentsJoined?.length || 0})
        </h3>
        {(activity?.tournamentsJoined || []).length === 0 ? (
          <p className="text-muted">None</p>
        ) : (
          <ul className="admin-simple-list">
            {activity.tournamentsJoined.map((t) => (
              <li key={`${t.id}-${t.joined_at}`}>
                <Link to={`/tournament/${t.id}`}>{t.name}</Link>
                <span className="badge badge--muted">{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">
          Match history ({activity?.matchHistory?.length || 0})
        </h3>
        {(activity?.matchHistory || []).length === 0 ? (
          <p className="text-muted">None</p>
        ) : (
          <ul className="admin-simple-list">
            {activity.matchHistory.map((m) => (
              <li key={m.id}>
                <Link to={`/match/${m.id}`}>
                  {m.player_1_username || 'TBD'} vs {m.player_2_username || 'TBD'}
                </Link>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {m.tournament_name} · R{m.round} · {m.status}
                  {m.winner_username ? ` · W: ${m.winner_username}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AdminUserDetail
