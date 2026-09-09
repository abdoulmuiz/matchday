import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import Card from '../components/Card'
import Button from '../components/Button'

const EmailIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const CheckEmail = () => {
  const navigate = useNavigate()

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
          <p className="text-muted" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            We&apos;ve sent a verification link to your email address. Please click the link to verify your account.
          </p>

          <div className="surface--inset" style={{ padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>
              The verification link will expire in 24 hours.
            </p>
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              If you don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <Button variant="secondary" fullWidth onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default CheckEmail
