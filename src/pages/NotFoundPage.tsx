import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SLIDES } from '@/lib/slides'

export function NotFoundPage() {
  const featured = SLIDES.filter((s) => s.ready).slice(0, 5)

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <Helmet>
        <title>Page not found — oauthflows</title>
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <div className="max-w-md text-center">
        <p className="text-emerald-500 text-sm font-semibold tracking-wider uppercase mb-3">404</p>
        <h1 className="text-3xl font-bold text-neutral-100 mb-3">Page not found</h1>
        <p className="text-neutral-400 mb-8">
          That OAuth flow doesn’t exist here — yet. Try one of these instead.
        </p>
        <div className="flex flex-col gap-2 mb-8 text-left">
          {featured.map((s) => (
            <Link
              key={s.slug}
              to={`/flows/${s.slug}`}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-200 transition-colors hover:border-neutral-600"
            >
              {s.title}
            </Link>
          ))}
        </div>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to all flows
          </Button>
        </Link>
      </div>
    </main>
  )
}
