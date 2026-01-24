import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: (error: unknown) => React.ReactNode;
};

type State = {
  hasError: boolean;
  error: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Keep console visibility for debugging
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The dashboard hit an error while rendering. You can reload the page to recover.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
            {String((this.state.error as any)?.message ?? this.state.error)}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
