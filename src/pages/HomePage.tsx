import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { SLIDES } from '@/lib/slides'

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-500 sm:text-5xl">
          oauthflows
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-400">
          Interactive visualizations of OAuth 2.0, OpenID Connect, and modern identity flows.
        </p>
        <Link to={`/flows/${(SLIDES.find((s) => s.component) ?? SLIDES[0]).slug}`} className="mt-8 inline-block">
          <Button size="lg" className="gap-2">
            Start Learning
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Feature cards */}
      <section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SLIDES.map((slide, i) => {
            const isReady = !!slide.component

            const card = (
              <Card className={cn(
                'h-full transition-colors',
                isReady
                  ? 'group-hover:border-neutral-600'
                  : 'opacity-70'
              )}>
                <CardHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Flow {i + 1}
                    </p>
                    {!isReady && (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{slide.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {slide.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )

            return isReady ? (
              <Link key={slide.slug} to={`/flows/${slide.slug}`} className="group">
                {card}
              </Link>
            ) : (
              <div key={slide.slug} className="cursor-default">
                {card}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
