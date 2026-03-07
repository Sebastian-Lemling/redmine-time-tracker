import { createContext, useContext } from "react";
import type { RedmineUser, RedmineInstance } from "./types/redmine";
import type { AppRoute } from "./hooks/useHashRouter";
import type { ThemeMode } from "./hooks/useTheme";

export interface AppContextValue {
  user: RedmineUser;
  redmineUrl: string;
  route: AppRoute;
  navigate: (partial: Partial<AppRoute>) => void;
  todayMinutes: number;
  weekMinutes: number;
  unsyncedCount: number;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  loading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  instances: RedmineInstance[];
  activeInstanceId: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = AppContext.Provider;

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
