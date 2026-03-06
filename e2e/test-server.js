import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TEST_USER = {
  id: 1,
  login: "testuser",
  firstname: "Test",
  lastname: "User",
  mail: "test@example.com",
};

const ORIGINAL_ISSUES = [
  {
    id: 101,
    subject: "Fix login validation",
    project: { id: 1, name: "Project Alpha" },
    priority: { id: 2, name: "Normal" },
    status: { id: 2, name: "In Progress" },
    tracker: { id: 1, name: "Bug" },
    assigned_to: { id: 1, name: "Test User" },
    done_ratio: 30,
    description: "Login validation needs regex check",
    due_date: "2024-02-15",
    updated_on: "2024-01-15T10:00:00Z",
    created_on: "2024-01-10T08:00:00Z",
    journals: [
      {
        id: 1,
        user: { id: 1, name: "Test User" },
        notes: "Started working on the regex patterns",
        created_on: "2024-01-12T14:00:00Z",
      },
    ],
  },
  {
    id: 102,
    subject: "Add dark mode support",
    project: { id: 1, name: "Project Alpha" },
    priority: { id: 3, name: "High" },
    status: { id: 1, name: "New" },
    tracker: { id: 2, name: "Feature" },
    assigned_to: { id: 1, name: "Test User" },
    done_ratio: 0,
    description: "",
    updated_on: "2024-01-14T15:00:00Z",
    created_on: "2024-01-12T09:00:00Z",
    journals: [],
  },
  {
    id: 201,
    subject: "Update API documentation",
    project: { id: 2, name: "Project Beta" },
    priority: { id: 2, name: "Normal" },
    status: { id: 1, name: "New" },
    tracker: { id: 2, name: "Feature" },
    assigned_to: { id: 1, name: "Test User" },
    done_ratio: 0,
    description: "API docs need updating for v2",
    updated_on: "2024-01-13T12:00:00Z",
    created_on: "2024-01-11T10:00:00Z",
    journals: [],
  },
];

let ISSUES = structuredClone(ORIGINAL_ISSUES);

const ALLOWED_STATUSES = {
  1: [
    { id: 2, name: "In Progress" },
    { id: 3, name: "Resolved" },
  ],
  2: [
    { id: 1, name: "New" },
    { id: 3, name: "Resolved" },
  ],
  3: [
    { id: 1, name: "New" },
    { id: 2, name: "In Progress" },
  ],
};

const ACTIVITIES = [
  { id: 9, name: "Development", is_default: true },
  { id: 10, name: "Testing" },
];

const STATUSES = [
  { id: 1, name: "New", is_closed: false },
  { id: 2, name: "In Progress", is_closed: false },
  { id: 3, name: "Resolved", is_closed: true },
];

const TRACKERS = [
  { id: 1, name: "Bug" },
  { id: 2, name: "Feature" },
];

const PROJECTS = [
  { id: 1, name: "Project Alpha", identifier: "alpha" },
  { id: 2, name: "Project Beta", identifier: "beta" },
];

const PRIORITIES = [
  { id: 1, name: "Low" },
  { id: 2, name: "Normal" },
  { id: 3, name: "High" },
  { id: 4, name: "Urgent" },
];

let timelog = [];
let syncedEntries = [];
let nextRemoteId = 1000;
let failNext = false;

// --- Reset endpoint for tests ---
app.post("/api/__reset", (_req, res) => {
  timelog = [];
  syncedEntries = [];
  nextRemoteId = 1000;
  failNext = false;
  ISSUES = structuredClone(ORIGINAL_ISSUES);
  res.json({ ok: true });
});

// --- Error simulation ---
app.post("/api/__fail-next", (_req, res) => {
  failNext = true;
  res.json({ ok: true });
});

// --- User ---
app.get("/api/me", (_req, res) => {
  res.json({ user: TEST_USER, redmineUrl: "http://redmine.example.com" });
});

// --- Issues (assigned) ---
app.get("/api/issues", (_req, res) => {
  res.json({ issues: ISSUES, total_count: ISSUES.length });
});

// --- Issue search (all filter params) ---
app.get("/api/issues/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  let results = [...ISSUES];

  if (q) {
    const idMatch = q.match(/^#?(\d+)$/);
    if (idMatch) {
      results = results.filter((i) => i.id === Number(idMatch[1]));
    } else {
      results = results.filter((i) => i.subject.toLowerCase().includes(q));
    }
  }
  if (req.query.project_id) {
    results = results.filter((i) => i.project.id === Number(req.query.project_id));
  }
  if (req.query.tracker_id) {
    results = results.filter((i) => i.tracker.id === Number(req.query.tracker_id));
  }
  if (req.query.status_id) {
    results = results.filter((i) => i.status.id === Number(req.query.status_id));
  }
  if (req.query.priority_id) {
    results = results.filter((i) => i.priority.id === Number(req.query.priority_id));
  }
  if (req.query.assigned_to_id) {
    const val = req.query.assigned_to_id;
    if (val === "me") {
      results = results.filter((i) => i.assigned_to?.id === TEST_USER.id);
    } else {
      results = results.filter((i) => i.assigned_to?.id === Number(val));
    }
  }
  if (req.query.fixed_version_id) {
    results = results.filter((i) => i.fixed_version?.id === Number(req.query.fixed_version_id));
  }
  if (req.query.sort) {
    const [field, dir] = req.query.sort.split(":");
    const mult = dir === "asc" ? 1 : -1;
    results.sort((a, b) => {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";
      if (av < bv) return -1 * mult;
      if (av > bv) return 1 * mult;
      return 0;
    });
  }

  const offset = Number(req.query.offset) || 0;
  const limit = Number(req.query.limit) || 25;
  res.json({
    issues: results.slice(offset, offset + limit),
    total_count: results.length,
    offset,
    limit,
  });
});

