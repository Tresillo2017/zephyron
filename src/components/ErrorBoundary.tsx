import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-surface">
          <div className="text-center px-6 max-w-md">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'hsl(0 60% 50% / 0.1)' }}
            >
              <svg className="w-7 h-7" style={{ color: 'hsl(0 60% 55%)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--c1))' }}>Something went wrong</h1>
            <p className="text-sm mb-6" style={{ color: 'hsl(var(--c3))' }}>
              An unexpected error occurred. Please reload the page to continue.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono mb-4 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--b4) / 0.4)', color: 'hsl(var(--c3))' }}>
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: 'hsl(var(--h3))',
                color: 'white',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
