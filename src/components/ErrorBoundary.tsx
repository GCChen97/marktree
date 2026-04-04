import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell" data-theme="day" data-viewport-mode="desktop">
          <div className="pane-content">
            <p className="pane-eyebrow">Runtime Error</p>
            <h1 className="pane-title">页面渲染失败</h1>
            <p className="pane-description">
              {this.state.error.message || '发生了未知运行时错误。'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
