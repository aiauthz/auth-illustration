import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { PresentationPage } from '@/pages/PresentationPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="/flows/:slug" element={<PresentationPage />} />
    </Routes>
  )
}

export default App
