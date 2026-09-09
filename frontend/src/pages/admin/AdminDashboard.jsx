import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/admin/analytics', { headers: authHeaders() })
        setAnalytics(res.data.analytics)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const maxSignup = useMemo(() => {
    if (!analytics?.signupsLast30Days?.length) return 1
    return Math.max(1, ...analytics.signupsLast30Days.map((d) => d.count))
  }, [analytics])

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '40vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (error) {
    return <div className="alert alert--error">{error}</div>
  }

  const by = analytics.tournamentsByStatus || {}

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h2>Platform overview</h2>
        <p className="text-muted">Last 30 days and live totals.</p>
      </header>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <p className="admin-stat__label">Registered users</p>
          <p className="admin-stat__value mono">{analytics.totalUsers}</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat__label">Tournaments</p>
          <p className="admin-stat__value mono">{analytics.totalTournaments}</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat__label">Open mismatches</p>
          <p className="admin-stat__value mono">{analytics.openMismatches}</p>
          {analytics.openMismatches > 0 && (
            <Link to="/admin/disputes" className="admin-stat__link">
              Review queue →
            </Link>
          )}
        </div>
        <div className="admin-stat">
          <p className="admin-stat__label">Suspended accounts</p>
          <p className="admin-stat__value mono">{analytics.suspendedUsers}</p>
        </div>
      </div>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Tournaments by status</h3>
        <div className="admin-status-row">
          {[
            { key: 'open', label: 'Open' },
            { key: 'live', label: 'Live' },
            { key: 'completed', label: 'Completed' },
            { key: 'closed', label: 'Closed' },
          ].map((s) => (
            <div key={s.key} className="admin-status-chip">
              <span>{s.label}</span>
              <strong className="mono">{by[s.key] || 0}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Signups — last 30 days</h3>
        <div className="admin-chart" role="img" aria-label="Daily signups chart">
          {analytics.signupsLast30Days.map((d) => {
            const height = Math.max(4, Math.round((d.count / maxSignup) * 100))
            return (
              <div key={d.day} className="admin-chart__col" title={`${d.day}: ${d.count}`}>
                <div className="admin-chart__bar" style={{ height: `${height}%` }} />
                <span className="admin-chart__count mono">{d.count || ''}</span>
              </div>
            )
          })}
        </div>
        <div className="admin-chart__axis text-muted">
          <span>{analytics.signupsLast30Days[0]?.day}</span>
          <span>{analytics.signupsLast30Days[analytics.signupsLast30Days.length - 1]?.day}</span>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
