import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

export const revealVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { duration: 0.4, ease: EASE },
  },
}

export const slideLeftVariants = {
  hidden: { opacity: 0, x: -48, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
}

export const slideRightVariants = {
  hidden: { opacity: 0, x: 48, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
}

const reducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

export function Reveal({
  children,
  delay = 0,
  className,
  style,
  variants = revealVariants,
}) {
  const prefersReduced = useReducedMotion()
  const active = prefersReduced ? reducedVariants : variants

  return (
    <motion.div
      className={className}
      style={{ transformPerspective: 1000, ...style }}
      variants={active}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({ children, stagger = 0.08, style, className }) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: prefersReduced ? 0 : stagger,
            delayChildren: prefersReduced ? 0 : 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style, className, variants = revealVariants }) {
  const prefersReduced = useReducedMotion()
  const active = prefersReduced ? reducedVariants : variants

  return (
    <motion.div className={className} style={style} variants={active}>
      {children}
    </motion.div>
  )
}
