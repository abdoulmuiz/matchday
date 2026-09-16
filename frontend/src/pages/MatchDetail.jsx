import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { mediaUrl } from '../api'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'

const MatchDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [match, setMatch] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showEditScoreModal, setShowEditScoreModal] = useState(false)
  const [editScoreData, setEditScoreData] = useState({ player_1_score: '', player_2_score: '', winnerId: null })
  const [editingScore, setEditingScore] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)
  const [showDirectInputModal, setShowDirectInputModal] = useState(false)
  const [directInputData, setDirectInputData] = useState({ player_1_score: '', player_2_score: '', winnerId: null })
  const [submittingDirectInput, setSubmittingDirectInput] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState('30')
  const [extending, setExtending] = useState(false)
  const [showForfeitModal, setShowForfeitModal] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  const [deadlineError, setDeadlineError] = useState('')

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUnreadCount(response.data.count)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }
    fetchUnreadCount()
  }, [])

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await axios.get(`/api/matches/${id}`)
        setMatch(response.data.match)

        const tournamentResponse = await axios.get(`/api/tournaments/${response.data.match.tournament_id}`)
        setTournament(tournamentResponse.data.tournament)
      } catch (error) {
        console.error('Error fetching match:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMatch()
  }, [id])

  useEffect(() => {
    if (!match?.match_deadline || match.status === 'completed') return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [match?.match_deadline, match?.status])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadError('')
    }
  }

  const handleSubmitResult = async () => {
    if (!selectedFile) {
      setUploadError('Please select a screenshot')
      return
    }

    const formData = new FormData()
    formData.append('screenshot', selectedFile)

    setUploading(true)
    setUploadError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/matches/${id}/submit-result`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setMatch(response.data.match)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      setUploadError(error.response?.data?.error || 'Failed to submit result')
    } finally {
      setUploading(false)
    }
  }

  const handleEditScore = async () => {
    if (!editScoreData.player_1_score || !editScoreData.player_2_score) {
      alert('Please enter both scores')
      return
    }

    setEditingScore(true)
    setConflictWarning(null)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`/api/matches/${id}/edit-score`, {
        player_1_score: parseInt(editScoreData.player_1_score),
        player_2_score: parseInt(editScoreData.player_2_score),
        winnerId: editScoreData.winnerId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMatch(response.data.match)
      setShowEditScoreModal(false)
      setEditScoreData({ player_1_score: '', player_2_score: '', winnerId: null })

      if (response.data.conflictWarning) {
        setConflictWarning(response.data.conflictWarning)
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to edit score')
    } finally {
      setEditingScore(false)
    }
  }

  const handleDirectInput = async () => {
    if (!directInputData.player_1_score || !directInputData.player_2_score) {
      alert('Please enter both scores')
      return
    }

    setSubmittingDirectInput(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/matches/${id}/direct-result`, {
        player_1_score: parseInt(directInputData.player_1_score),
        player_2_score: parseInt(directInputData.player_2_score),
        winnerId: directInputData.winnerId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMatch(response.data.match)
      setShowDirectInputModal(false)
      setDirectInputData({ player_1_score: '', player_2_score: '', winnerId: null })
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit result')
    } finally {
      setSubmittingDirectInput(false)
    }
  }

  const isOrganizer = () => {
    return user && tournament && tournament.created_by === user.id
  }

  const canResolveMismatch = () => {
    return isOrganizer() || Boolean(user?.isAdmin)
  }

  const formatDeadlineRemaining = (deadlineMs) => {
    const diff = deadlineMs - now
    if (diff <= 0) return '0:00'
    const totalSec = Math.floor(diff / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleExtendDeadline = async () => {
    const minutesInt = parseInt(extendMinutes, 10)
    if (!minutesInt || minutesInt < 1) {
      setDeadlineError('Enter minutes to add (at least 1)')
      return
    }
    setExtending(true)
    setDeadlineError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/matches/${id}/extend-deadline`,
        { minutes: minutesInt },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMatch(response.data.match)
      setShowExtendModal(false)
      setExtendMinutes('30')
    } catch (error) {
      setDeadlineError(error.response?.data?.error || 'Failed to extend deadline')
    } finally {
      setExtending(false)
    }
  }

  const handleForceForfeit = async (winnerId) => {
    setForfeiting(true)
    setDeadlineError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/matches/${id}/force-forfeit`,
        { winnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMatch(response.data.match)
      setShowForfeitModal(false)
    } catch (error) {
      setDeadlineError(error.response?.data?.error || 'Failed to force forfeit')
    } finally {
      setForfeiting(false)
    }
  }

  const canSubmit = () => {
    if (!user || match.status === 'completed') return false
    const isPlayer1 = match.player_1_id === user.id
    const isPlayer2 = match.player_2_id === user.id
    if (!isPlayer1 && !isPlayer2) return false

    const hasSubmitted = isPlayer1 ? match.player_1_screenshot_url : match.player_2_screenshot_url
    return !hasSubmitted
  }

  const getPlayerSubmissionStatus = () => {
    if (!user) return null
    const isPlayer1 = match.player_1_id === user.id
    const isPlayer2 = match.player_2_id === user.id
    if (!isPlayer1 && !isPlayer2) return null

    const hasSubmitted = isPlayer1 ? match.player_1_screenshot_url : match.player_2_screenshot_url
    const opponentSubmitted = isPlayer1 ? match.player_2_screenshot_url : match.player_1_screenshot_url

    if (hasSubmitted && opponentSubmitted) return 'both'
    if (hasSubmitted) return 'submitted'
    if (opponentSubmitted) return 'waiting'
    return 'none'
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge badge--muted'
      case 'live':
        return 'badge badge--lime'
      case 'completed':
        return 'badge badge--success'
      default:
        return 'badge badge--muted'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'live':
        return 'Live'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const handleUploadZoneEnter = (e) => {
    e.currentTarget.style.borderColor = 'var(--accent-lime)'
    e.currentTarget.style.background = 'var(--accent-lime-soft)'
  }

  const handleUploadZoneLeave = (e) => {
    e.currentTarget.style.borderColor = 'var(--border-subtle)'
    e.currentTarget.style.background = 'transparent'
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    )
  }

  if (!match) {
    return (
      <AppShell>
        <div className="loading-screen" style={{ minHeight: '60vh' }}>
          <p className="text-muted">Match not found</p>
        </div>
      </AppShell>
    )
  }

  const player1 = match.player_1_username || 'TBD'
  const player2 = match.player_2_username || 'TBD'
  const isForfeit = Boolean(Number(match.is_forfeit))
  const player1Won = match.winner_id && match.winner_username === player1
  const player2Won = match.winner_id && match.winner_username === player2
  const score1 = isForfeit
    ? (player1Won ? 'W/O' : '–')
    : (match.player_1_score !== null ? match.player_1_score : '-')
  const score2 = isForfeit
    ? (player2Won ? 'W/O' : '–')
    : (match.player_2_score !== null ? match.player_2_score : '-')
  const submissionStatus = getPlayerSubmissionStatus()
  const deadlineMs = match.match_deadline ? new Date(match.match_deadline).getTime() : null
  const isDeadlineOverdue =
    deadlineMs != null && match.status !== 'completed' && deadlineMs <= now
  const showOrganizerDeadlineActions =
    isOrganizer() && isDeadlineOverdue && match.player_1_id && match.player_2_id

  const renderPlayerColumn = (side) => {
    const isPlayer1 = side === 1
    const username = isPlayer1 ? player1 : player2
    const score = isPlayer1 ? score1 : score2
    const picture = isPlayer1 ? match.player_1_picture : match.player_2_picture
    const isWinner = isPlayer1 ? player1Won : player2Won
    const label = isPlayer1 ? 'Player 1' : 'Player 2'

    return (
      <div
        className="surface--inset md-player"
        style={{
          textAlign: 'center',
          padding: '20px 12px',
          border: isWinner ? '2px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
          boxShadow: isWinner ? '0 0 24px var(--accent-lime-glow)' : undefined,
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <div
          className="md-player__avatar"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--accent-lime-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            border: isWinner ? '2px solid var(--accent-lime)' : '2px solid var(--border-strong)',
            margin: '0 auto 12px',
            overflow: 'hidden',
          }}
        >
          {picture ? (
            <img
              src={mediaUrl(picture)}
              alt={username}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            '👤'
          )}
        </div>

        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: isWinner ? 'var(--accent-lime)' : 'var(--text-primary)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {username}
        </p>
        <p className="text-muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          {label}
        </p>

        <div
          className="mono"
          style={{
            fontSize: 'clamp(40px, 12vw, 56px)',
            fontWeight: 700,
            lineHeight: 1,
            color: isWinner ? 'var(--accent-lime)' : 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {score}
        </div>

        {isWinner && (
          <span className="badge badge--lime" style={{ marginTop: 12 }}>
            {isForfeit ? 'W/O Winner' : 'Winner'}
          </span>
        )}
      </div>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title="Match Details"
        showBack={true}
        onBack={() => navigate(`/bracket/${match.tournament_id}`)}
      />

      <Card padding="0" style={{ overflow: 'hidden' }}>
        {/* Scoreboard header */}
        <div
          className="panel-pad"
          style={{
            paddingBottom: 20,
            background: 'linear-gradient(180deg, rgba(212, 255, 61, 0.06) 0%, transparent 100%)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <span className={getStatusBadgeClass(match.status)}>
              {match.status === 'live' && (
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
              )}
              {getStatusText(match.status)}
            </span>
            <span className="text-muted" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Round {match.round}
            </span>
          </div>

          {/* VS Scoreboard */}
          <div
            className="md-scoreboard"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 12,
              alignItems: 'stretch',
            }}
          >
            {renderPlayerColumn(1)}

            <div
              className="md-scoreboard__vs"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '0 4px',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--accent-lime)',
                  letterSpacing: '0.12em',
                }}
              >
                VS
              </span>
              {match.status === 'live' && (
                <span className="badge badge--live" style={{ fontSize: 9, padding: '3px 8px' }}>
                  LIVE
                </span>
              )}
            </div>

            {renderPlayerColumn(2)}
          </div>
        </div>

        <div className="panel-pad" style={{ paddingTop: 24 }}>
          {match.status === 'completed' && match.winner_username && (
            <div className="alert alert--success text-center mb-6">
              <p className="text-muted" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {isForfeit ? 'Walkover / Forfeit' : 'Match Winner'}
              </p>
              <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--success-green)' }}>
                🏆 {match.winner_username}
              </p>
              {isForfeit && (
                <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
                  Resolved by organizer — not a played result
                </p>
              )}
            </div>
          )}

          {deadlineMs != null && match.status !== 'completed' && (
            <div
              className={`alert mb-6 ${isDeadlineOverdue ? 'alert--error' : 'alert--success'}`}
              style={{
                borderColor: isDeadlineOverdue ? undefined : 'rgba(198, 255, 26, 0.35)',
              }}
            >
              <div className="flex-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.85 }}>
                    Match time limit
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {isDeadlineOverdue
                      ? 'Deadline reached — match still incomplete'
                      : `Time remaining: ${formatDeadlineRemaining(deadlineMs)}`}
                  </p>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                    Due {new Date(deadlineMs).toLocaleString()}
                  </p>
                </div>
                {!isDeadlineOverdue && (
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-lime)' }}>
                    {formatDeadlineRemaining(deadlineMs)}
                  </span>
                )}
              </div>
            </div>
          )}

          {showOrganizerDeadlineActions && (
            <div className="surface--inset panel-pad mb-6">
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-lime)', marginBottom: 8 }}>
                Organizer actions
              </p>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                The match deadline has passed. Extend time or award a walkover.
              </p>
              {deadlineError && !showExtendModal && !showForfeitModal && (
                <div className="alert alert--error mb-4">{deadlineError}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setDeadlineError('')
                    setShowExtendModal(true)
                  }}
                >
                  Add time
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setDeadlineError('')
                    setShowForfeitModal(true)
                  }}
                >
                  Force forfeit / walkover
                </Button>
              </div>
            </div>
          )}

          {conflictWarning && (
            <div className="alert alert--error mb-6">
              ⚠️ {conflictWarning}
            </div>
          )}

          {isOrganizer() && match.status !== 'pending' && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setEditScoreData({
                  player_1_score: match.player_1_score || '',
                  player_2_score: match.player_2_score || '',
                  winnerId: match.winner_id
                })
                setShowEditScoreModal(true)
              }}
              style={{ marginBottom: 16 }}
            >
              ✏️ Edit Score (Organizer Only)
            </Button>
          )}

          {isOrganizer() && match.status !== 'completed' && !match.player_1_score && !match.player_2_score && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setDirectInputData({
                  player_1_score: match.player_1_score || '',
                  player_2_score: match.player_2_score || '',
                  winnerId: match.winner_id
                })
                setShowDirectInputModal(true)
              }}
              style={{ marginBottom: 16 }}
            >
              📝 Input Result (Organizer Only)
            </Button>
          )}

          {match.status !== 'completed' && (
            <div className="surface--inset panel-pad mb-6">
              {canSubmit() ? (
                <div>
                  <div className="flex-between mb-4">
                    <h4 style={{ fontSize: 16, color: 'var(--accent-lime)', fontWeight: 600, margin: 0 }}>
                      Upload Your Result
                    </h4>
                    <span className="badge badge--open">Screenshot</span>
                  </div>

                  {uploadError && (
                    <div className="alert alert--error">
                      {uploadError}
                    </div>
                  )}

                  {!previewUrl ? (
                    <div
                      style={{
                        border: '2px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '36px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onClick={() => document.getElementById('screenshot-input').click()}
                      onMouseEnter={handleUploadZoneEnter}
                      onMouseLeave={handleUploadZoneLeave}
                    >
                      <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Click to upload screenshot
                      </p>
                      <p className="text-muted" style={{ fontSize: 12 }}>
                        JPEG or PNG, max 5MB
                      </p>
                      <input
                        id="screenshot-input"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxWidth: '400px',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 16,
                          border: '1px solid var(--border-subtle)',
                          display: 'block',
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <Button
                          onClick={handleSubmitResult}
                          loading={uploading}
                          disabled={uploading}
                          style={{ flex: 1 }}
                        >
                          Submit Result
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl(null)
                            setUploadError('')
                          }}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  {submissionStatus === 'submitted' && (
                    <div>
                      <div className="alert alert--success" style={{ marginBottom: 12 }}>
                        ✓ Result Submitted
                      </div>
                      <p className="text-muted" style={{ fontSize: 13 }}>
                        Waiting on opponent to submit their result
                      </p>
                    </div>
                  )}
                  {submissionStatus === 'waiting' && (
                    <div>
                      <div className="alert alert--info" style={{ marginBottom: 12 }}>
                        Opponent has submitted their result
                      </div>
                      <p className="text-muted" style={{ fontSize: 13 }}>
                        Please upload your screenshot to verify
                      </p>
                    </div>
                  )}
                  {submissionStatus === 'both' && (
                    <div>
                      <p style={{ fontSize: 14, color: 'var(--accent-lime)', marginBottom: 12, fontWeight: 600 }}>
                        Both results submitted
                      </p>
                      <div className="progress-track mb-4">
                        <div
                          className="progress-fill"
                          style={{
                            width: '70%',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        />
                      </div>
                      <p className="text-muted" style={{ fontSize: 13 }}>
                        Verifying scores...
                      </p>
                    </div>
                  )}
                  {!user && (
                    <p className="text-muted" style={{ fontSize: 14 }}>
                      Log in to submit your result
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {(match.status === 'completed' || match.verification_status === 'mismatch') &&
            (match.player_1_screenshot_url || match.player_2_screenshot_url) && (
            <div className="surface--inset panel-pad mb-6">
              <div className="flex-between mb-4">
                <h4 style={{ fontSize: 16, color: 'var(--accent-lime)', fontWeight: 600, margin: 0 }}>
                  Match Screenshots
                </h4>
                <span className="badge badge--muted">Evidence</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {match.player_1_screenshot_url && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      {player1}&apos;s screenshot
                    </p>
                    <img
                      src={mediaUrl(match.player_1_screenshot_url)}
                      alt={`${player1} screenshot`}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                        transition: 'border-color 0.2s, transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-lime)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      onClick={() => window.open(mediaUrl(match.player_1_screenshot_url), '_blank')}
                    />
                  </div>
                )}
                {match.player_2_screenshot_url && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      {player2}&apos;s screenshot
                    </p>
                    <img
                      src={mediaUrl(match.player_2_screenshot_url)}
                      alt={`${player2} screenshot`}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                        transition: 'border-color 0.2s, transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-lime)'
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      onClick={() => window.open(mediaUrl(match.player_2_screenshot_url), '_blank')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {match.verification_status === 'mismatch' && user && (
            <div className="alert alert--error mb-6" style={{ padding: 24, borderWidth: 2 }}>
              <div className="flex-between mb-4" style={{ alignItems: 'flex-start' }}>
                <h4 style={{ fontSize: 16, color: 'var(--error-red)', fontWeight: 600, margin: 0 }}>
                  ⚠️ Score Mismatch Detected
                </h4>
                <span className="badge badge--danger">Action Required</span>
              </div>
              <p className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>
                The AI-extracted scores from both screenshots do not match.
                {canResolveMismatch()
                  ? ' Review both reports and select the correct winner.'
                  : ' Waiting for the organizer (or an admin) to resolve.'}
              </p>

              {match.player_1_reported_score && match.player_1_reported_score !== 'UNCLEAR' && (
                <div style={{ marginBottom: 12 }}>
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    {player1} reported:{' '}
                    <span className="mono" style={{ color: 'var(--accent-lime)' }}>
                      {match.player_1_reported_score}
                    </span>
                  </p>
                </div>
              )}
              {match.player_2_reported_score && match.player_2_reported_score !== 'UNCLEAR' && (
                <div style={{ marginBottom: 16 }}>
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    {player2} reported:{' '}
                    <span className="mono" style={{ color: 'var(--accent-lime)' }}>
                      {match.player_2_reported_score}
                    </span>
                  </p>
                </div>
              )}

              {canResolveMismatch() && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token')
                        await axios.post(`/api/matches/${id}/resolve-mismatch`,
                          { winnerId: match.player_1_id },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        setMatch((await axios.get(`/api/matches/${id}`)).data.match)
                      } catch (error) {
                        alert(error.response?.data?.error || 'Failed to resolve mismatch')
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    Confirm {player1} Won
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token')
                        await axios.post(`/api/matches/${id}/resolve-mismatch`,
                          { winnerId: match.player_2_id },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        setMatch((await axios.get(`/api/matches/${id}`)).data.match)
                      } catch (error) {
                        alert(error.response?.data?.error || 'Failed to resolve mismatch')
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    Confirm {player2} Won
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="text-center mt-6">
        <p className="mono text-muted" style={{ fontSize: 12 }}>
          Match ID: #{match.id}
        </p>
      </div>

      <BottomNav unreadCount={unreadCount} />

      {/* Edit Score Modal */}
      {showEditScoreModal && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h3 className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>
              Edit Match Score
            </h3>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              Manually override the match result. This will be logged and players will be notified.
            </p>

            <div className="mb-4">
              <label className="field-label">{player1} Score</label>
              <input
                type="number"
                className="mono"
                value={editScoreData.player_1_score}
                onChange={(e) => setEditScoreData({ ...editScoreData, player_1_score: e.target.value })}
                placeholder="0"
                min="0"
                style={{ fontSize: 20 }}
              />
            </div>

            <div className="mb-4">
              <label className="field-label">{player2} Score</label>
              <input
                type="number"
                className="mono"
                value={editScoreData.player_2_score}
                onChange={(e) => setEditScoreData({ ...editScoreData, player_2_score: e.target.value })}
                placeholder="0"
                min="0"
                style={{ fontSize: 20 }}
              />
            </div>

            <div className="mb-6">
              <label className="field-label">
                Winner (optional - auto-determined from scores if not selected)
              </label>
              <select
                value={editScoreData.winnerId || ''}
                onChange={(e) => setEditScoreData({ ...editScoreData, winnerId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Auto-determine from scores</option>
                <option value={match.player_1_id}>{player1}</option>
                <option value={match.player_2_id}>{player2}</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowEditScoreModal(false)
                  setEditScoreData({ player_1_score: '', player_2_score: '', winnerId: null })
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleEditScore}
                loading={editingScore}
                disabled={editingScore}
              >
                Update Score
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Input Modal */}
      {showDirectInputModal && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h3 className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>
              Input Match Result
            </h3>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              Enter the match result directly. No screenshot required.
            </p>

            <div className="mb-4">
              <label className="field-label">{player1} Score</label>
              <input
                type="number"
                className="mono"
                value={directInputData.player_1_score}
                onChange={(e) => setDirectInputData({ ...directInputData, player_1_score: e.target.value })}
                placeholder="0"
                min="0"
                style={{ fontSize: 20 }}
              />
            </div>

            <div className="mb-4">
              <label className="field-label">{player2} Score</label>
              <input
                type="number"
                className="mono"
                value={directInputData.player_2_score}
                onChange={(e) => setDirectInputData({ ...directInputData, player_2_score: e.target.value })}
                placeholder="0"
                min="0"
                style={{ fontSize: 20 }}
              />
            </div>

            <div>
              <label className="field-label">
                Winner (optional - auto-determined from scores if not selected)
              </label>
              <select
                value={directInputData.winnerId || ''}
                onChange={(e) => setDirectInputData({ ...directInputData, winnerId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Auto-determine from scores</option>
                <option value={match.player_1_id}>{player1}</option>
                <option value={match.player_2_id}>{player2}</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowDirectInputModal(false)
                  setDirectInputData({ player_1_score: '', player_2_score: '', winnerId: null })
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleDirectInput}
                loading={submittingDirectInput}
                disabled={submittingDirectInput}
              >
                Submit Result
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExtendModal && (
        <div className="modal-overlay" onClick={() => !extending && setShowExtendModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>
              Add time
            </h3>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              Extend the match deadline by additional minutes. Players will be notified.
            </p>
            {deadlineError && <div className="alert alert--error mb-4">{deadlineError}</div>}
            <div className="mb-6">
              <label className="field-label">Minutes to add</label>
              <input
                type="number"
                className="mono"
                min="1"
                max="1440"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(e.target.value)}
                placeholder="30"
                style={{ fontSize: 20 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                variant="secondary"
                fullWidth
                disabled={extending}
                onClick={() => setShowExtendModal(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleExtendDeadline} loading={extending} disabled={extending}>
                Extend deadline
              </Button>
            </div>
          </div>
        </div>
      )}

      {showForfeitModal && (
        <div className="modal-overlay" onClick={() => !forfeiting && setShowForfeitModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>
              Force forfeit / walkover
            </h3>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              Declare one player the winner by forfeit. This completes the match and advances them. Shown as W/O on the bracket.
            </p>
            {deadlineError && <div className="alert alert--error mb-4">{deadlineError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button
                fullWidth
                disabled={forfeiting || !match.player_1_id}
                loading={forfeiting}
                onClick={() => handleForceForfeit(match.player_1_id)}
              >
                Declare {player1} winner
              </Button>
              <Button
                fullWidth
                disabled={forfeiting || !match.player_2_id}
                loading={forfeiting}
                onClick={() => handleForceForfeit(match.player_2_id)}
              >
                Declare {player2} winner
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={forfeiting}
                onClick={() => setShowForfeitModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default MatchDetail
