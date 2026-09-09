import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import BrandMark from '../components/BrandMark'
import AppShell from '../components/AppShell'

const Signup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  })
  const [errors, setErrors] = useState({})
  const [usernameStatus, setUsernameStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRequirements = {
    length: formData.password.length >= 8,
    number: /\d/.test(formData.password),
  }

  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 3) {
        setUsernameStatus('checking')
        try {
          const response = await axios.get(`/api/auth/check-username/${formData.username}`)
          setUsernameStatus(response.data.available ? 'available' : 'unavailable')
        } catch {
          setUsernameStatus('')
        }
      } else {
        setUsernameStatus('')
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.username])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setErrors({
      ...errors,
      [e.target.name]: '',
    })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

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

    if (!formData.username) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (usernameStatus === 'unavailable') {
      newErrors.username = 'Username is already taken'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      await axios.post('/api/auth/signup', {
        email: formData.email,
        password: formData.password,
        username: formData.username,
      })
      navigate('/check-email')
    } catch (error) {
      setErrors({
        submit: error.response?.data?.error || 'Signup failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
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

          <h2 style={{ fontSize: 28, marginBottom: 8 }}>Create Account</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Build your roster and enter the arena.
          </p>

          {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              error={errors.email}
              required
            />

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className="mono"
                style={{
                  borderColor: errors.username ? 'var(--error-red)' : undefined,
                }}
              />
              {usernameStatus === 'checking' && (
                <p className="username-status checking">Checking availability...</p>
              )}
              {usernameStatus === 'available' && (
                <p className="username-status available">Username available</p>
              )}
              {usernameStatus === 'unavailable' && (
                <p className="username-status unavailable">Username taken</p>
              )}
              {errors.username && <p className="error" style={{ marginTop: 8 }}>{errors.username}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Password</label>
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
              <label className="field-label">Confirm Password</label>
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
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="error" style={{ marginTop: 8 }}>{errors.confirmPassword}</p>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="checkbox-group">
                <input type="checkbox" required />
                <span>I agree to the Terms of Service and Privacy Policy</span>
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading || usernameStatus === 'unavailable'}
            >
              Create Account
            </Button>
          </form>

          <div className="text-center" style={{ marginTop: 24 }}>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('/login')}>
                Log in
              </button>
            </p>
          </div>
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default Signup
