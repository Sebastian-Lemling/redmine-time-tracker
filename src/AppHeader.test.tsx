import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import AppHeader from "./AppHeader";
import { AppProvider } from "./AppContext";
import type { AppContextValue } from "./AppContext";

function makeContext(overrides?: Partial<AppContextValue>): AppContextValue {
  return {
    user: { id: 1, login: "admin", firstname: "Max", lastname: "Mustermann" } as any,
    redmineUrl: "http://redmine.test",
    route: { section: "tickets" } as any,
    navigate: vi.fn(),
    todayMinutes: 120,
    weekMinutes: 600,
    unsyncedCount: 3,
    themeMode: "light",
    setThemeMode: vi.fn(),
    loading: false,
    isRefreshing: false,
    onRefresh: vi.fn(),
    instances: [],
    activeInstanceId: "default",
    ...overrides,
  };
}

function renderWithContext(ctx: AppContextValue) {
  return render(
    <AppProvider value={ctx}>
      <AppHeader />
    </AppProvider>,
  );
}

describe("AppHeader", () => {
  it("renders navigation tabs", () => {
    renderWithContext(makeContext());
    expect(screen.getByText(/tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/zeiterfassung|time tracking/i)).toBeInTheDocument();
    // overview tab is hidden (WIP)
  });

  it("shows today and week hours", () => {
    renderWithContext(makeContext({ todayMinutes: 120, weekMinutes: 600 }));
    expect(screen.getByText("2:00h")).toBeInTheDocument();
    expect(screen.getByText("10:00h")).toBeInTheDocument();
  });

  it("shows unsynced badge count on timelog tab", () => {
    renderWithContext(makeContext({ unsyncedCount: 5 }));
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides unsynced badge when count is 0", () => {
    const { container } = renderWithContext(makeContext({ unsyncedCount: 0 }));
    expect(container.querySelector(".bg-error")).not.toBeInTheDocument();
  });

  it("clicking tickets tab navigates to tickets", () => {
    const navigate = vi.fn();
    renderWithContext(makeContext({ navigate }));
    fireEvent.click(screen.getByText(/tickets/i));
    expect(navigate).toHaveBeenCalledWith({ section: "tickets" });
  });

  it("clicking timelog tab navigates to timelog", () => {
    const navigate = vi.fn();
    renderWithContext(makeContext({ navigate }));
    fireEvent.click(screen.getByText(/zeiterfassung|time tracking/i));
    expect(navigate).toHaveBeenCalledWith({ section: "timelog" });
  });

  it("refresh button calls onRefresh", () => {
    const onRefresh = vi.fn();
    renderWithContext(makeContext({ onRefresh }));
    fireEvent.click(screen.getByLabelText(/aktualisieren|refresh/i));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("refresh icon spins when refreshing", () => {
    const { container } = renderWithContext(makeContext({ isRefreshing: true }));
    expect(container.querySelector(".refresh-spin")).toBeInTheDocument();
  });

  it("active tickets tab has indicator bar", () => {
    renderWithContext(makeContext({ route: { section: "tickets" } as any }));
    const ticketsTab = screen.getByText(/tickets/i).closest("button")!;
    expect(ticketsTab.className).toContain("text-on-surface");
  });

  describe("multi-instance tabs", () => {
    const instances = [
      { id: "prod", name: "Production", url: "https://r1.test", order: 0 },
      { id: "dev", name: "Development", url: "https://r2.test", order: 1 },
    ];

    it("renders one tab per instance instead of single Tickets tab", () => {
      renderWithContext(makeContext({ instances }));
      expect(screen.getByText("Production")).toBeInTheDocument();
      expect(screen.getByText("Development")).toBeInTheDocument();
      expect(screen.queryByText(/^tickets$/i)).not.toBeInTheDocument();
    });

    it("clicking instance tab navigates to tickets with instanceId", () => {
      const navigate = vi.fn();
      renderWithContext(makeContext({ instances, navigate }));
      fireEvent.click(screen.getByText("Development"));
      expect(navigate).toHaveBeenCalledWith({ section: "tickets", instanceId: "dev" });
    });

    it("active instance tab is highlighted", () => {
      renderWithContext(
        makeContext({
          instances,
          activeInstanceId: "prod",
          route: { section: "tickets" } as any,
        }),
      );
      const prodTab = screen.getByText("Production").closest("button")!;
      expect(prodTab.className).toContain("text-on-surface");
      const devTab = screen.getByText("Development").closest("button")!;
      expect(devTab.className).toContain("text-on-surface-variant");
    });

    it("single instance renders regular Tickets tab", () => {
      const singleInstance = [{ id: "default", name: "Redmine", url: "", order: 0 }];
      renderWithContext(makeContext({ instances: singleInstance }));
      expect(screen.getByText(/tickets/i)).toBeInTheDocument();
      expect(screen.queryByText("Redmine")).not.toBeInTheDocument();
    });
  });
});
