import { useEffect, useState } from 'react'
import { useStage } from '@/stage/Stage'
import { ValidationIndicator } from './ValidationIndicator'

interface ValidationIndicatorPositionedProps {
  isValidated: boolean
  nodeId: string
  position?: 'top' | 'right' | 'bottom' | 'left'
  validatingText?: string
  validatedText?: string
  validatingSubtext?: string
  validatedSubtext?: string
}

export function ValidationIndicatorPositioned({
  isValidated,
  nodeId,
  position = 'top',
  validatingText,
  validatedText,
  validatingSubtext,
  validatedSubtext,
}: ValidationIndicatorPositionedProps) {
  const { nodeRefs } = useStage()
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const [transform, setTransform] = useState('translate(-50%, -100%)')

  useEffect(() => {
    const updatePosition = () => {
      const nodeRef = nodeRefs.get(nodeId)
      if (nodeRef?.current) {
        const el = nodeRef.current
        const nodeLeft = parseFloat(el.style.left) || 0
        const nodeTop = parseFloat(el.style.top) || 0
        const nodeWidth = el.offsetWidth
        const nodeHeight = el.offsetHeight

        const centerX = nodeLeft + nodeWidth / 2
        const centerY = nodeTop + nodeHeight / 2
        const rightX = nodeLeft + nodeWidth
        const bottomY = nodeTop + nodeHeight

        let newPos = { left: 0, top: 0 }
        let newTransform = ''

        switch (position) {
          case 'top':
            newPos = { left: centerX, top: nodeTop - 20 }
            newTransform = 'translate(-50%, -100%)'
            break
          case 'right':
            newPos = { left: rightX + 20, top: centerY }
            newTransform = 'translate(0, -50%)'
            break
          case 'bottom':
            newPos = { left: centerX, top: bottomY + 20 }
            newTransform = 'translate(-50%, 0)'
            break
          case 'left':
            newPos = { left: nodeLeft - 20, top: centerY }
            newTransform = 'translate(-100%, -50%)'
            break
        }

        setPos(newPos)
        setTransform(newTransform)
      }
    }

    updatePosition()
    const timer = setInterval(updatePosition, 100)

    return () => clearInterval(timer)
  }, [nodeId, nodeRefs, position])

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        transform: transform,
      }}
    >
      <ValidationIndicator
        isValidated={isValidated}
        validatingText={validatingText}
        validatedText={validatedText}
        validatingSubtext={validatingSubtext}
        validatedSubtext={validatedSubtext}
      />
    </div>
  )
}
