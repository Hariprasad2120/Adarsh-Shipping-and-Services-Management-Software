"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { devConsoleStore } from "./dev-console-store";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class DevConsoleErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    devConsoleStore.recordError({
      message: error.message || String(error),
      stack: info.componentStack ?? error.stack,
      source: "react",
      severity: "error",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mnx-dev-crash-fallback" role="alert">
          <p>Something broke while rendering this page.</p>
          <button type="button" onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
