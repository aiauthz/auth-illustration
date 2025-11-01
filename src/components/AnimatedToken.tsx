import { useEffect, useState } from 'react'

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
 * AnimatedToken - A token that animates along a path
 */
export function AnimatedToken({
  startX,
  startY,
  endX,
  endY,
  color,
  duration = 1500,
  label = '🔑',
  onComplete,
}: AnimatedTokenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(elapsed / duration, 1)
      
      setProgress(newProgress)
      
      if (newProgress < 1) {
        requestAnimationFrame(animate)
      } else if (onComplete) {
        onComplete()
      }
    }
    
    requestAnimationFrame(animate)
  }, [duration, onComplete])

  // Easing function for smooth animation
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const easedProgress = easeInOutCubic(progress)
  const currentX = startX + (endX - startX) * easedProgress
  const currentY = startY + (endY - startY) * easedProgress

  return (
    <div
      className="absolute pointer-events-none z-50 transition-opacity"
      style={{
        left: `${currentX}px`,
        top: `${currentY}px`,
        transform: 'translate(-50%, -50%)',
        opacity: progress < 0.95 ? 1 : 1 - (progress - 0.95) * 20,
      }}
    >
      <div
        className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-2xl animate-pulse"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}80`,
        }}
      >
        <span className="text-2xl">{label}</span>
      </div>
      {/* Trail effect */}
      <div
        className="absolute inset-0 rounded-full blur-md"
        style={{
          backgroundColor: color,
          opacity: 0.3,
          transform: 'scale(1.5)',
        }}
      />
    </div>
  )
}
