import { motion } from 'framer-motion'

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  style: customStyle,
}) => {
  const paddings = {
    small: '10px 18px',
    medium: '12px 22px',
    large: '16px 30px',
  }

  const fonts = {
    small: '16px',
    medium: '18px',
    large: '22px',
  }

  const variantStyles = {
    primary: {
      background: 'linear-gradient(180deg, #E8FF66 0%, #C6FF1A 100%)',
      color: '#050706',
      border: 'none',
      boxShadow: '0 0 18px rgba(198,255,26,0.4), 0 4px 20px rgba(198,255,26,0.3)',
    },
    secondary: {
      background: 'transparent',
      color: '#C6FF1A',
      border: '1.5px solid rgba(198,255,26,0.75)',
      boxShadow: '0 0 12px rgba(198,255,26,0.15)',
    },
    ghost: {
      background: 'rgba(255,255,255,0.03)',
      color: '#F3F6EF',
      border: '1px solid #1E2C24',
    },
    danger: {
      background: 'transparent',
      color: '#FF5D5D',
      border: '1.5px solid rgba(255,93,93,0.65)',
    },
  }

  const hoverByVariant = {
    primary: {
      scale: 1.03,
      boxShadow: '0 0 36px rgba(198,255,26,0.65), 0 0 60px rgba(198,255,26,0.3)',
      filter: 'brightness(1.08)',
    },
    secondary: {
      scale: 1.03,
      background: 'rgba(198,255,26,0.12)',
      boxShadow: '0 0 28px rgba(198,255,26,0.4)',
    },
    ghost: {
      scale: 1.02,
      background: '#1A2620',
    },
    danger: {
      scale: 1.02,
      background: 'rgba(255,93,93,0.1)',
    },
  }

  const interactive = !disabled && !loading

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        borderRadius: '12px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-display)',
        fontSize: fonts[size] || fonts.medium,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: disabled || loading ? 0.5 : 1,
        padding: paddings[size] || paddings.medium,
        width: fullWidth ? '100%' : undefined,
        ...variantStyles[variant],
        ...customStyle,
      }}
      whileHover={interactive ? hoverByVariant[variant] : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {loading && <span className="spinner" style={{ width: 16, height: 16 }} />}
      {children}
    </motion.button>
  )
}

export default Button
