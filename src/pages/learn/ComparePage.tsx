import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlowComparison {
  id: string
  name: string
  analogy: string
  actors: string[]
  hasRedirect: boolean
  hasUserInteraction: boolean
  hasPkce: boolean
  hasRefreshToken: boolean
  hasClientSecret: boolean
  tokenLocation: string
  bestFor: string[]
  status: 'recommended' | 'active' | 'deprecated'
  rfc: string
}

const FLOWS: FlowComparison[] = [
  {
    id: 'auth-code-pkce',
    name: 'Auth Code + PKCE',
    analogy: 'Picking up a prescription: pharmacy checks your ID (auth server), gives you a numbered ticket (code), you take the ticket to the counter (token exchange), they give you the medicine (access token). The ticket is useless without your ID.',
    actors: ['User', 'Browser/App', 'Auth Server', 'Resource Server'],
    hasRedirect: true,
    hasUserInteraction: true,
    hasPkce: true,
    hasRefreshToken: true,
    hasClientSecret: false,
    tokenLocation: 'HTTP response body (never in URL)',
    bestFor: ['SPAs', 'Mobile apps', 'Any public client'],
    status: 'recommended',
    rfc: 'RFC 6749 + RFC 7636',
  },
  {
    id: 'client-credentials',
    name: 'Client Credentials',
    analogy: 'A delivery truck arriving at a warehouse: no person inside needs to show ID. The truck shows its company badge (client_id + secret), the gate opens, and the truck loads cargo (API data). If the badge is stolen, the company revokes it.',
    actors: ['Service', 'Auth Server', 'Resource Server'],
    hasRedirect: false,
    hasUserInteraction: false,
    hasPkce: false,
    hasRefreshToken: false,
    hasClientSecret: true,
    tokenLocation: 'HTTP response body',
    bestFor: ['Microservices', 'Background jobs', 'CI/CD', 'M2M'],
    status: 'active',
    rfc: 'RFC 6749 Section 4.4',
  },
  {
    id: 'device-code',
    name: 'Device Code',
    analogy: 'Checking in at a hotel kiosk: the kiosk prints a code (user_code), you call the front desk from your phone to confirm the code (verify on phone), and the kiosk unlocks your room (device gets tokens). You never type a password on the kiosk.',
    actors: ['Device', 'Auth Server', 'User (on phone)'],
    hasRedirect: false,
    hasUserInteraction: true,
    hasPkce: false,
    hasRefreshToken: true,
    hasClientSecret: false,
    tokenLocation: 'Polling response body',
    bestFor: ['Smart TVs', 'CLI tools', 'IoT devices', 'Game consoles'],
    status: 'active',
    rfc: 'RFC 8628',
  },
  {
    id: 'implicit',
    name: 'Implicit',
    analogy: 'Shouting your credit card number across a crowded store: the cashier (auth server) yells back your receipt (token) so everyone can hear it (URL fragment). It works, but everyone in the store now has your card number.',
    actors: ['User', 'Browser', 'Auth Server'],
    hasRedirect: true,
    hasUserInteraction: true,
    hasPkce: false,
    hasRefreshToken: false,
    hasClientSecret: false,
    tokenLocation: 'URL fragment (#access_token=...)',
    bestFor: ['Nothing (deprecated)', 'Was used for SPAs before CORS'],
    status: 'deprecated',
    rfc: 'RFC 6749 Section 4.2 (removed in OAuth 2.1)',
  },
  {
    id: 'ropc',
    name: 'Password Grant (ROPC)',
    analogy: 'Giving your house keys to a stranger so they can water your plants: they now have complete access to your home. Even if they only water the plants, nothing stops them from looking through your drawers.',
    actors: ['User', 'Client App', 'Auth Server'],
    hasRedirect: false,
    hasUserInteraction: true,
    hasPkce: false,
    hasRefreshToken: true,
    hasClientSecret: true,
    tokenLocation: 'HTTP response body',
    bestFor: ['Nothing (deprecated)', 'Was used for legacy migration only'],
    status: 'deprecated',
    rfc: 'RFC 6749 Section 4.3 (removed in OAuth 2.1)',
  },
]

interface DecisionNode {
  question: string
  yes: string | DecisionNode
  no: string | DecisionNode
}

const DECISION_TREE: DecisionNode = {
  question: 'Is a user involved?',
  yes: {
    question: 'Does the device have a browser?',
    yes: {
      question: 'Is it a server-side app with a backend?',
      yes: 'Auth Code + PKCE (with client_secret on backend)',
      no: 'Auth Code + PKCE (public client, no secret)',
    },
    no: 'Device Code Flow',
  },
  no: 'Client Credentials',
}

const statusColors = {
  recommended: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
  active: 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  deprecated: 'text-red-400 bg-red-900/20 border-red-800/30',
}

