import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

export default function ScrollProgress() {
  const prefersReduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 32,
    restDelta: 0.001,
  })

  if (prefersReduced) return null

  return (
    <motion.div
      aria-hidden
      style={{
        scaleX,
        transformOrigin: '0% 50%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, #9FE600, #C6FF1A, #E8FF66)',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 0 16px rgba(198, 255, 26, 0.75), 0 0 32px rgba(198, 255, 26, 0.35)',
      }}
    />
  )
}
