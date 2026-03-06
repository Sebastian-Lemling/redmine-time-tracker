import type { RedmineUser } from "./redmine";

export type DescriptionState =
  | { status: "collapsed" }
  | { status: "loading"; startTime: number }
  | { status: "animating" }
  | { status: "expanded" };

export type AppState =
  | { status: "initial" }
  | { status: "connecting" }
  | { status: "error"; message: string }
  | { status: "ready"; user: RedmineUser };

export type SyncState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "error"; message: string }
  | { status: "success" };

export type BatchSyncState =
  | { status: "idle"; selectedIds: Set<string> }
  | { status: "syncing"; selectedIds: Set<string>; syncingId: string }
  | { status: "error"; syncedCount: number; failedCount: number; lastError: Error }
  | { status: "done"; syncedCount: number; failedCount: number };

export type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "loadingMore" }
  | { status: "error"; message: string }
  | { status: "success"; totalCount: number };
