import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadInstances, saveInstances, getInstanceConfig, getForInstance } from "./credentials.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const TIMELOG_FILE = join(DATA_DIR, "timelog.json");

const instances = loadInstances();

if (instances.length === 0) {
  console.error("\n  No Redmine instances configured.\n  Run: npm run setup\n");
  process.exit(1);
}

const instanceConfigs = new Map();
for (const inst of instances) {
  const config = getInstanceConfig(inst.id, instances);
  if (config) {
    instanceConfigs.set(inst.id, config);
    console.log(`Redmine [${inst.name}]: ${config.baseUrl}`);
  } else {
    console.warn(
      `  Warning: Instance "${inst.name}" (${inst.id}) has missing credentials, skipping.`,
    );
  }
}

if (instanceConfigs.size === 0) {
  console.error("\n  No valid instance credentials found.\n  Run: npm run setup\n");
  process.exit(1);
}

function localDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function readTimelog() {
  if (!existsSync(TIMELOG_FILE)) return [];
  const raw = readFileSync(TIMELOG_FILE, "utf-8");
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("Not an array");
    // Migration: add instanceId to entries that don't have one
    let migrated = false;
    for (const entry of data) {
      if (!entry.instanceId) {
        entry.instanceId = "default";
        migrated = true;
      }
    }
    if (migrated) writeTimelog(data);
    return data;
  } catch {
    const backup = TIMELOG_FILE + ".corrupt." + Date.now();
    writeFileSync(backup, raw);
    console.error(`Corrupted timelog.json backed up to ${backup}`);
    return [];
  }
}

function writeTimelog(entries) {
  const tmp = TIMELOG_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(entries, null, 2));
  renameSync(tmp, TIMELOG_FILE);
}

let timelogLock = Promise.resolve();
function withTimelogLock(fn) {
  const next = timelogLock.then(fn);
  timelogLock = next.catch(() => {});
  return next;
}

function validateTimelogEntry(body) {
  const clean = {};
  if (typeof body.issueId === "number") clean.issueId = body.issueId;
  if (typeof body.issueSubject === "string") clean.issueSubject = body.issueSubject.slice(0, 500);
  if (typeof body.projectId === "number") clean.projectId = body.projectId;
  if (typeof body.projectName === "string") clean.projectName = body.projectName.slice(0, 200);
  if (typeof body.startTime === "string") clean.startTime = body.startTime.slice(0, 30);
  if (typeof body.endTime === "string") clean.endTime = body.endTime.slice(0, 30);
  if (typeof body.duration === "number") clean.duration = body.duration;
  if (typeof body.description === "string") clean.description = body.description.slice(0, 2000);
  if (typeof body.date === "string") clean.date = body.date.slice(0, 10);
  if (typeof body.activityId === "number") clean.activityId = body.activityId;
  if (typeof body.activityName === "string") clean.activityName = body.activityName.slice(0, 200);
  if (typeof body.originalDuration === "number") clean.originalDuration = body.originalDuration;
  if (typeof body.instanceId === "string") clean.instanceId = body.instanceId.slice(0, 100);
  if (typeof body.instanceName === "string") clean.instanceName = body.instanceName.slice(0, 200);
  return clean;
}

function validateTimelogUpdate(body) {
  const clean = {};
  if (typeof body.syncedToRedmine === "boolean") clean.syncedToRedmine = body.syncedToRedmine;
  if (typeof body.redmineTimeEntryId === "number")
    clean.redmineTimeEntryId = body.redmineTimeEntryId;
  if (typeof body.description === "string") clean.description = body.description.slice(0, 2000);
  if (typeof body.duration === "number") clean.duration = body.duration;
  if (typeof body.date === "string") clean.date = body.date.slice(0, 10);
  if (typeof body.activityId === "number") clean.activityId = body.activityId;
  if (typeof body.activityName === "string") clean.activityName = body.activityName.slice(0, 200);
  if (typeof body.originalDuration === "number") clean.originalDuration = body.originalDuration;
  return clean;
}

const DIST_DIR = join(__dirname, "..", "dist");
const isProduction = existsSync(DIST_DIR);

const app = express();
app.use(
  cors({
    origin: isProduction ? true : "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "100kb" }));

const REDMINE_TIMEOUT_MS = 30000;
const MAX_PAGINATION_PAGES = 50;

function validateId(req, res) {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: "Invalid ID parameter" });
    return false;
  }
  return true;
}

