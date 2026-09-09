import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminUsers = () => {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (search = q) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get('/api/admin/users', {
        headers: authHeaders(),
        params: { q: search || undefined, limit: 50 },
      })
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load(q)
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h2>User management</h2>
        <p className="text-muted">Search by username, email, or 11-digit player ID.</p>
      </header>

      <form className="admin-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Username, email, or user ID…"
          aria-label="Search users"
        />
        <Button type="submit">Search</Button>
      </form>

      {error && <div className="alert alert--error mb-4">{error}</div>}

      <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
        {total} user{total === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '30vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div className="admin-list">
          {users.length === 0 && (
            <p className="text-muted">No users found.</p>
          )}
          {users.map((u) => (
            <Link key={u.id} to={`/admin/users/${u.id}`} className="admin-list__row">
              <div className="admin-list__avatar" aria-hidden>
                {u.profilePictureUrl ? (
                  <img src={u.profilePictureUrl} alt="" />
                ) : (
                  <span>{(u.username || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="admin-list__main">
                <p className="admin-list__title">
                  {u.username}
                  {u.isAdmin && <span className="badge badge--lime" style={{ marginLeft: 8 }}>Admin</span>}
                  {u.isSuspended && <span className="badge badge--muted" style={{ marginLeft: 8 }}>Suspended</span>}
                </p>
                <p className="admin-list__meta text-muted">
                  {u.email} · <span className="mono">{u.userCode}</span>
                </p>
              </div>
              <span className="admin-list__chevron">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminUsers
