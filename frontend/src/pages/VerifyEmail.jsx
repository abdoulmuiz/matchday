import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import Button from '../components/Button'

const SuccessIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ErrorIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const VerifyEmail = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const isVerifying = useRef(false)

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent duplicate requests
      if (isVerifying.current) {
        console.log('Verification already in progress, skipping duplicate request');
        return
      }
      isVerifying.current = true;

      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')

      console.log('=== FRONTEND VERIFICATION START ===');
      console.log('Token from URL:', token);
      console.log('Token length:', token ? token.length : 'null');
      console.log('Full URL:', window.location.href);

      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link')
        return
      }

      try {
        console.log('Sending verification request to backend...');
        await axios.get(`/api/auth/verify-email?token=${token}`)
        console.log('Verification request succeeded');
        setStatus('success')
        setMessage('Your email has been verified successfully!')
      } catch (error) {
        console.log('=== FRONTEND VERIFICATION ERROR ===');
        console.log('Error response:', error.response);
        console.log('Error data:', error.response?.data);
        console.log('Error status:', error.response?.status);
        setStatus('error')
        setMessage(error.response?.data?.error || 'Verification failed. The link may be expired or invalid.')
      }
    }

    verifyEmail()
  }, [])

  return (
    <AppShell withNavPadding={false}>
      <motion.div
        className="auth-panel"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="panel-pad text-center" padding="32px">
          {status === 'loading' && (
            <div>
              <span className="spinner" style={{ width: 40, height: 40, margin: '0 auto 24px', display: 'block' }} />
              <h2 style={{ fontSize: 24, marginBottom: 12 }}>Verifying...</h2>
              <p className="text-muted">Please wait while we verify your email.</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="status-icon status-icon--success">
                <SuccessIcon />
              </div>
              <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--success-green)' }}>
                Email Verified!
              </h2>
              <p className="text-muted" style={{ fontSize: 15, marginBottom: 28 }}>
                {message}
              </p>
              <Button fullWidth onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="status-icon status-icon--error">
                <ErrorIcon />
              </div>
              <h2 style={{ fontSize: 28, marginBottom: 12, color: 'var(--error-red)' }}>
                Verification Failed
              </h2>
              <p className="text-muted" style={{ fontSize: 15, marginBottom: 28 }}>
                {message}
              </p>
              <Button variant="secondary" fullWidth onClick={() => navigate('/signup')}>
                Back to Signup
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default VerifyEmail
