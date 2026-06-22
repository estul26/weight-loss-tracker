import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Weight Path screen error', error, info) }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="login-page"><section className="login-card" role="alert"><div className="login-mark">W</div><p className="eyebrow">Something went wrong</p><h1>Your records are safe.</h1><p>Weight Path had trouble opening this screen. Reload the app to continue.</p><button className="btn mt-5 w-full" onClick={() => window.location.reload()}>Reload Weight Path</button></section></main>
  }
}
