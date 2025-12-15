import type { ReactNode } from 'react'
import { Component } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown; errorInfo?: unknown }
> {
  state = { error: null as unknown, errorInfo: undefined as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Keep console output for debugging in production mobile devices.
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg =
      this.state.error instanceof Error
        ? `${this.state.error.name}: ${this.state.error.message}`
        : String(this.state.error)

    return (
      <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            background: 'white',
            border: '1px solid rgba(17,24,39,0.12)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 10px 30px rgba(17,24,39,0.06)',
          }}
        >
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ marginTop: 8, color: 'rgba(17,24,39,0.75)' }}>
            The app crashed instead of showing a blank screen. Please copy the error below.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#f9fafb',
              border: '1px solid rgba(17,24,39,0.12)',
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {msg}
          </pre>
          <button
            style={{ marginTop: 10 }}
            onClick={() => {
              window.location.reload()
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}


