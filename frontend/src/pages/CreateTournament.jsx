import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import AppShell from '../components/AppShell'
import Button from '../components/Button'
import BottomNav from '../components/BottomNav'

const EASE = [0.22, 1, 0.36, 1]

const PLAYER_OPTIONS = [
  { value: 8, label: '8', sub: 'Quick cup', rounds: '3 rounds' },
  { value: 16, label: '16', sub: 'Classic', rounds: '4 rounds' },
  { value: 32, label: '32', sub: 'Pro bracket', rounds: '5 rounds' },
  { value: 64, label: '64', sub: 'Grand slam', rounds: '6 rounds' },
]

const CreateTournament = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    player_limit: '',
    match_time_limit: '',
    type: 'open',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const handlePlayerLimitSelect = (limit) => {
    setFormData({
      ...formData,
      player_limit: limit,
    })
    setErrors({ ...errors, player_limit: '' })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Tournament name is required'
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required'
    }

    if (!formData.player_limit) {
      newErrors.player_limit = 'Player limit is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/tournaments', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate(`/tournament/${response.data.tournament.id}`)
    } catch (error) {
      setErrors({
        submit: error.response?.data?.error || 'Tournament creation failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const previewName = formData.name.trim() || 'Your Tournament Name'
  const previewDesc =
    formData.description.trim() || 'Describe the stakes, rules, and vibes of this matchday.'
  const previewLimit = formData.player_limit || '—'
  const selectedSize = PLAYER_OPTIONS.find((o) => o.value === formData.player_limit)

  return (
    <AppShell>
      <div className="create-page">
        <motion.section
          className="create-hero"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <p className="eyebrow">New matchday</p>
          <h1 className="create-hero__title">Build the bracket</h1>
          <p className="create-hero__copy">
            Name it, set the field size, and open the gates — or lock it behind a PIN.
          </p>
        </motion.section>

        <div className="create-layout">
          <motion.form
            className="create-form surface"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
          >
            {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

            <section className="create-section">
              <div className="create-section__head">
                <span className="create-step">01</span>
                <div>
                  <h2>Identity</h2>
                  <p>What players will see on the lobby board.</p>
                </div>
              </div>

              <div className="create-field">
                <label className="field-label" htmlFor="tournament-name">
                  Tournament name <span className="req">*</span>
                </label>
                <input
                  id="tournament-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Midweek Madness Cup"
                  style={{ borderColor: errors.name ? 'var(--error-red)' : undefined }}
                  required
                />
                {errors.name && <p className="error" style={{ marginTop: 8 }}>{errors.name}</p>}
              </div>

              <div className="create-field">
                <label className="field-label" htmlFor="tournament-desc">
                  Description <span className="req">*</span>
                </label>
                <textarea
                  id="tournament-desc"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Rules, skill level, prize vibe..."
                  rows={4}
                  style={{ borderColor: errors.description ? 'var(--error-red)' : undefined }}
                  required
                />
                {errors.description && (
                  <p className="error" style={{ marginTop: 8 }}>{errors.description}</p>
                )}
              </div>
            </section>

            <section className="create-section">
              <div className="create-section__head">
                <span className="create-step">02</span>
                <div>
                  <h2>Field size</h2>
                  <p>How many players enter the draw.</p>
                </div>
              </div>

              <div className="create-size-grid" role="group" aria-label="Player limit">
                {PLAYER_OPTIONS.map((opt) => {
                  const active = formData.player_limit === opt.value
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      className={`create-size${active ? ' create-size--active' : ''}`}
                      onClick={() => handlePlayerLimitSelect(opt.value)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="create-size__num">{opt.label}</span>
                      <span className="create-size__sub">{opt.sub}</span>
                      <span className="create-size__meta">{opt.rounds}</span>
                    </motion.button>
                  )
                })}
              </div>
              {errors.player_limit && (
                <p className="error" style={{ marginTop: 8 }}>{errors.player_limit}</p>
              )}
            </section>

            <section className="create-section">
              <div className="create-section__head">
                <span className="create-step">03</span>
                <div>
                  <h2>Access</h2>
                  <p>Open lobby or PIN-locked invite only.</p>
                </div>
              </div>

              <div className="create-access-grid">
                <motion.button
                  type="button"
                  className={`create-access${formData.type === 'open' ? ' create-access--active' : ''}`}
                  onClick={() => setFormData({ ...formData, type: 'open' })}
                  whileTap={{ scale: 0.985 }}
                >
                  <span className="create-access__icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                    </svg>
                  </span>
                  <span className="create-access__title">Open</span>
                  <span className="create-access__copy">Anyone can join from browse.</span>
                </motion.button>

                <motion.button
                  type="button"
                  className={`create-access${formData.type === 'closed' ? ' create-access--active' : ''}`}
                  onClick={() => setFormData({ ...formData, type: 'closed' })}
                  whileTap={{ scale: 0.985 }}
                >
                  <span className="create-access__icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <span className="create-access__title">Closed</span>
                  <span className="create-access__copy">PIN generated after creation.</span>
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={formData.type}
                  className="create-access-note"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {formData.type === 'open'
                    ? 'Public lobby — players can join freely until the bracket fills.'
                    : 'Private lobby — share the PIN with invited players only.'}
                </motion.p>
              </AnimatePresence>
            </section>

            <section className="create-section create-section--last">
              <div className="create-section__head">
                <span className="create-step">04</span>
                <div>
                  <h2>Match clock</h2>
                  <p>Optional minutes per match. When time runs out, everyone is alerted — you can add time or award a walkover.</p>
                </div>
              </div>

              <div className="create-field create-field--inline">
                <div className="create-time">
                  <input
                    type="number"
                    name="match_time_limit"
                    value={formData.match_time_limit}
                    onChange={handleChange}
                    placeholder="60"
                    min="5"
                    max="1440"
                    aria-label="Match time limit in minutes"
                  />
                  <span className="create-time__unit">min</span>
                </div>
                <p className="text-muted" style={{ fontSize: 13, marginTop: 10 }}>
                  Leave blank for no limit. Range: 5–1440 minutes.
                </p>
              </div>
            </section>

            <div className="create-actions">
              <Button type="submit" fullWidth size="large" loading={loading} disabled={loading}>
                Launch Tournament
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={() => navigate('/home')}>
                Cancel
              </Button>
            </div>
          </motion.form>

          <motion.aside
            className="create-preview"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: EASE }}
          >
            <div className="create-preview__sticky">
              <p className="eyebrow">Live preview</p>
              <div className="create-preview-card surface">
                <div className="create-preview-card__glow" aria-hidden />
                <div className="t-card__meta">
                  <span className={`badge ${formData.type === 'open' ? 'badge--open' : 'badge--muted'}`}>
                    {formData.type === 'open' ? 'Open' : 'Closed'}
                  </span>
                  <span className="create-preview-card__status">Draft</span>
                </div>
                <h3 className="create-preview-card__title">{previewName}</h3>
                <p className="create-preview-card__desc">{previewDesc}</p>
                <div className="t-card__stat-row">
                  <span>Players</span>
                  <span className="t-card__stat-value">0/{previewLimit}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '0%' }} />
                </div>
                <div className="create-preview-card__footer">
                  <span>{selectedSize ? selectedSize.sub : 'Pick a field size'}</span>
                  <span className="mono">
                    {formData.match_time_limit ? `${formData.match_time_limit}m` : 'No clock'}
                  </span>
                </div>
              </div>
              <ul className="create-preview-tips">
                <li>Clear names fill lobbies faster.</li>
                <li>Closed cups need a shared PIN after launch.</li>
                <li>You can manage players from the tournament page.</li>
              </ul>
            </div>
          </motion.aside>
        </div>
      </div>

      <BottomNav unreadCount={unreadCount} />
    </AppShell>
  )
}

export default CreateTournament
