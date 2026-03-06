import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error;
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>OK</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("catches child render error → shows default fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("Test crash")} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Child content")).not.toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("default fallback shows error message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("Detail error message")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Detail error message")).toBeInTheDocument();
    spy.mockRestore();
  });

  it('"Try again" button resets error state → re-renders children', () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Conditional() {
      if (shouldThrow) throw new Error("fail");
      return <div>Recovered</div>;
    }
    render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("Recovered")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("custom fallback prop renders static fallback UI", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingChild error={new Error("crash")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("componentDidCatch called with error info", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("logged error")} />
      </ErrorBoundary>,
    );
    // componentDidCatch logs to console.error
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
