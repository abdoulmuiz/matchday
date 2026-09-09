import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'
import AppShell from '../components/AppShell'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'

const EASE = [0.22, 1, 0.36, 1]

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
]

const statusBadge = (status) => {
  if (status === 'open') return 'badge badge--open'
  if (status === 'live') return 'badge badge--live'
  if (status === 'completed' || status === 'closed') return 'badge badge--muted'
  return 'badge badge--muted'
}

const BrowseTournaments = () => {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [copiedTournamentId, setCopiedTournamentId] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const fetchTournaments = async () => {
      try {
        setLoading(true)
        setError('')
        let response
        if (debouncedSearchQuery.trim()) {
          const token = localStorage.getItem('token')
          const headers = token ? { Authorization: `Bearer ${token}` } : {}
          response = await axios.get('/api/tournaments/search', {
            params: { q: debouncedSearchQuery },
            headers,
            signal: controller.signal,
          })
        } else {
          const params = filter !== 'all' ? { status: filter } : {}
          response = await axios.get('/api/tournaments', {
            params,
            signal: controller.signal,
          })
        }
        if (!cancelled) {
          setTournaments(response.data.tournaments || [])
        }
      } catch (err) {
        if (cancelled || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        console.error('Error fetching tournaments:', err)
        if (!cancelled) {
          setError('Could not load tournaments. Pull to retry or try again.')
          setTournaments([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }

    fetchTournaments()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [filter, debouncedSearchQuery, retryKey])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setDebouncedSearchQuery(searchQuery)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const getFillPercentage = (current, max) => (current / max) * 100

  const handleShare = async (e, tournamentId) => {
    e.stopPropagation()
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
    const shareUrl = `${frontendUrl}/tournament/${tournamentId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedTournamentId(tournamentId)
      setTimeout(() => setCopiedTournamentId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy link to clipboard')
    }
  }

  const resultLabel = useMemo(() => {
    if (debouncedSearchQuery.trim()) {
      return `${tournaments.length} result${tournaments.length === 1 ? '' : 's'} for “${debouncedSearchQuery.trim()}”`
    }
    if (filter === 'all') return `${tournaments.length} tournament${tournaments.length === 1 ? '' : 's'}`
    return `${tournaments.length} ${filter}`
  }, [tournaments.length, debouncedSearchQuery, filter])

  if (initialLoad && loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <AppShell>
      <div className="browse-page">
        <motion.section
          className="browse-hero"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="browse-hero__text">
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Match lobby
            </p>
            <h1 className="browse-hero__title">Find your bracket</h1>
            <p className="browse-hero__copy">
              Search open cups, jump into live games, or create your own field.
            </p>
          </div>
          <Button
            onClick={() => navigate('/create-tournament')}
            size="medium"
            style={{ flexShrink: 0 }}
          >
            + Create
          </Button>
        </motion.section>

        <motion.form
          className="browse-search"
          onSubmit={handleSearchSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: EASE }}
        >
          <div className="browse-search__field">
            <span className="browse-search__icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search name, ID, or creator..."
              aria-label="Search tournaments"
            />
            {searchQuery && (
              <button
                type="button"
                className="browse-search__clear"
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedSearchQuery('')
                  searchInputRef.current?.focus()
                }}
              >
                Clear
              </button>
            )}
          </div>
          <Button type="submit" size="medium">
            Search
          </Button>
        </motion.form>

        <motion.div
          className="browse-filters"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
        >
          <div className="browse-filters__tabs" role="tablist" aria-label="Tournament status">
            {FILTERS.map((item) => {
              const active = filter === item.id
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`browse-tab${active ? ' browse-tab--active' : ''}`}
                  onClick={() => setFilter(item.id)}
                  whileTap={{ scale: 0.97 }}
                  disabled={!!debouncedSearchQuery.trim()}
                  title={
                    debouncedSearchQuery.trim()
                      ? 'Clear search to use status filters'
                      : undefined
                  }
                >
                  {item.label}
                </motion.button>
              )
            })}
          </div>
          <p className="browse-results-meta">
            {loading ? 'Searching…' : resultLabel}
          </p>
        </motion.div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '30vh' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="browse-empty">
              <div className="browse-empty__mark" aria-hidden>!</div>
              <h3 className="empty-state__title">Couldn’t load tournaments</h3>
              <p className="empty-state__copy">{error}</p>
              <Button onClick={() => setRetryKey((k) => k + 1)}>Retry</Button>
            </Card>
          </motion.div>
        ) : tournaments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="browse-empty">
              <div className="browse-empty__mark" aria-hidden>
                ⌀
              </div>
              <h3 className="empty-state__title">No tournaments found</h3>
              <p className="empty-state__copy">
                {searchQuery
                  ? 'Try a different search term or clear filters.'
                  : 'Be the first to open a lobby.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/create-tournament')}>Create Tournament</Button>
              )}
            </Card>
          </motion.div>
        ) : (
          <div className="browse-grid">
            <AnimatePresence mode="popLayout">
              {tournaments.map((tournament, index) => {
                const fill = getFillPercentage(
                  tournament.participant_count,
                  tournament.player_limit
                )
                const almostFull = fill >= 80

                return (
                  <motion.div
                    key={tournament.id}
                    layout
                    initial={{ opacity: 0, y: 22, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{
                      duration: 0.28,
                      delay: Math.min(index, 10) * 0.05,
                      ease: EASE,
                    }}
                  >
                    <Card
                      className={`browse-card${tournament.is_participant ? ' browse-card--joined' : ''}`}
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                      hoverable
                      padding="0"
                    >
                      <div className="browse-card__body">
                        <div className="browse-card__top">
                          <div className="browse-card__badges">
                            <span className={statusBadge(tournament.status)}>
                              {tournament.status}
                            </span>
                            {tournament.type === 'closed' && (
                              <span className="badge badge--muted">Private</span>
                            )}
                            {tournament.is_participant && (
                              <span className="badge badge--success">Joined</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`icon-btn browse-card__share${
                              copiedTournamentId === tournament.id ? ' icon-btn--success' : ''
                            }`}
                            onClick={(e) => handleShare(e, tournament.id)}
                            title="Share tournament"
                            aria-label="Share tournament"
                          >
                            {copiedTournamentId === tournament.id ? '✓' : '↗'}
                          </button>
                        </div>

                        <h3 className="browse-card__title">{tournament.name}</h3>
                        <p className="browse-card__desc">{tournament.description}</p>

                        <div className="browse-card__fill">
                          <div className="t-card__stat-row">
                            <span>{almostFull ? 'Almost full' : 'Players'}</span>
                            <span className="t-card__stat-value mono">
                              {tournament.participant_count}/{tournament.player_limit}
                            </span>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill${fill >= 100 ? ' progress-fill--full' : ''}`}
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                        </div>

                        <div className="browse-card__footer">
                          <div className="browse-card__creator">
                            <span className="browse-card__avatar" aria-hidden>
                              {(tournament.creator_username || '?').charAt(0).toUpperCase()}
                            </span>
                            <span>{tournament.creator_username}</span>
                          </div>
                          <span className="browse-card__cta">View →</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  )
}

export default BrowseTournaments
