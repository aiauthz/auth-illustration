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
import homepageData from '@/data/homepage.json'

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-500 sm:text-5xl">
          {homepageData.hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-400">
          {homepageData.hero.subtitle}
        </p>
        <Link to={`/flows/${(SLIDES.find((s) => s.component) ?? SLIDES[0]).slug}`} className="mt-8 inline-block">
          <Button size="lg" className="gap-2">
            {homepageData.hero.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Playground CTA */}
      <section className="mb-16">
        <Link to="/playground" className="group block">
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-neutral-900 p-8 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {homepageData.playground.badges.map((badge) => (
                    <span
                      key={badge}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded font-medium',
                        badge === 'Live'
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700',
                      )}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">{homepageData.playground.title}</h2>
                <p className="text-neutral-400 max-w-lg">
                  {homepageData.playground.description}
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-emerald-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </section>

      {/* Flow cards grouped by category */}
      {homepageData.categoryOrder.map((category) => {
        const categorySlides = SLIDES.filter((s) => s.category === category)
        if (categorySlides.length === 0) return null

        const categoryColor = homepageData.categories[category as keyof typeof homepageData.categories]?.color ?? 'text-neutral-400'

        return (
          <section key={category} className="mb-12">
            <h2 className={cn('text-sm font-semibold uppercase tracking-wider mb-4', categoryColor)}>
              {category}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categorySlides.map((slide) => {
                const isReady = !!slide.component
                const globalIndex = SLIDES.indexOf(slide)

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
                          Flow {globalIndex + 1}
                        </p>
                        {category === 'Deprecated' && (
                          <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-800/30">
                            Deprecated
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
        )
      })}
    </div>
  )
}
