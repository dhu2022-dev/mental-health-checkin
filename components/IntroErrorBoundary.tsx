"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onFallback: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Catches React render errors (e.g. from DOM conflicts with password manager
 * extensions like Bitwarden) and shows a fallback with Skip instead of a blank screen.
 */
export class IntroErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60">
          <p className="text-white/80 text-sm">Something went wrong with the intro.</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onFallback();
            }}
            className="px-4 py-2 rounded-lg bg-white/90 text-stone-800 font-medium hover:bg-white transition"
          >
            Continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
