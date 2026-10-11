import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-rose-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Application Encountered an Issue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected error occurred while rendering this interface. Your data and booked tokens are safe on the server.
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-rose-300 break-all text-left max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-[#8164AD] hover:bg-[#6A4C97] text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-[#8164AD]/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
