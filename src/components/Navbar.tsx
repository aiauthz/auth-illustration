import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors">
          <Shield className="h-5 w-5" />
          <span className="font-semibold text-sm">oauthflows</span>
        </Link>
      </div>
    </nav>
  )
}