function validateInstanceId(req, res) {
  const { instanceId } = req.params;
  if (!instanceId || !/^[a-zA-Z0-9_-]+$/.test(instanceId)) {
    res.status(400).json({ error: "Invalid instance ID" });
    return false;
  }
  if (!instanceConfigs.has(instanceId)) {
    res.status(404).json({ error: `Unknown instance: ${instanceId}` });
    return false;
  }
  return true;
}

async function redmineFetch(instanceId, path, options = {}) {
  const config = instanceConfigs.get(instanceId);
  if (!config) throw new Error(`Unknown instance: ${instanceId}`);

  const url = `${config.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REDMINE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "X-Redmine-API-Key": config.apiKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return { status: 502, body: { error: "Invalid response from Redmine" } };
      }
    }
    return {
      status: res.status,
      body: body ?? (res.ok ? {} : { error: `Redmine returned ${res.status}` }),
    };
  } catch (e) {
    if (e.name === "AbortError") {
      return { status: 504, body: { error: "Redmine request timed out" } };
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Instance management endpoints
// =============================================================================

app.get("/api/instances", (req, res) => {
  const current = loadInstances();
  res.json(
    current.map((inst) => ({
      id: inst.id,
      name: inst.name,
      url: inst.url,
      order: inst.order ?? 0,
    })),
  );
});

app.put("/api/instances", (req, res) => {
  const updates = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Expected array of instances" });
  }
  const current = loadInstances();
  const currentIds = new Set(current.map((i) => i.id));
  const result = [];
  for (const upd of updates) {
    if (!upd.id || !currentIds.has(upd.id)) continue;
    const existing = current.find((i) => i.id === upd.id);
    result.push({
      id: existing.id,
      name: typeof upd.name === "string" ? upd.name.slice(0, 100) : existing.name,
      url: existing.url,
      order: typeof upd.order === "number" ? upd.order : (existing.order ?? 0),
    });
  }
  for (const inst of current) {
    if (!result.find((r) => r.id === inst.id)) {
      result.push(inst);
    }
  }
  result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  saveInstances(result);
  for (const inst of result) {
    const cfg = instanceConfigs.get(inst.id);
    if (cfg) cfg.name = inst.name;
  }
  res.json(result);
});

// =============================================================================
// Per-instance Redmine API routes: /api/i/:instanceId/*
// =============================================================================

app.get("/api/i/:instanceId/me", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/users/current.json");
    if (result.body?.user) {
      const { id, login, firstname, lastname, mail } = result.body.user;
      const config = instanceConfigs.get(instanceId);
      res.json({ user: { id, login, firstname, lastname, mail }, redmineUrl: config.baseUrl });
    } else {
      res.status(502).json({ error: "Unexpected Redmine response" });
    }
  } catch (e) {
    console.error(`Redmine [${instanceId}] /me error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/issues", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const allIssues = [];
    let offset = 0;
    const limit = 100;
    for (let _page = 0; _page < MAX_PAGINATION_PAGES; _page++) {
      const result = await redmineFetch(
        instanceId,
        `/issues.json?assigned_to_id=me&status_id=open&sort=project,priority:desc&limit=${limit}&offset=${offset}`,
      );
      if (result.status !== 200) return res.status(result.status).json(result.body);
      const issues = result.body?.issues || [];
      allIssues.push(...issues);
      if (allIssues.length >= (result.body?.total_count || 0) || issues.length < limit) break;
      offset += limit;
    }
    res.json({ issues: allIssues, total_count: allIssues.length });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /issues error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/activities", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/enumerations/time_entry_activities.json");
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /activities error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/projects/:id/activities", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(
      instanceId,
      `/projects/${req.params.id}.json?include=time_entry_activities`,
    );
    if (result.status !== 200) return res.status(result.status).json(result.body);
    const activities =
      result.body?.project?.time_entry_activities || result.body?.time_entry_activities || [];
    res.json({ time_entry_activities: activities });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /projects/activities error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.post("/api/i/:instanceId/time_entries", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/time_entries.json", {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    if (result.status >= 400) {
      console.error(
        `Redmine [${instanceId}] POST /time_entries rejected:`,
        result.status,
        JSON.stringify(result.body),
      );
      console.error("  Request body:", JSON.stringify(req.body));
    }
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /time_entries error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/time_entries/range", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  const { from, to } = req.query;
  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return res.status(400).json({ error: "from and to query params required (YYYY-MM-DD)" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Invalid date format, expected YYYY-MM-DD" });
  }
  try {
    const allEntries = [];
    let offset = 0;
    const limit = 100;
    for (let _page = 0; _page < MAX_PAGINATION_PAGES; _page++) {
      const result = await redmineFetch(
        instanceId,
        `/time_entries.json?user_id=me&from=${from}&to=${to}&limit=${limit}&offset=${offset}`,
      );
      if (result.status !== 200) return res.status(result.status).json(result.body);
      const entries = result.body?.time_entries || [];
      allEntries.push(...entries);
      if (allEntries.length >= (result.body?.total_count || 0) || entries.length < limit) break;
      offset += limit;
    }
    const config = instanceConfigs.get(instanceId);
    for (const e of allEntries) {
      e.instanceId = instanceId;
      e.instanceName = config?.name || instanceId;
    }
    res.json({ time_entries: allEntries });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /time_entries/range error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/issues/search", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const params = new URLSearchParams();
    const {
      q,
      project_id,
      status_id,
      tracker_id,
      assigned_to_id,
      fixed_version_id,
      priority_id,
      sort,
      limit,
      offset,
    } = req.query;

    if (
      !q &&
      !project_id &&
      !status_id &&
      !tracker_id &&
      !assigned_to_id &&
      !fixed_version_id &&
      !priority_id
    ) {
      return res.json({ issues: [], total_count: 0, offset: 0, limit: 25 });
    }

    if (q && typeof q === "string") {
      const idMatch = q.match(/^#?(\d+)$/);
      if (idMatch) {
        params.set("issue_id", idMatch[1]);
      } else {
        params.append("f[]", "subject");
        params.set("op[subject]", "~");
        params.append("v[subject][]", q);
      }
    }
    if (project_id) params.set("project_id", String(project_id));
    if (status_id) {
      params.append("f[]", "status_id");
      params.set("op[status_id]", "=");
      params.append("v[status_id][]", String(status_id));
    } else {
      params.set("status_id", "*");
    }
    if (tracker_id) {
      params.append("f[]", "tracker_id");
      params.set("op[tracker_id]", "=");
      params.append("v[tracker_id][]", String(tracker_id));
    }
    if (assigned_to_id) {
      params.append("f[]", "assigned_to_id");
      params.set("op[assigned_to_id]", "=");
      params.append("v[assigned_to_id][]", String(assigned_to_id));
    }
    if (fixed_version_id) {
      params.append("f[]", "fixed_version_id");
      params.set("op[fixed_version_id]", "=");
      params.append("v[fixed_version_id][]", String(fixed_version_id));
    }
    if (priority_id) {
      params.append("f[]", "priority_id");
      params.set("op[priority_id]", "=");
      params.append("v[priority_id][]", String(priority_id));
    }
    params.set("sort", typeof sort === "string" ? sort : "updated_on:desc");
    params.set("limit", String(Number(limit) || 25));
    params.set("offset", String(Number(offset) || 0));

    const result = await redmineFetch(instanceId, `/issues.json?${params.toString()}`);
    if (result.status !== 200) return res.status(result.status).json(result.body);
    res.json({
      issues: result.body?.issues || [],
      total_count: result.body?.total_count || 0,
      offset: Number(offset) || 0,
      limit: Number(limit) || 25,
    });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /issues/search error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/projects", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const allProjects = [];
    let offset = 0;
    const limit = 100;
    for (let _page = 0; _page < MAX_PAGINATION_PAGES; _page++) {
      const result = await redmineFetch(
        instanceId,
        `/projects.json?limit=${limit}&offset=${offset}`,
      );
      if (result.status !== 200) return res.status(result.status).json(result.body);
      const projects = result.body?.projects || [];
      allProjects.push(
        ...projects.map((p) => ({ id: p.id, name: p.name, identifier: p.identifier })),
      );
      if (allProjects.length >= (result.body?.total_count || 0) || projects.length < limit) break;
      offset += limit;
    }
    allProjects.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ projects: allProjects });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /projects error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/priorities", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/enumerations/issue_priorities.json");
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /priorities error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/issues/:id", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const qs = new URLSearchParams(req.query).toString();
    const path = `/issues/${req.params.id}.json${qs ? `?${qs}` : ""}`;
    const result = await redmineFetch(instanceId, path);
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] GET /issues/:id error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/time_entries/today", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const today = localDateString();
    const result = await redmineFetch(
      instanceId,
      `/time_entries.json?user_id=me&from=${today}&to=${today}&limit=100`,
    );
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /time_entries/today error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/statuses", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/issue_statuses.json");
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /statuses error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/trackers", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, "/trackers.json");
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /trackers error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/projects/:id/trackers", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(
      instanceId,
      `/projects/${req.params.id}.json?include=trackers`,
    );
    if (result.status !== 200) return res.status(result.status).json(result.body);
    const trackers = result.body?.project?.trackers || [];
    res.json({ trackers });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /projects/trackers error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/projects/:id/versions", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const result = await redmineFetch(instanceId, `/projects/${req.params.id}/versions.json`);
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(`Redmine [${instanceId}] /projects/versions error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.get("/api/i/:instanceId/projects/:id/members", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    const allMembers = [];
    let offset = 0;
    const limit = 100;
    for (let _page = 0; _page < MAX_PAGINATION_PAGES; _page++) {
      const result = await redmineFetch(
        instanceId,
        `/projects/${req.params.id}/memberships.json?limit=${limit}&offset=${offset}`,
      );
      if (result.status !== 200) return res.status(result.status).json(result.body);
      const memberships = result.body?.memberships || [];
      for (const m of memberships) {
        if (m.user) allMembers.push({ id: m.user.id, name: m.user.name });
      }
      if (allMembers.length >= (result.body?.total_count || 0) || memberships.length < limit) break;
      offset += limit;
    }
    allMembers.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ members: allMembers });
  } catch (e) {
    console.error(`Redmine [${instanceId}] /projects/members error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

app.put("/api/i/:instanceId/issues/:id", async (req, res) => {
  if (!validateInstanceId(req, res)) return;
  if (!validateId(req, res)) return;
  const { instanceId } = req.params;
  try {
    if (req.body.updated_on && typeof req.body.updated_on === "string") {
      const check = await redmineFetch(instanceId, `/issues/${req.params.id}.json`);
      if (check.status !== 200) return res.status(check.status).json(check.body);
      const current = check.body?.issue;
      if (current && current.updated_on !== req.body.updated_on) {
        return res.status(409).json({
          error: "conflict",
          message: "Issue was modified since last fetch",
          current_issue: current,
        });
      }
    }

    const issue = {};
    if (req.body.status_id) {
      const v = Number(req.body.status_id);
      if (Number.isFinite(v) && v > 0) issue.status_id = v;
    }
    if (req.body.assigned_to_id !== undefined) {
      const v = Number(req.body.assigned_to_id);
      if (Number.isFinite(v) && v > 0) issue.assigned_to_id = v;
    }
    if (req.body.tracker_id) {
      const v = Number(req.body.tracker_id);
      if (Number.isFinite(v) && v > 0) issue.tracker_id = v;
    }
    if (req.body.fixed_version_id !== undefined) {
      const v = Number(req.body.fixed_version_id);
      if (Number.isFinite(v) && v > 0) issue.fixed_version_id = v;
    }
    if (req.body.done_ratio !== undefined) {
      const v = Number(req.body.done_ratio);
      if (Number.isFinite(v) && v >= 0 && v <= 100) issue.done_ratio = v;
    }
    if (Object.keys(issue).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const result = await redmineFetch(instanceId, `/issues/${req.params.id}.json`, {
      method: "PUT",
      body: JSON.stringify({ issue }),
    });
    if (result.status === 204) return res.json({ ok: true });
    res.status(result.status).json(result.body || { error: "Update failed" });
  } catch (e) {
    console.error(`Redmine [${instanceId}] PUT /issues error:`, e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

// =============================================================================
// Aggregated endpoints (across all instances)
// =============================================================================

app.get("/api/time_entries/range", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return res.status(400).json({ error: "from and to query params required (YYYY-MM-DD)" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Invalid date format, expected YYYY-MM-DD" });
  }

  try {
    const allEntries = [];
    const errors = [];

    const results = await Promise.all(
      [...instanceConfigs.entries()].map(async ([instanceId, config]) => {
        const instanceEntries = [];
        try {
          let offset = 0;
          const limit = 100;
          for (let _page = 0; _page < MAX_PAGINATION_PAGES; _page++) {
            const result = await redmineFetch(
              instanceId,
              `/time_entries.json?user_id=me&from=${from}&to=${to}&limit=${limit}&offset=${offset}`,
            );
            if (result.status !== 200) {
              errors.push({ instanceId, error: result.body?.error || `HTTP ${result.status}` });
              break;
            }
            const entries = result.body?.time_entries || [];
            for (const e of entries) {
              e.instanceId = instanceId;
              e.instanceName = config.name;
            }
            instanceEntries.push(...entries);
            if (instanceEntries.length >= (result.body?.total_count || 0) || entries.length < limit)
              break;
            offset += limit;
          }
        } catch (e) {
          errors.push({ instanceId, error: e.message });
        }
        return instanceEntries;
      }),
    );
    for (const entries of results) {
      allEntries.push(...entries);
    }

    res.json({ time_entries: allEntries, errors: errors.length > 0 ? errors : undefined });
  } catch (e) {
    console.error("Aggregated /time_entries/range error:", e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

// =============================================================================
// Backwards-compatible routes (use first instance as default)
// =============================================================================

const defaultInstanceId = instances[0]?.id;

app.get("/api/me", async (req, res) => {
  if (!defaultInstanceId || !instanceConfigs.has(defaultInstanceId)) {
    return res.status(500).json({ error: "No default instance configured" });
  }
  try {
    const result = await redmineFetch(defaultInstanceId, "/users/current.json");
    if (result.body?.user) {
      const { id, login, firstname, lastname, mail } = result.body.user;
      const config = instanceConfigs.get(defaultInstanceId);
      res.json({ user: { id, login, firstname, lastname, mail }, redmineUrl: config.baseUrl });
    } else {
      res.status(502).json({ error: "Unexpected Redmine response" });
    }
  } catch (e) {
    console.error("Redmine /me error:", e.message);
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

// =============================================================================
// Timelog CRUD (shared across instances)
// =============================================================================

app.get("/api/timelog", (req, res) => {
  res.json(readTimelog());
});

app.post("/api/timelog", async (req, res) => {
  try {
    const entry = await withTimelogLock(() => {
      const entries = readTimelog();
      const validated = validateTimelogEntry(req.body);
      if (!validated.instanceId) validated.instanceId = "default";
      const newEntry = { ...validated, id: crypto.randomUUID(), syncedToRedmine: false };
      entries.unshift(newEntry);
      writeTimelog(entries);
      return newEntry;
    });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: "Failed to save entry" });
  }
});

app.put("/api/timelog/:id", async (req, res) => {
  try {
    const result = await withTimelogLock(() => {
      const entries = readTimelog();
      const idx = entries.findIndex((e) => e.id === req.params.id);
      if (idx === -1) return null;
      const validated = validateTimelogUpdate(req.body);
      entries[idx] = { ...entries[idx], ...validated };
      writeTimelog(entries);
      return entries[idx];
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

app.delete("/api/timelog/:id", async (req, res) => {
  try {
    await withTimelogLock(() => {
      const entries = readTimelog();
      const filtered = entries.filter((e) => e.id !== req.params.id);
      writeTimelog(filtered);
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

app.post("/api/timelog/:id", async (req, res) => {
  if (req.query._method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  try {
    await withTimelogLock(() => {
      const entries = readTimelog();
      const filtered = entries.filter((e) => e.id !== req.params.id);
      writeTimelog(filtered);
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

app.all("/api/{*path}", async (req, res) => {
  if (!defaultInstanceId || !instanceConfigs.has(defaultInstanceId)) {
    return res.status(500).json({ error: "No default instance configured" });
  }
  try {
    let path = req.path.replace(/^\/api/, "");
    if (!path.includes(".")) path += ".json";
    const qs = new URLSearchParams(req.query).toString();
    if (qs) path += `?${qs}`;

    const fetchOpts = { method: req.method };
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const result = await redmineFetch(defaultInstanceId, path, fetchOpts);
    res.status(result.status).json(result.body);
  } catch (e) {
    console.error(
      `Redmine [${defaultInstanceId}] catch-all ${req.method} ${req.path} error:`,
      e.message,
    );
    res.status(502).json({ error: "Cannot reach Redmine" });
  }
});

if (isProduction) {
  app.use(express.static(DIST_DIR));
  app.get("{*path}", (req, res) => {
    res.sendFile(join(DIST_DIR, "index.html"));
  });
  console.log("Serving frontend from dist/");
}

const PORT = 3001;
const HOST = isProduction ? "0.0.0.0" : "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`${isProduction ? "Server" : "Proxy"} running on http://${HOST}:${PORT}`);
});
