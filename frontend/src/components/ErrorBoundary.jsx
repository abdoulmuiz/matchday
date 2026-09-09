import { Component } from 'react'
import Button from './Button'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/home'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen" style={{ flexDirection: 'column', gap: 16, padding: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--accent-lime)' }}>
            Something went wrong
          </h1>
          <p className="text-muted" style={{ textAlign: 'center', maxWidth: 360 }}>
            An unexpected error stopped this screen. You can reload or head back home.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="secondary" onClick={this.handleHome}>
              Go Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