/**
 * Comparison Page — Layer 5: "Synthesize"
 * Side-by-side flow comparison + decision tree + analogies.
 */
export function ComparePage() {
  const [selectedFlows, setSelectedFlows] = useState<string[]>(['auth-code-pkce', 'implicit'])
  const [decisionPath, setDecisionPath] = useState<boolean[]>([])

  const toggleFlow = (id: string) => {
    setSelectedFlows((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  const selected = FLOWS.filter((f) => selectedFlows.includes(f.id))

  // Navigate decision tree
  let currentNode: DecisionNode | string = DECISION_TREE
  for (const answer of decisionPath) {
    if (typeof currentNode === 'string') break
    currentNode = answer ? currentNode.yes : currentNode.no
  }
  const isDecisionLeaf = typeof currentNode === 'string'

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold">Compare Flows</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 border border-purple-500/30">
            Layer 5: Synthesize
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Decision Tree */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">Which flow should I use?</h2>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
            <div className="space-y-4">
              {/* Render decision path */}
              {(() => {
                const nodes: { question: string; answer: boolean }[] = []
                let node: DecisionNode | string = DECISION_TREE
                for (let i = 0; i < decisionPath.length; i++) {
                  if (typeof node === 'string') break
                  nodes.push({ question: node.question, answer: decisionPath[i] })
                  node = decisionPath[i] ? node.yes : node.no
                }
                return nodes.map((n, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-sm text-neutral-500"
                  >
                    <span>{n.question}</span>
                    <span className={n.answer ? 'text-emerald-400' : 'text-red-400'}>
                      {n.answer ? 'Yes' : 'No'}
                    </span>
                  </motion.div>
                ))
              })()}

              {/* Current question or result */}
              <AnimatePresence mode="wait">
                {isDecisionLeaf ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 rounded-lg bg-emerald-900/20 border border-emerald-800/30"
                  >
                    <ArrowRight className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-lg font-semibold text-emerald-300">
                      {currentNode as string}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`q-${decisionPath.length}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-base font-medium text-neutral-200">
                      {(currentNode as DecisionNode).question}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDecisionPath([...decisionPath, true])}
                        className="px-4 py-2 rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50 text-sm font-medium transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDecisionPath([...decisionPath, false])}
                        className="px-4 py-2 rounded-md bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 text-sm font-medium transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {decisionPath.length > 0 && (
                <button
                  onClick={() => setDecisionPath([])}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Start over
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Flow selector */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">Compare side by side</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {FLOWS.map((flow) => (
              <button
                key={flow.id}
                onClick={() => toggleFlow(flow.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                  selectedFlows.includes(flow.id)
                    ? statusColors[flow.status]
                    : 'text-neutral-500 bg-neutral-900 border-neutral-700 hover:border-neutral-600',
                )}
              >
                {flow.name}
              </button>
            ))}
          </div>

          {/* Comparison table */}
          {selected.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-3 px-4 text-neutral-500 font-medium w-[180px]">Property</th>
                    {selected.map((f) => (
                      <th key={f.id} className="text-left py-3 px-4 text-neutral-300 font-semibold">
                        <div className="flex items-center gap-2">
                          {f.name}
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', statusColors[f.status])}>
                            {f.status}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Actors" values={selected.map((f) => f.actors.join(', '))} />
                  <CompareRow label="Browser redirect" values={selected.map((f) => f.hasRedirect)} />
                  <CompareRow label="User interaction" values={selected.map((f) => f.hasUserInteraction)} />
                  <CompareRow label="PKCE" values={selected.map((f) => f.hasPkce)} />
                  <CompareRow label="Refresh token" values={selected.map((f) => f.hasRefreshToken)} />
                  <CompareRow label="Client secret" values={selected.map((f) => f.hasClientSecret)} />
                  <CompareRow label="Token location" values={selected.map((f) => f.tokenLocation)} />
                  <CompareRow label="Best for" values={selected.map((f) => f.bestFor.join(', '))} />
                  <CompareRow label="RFC" values={selected.map((f) => f.rfc)} />
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Analogies */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">Real-world analogies</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FLOWS.map((flow) => (
              <motion.div
                key={flow.id}
                className="bg-neutral-900 rounded-lg border border-neutral-800 p-4"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-neutral-200">{flow.name}</h3>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', statusColors[flow.status])}>
                    {flow.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{flow.analogy}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function CompareRow({ label, values }: { label: string; values: (string | boolean)[] }) {
  return (
    <tr className="border-b border-neutral-800/50">
      <td className="py-3 px-4 text-neutral-500 font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4">
          {typeof v === 'boolean' ? (
            v ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <X className="h-4 w-4 text-neutral-600" />
            )
          ) : (
            <span className="text-neutral-300 text-xs">{v || <Minus className="h-4 w-4 text-neutral-700" />}</span>
          )}
        </td>
      ))}
    </tr>
  )
}
