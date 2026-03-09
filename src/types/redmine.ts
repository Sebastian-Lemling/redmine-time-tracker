export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier?: string;
}

export interface RedmineIssue {
  id: number;
  subject: string;
  project: RedmineProject;
  priority: { id: number; name: string };
  status: { id: number; name: string };
  tracker: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  fixed_version?: { id: number; name: string };
  estimated_hours?: number;
  spent_hours?: number;
  due_date?: string | null;
  done_ratio: number;
  description?: string;
  updated_on?: string;
  created_on?: string;
}

export interface RedmineStatus {
  id: number;
  name: string;
  is_closed: boolean;
}

export interface RedmineTracker {
  id: number;
  name: string;
}

export interface RedmineVersion {
  id: number;
  name: string;
  status?: string;
}

export interface RedmineMember {
  id: number;
  name: string;
}

export interface RedmineInstance {
  id: string;
  name: string;
  url: string;
  order: number;
}

export interface RedmineTimeEntry {
  id: number;
  hours: number;
  comments: string;
  spent_on: string;
  activity: { id: number; name: string };
  project: { id: number; name: string };
  issue?: { id: number };
  instanceId?: string;
  instanceName?: string;
}

export interface RedmineAttachment {
  id: number;
  filename: string;
  content_url: string;
  content_type: string;
  filesize?: number;
  author?: { id: number; name: string };
  created_on?: string;
}

export interface RedmineJournalDetail {
  property: string;
  name: string;
  old_value?: string | null;
  new_value?: string | null;
}

export interface RedmineJournal {
  id: number;
  user: { id: number; name: string };
  notes: string;
  created_on: string;
  details?: RedmineJournalDetail[];
}

export interface RedmineActivity {
  id: number;
  name: string;
  is_default?: boolean;
}

export interface TimeLogEntry {
  id: string;
  issueId: number;
  issueSubject: string;
  projectId: number;
  projectName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // minutes
  originalDuration?: number; // minutes — first booked duration, never overwritten
  description: string;
  date: string; // YYYY-MM-DD
  syncedToRedmine: boolean;
  redmineTimeEntryId?: number;
  activityId?: number;
  activityName?: string;
  instanceId: string;
  instanceName?: string;
}

export interface TimerState {
  issueId: number;
  issueSubject: string;
  projectId?: number;
  projectName: string;
  startTime: string; // ISO string
  pausedAt?: string; // ISO when paused
  totalPausedMs?: number; // accumulated pause ms
  instanceId: string;
}

export interface RedminePriority {
  id: number;
  name: string;
  is_default?: boolean;
}

export interface IssueSearchParams {
  q?: string;
  project_id?: number;
  status_id?: string;
  tracker_id?: number;
  assigned_to_id?: string;
  fixed_version_id?: number;
  priority_id?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface IssueSearchResult {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

export type TimerKey = string;

export type MultiTimerMap = Record<TimerKey, TimerState>;

export type ActiveTimerKey = TimerKey | null;

export function timerKey(instanceId: string, issueId: number): TimerKey {
  return `${instanceId}:${issueId}`;
}

export function parseTimerKey(key: TimerKey): { instanceId: string; issueId: number } {
  const idx = key.lastIndexOf(":");
  return { instanceId: key.slice(0, idx), issueId: Number(key.slice(idx + 1)) };
}

export const DEFAULT_INSTANCE_ID = "default";
