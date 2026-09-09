import { motion } from 'framer-motion'

const Card = ({
  children,
  padding = '24px',
  onClick,
  hoverable = false,
  className = '',
  style: customStyle,
}) => {
  return (
    <motion.div
      onClick={onClick}
      className={`surface ${className}`.trim()}
      style={{ padding, cursor: onClick || hoverable ? 'pointer' : undefined, ...customStyle }}
      whileHover={
        hoverable
          ? {
              y: -6,
              scale: 1.015,
              boxShadow:
                '0 18px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(198,255,26,0.28), 0 0 28px rgba(198,255,26,0.18)',
            }
          : undefined
      }
      whileTap={hoverable ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default Card
