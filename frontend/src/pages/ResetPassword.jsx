import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import BrandMark from '../components/BrandMark'
import Card from '../components/Card'
import Button from '../components/Button'

const SuccessIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ResetPassword = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password requirements check
  const passwordRequirements = {
    length: formData.password.length >= 8,
    number: /\d/.test(formData.password)
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (!token) {
      setTokenValid(false)
    }
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!passwordRequirements.length) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!passwordRequirements.number) {
      newErrors.password = 'Password must contain at least 1 number'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    setLoading(true)
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword: formData.password
      })
      setSuccess(true)
    } catch (error) {
      setErrors({ 
        submit: error.response?.data?.error || 'Password reset failed. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  if (!tokenValid) {
    return (
      <AppShell withNavPadding={false}>
        <motion.div
          className="auth-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="panel-pad text-center" padding="32px">
            <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--error-red)' }}>
              Invalid Link
            </h2>
            <p className="text-muted" style={{ fontSize: 15, marginBottom: 28 }}>
              This password reset link is invalid or has expired.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/forgot-password')}>
              Request New Link
            </Button>
          </Card>
        </motion.div>
      </AppShell>
    )
  }

  if (success) {
    return (
      <AppShell withNavPadding={false}>
        <motion.div
          className="auth-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="panel-pad text-center" padding="32px">
            <div className="status-icon status-icon--success">
              <SuccessIcon />
            </div>
            <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--success-green)' }}>
              Password Reset!
            </h2>
            <p className="text-muted" style={{ fontSize: 15, marginBottom: 28 }}>
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Button fullWidth onClick={() => navigate('/login')}>
              Go to Login
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

          <h2 style={{ fontSize: 28, marginBottom: 24 }}>Set New Password</h2>

          {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    paddingRight: 48,
                    borderColor: errors.password ? 'var(--error-red)' : undefined,
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="error" style={{ marginTop: 8 }}>{errors.password}</p>}
              
              {formData.password && (
                <div className="password-requirements">
                  <p>Password requirements:</p>
                  <ul>
                    <li className={passwordRequirements.length ? 'valid' : ''}>
                      At least 8 characters
                    </li>
                    <li className={passwordRequirements.number ? 'valid' : ''}>
                      At least 1 number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="field-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    paddingRight: 48,
                    borderColor: errors.confirmPassword ? 'var(--error-red)' : undefined,
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && <p className="error" style={{ marginTop: 8 }}>{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Reset Password
            </Button>
          </form>
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default ResetPassword
