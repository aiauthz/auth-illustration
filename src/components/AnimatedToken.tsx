import { motion } from 'motion/react'

interface AnimatedTokenProps {
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  duration?: number
  label?: string
  onComplete?: () => void
}

/**
 * AnimatedToken - A glowing token that animates from one position to another.
 * Uses motion for spring-based animation with proper exit handling.
 */
export function AnimatedToken({
  startX,
  startY,
  endX,
  endY,
  color,
  duration = 1.5,
  label = '🔑',
  onComplete,
}: AnimatedTokenProps) {
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ transform: 'translate(-50%, -50%)' }}
      initial={{ left: startX, top: startY, opacity: 0, scale: 0.3 }}
      animate={{ left: endX, top: endY, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{
        left: { duration, ease: [0.4, 0, 0.2, 1] },
        top: { duration, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.3, delay: 0 },
        scale: { duration: 0.4, ease: 'easeOut' },
      }}
      onAnimationComplete={() => onComplete?.()}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: color, opacity: 0.4 }}
        animate={{ scale: [1.2, 1.8, 1.2] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Token body */}
      <motion.div
        className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-2xl"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}80`,
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-2xl">{label}</span>
      </motion.div>

      {/* Trail particles */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
      />
    </motion.div>
  )
}
