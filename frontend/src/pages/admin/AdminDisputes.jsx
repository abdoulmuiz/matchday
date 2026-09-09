import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminDisputes = () => {
  const navigate = useNavigate()
  const [mismatches, setMismatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/admin/mismatches', { headers: authHeaders() })
        setMismatches(res.data.mismatches || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load disputes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h2>Dispute / mismatch queue</h2>
        <p className="text-muted">
          Every match flagged as mismatch across the platform. Open a match to view both screenshots and confirm a winner.
        </p>
      </header>

      {error && <div className="alert alert--error mb-4">{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '30vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : mismatches.length === 0 ? (
        <div className="admin-panel">
          <p style={{ margin: 0, color: 'var(--success-green)' }}>No open mismatches.</p>
        </div>
      ) : (
        <div className="admin-list">
          {mismatches.map((m) => (
            <button
              key={m.id}
              type="button"
              className="admin-list__row"
              onClick={() => navigate(`/match/${m.id}`)}
            >
              <div className="admin-list__main">
                <p className="admin-list__title">
                  {m.player_1_username || 'TBD'} vs {m.player_2_username || 'TBD'}
                  <span className="badge badge--live" style={{ marginLeft: 8 }}>Mismatch</span>
                </p>
                <p className="admin-list__meta text-muted">
                  <Link
                    to={`/tournament/${m.tournament_id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'inherit' }}
                  >
                    {m.tournament_name}
                  </Link>
                  {' · '}Round {m.round}
                  {' · '}Org: {m.organizer_username}
                  {m.player_1_reported_score || m.player_2_reported_score ? (
                    <>
                      {' · '}Reports:{' '}
                      <span className="mono">
                        {m.player_1_reported_score || '—'} / {m.player_2_reported_score || '—'}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <span className="admin-list__chevron">Resolve →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminDisputes
