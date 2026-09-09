import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import BottomNav from '../components/BottomNav'

const EASE = [0.22, 1, 0.36, 1]

const statusBadgeClass = (status) => {
  if (status === 'open') return 'badge badge--open'
  if (status === 'live') return 'badge badge--live'
  if (status === 'completed' || status === 'closed') return 'badge badge--muted'
  return 'badge badge--muted'
}

const TournamentDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, setRedirectAfterLogin } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [mismatchedMatches, setMismatchedMatches] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPinModal, setShowPinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [failedAvatars, setFailedAvatars] = useState({})

  const isOrganizer = user && tournament && tournament.created_by === user.id

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
    const fetchTournament = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await axios.get(`/api/tournaments/${id}`, { headers })
        setTournament(response.data.tournament)

        const matchesResponse = await axios.get(`/api/matches/tournament/${id}`)
        const mismatches = matchesResponse.data.matches.filter(
          (m) => m.verification_status === 'mismatch'
        )
        setMismatchedMatches(mismatches)
      } catch (error) {
        console.error('Error fetching tournament:', error)
        if (error.response?.status === 404) {
          navigate('/browse-tournaments')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTournament()
  }, [id, navigate])

  const handleJoin = async () => {
    if (!user) {
      setRedirectAfterLogin(`/tournament/${id}`)
      navigate('/login')
      return
    }

    if (tournament.type === 'closed' && tournament.created_by !== user.id) {
      setShowPinModal(true)
      return
    }

    setJoining(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/tournaments/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const tournamentResponse = await axios.get(`/api/tournaments/${id}`, { headers })
      setTournament(tournamentResponse.data.tournament)
    } catch (error) {
      console.error('Error joining tournament:', error)
      if (error.response) {
        alert(error.response.data?.error || 'Failed to join tournament')
      } else if (error.request) {
        alert('Network error. Please check your connection.')
      } else {
        alert('An unexpected error occurred.')
      }
    } finally {
      setJoining(false)
    }
  }

  const handleJoinWithPin = async () => {
    if (!newPin || newPin.length !== 5) {
      alert('Please enter a valid 5-digit PIN')
      return
    }

    setJoining(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/tournaments/${id}/join`,
        { pin: newPin },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setShowPinModal(false)
      setNewPin('')

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const tournamentResponse = await axios.get(`/api/tournaments/${id}`, { headers })
      setTournament(tournamentResponse.data.tournament)
    } catch (error) {
      console.error('Error joining tournament:', error)
      if (error.response) {
        alert(error.response.data?.error || 'Failed to join tournament')
      } else if (error.request) {
        alert('Network error. Please check your connection.')
      } else {
        alert('An unexpected error occurred.')
      }
    } finally {
      setJoining(false)
    }
  }

  const handleUpdatePin = async () => {
    if (!newPin || !/^\d{5}$/.test(newPin)) {
      alert('PIN must be exactly 5 digits')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `/api/tournaments/${id}/pin`,
        { pin: newPin },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const tournamentResponse = await axios.get(`/api/tournaments/${id}`, { headers })
      setTournament(tournamentResponse.data.tournament)
      setShowPinModal(false)
      setNewPin('')
      alert('PIN updated successfully')
    } catch (error) {
      console.error('Error updating PIN:', error)
      alert(error.response?.data?.error || 'Failed to update PIN')
    }
  }

  const handleShare = async () => {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
    const shareUrl = `${frontendUrl}/tournament/${id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy link to clipboard')
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournament.tournament_code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy tournament code')
    }
  }

  const handleDeleteTournament = async () => {
    const participantCount = tournament.participants ? tournament.participants.length : 0

    let reason = ''
    if (participantCount > 0) {
      reason = prompt(
        `This tournament has ${participantCount} participant(s). Please provide a reason for deleting this tournament:`
      )
      if (!reason || reason.trim() === '') {
        alert('A reason is required when deleting a tournament with participants.')
        return
      }
    } else if (
      !confirm(
        'Are you sure you want to DELETE this tournament? This action CANNOT be undone. All matches and participant data will be permanently removed.'
      )
    ) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: reason.trim() },
      })
      navigate('/browse-tournaments')
    } catch (error) {
      console.error('Error deleting tournament:', error)
      alert(error.response?.data?.error || 'Failed to delete tournament')
    }
  }

  const handleKickParticipant = async (participantId, participantUsername) => {
    if (!confirm(`Are you sure you want to remove ${participantUsername} from the tournament?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/tournaments/${id}/kick`,
        { userId: participantId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTournament(response.data.tournament)
    } catch (error) {
      console.error('Error kicking participant:', error)
      alert(error.response?.data?.error || 'Failed to remove participant')
    }
  }

  const getFillPercentage = (current, max) => (current / max) * 100

  const closePinModal = () => {
    setShowPinModal(false)
    setNewPin('')
  }

  const handlePinSubmit = () => {
    if (isOrganizer) handleUpdatePin()
    else handleJoinWithPin()
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!tournament) {
    return (
      <AppShell>
        <div className="td-empty surface">
          <h3>Tournament not found</h3>
          <p>This tournament may have been removed or the link is invalid.</p>
          <Button onClick={() => navigate('/browse-tournaments')}>Browse Tournaments</Button>
        </div>
      </AppShell>
    )
  }

  const fillPct = getFillPercentage(tournament.participant_count, tournament.player_limit)
  const participants = tournament.participants || []

  return (
    <AppShell>
      <div className="td-page">
        <PageHeader
          title="Tournament"
          showBack
          onBack={() => navigate('/browse-tournaments')}
        >
          <button type="button" className="td-icon-btn" onClick={handleShare} title="Share">
            {copied ? '✓' : '↗'}
          </button>
        </PageHeader>

        <motion.section
          className="td-hero surface"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="td-hero__top">
            <div className="td-hero__badges">
              <span className={statusBadgeClass(tournament.status)}>{tournament.status}</span>
              {tournament.type === 'closed' && (
                <span className="badge badge--muted">Private</span>
              )}
              {isOrganizer && <span className="badge badge--lime">Organizer</span>}
            </div>

            {isOrganizer && mismatchedMatches.length > 0 && (
              <button
                type="button"
                className="badge badge--danger td-review-btn"
                onClick={() => navigate(`/bracket/${id}`)}
              >
                {mismatchedMatches.length} need review
              </button>
            )}
          </div>

          <h1 className="td-hero__title">{tournament.name}</h1>
          <p className="td-hero__desc">{tournament.description}</p>

          <div className="td-meta">
            <div className="td-meta__item">
              <span className="td-meta__label">Code</span>
              <div className="td-meta__row">
                <span className="mono td-meta__value">
                  {tournament.tournament_code || '—'}
                </span>
                <button type="button" className="td-chip-btn" onClick={handleCopyCode}>
                  {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="td-meta__item">
              <span className="td-meta__label">Roster</span>
              <div className="td-meta__row">
                <span className="mono td-meta__value">
                  {tournament.participant_count}/{tournament.player_limit}
                </span>
              </div>
              <div className="progress-track td-progress">
                <div
                  className={`progress-fill${tournament.is_full ? ' progress-fill--full' : ''}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          </div>

          {tournament.type === 'closed' && isOrganizer && (
            <div className="td-pin">
              <div className="td-pin__head">
                <span>PIN</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setShowPinModal(true)
                    setNewPin('')
                  }}
                >
                  Change
                </button>
              </div>
              <p className="mono td-pin__code">{tournament.pin}</p>
              <p className="td-pin__hint">Share only with invited players.</p>
            </div>
          )}

          <div className="td-actions">
            {tournament.status === 'open' && (
              <>
                {tournament.is_participant ? (
                  <div className="td-joined">You're in this lobby</div>
                ) : tournament.is_full ? (
                  <Button fullWidth disabled variant="ghost">
                    Full — starting soon
                  </Button>
                ) : (
                  <Button fullWidth onClick={handleJoin} loading={joining} disabled={joining}>
                    Join Tournament
                  </Button>
                )}
                {isOrganizer && (
                  <Button variant="danger" fullWidth onClick={handleDeleteTournament}>
                    Delete Tournament
                  </Button>
                )}
              </>
            )}

            {tournament.status === 'closed' && (
              <div className="alert alert--error" style={{ marginBottom: 0 }}>
                <strong>Tournament closed</strong>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Closed by the organizer.
                </p>
              </div>
            )}

            {tournament.status === 'live' && (
              <>
                <Button fullWidth onClick={() => navigate(`/bracket/${id}`)}>
                  View Bracket
                </Button>
                <div className="td-live-note">Live — bracket is ready for matches.</div>
              </>
            )}
          </div>
        </motion.section>

        <motion.section
          className="td-roster surface"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: EASE }}
        >
          <div className="td-roster__head">
            <h2>Participants</h2>
            <span className="mono">{participants.length}</span>
          </div>

          {participants.length === 0 ? (
            <p className="td-roster__empty">No players yet — be the first to join.</p>
          ) : (
            <ul className="td-list">
              {participants.map((participant) => {
                const showKick =
                  isOrganizer &&
                  tournament.status === 'open' &&
                  participant.user_id !== user?.id
                const avatarFailed = failedAvatars[participant.id]
                const initial = participant.username?.charAt(0)?.toUpperCase() || '?'

                return (
                  <li key={participant.id} className="td-list__item">
                    <div className="td-list__left">
                      <div className="td-avatar" aria-hidden>
                        {participant.profile_picture_url && !avatarFailed ? (
                          <img
                            src={participant.profile_picture_url}
                            alt=""
                            onError={() =>
                              setFailedAvatars((prev) => ({
                                ...prev,
                                [participant.id]: true,
                              }))
                            }
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                      <div className="td-list__info">
                        <p className="td-list__name">{participant.username}</p>
                        <p className="td-list__meta">
                          Joined {new Date(participant.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {showKick && (
                      <button
                        type="button"
                        className="td-kick"
                        onClick={() =>
                          handleKickParticipant(participant.user_id, participant.username)
                        }
                      >
                        Remove
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </motion.section>
      </div>

      <BottomNav unreadCount={unreadCount} />

      {showPinModal && (
        <div className="modal-overlay" onClick={closePinModal}>
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-modal-title"
          >
            <h3 id="pin-modal-title" style={{ fontSize: 22, marginBottom: 8 }}>
              {isOrganizer ? 'Change PIN' : 'Enter PIN'}
            </h3>
            <p className="text-muted mb-6" style={{ fontSize: 14 }}>
              {isOrganizer
                ? 'Enter a new 5-digit PIN for this tournament.'
                : 'Enter the 5-digit PIN from the organizer.'}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPin.length === 5 && !joining) handlePinSubmit()
              }}
              placeholder="12345"
              maxLength={5}
              className="mono mb-6"
              style={{ fontSize: 22, letterSpacing: '0.22em', textAlign: 'center' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" fullWidth onClick={closePinModal}>
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handlePinSubmit}
                loading={joining}
                disabled={joining || newPin.length !== 5}
              >
                {isOrganizer ? 'Update' : 'Join'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default TournamentDetail
