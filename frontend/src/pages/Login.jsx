import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import BrandMark from '../components/BrandMark'
import AppShell from '../components/AppShell'

const Login = () => {
  const navigate = useNavigate()
  const { login, redirectAfterLogin, setRedirectAfterLogin } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
    setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email) newErrors.email = 'Email or username is required'
    if (!formData.password) newErrors.password = 'Password is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await login(formData.email, formData.password)
      if (!response.user.profileCompleted) {
        navigate('/complete-profile')
      } else if (redirectAfterLogin) {
        navigate(redirectAfterLogin)
        setRedirectAfterLogin(null)
      } else {
        navigate('/home')
      }
    } catch (error) {
      setErrors({
        submit: error.response?.data?.error || 'Login failed. Please try again.',
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

          <h2 style={{ fontSize: 28, marginBottom: 8 }}>Welcome Back</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Sign in to join the next kickoff.
          </p>

          {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email or Username"
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com or username"
              error={errors.email}
              required
            />

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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="error" style={{ marginTop: 8 }}>{errors.password}</p>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me</span>
              </label>
            </div>

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Log In
            </Button>
          </form>

          <div className="text-center" style={{ marginTop: 24 }}>
            <button type="button" className="link-btn" onClick={() => navigate('/forgot-password')}>
              Forgot password?
            </button>
          </div>

          <div className="text-center" style={{ marginTop: 16 }}>
            <p className="text-muted" style={{ fontSize: 14 }}>
              Don&apos;t have an account?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('/signup')}>
                Sign up
              </button>
            </p>
          </div>
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default Login
