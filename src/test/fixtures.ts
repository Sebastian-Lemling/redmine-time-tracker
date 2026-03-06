import type {
  RedmineIssue,
  RedmineTimeEntry,
  RedmineUser,
  RedmineProject,
  RedmineActivity,
  TimeLogEntry,
  TimerState,
} from "@/types/redmine";

export function createUser(overrides?: Partial<RedmineUser>): RedmineUser {
  return {
    id: 1,
    login: "jdoe",
    firstname: "John",
    lastname: "Doe",
    mail: "jdoe@example.com",
    ...overrides,
  };
}

export function createProject(overrides?: Partial<RedmineProject>): RedmineProject {
  return {
    id: 1,
    name: "Test Project",
    identifier: "test-project",
    ...overrides,
  };
}

export function createIssue(overrides?: Partial<RedmineIssue>): RedmineIssue {
  return {
    id: 101,
    subject: "Test Issue",
    project: { id: 1, name: "Test Project" },
    priority: { id: 2, name: "Normal" },
    status: { id: 1, name: "New" },
    tracker: { id: 1, name: "Bug" },
    done_ratio: 0,
    ...overrides,
  };
}

export function createTimeEntry(overrides?: Partial<RedmineTimeEntry>): RedmineTimeEntry {
  return {
    id: 1,
    hours: 1.5,
    comments: "Test time entry",
    spent_on: "2026-03-03",
    activity: { id: 9, name: "Development" },
    project: { id: 1, name: "Test Project" },
    issue: { id: 101 },
    ...overrides,
  };
}

export function createActivity(overrides?: Partial<RedmineActivity>): RedmineActivity {
  return {
    id: 9,
    name: "Development",
    is_default: true,
    ...overrides,
  };
}

export function createTimeLogEntry(overrides?: Partial<TimeLogEntry>): TimeLogEntry {
  return {
    id: "tl-1",
    issueId: 101,
    issueSubject: "Test Issue",
    projectId: 1,
    projectName: "Test Project",
    startTime: "2026-03-03T09:00:00.000Z",
    endTime: "2026-03-03T10:30:00.000Z",
    duration: 90,
    description: "",
    date: "2026-03-03",
    syncedToRedmine: false,
    ...overrides,
  };
}

export function createTimerState(overrides?: Partial<TimerState>): TimerState {
  return {
    issueId: 101,
    issueSubject: "Test Issue",
    projectName: "Test Project",
    startTime: new Date().toISOString(),
    ...overrides,
  };
}
