import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { mediaUrl } from '../api'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const EASE = [0.22, 1, 0.36, 1]

const getRoundName = (roundNumber, totalRounds, matchesInRound) => {
  const fromEnd = totalRounds - roundNumber
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinals'
  if (fromEnd === 2) return 'Quarterfinals'
  if (matchesInRound > 0) return `Round of ${matchesInRound * 2}`
  return `Round ${roundNumber}`
}

const PlayerRow = ({ name, picture, score, isWinner, isLoser }) => {
  const initial = (name && name !== 'TBD' ? name : '?').charAt(0).toUpperCase()

  return (
    <div
      className={[
        'bk-player',
        isWinner ? 'bk-player--winner' : '',
        isLoser ? 'bk-player--loser' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="bk-player__avatar" aria-hidden>
        {picture ? (
          <img src={mediaUrl(picture)} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <span className="bk-player__name">{name}</span>
      <span className="bk-player__score mono">{score}</span>
    </div>
  )
}

const MatchCard = ({ match, onOpen, index }) => {
  const player1 = match.player_1_username || 'TBD'
  const player2 = match.player_2_username || 'TBD'
  const isForfeit = Boolean(Number(match.is_forfeit))
  const hasWinner = Boolean(match.winner_id)
  const p1Wins = hasWinner && match.winner_id === match.player_1_id
  const p2Wins = hasWinner && match.winner_id === match.player_2_id

  const score1 = isForfeit
    ? (p1Wins ? 'W/O' : '–')
    : (match.player_1_score !== null && match.player_1_score !== undefined
      ? match.player_1_score
      : '–')
  const score2 = isForfeit
    ? (p2Wins ? 'W/O' : '–')
    : (match.player_2_score !== null && match.player_2_score !== undefined
      ? match.player_2_score
      : '–')

  const isMismatch = match.verification_status === 'mismatch'
  const hasScreenshot = Boolean(match.player_1_screenshot_url || match.player_2_screenshot_url)

  let statusLabel = 'Pending'
  let statusClass = 'bk-status bk-status--pending'
  if (isMismatch) {
    statusLabel = 'Mismatch'
    statusClass = 'bk-status bk-status--mismatch'
  } else if (match.status === 'completed') {
    statusLabel = isForfeit ? 'Forfeit' : (hasScreenshot ? 'Verified' : 'Completed')
    statusClass = 'bk-status bk-status--done'
  } else if (match.status === 'live') {
    statusLabel = 'Live'
    statusClass = 'bk-status bk-status--live'
  } else if (match.match_deadline && new Date(match.match_deadline) <= new Date()) {
    statusLabel = 'Overdue'
    statusClass = 'bk-status bk-status--mismatch'
  }

  return (
    <motion.button
      type="button"
      className={`bk-match${isMismatch ? ' bk-match--mismatch' : ''}${hasWinner ? ' bk-match--decided' : ''}`}
      onClick={() => onOpen(match.id)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="bk-match__rail" aria-hidden />
      <PlayerRow
        name={player1}
        picture={match.player_1_picture}
        score={score1}
        isWinner={p1Wins}
        isLoser={hasWinner && !p1Wins}
      />
      <PlayerRow
        name={player2}
        picture={match.player_2_picture}
        score={score2}
        isWinner={p2Wins}
        isLoser={hasWinner && !p2Wins}
      />
      <div className="bk-match__footer">
        <span className={statusClass}>{statusLabel}</span>
        <span className="bk-match__open">Open →</span>
      </div>
    </motion.button>
  )
}

const Bracket = () => {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const [rounds, setRounds] = useState({})
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

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
    const fetchData = async () => {
      try {
        const tournamentResponse = await axios.get(`/api/tournaments/${tournamentId}`)
        setTournament(tournamentResponse.data.tournament)

        const matchesResponse = await axios.get(`/api/matches/tournament/${tournamentId}`)
        setRounds(matchesResponse.data.rounds || {})
      } catch (error) {
        console.error('Error fetching bracket data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tournamentId])

  const roundNumbers = useMemo(
    () => Object.keys(rounds).map(Number).sort((a, b) => a - b),
    [rounds]
  )
  const totalRounds = roundNumbers.length

  const completedCount = useMemo(() => {
    return Object.values(rounds)
      .flat()
      .filter((m) => m.status === 'completed').length
  }, [rounds])

  const totalMatches = useMemo(
    () => Object.values(rounds).flat().length,
    [rounds]
  )

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <AppShell>
      <div className="bk-page">
        <PageHeader
          title="Bracket"
          showBack
          onBack={() => navigate(`/tournament/${tournamentId}`)}
        />

        <motion.section
          className="bk-hero"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              Tournament tree
            </p>
            <h2 className="bk-hero__title">{tournament?.name || 'Tournament Bracket'}</h2>
            <p className="bk-hero__copy">Tap any match to view details and submit results.</p>
          </div>
          {totalRounds > 0 && (
            <div className="bk-hero__stats">
              <div className="bk-stat">
                <span className="bk-stat__value mono">{totalRounds}</span>
                <span className="bk-stat__label">Rounds</span>
              </div>
              <div className="bk-stat">
                <span className="bk-stat__value mono">
                  {completedCount}/{totalMatches}
                </span>
                <span className="bk-stat__label">Played</span>
              </div>
            </div>
          )}
        </motion.section>

        {roundNumbers.length === 0 ? (
          <div className="bk-empty surface">
            <div className="bk-empty__mark" aria-hidden>
              ⌁
            </div>
            <h3>Bracket not generated yet</h3>
            <p>The bracket will appear once the tournament fills and goes live.</p>
          </div>
        ) : (
          <div className="bk-board-wrap">
            <div className="bk-board" role="list">
              {roundNumbers.map((roundNum, roundIndex) => {
                const roundMatches = [...(rounds[roundNum] || [])].sort(
                  (a, b) => a.id - b.id
                )
                const label = getRoundName(roundNum, totalRounds, roundMatches.length)

                return (
                  <div
                    key={roundNum}
                    className="bk-round"
                    role="listitem"
                    style={{ '--round-index': roundIndex }}
                  >
                    <div className="bk-round__head">
                      <span className="bk-round__label">{label}</span>
                      <span className="bk-round__count mono">{roundMatches.length}</span>
                    </div>

                    <div className="bk-round__matches">
                      {roundMatches.map((match, matchIndex) => (
                        <div key={match.id} className="bk-slot">
                          <MatchCard
                            match={match}
                            index={matchIndex}
                            onOpen={(id) => navigate(`/match/${id}`)}
                          />
                          {roundIndex < totalRounds - 1 && (
                            <span className="bk-connector" aria-hidden />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav unreadCount={unreadCount} />
    </AppShell>
  )
}

export default Bracket
