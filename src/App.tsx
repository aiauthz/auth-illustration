import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'

const PresentationPage = lazy(() => import('@/pages/PresentationPage').then((m) => ({ default: m.PresentationPage })))
const PlaygroundPage = lazy(() => import('@/pages/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })))

const Loading = () => (
  <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
    <div className="w-5 h-5 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="/flows/:slug" element={<PresentationPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/playground/callback" element={<OAuthCallbackPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
