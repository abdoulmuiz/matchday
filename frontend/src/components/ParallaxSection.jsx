import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

/**
 * Background layer drifts slower than foreground for depth.
 */
export default function ParallaxSection({
  children,
  speed = 0.35,
  style,
  background,
}) {
  const ref = useRef(null)
  const prefersReduced = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReduced ? [0, 0] : [-90 * speed, 90 * speed]
  )

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        aria-hidden
        style={{
          y,
          position: 'absolute',
          inset: '-25%',
          zIndex: 0,
          pointerEvents: 'none',
          background:
            background ||
            'radial-gradient(ellipse 70% 55% at 50% 20%, rgba(198,255,26,0.2) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(154,255,77,0.1) 0%, transparent 50%)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
