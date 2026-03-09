import { platform } from "os";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_NAME = "redmine-tracker";
const ENV_FILE = join(__dirname, "..", ".env");
const DATA_DIR = join(__dirname, "..", "data");
const INSTANCES_FILE = join(DATA_DIR, "instances.json");

// --- OS-native keystore ---

function macGet(key) {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", SERVICE_NAME, "-a", key, "-w"],
      { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
  } catch {
    return null;
  }
}

function macSet(key, value) {
  try {
    execFileSync("security", ["delete-generic-password", "-s", SERVICE_NAME, "-a", key], {
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    /* not found — ok */
  }
  execFileSync("security", ["add-generic-password", "-s", SERVICE_NAME, "-a", key, "-w", value]);
}

function linuxGet(key) {
  try {
    return execFileSync("secret-tool", ["lookup", "service", SERVICE_NAME, "key", key], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function linuxSet(key, value) {
  execFileSync(
    "secret-tool",
    ["store", "--label", `${SERVICE_NAME}/${key}`, "service", SERVICE_NAME, "key", key],
    { input: value, encoding: "utf-8", timeout: 5000 },
  );
}

function getFromKeystore(key) {
  switch (platform()) {
    case "darwin":
      return macGet(key);
    case "linux":
      return linuxGet(key);
    default:
      return null;
  }
}

function setInKeystore(key, value) {
  switch (platform()) {
    case "darwin":
      macSet(key, value);
      return;
    case "linux":
      linuxSet(key, value);
      return;
    default:
      throw new Error(`No keystore available on ${platform()}`);
  }
}

// --- .env fallback ---

function parseDotenv() {
  if (!existsSync(ENV_FILE)) return {};
  const content = readFileSync(ENV_FILE, "utf-8");
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

function writeDotenv(key, value) {
  const existing = parseDotenv();
  existing[key] = value;
  const content =
    Object.entries(existing)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  writeFileSync(ENV_FILE, content, "utf-8");
  protectEnvFile();
}

function protectEnvFile() {
  if (platform() === "win32") {
    try {
      execFileSync(
        "icacls",
        [ENV_FILE, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:(F)`],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch {
      console.warn("  Warning: Could not restrict .env permissions (Windows ACL).");
    }
  } else {
    try {
      chmodSync(ENV_FILE, 0o600);
    } catch {
      /* ignore */
    }
  }
}

// --- Env-var keys ---
const ENV_MAP = {
  "redmine-url": "REDMINE_URL",
  "redmine-api-key": "REDMINE_API_KEY",
};

function envKeyForInstance(baseKey, instanceId) {
  const envBase = ENV_MAP[baseKey];
  if (!envBase) return null;
  if (instanceId === "default") return envBase;
  const suffix = instanceId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `${envBase}_${suffix}`;
}

// --- Public API ---

export function get(key) {
  // 1. OS keystore
  const osValue = getFromKeystore(key);
  if (osValue) return osValue;

  // 2. Environment variable
  const envKey = ENV_MAP[key];
  if (envKey && process.env[envKey]) return process.env[envKey];

  // 3. .env file
  if (envKey) {
    const dotenv = parseDotenv();
    if (dotenv[envKey]) return dotenv[envKey];
  }

  return null;
}

export function getForInstance(baseKey, instanceId) {
  const instanceKey = `${baseKey}-${instanceId}`;

  // 1. OS keystore with instance suffix
  const osValue = getFromKeystore(instanceKey);
  if (osValue) return osValue;

  // 2. Fall back to legacy key for "default" instance
  if (instanceId === "default") {
    const legacyValue = getFromKeystore(baseKey);
    if (legacyValue) return legacyValue;
  }

  // 3. Environment variable
  const envKey = envKeyForInstance(baseKey, instanceId);
  if (envKey && process.env[envKey]) return process.env[envKey];

  // 4. .env file
  if (envKey) {
    const dotenv = parseDotenv();
    if (dotenv[envKey]) return dotenv[envKey];
  }

  // 5. Fall back to legacy env var for "default"
  if (instanceId === "default") {
    const legacyEnvKey = ENV_MAP[baseKey];
    if (legacyEnvKey && process.env[legacyEnvKey]) return process.env[legacyEnvKey];
    if (legacyEnvKey) {
      const dotenv = parseDotenv();
      if (dotenv[legacyEnvKey]) return dotenv[legacyEnvKey];
    }
  }

  return null;
}

export function set(key, value) {
  try {
    setInKeystore(key, value);
  } catch {
    const envKey = ENV_MAP[key];
    if (!envKey) throw new Error(`Unknown credential key: ${key}`);
    writeDotenv(envKey, value);
    console.warn(`  Warning: Stored in .env (plaintext). Prefer OS keystore.`);
  }
}

export function setForInstance(baseKey, instanceId, value) {
  const instanceKey = `${baseKey}-${instanceId}`;
  try {
    setInKeystore(instanceKey, value);
  } catch {
    const envKey = envKeyForInstance(baseKey, instanceId);
    if (!envKey) throw new Error(`Unknown credential key: ${baseKey}`);
    writeDotenv(envKey, value);
    console.warn(`  Warning: Stored in .env (plaintext). Prefer OS keystore.`);
  }
}

/** Sanitize API key from log messages */
export function sanitize(message) {
  const apiKey = get("redmine-api-key");
  if (!apiKey || apiKey.length < 8) return message;
  return message.replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "***");
}

// --- Instance management ---

export function loadInstances() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Env vars are the source of truth — always re-discover when present
  const discovered = discoverInstancesFromEnv();
  if (discovered.length > 0) {
    saveInstances(discovered);
    return discovered;
  }

  // Fall back to instances.json (local setup with OS keystore)
  if (existsSync(INSTANCES_FILE)) {
    try {
      const raw = readFileSync(INSTANCES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* corrupted file — ignore */
    }
  }

  return [];
}

function discoverInstancesFromEnv() {
  const dotenv = parseDotenv();
  const allVars = { ...dotenv, ...process.env };
  const instances = [];
  let order = 0;

  // Check legacy default instance (REDMINE_URL / REDMINE_API_KEY)
  const defaultUrl = allVars.REDMINE_URL;
  const defaultKey = allVars.REDMINE_API_KEY;
  if (defaultUrl && defaultKey) {
    instances.push({
      id: "default",
      name: allVars.REDMINE_NAME || "Redmine",
      url: defaultUrl.replace(/\/$/, ""),
      order: order++,
    });
  }

  // Scan for additional instances (REDMINE_URL_* / REDMINE_API_KEY_*)
  const suffixes = new Set();
  for (const key of Object.keys(allVars)) {
    const match = key.match(/^REDMINE_URL_(.+)$/);
    if (match) suffixes.add(match[1]);
  }

  for (const suffix of [...suffixes].sort()) {
    const url = allVars[`REDMINE_URL_${suffix}`];
    const apiKey = allVars[`REDMINE_API_KEY_${suffix}`];
    if (!url || !apiKey) continue;

    const id = suffix.toLowerCase().replace(/_/g, "-");
    const name =
      allVars[`REDMINE_NAME_${suffix}`] ||
      suffix
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    instances.push({
      id,
      name,
      url: url.replace(/\/$/, ""),
      order: order++,
    });
  }

  return instances;
}

export function saveInstances(instances) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
}

export function getInstanceConfig(instanceId, instances) {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) return null;

  const url = getForInstance("redmine-url", instanceId);
  const apiKey = getForInstance("redmine-api-key", instanceId);
  if (!url || !apiKey) return null;

  return {
    id: instance.id,
    name: instance.name,
    baseUrl: url.replace(/\/$/, ""),
    apiKey,
  };
}
