import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '60vh', gap: 16, padding: 32, textAlign: 'center',
        }}>
          <AlertTriangle size={48} style={{ color: 'var(--accent-red)' }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
