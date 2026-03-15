import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { PresentationPage } from '@/pages/PresentationPage'
import { PlaygroundPage } from '@/pages/PlaygroundPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { UrlBuilderPage } from '@/pages/learn/UrlBuilderPage'
import { SecurityLabPage } from '@/pages/learn/SecurityLabPage'
import { ComparePage } from '@/pages/learn/ComparePage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="/flows/:slug" element={<PresentationPage />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="/playground/callback" element={<OAuthCallbackPage />} />
      <Route path="/learn/url-builder" element={<UrlBuilderPage />} />
      <Route path="/learn/security-lab" element={<SecurityLabPage />} />
      <Route path="/learn/compare" element={<ComparePage />} />
    </Routes>
  )
}

export default App
