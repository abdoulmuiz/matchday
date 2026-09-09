import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminTournaments = () => {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [tournaments, setTournaments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get('/api/admin/tournaments', {
        headers: authHeaders(),
        params: {
          status: status || undefined,
          type: type || undefined,
          limit: 100,
        },
      })
      setTournaments(res.data.tournaments || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type])

  const handleDelete = async (t) => {
    const count = Number(t.participant_count) || 0
    let reason = ''
    if (count > 0) {
      reason = window.prompt(
        `Delete "${t.name}"? Participants will be notified. Optional reason:`,
        ''
      )
      if (reason === null) return
    } else if (!window.confirm(`Delete "${t.name}"?`)) {
      return
    }

    setDeletingId(t.id)
    setError('')
    try {
      await axios.delete(`/api/admin/tournaments/${t.id}`, {
        headers: authHeaders(),
        data: { reason: reason || undefined },
      })
      setTournaments((prev) => prev.filter((x) => x.id !== t.id))
      setTotal((n) => Math.max(0, n - 1))
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h2>Tournament oversight</h2>
        <p className="text-muted">All tournaments on the platform.</p>
      </header>

      <div className="admin-filters">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed (PIN)</option>
          </select>
        </label>
      </div>

      {error && <div className="alert alert--error mb-4">{error}</div>}

      <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
        {total} tournament{total === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '30vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div className="admin-list">
          {tournaments.length === 0 && <p className="text-muted">No tournaments match.</p>}
          {tournaments.map((t) => (
            <div key={t.id} className="admin-list__row admin-list__row--static">
              <div className="admin-list__main" style={{ flex: 1 }}>
                <p className="admin-list__title">
                  {t.name}
                  <span className="badge badge--muted" style={{ marginLeft: 8 }}>{t.status}</span>
                  <span className="badge badge--open" style={{ marginLeft: 6 }}>
                    {t.type === 'closed' ? 'PIN' : 'Open'}
                  </span>
                </p>
                <p className="admin-list__meta text-muted">
                  by {t.creator_username} · {t.participant_count}/{t.player_limit} ·{' '}
                  <span className="mono">{t.tournament_code}</span>
                </p>
              </div>
              <div className="admin-list__actions">
                <Link to={`/tournament/${t.id}`} className="td-chip-btn">
                  Details
                </Link>
                <Link to={`/bracket/${t.id}`} className="td-chip-btn">
                  Bracket
                </Link>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(t)}
                  loading={deletingId === t.id}
                  disabled={deletingId === t.id}
                  style={{ padding: '8px 12px', fontSize: 12 }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminTournaments
