import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'
import AppShell from '../components/AppShell'
import ParallaxSection from '../components/ParallaxSection'
import {
  Reveal,
  Stagger,
  StaggerItem,
  slideLeftVariants,
  slideRightVariants,
} from '../components/motion/Reveal'

const EASE = [0.22, 1, 0.36, 1]

const statusBadge = (status) => {
  if (status === 'open') return 'badge badge--open'
  if (status === 'live') return 'badge badge--live'
  return 'badge badge--muted'
}

const Home = () => {
  const { user } = useAuth()
  const { logoUrl } = useBranding()
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()
  const [recentTournaments, setRecentTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [livePlayerCount] = useState(127)
  const [copiedTournamentId, setCopiedTournamentId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const fetchRecentTournaments = async () => {
      try {
        setError('')
        const response = await axios.get('/api/tournaments/recent', {
          signal: controller.signal,
        })
        setRecentTournaments(response.data.tournaments || [])
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        console.error('Error fetching recent tournaments:', err)
        setError('Could not load open matches.')
      } finally {
        setLoading(false)
      }
    }
    fetchRecentTournaments()
    return () => controller.abort()
  }, [])

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

  if (!user) {
    return null
  }

  return (
    <AppShell>
      <ParallaxSection speed={0.25} style={{ marginBottom: 4 }}>
        <section className="hero">
          <div className="hero__top">
            <motion.div
              className="hero__live"
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.25 }}
            >
              <span className="hero__live-dot" />
              {livePlayerCount} online
            </motion.div>
          </div>

          <motion.div
            className="hero__brand"
            initial={prefersReduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {logoUrl ? (
              <div className="hero__logo hero__logo--image" aria-hidden>
                <img src={logoUrl} alt="" />
              </div>
            ) : (
              <div className="hero__logo" aria-hidden>
                EF
              </div>
            )}
            <h1 className="hero__title">MatchDay</h1>
          </motion.div>

          <motion.p
            className="hero__copy"
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06, ease: EASE }}
          >
            Play. Compete. Win. Join tournaments, upload results, climb the ranks.
          </motion.p>

          <motion.div
            className="hero__actions"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: prefersReduced ? 0 : 0.06,
                  delayChildren: 0.12,
                },
              },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
              }}
            >
              <Button onClick={() => navigate('/browse-tournaments')} size="medium" style={{ minWidth: 140 }}>
                Join Match
              </Button>
            </motion.div>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
              }}
            >
              <Button
                variant="secondary"
                onClick={() => navigate('/create-tournament')}
                size="medium"
                style={{ minWidth: 140 }}
              >
                Create Match
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </ParallaxSection>

      <section style={{ marginBottom: 36 }}>
        <Reveal>
          <div className="section-head">
            <div>
              <h2 className="section-title">Open Matches</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>
                Jump into a live bracket and prove yourself.
              </p>
            </div>
            <button type="button" className="link-btn" onClick={() => navigate('/browse-tournaments')}>
              View all →
            </button>
          </div>
        </Reveal>

          {loading ? (
            <div className="text-center" style={{ padding: '64px 24px' }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : error ? (
            <Reveal>
              <Card className="empty-state">
                <h3 className="empty-state__title">Couldn’t load matches</h3>
                <p className="empty-state__copy">{error}</p>
              </Card>
            </Reveal>
          ) : recentTournaments.length === 0 ? (
          <Reveal>
            <Card className="empty-state">
              <div className="empty-state__icon">⚽</div>
              <h3 className="empty-state__title">No open tournaments yet</h3>
              <p className="empty-state__copy">Be the first to create a tournament.</p>
              <Button onClick={() => navigate('/create-tournament')}>Create Tournament</Button>
            </Card>
          </Reveal>
        ) : (
          <Stagger stagger={0.08} className="card-grid">
            {recentTournaments.map((tournament) => (
              <StaggerItem key={tournament.id}>
                <Card
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                  hoverable
                  padding="20px"
                >
                  <div className="t-card__meta">
                    <span className={statusBadge(tournament.status)}>
                      {tournament.status}
                      {tournament.type === 'closed' && ' 🔒'}
                    </span>
                    <button
                      type="button"
                      className={`icon-btn${copiedTournamentId === tournament.id ? ' icon-btn--success' : ''}`}
                      onClick={(e) => handleShare(e, tournament.id)}
                      title="Share tournament"
                    >
                      {copiedTournamentId === tournament.id ? '✓' : '↗'}
                    </button>
                  </div>

                  <h3 className="t-card__title">{tournament.name}</h3>
                  <p className="t-card__desc">{tournament.description}</p>

                  <div className="t-card__stat-row">
                    <span>Players</span>
                    <span className="t-card__stat-value">
                      {tournament.participant_count}/{tournament.player_limit}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${getFillPercentage(tournament.participant_count, tournament.player_limit)}%`,
                      }}
                    />
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <section style={{ marginBottom: 20 }}>
        <Reveal>
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">Four steps from signup to the trophy.</p>
        </Reveal>
        <Stagger stagger={0.1} className="steps-grid">
          {[
            { icon: '01', title: 'Join a Tournament', desc: 'Browse open brackets and lock in your spot.' },
            { icon: '02', title: 'Play Your Match', desc: 'Face your opponent and put up a score.' },
            { icon: '03', title: 'Upload Result', desc: 'Submit a screenshot for verification.' },
            { icon: '04', title: 'Win & Advance', desc: 'Get verified and climb toward the final.' },
          ].map((step, index) => (
            <StaggerItem
              key={step.title}
              variants={index % 2 === 0 ? slideLeftVariants : slideRightVariants}
            >
              <Card padding="24px" hoverable>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 36,
                    color: 'var(--accent-lime)',
                    marginBottom: 12,
                    letterSpacing: '0.04em',
                  }}
                >
                  {step.icon}
                </div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <BottomNav />
    </AppShell>
  )
}

export default Home
