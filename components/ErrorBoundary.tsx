import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Erreur inattendue' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-xeption-red/10 border border-xeption-red/30 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 text-xeption-red" />
        </div>
        <div>
          <h2 className="text-xl font-tech font-bold uppercase text-white mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-gray-400 text-sm max-w-sm">{this.state.message}</p>
        </div>
        <button
          onClick={this.handleReset}
          className="px-5 py-2.5 bg-xeption-gold text-black font-tech font-bold text-sm uppercase tracking-wider rounded-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }
}
