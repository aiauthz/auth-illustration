import { Link } from 'react-router-dom'
import { Github, Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-900/50 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1.5 text-emerald-500">
            <Shield className="h-3.5 w-3.5" />
            <span className="font-semibold text-xs">oauthflows</span>
          </Link>
          <span className="text-neutral-700">·</span>
          <p className="text-xs text-neutral-500">
            Interactive visualizations of OAuth 2.0, OIDC, and modern identity flows.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <a
            href="https://github.com/nicholasgriffintn/okta-samples"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-neutral-200 transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <span className="text-neutral-700">·</span>
          <span>
            Made with ❤️ by{' '}
            <a
              href="https://github.com/iamspathan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              @iamspathan
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
