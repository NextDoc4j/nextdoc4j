import { Component, type ReactNode } from 'react';

interface ContentErrorBoundaryProps {
  children: ReactNode;
  resetKeys: readonly unknown[];
}

/** Isolates content rendering failures while keeping workspace navigation available. */
export class ContentErrorBoundary extends Component<
  ContentErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  /**
   * Switches to the recovery view after a descendant fails to render.
   * @param error Error raised by React descendants.
   * @returns The failed rendering state without exposing document contents.
   */
  static getDerivedStateFromError(error: unknown) {
    void error;
    return { failed: true };
  }

  /**
   * Restores rendering when navigation or the loaded document changes.
   * @param previous Props from the preceding render.
   * @returns Nothing; resets only a failed boundary with changed recovery keys.
   */
  componentDidUpdate(previous: ContentErrorBoundaryProps) {
    if (
      this.state.failed &&
      (previous.resetKeys.length !== this.props.resetKeys.length ||
        this.props.resetKeys.some((key, index) => !Object.is(key, previous.resetKeys[index])))
    ) {
      this.setState({ failed: false });
    }
  }

  /**
   * Renders the page or a local retry action using the workspace palette.
   * @param None; reads the current boundary state and children.
   * @returns Page content or an accessible recovery panel.
   */
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        className="m-6 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] p-6 text-[var(--ui-text)]"
        role="alert"
      >
        <h2 className="text-base font-semibold">当前内容暂时无法显示</h2>
        <p className="mt-2 text-sm text-[var(--ui-muted)]">
          可以重试，或从左侧切换其他接口和文档。
        </p>
        <button
          type="button"
          className="mt-4 rounded-md border border-[var(--ui-line)] px-3 py-1.5 text-sm text-[var(--ui-primary)] hover:bg-[var(--ui-soft)]"
          onClick={() => this.setState({ failed: false })}
        >
          重新尝试
        </button>
      </section>
    );
  }
}
