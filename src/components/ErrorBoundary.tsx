import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Button } from './bleh'
import './shell/dialogs.css'

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
        <div className="eb-root" role="alert">
          <div className="eb-card">
            <div className="eb-icon" aria-hidden="true">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="eb-title">Something went wrong</h1>
            <p className="eb-desc">An unexpected error occurred. Please reload the page to continue.</p>
            {this.state.error && <p className="eb-detail">{this.state.error.message}</p>}
            <Button appearance="primary" label="Reload Page" onClick={() => window.location.reload()} />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
