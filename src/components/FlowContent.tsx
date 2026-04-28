import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import flowContent from '@/data/flow-content.json'
import { SLIDES } from '@/lib/slides'

export interface FlowContentData {
  h1: string
  intro: string
  whenToUse: string
  steps: { name: string; text: string }[]
  gotchas: string[]
  related: string[]
}

const CONTENT = flowContent as Record<string, FlowContentData>

export function getFlowContent(slug: string): FlowContentData | null {
  return CONTENT[slug] ?? null
}

interface FlowContentProps {
  slug: string
}

export function FlowContent({ slug }: FlowContentProps) {
  const content = getFlowContent(slug)
  if (!content) return null

  const related = content.related
    .map((s) => SLIDES.find((slide) => slide.slug === s))
    .filter((s): s is NonNullable<typeof s> => !!s && s.ready)

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <h2 className="text-2xl font-semibold text-neutral-100 mb-4">Overview</h2>
      <p className="text-neutral-300 leading-relaxed mb-10">{content.intro}</p>

      <h2 className="text-2xl font-semibold text-neutral-100 mb-4">When to use it</h2>
      <p className="text-neutral-300 leading-relaxed mb-10">{content.whenToUse}</p>

      <h2 className="text-2xl font-semibold text-neutral-100 mb-4">Step by step</h2>
      <ol className="space-y-4 mb-10">
        {content.steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-sm font-medium flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <h3 className="text-base font-medium text-neutral-100 mb-1">{step.name}</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="text-2xl font-semibold text-neutral-100 mb-4">Gotchas &amp; security notes</h2>
      <ul className="space-y-3 mb-12">
        {content.gotchas.map((g, i) => (
          <li key={i} className="flex gap-3 text-neutral-300 text-sm leading-relaxed">
            <span className="text-amber-400 flex-shrink-0" aria-hidden="true">⚠</span>
            <span>{g}</span>
          </li>
        ))}
      </ul>

      {related.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">Related flows</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((slide) => (
              <Link
                key={slide.slug}
                to={`/flows/${slide.slug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:border-neutral-600"
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                    {slide.category}
                  </p>
                  <p className="text-sm font-medium text-neutral-100">{slide.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
