import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import BrandMark from '../components/BrandMark'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

const EmailIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setEmail(e.target.value)
    setErrors({ ...errors, email: '' })
  }

  const validateForm = () => {
    const newErrors = {}
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (error) {
      setErrors({ 
        submit: error.response?.data?.error || 'Request failed. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AppShell withNavPadding={false}>
        <motion.div
          className="auth-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="panel-pad text-center" padding="32px">
            <div className="status-icon status-icon--info">
              <EmailIcon />
            </div>
            <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--accent-lime)' }}>
              Check Your Email
            </h2>
            <p className="text-muted" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
              If an account exists with {email}, we&apos;ve sent a password reset link to your email.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </Card>
        </motion.div>
      </AppShell>
    )
  }

  return (
    <AppShell withNavPadding={false}>
      <motion.div
        className="auth-panel"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="panel-pad" padding="32px">
          <BrandMark />

          <h2 style={{ fontSize: 28, marginBottom: 8 }}>Reset Password</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={handleChange}
              placeholder="your@email.com"
              error={errors.email}
              required
            />

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Send Reset Link
            </Button>
          </form>

          <div className="text-center" style={{ marginTop: 24 }}>
            <button type="button" className="link-btn" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default ForgotPassword
