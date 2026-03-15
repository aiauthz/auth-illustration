import { Component, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary — catches render errors and shows a recovery UI
 * instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
            <h2 className="text-lg font-semibold text-neutral-200 mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-200 rounded-md text-sm hover:bg-neutral-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
