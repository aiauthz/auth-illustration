import { useRef, useEffect } from 'react'
import { useStage } from './Stage'
import { ActorCard } from './ActorCard'

interface Node {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  roleLabel?: {
    text: string
    color: 'blue' | 'purple' | 'green' | 'orange'
  }
}

interface NodeLayerProps {
  nodes: Node[]
}

/**
 * NodeComponent - individual node wrapper that registers itself
 */
function NodeComponent({ node, registerNode }: { node: Node; registerNode: (id: string, ref: React.RefObject<HTMLDivElement>) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      registerNode(node.id, ref)
    }
  }, [node.id, registerNode])

  return (
    <div
      ref={ref}
      className="absolute pointer-events-auto z-30"
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: node.w ? `${node.w}px` : '220px',
        height: node.h ? `${node.h}px` : 'auto',
        visibility: 'visible',
        opacity: 1,
      }}
    >
      <ActorCard nodeId={node.id} roleLabel={node.roleLabel} />
    </div>
  )
}

/**
 * NodeLayer - places actor cards at grid positions
 * Nodes are ALWAYS visible - they should render immediately
 */
export function NodeLayer({ nodes }: NodeLayerProps) {
  const { registerNode } = useStage()

  if (!nodes || nodes.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ width: '1280px', height: '720px', visibility: 'visible' }}>
      {nodes.map((node) => (
        <NodeComponent key={node.id} node={node} registerNode={registerNode} />
      ))}
    </div>
  )
}