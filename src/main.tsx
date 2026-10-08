import { StrictMode } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';

class BootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QORVIX boot error:', error, info);
  }
  reset = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('qorvix-')) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  };
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff', background: '#0F172A', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20 }}>QORVIX failed to start</h1>
          <p style={{ fontSize: 13, opacity: 0.8 }}>Showing the error instead of a gray screen:</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#1E293B', padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={this.reset} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 0 }}>
            Reset local data + reload
          </button>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Open DevTools (F12 → Console) for the full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const el = document.getElementById('root');
if (!el) {
  document.body.innerHTML = '<div style="padding:24px;font-family:system-ui">Missing #root in index.html</div>';
  throw new Error('Missing #root');
}

createRoot(el).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>
);
