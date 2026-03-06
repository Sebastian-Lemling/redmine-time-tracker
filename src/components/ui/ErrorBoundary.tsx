import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { logger } from "../../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("ErrorBoundary caught", { error, data: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            gap: 16,
            color: "var(--color-on-surface)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--color-error-container)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            !
          </div>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Something went wrong</p>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-on-surface-variant)",
              maxWidth: 400,
              textAlign: "center",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "8px 24px",
              borderRadius: 20,
              border: "1px solid var(--color-outline)",
              background: "transparent",
              color: "var(--color-primary)",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
