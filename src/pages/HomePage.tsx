import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Seo } from '@/components/Seo'
import { SLIDES } from '@/lib/slides'
import { HOME_SEO, SITE_NAME, SITE_URL, canonicalUrl } from '@/lib/seo'
import homepageData from '@/data/homepage.json'
import faqData from '@/data/faq.json'

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: HOME_SEO.description,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'OAuth 2.0 and OIDC flow visualizations',
    itemListElement: SLIDES.filter((s) => s.ready).map((slide, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: canonicalUrl(`/flows/${slide.slug}`),
      name: slide.title,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  },
]

export function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Seo {...HOME_SEO} jsonLd={HOME_JSON_LD} />
      {/* Hero */}
      <section className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-500 sm:text-5xl">
          OAuth 2.0 &amp; OIDC Flows, Visualized
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-400">
          {homepageData.hero.subtitle}
        </p>
        <Link to={`/flows/${(SLIDES.find((s) => s.ready) ?? SLIDES[0]).slug}`} className="mt-8 inline-block">
          <Button size="lg" className="gap-2">
            {homepageData.hero.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              <ArrowRight className="h-6 w-6 text-emerald-500 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
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
                const isReady = slide.ready
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

      {/* FAQ */}
      <section className="mt-16 mb-12 text-left">
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-500">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Short answers to common OAuth 2.0, OIDC, and authentication flow questions.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
          <dl className="divide-y divide-neutral-800">
            {faqData.map((item) => (
              <div key={item.q}>
                <details className="group px-6 py-1 sm:px-8">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-neutral-100 marker:content-none">
                    <span>{item.q}</span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180 group-open:text-emerald-400"
                      aria-hidden="true"
                    />
                  </summary>
                  <dd className="max-w-4xl pb-5 pr-8 text-sm leading-7 text-neutral-400">
                    {item.a}
                  </dd>
                </details>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  )
}