// --- Single issue (supports ?include=journals,allowed_statuses) ---
app.get("/api/issues/:id", (req, res) => {
  const issue = ISSUES.find((i) => i.id === Number(req.params.id));
  if (!issue) return res.status(404).json({ error: "Not found" });
  const include = String(req.query.include || "");
  const result = { ...issue };
  if (!include.includes("journals")) {
    const { journals, ...rest } = result;
    Object.assign(result, rest);
    delete result.journals;
  }
  if (include.includes("allowed_statuses")) {
    result.allowed_statuses = ALLOWED_STATUSES[issue.status.id] || STATUSES;
  }
  res.json({ issue: result });
});

// --- Activities ---
app.get("/api/activities", (_req, res) => {
  res.json({ time_entry_activities: ACTIVITIES });
});

app.get("/api/projects/:id/activities", (_req, res) => {
  res.json({ time_entry_activities: ACTIVITIES });
});

// --- Statuses ---
app.get("/api/statuses", (_req, res) => {
  res.json({ issue_statuses: STATUSES });
});

// --- Trackers ---
app.get("/api/trackers", (_req, res) => {
  res.json({ trackers: TRACKERS });
});

app.get("/api/projects/:id/trackers", (_req, res) => {
  res.json({ trackers: TRACKERS });
});

// --- Projects ---
app.get("/api/projects", (_req, res) => {
  res.json({ projects: PROJECTS });
});

// --- Priorities ---
app.get("/api/priorities", (_req, res) => {
  res.json({ issue_priorities: PRIORITIES });
});

// --- Project members ---
app.get("/api/projects/:id/members", (_req, res) => {
  res.json({ members: [{ id: 1, name: "Test User" }] });
});

// --- Project versions ---
app.get("/api/projects/:id/versions", (_req, res) => {
  res.json({ versions: [{ id: 1, name: "v1.0", status: "open" }] });
});

// --- Remote time entries ---
app.get("/api/time_entries/today", (_req, res) => {
  const todayStr = today();
  const entries = syncedEntries.filter((e) => e.spent_on === todayStr);
  res.json({ time_entries: entries });
});

app.get("/api/time_entries/range", (_req, res) => {
  res.json({ time_entries: syncedEntries });
});

// --- Create remote time entry (sync) ---
app.post("/api/time_entries", (req, res) => {
  if (failNext) {
    failNext = false;
    return res.status(500).json({ error: "Sync failed" });
  }
  const id = nextRemoteId++;
  const entry = {
    id,
    hours: req.body.time_entry?.hours || 0,
    comments: req.body.time_entry?.comments || "",
    spent_on: req.body.time_entry?.spent_on || today(),
    activity: ACTIVITIES.find((a) => a.id === req.body.time_entry?.activity_id) || ACTIVITIES[0],
    project: { id: 1, name: "Project Alpha" },
    issue: { id: req.body.time_entry?.issue_id },
  };
  syncedEntries.push(entry);
  res.status(201).json({ time_entry: entry });
});

// --- Update issue (actually mutates in-memory) ---
app.put("/api/issues/:id", (req, res) => {
  if (failNext) {
    failNext = false;
    return res.status(500).json({ error: "Internal Server Error" });
  }
  const issue = ISSUES.find((i) => i.id === Number(req.params.id));
  if (!issue) return res.status(404).json({ error: "Not found" });
  const body = req.body.issue || req.body;
  if (body.status_id) {
    const st = STATUSES.find((s) => s.id === body.status_id);
    if (st) issue.status = { id: st.id, name: st.name };
  }
  if (body.tracker_id) {
    const tr = TRACKERS.find((t) => t.id === body.tracker_id);
    if (tr) issue.tracker = { id: tr.id, name: tr.name };
  }
  if (body.assigned_to_id !== undefined) {
    if (body.assigned_to_id === null || body.assigned_to_id === "") {
      issue.assigned_to = null;
    } else {
      issue.assigned_to = { id: Number(body.assigned_to_id), name: "Test User" };
    }
  }
  if (body.fixed_version_id !== undefined) {
    if (body.fixed_version_id === null || body.fixed_version_id === "") {
      issue.fixed_version = null;
    } else {
      issue.fixed_version = { id: Number(body.fixed_version_id), name: "v1.0" };
    }
  }
  if (body.done_ratio !== undefined) {
    issue.done_ratio = Number(body.done_ratio);
  }
  issue.updated_on = new Date().toISOString();
  res.json({ ok: true });
});

// --- Local timelog CRUD ---
app.get("/api/timelog", (_req, res) => {
  res.json(timelog);
});

app.post("/api/timelog", (req, res) => {
  const entry = {
    ...req.body,
    id: crypto.randomUUID(),
    syncedToRedmine: false,
  };
  timelog.unshift(entry);
  res.json(entry);
});

app.put("/api/timelog/:id", (req, res) => {
  const idx = timelog.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  timelog[idx] = { ...timelog[idx], ...req.body };
  res.json(timelog[idx]);
});

app.delete("/api/timelog/:id", (req, res) => {
  timelog = timelog.filter((e) => e.id !== req.params.id);
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`E2E test proxy running on http://localhost:${PORT}`);
});
