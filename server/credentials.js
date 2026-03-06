import { platform } from "os";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_NAME = "redmine-tracker";
const ENV_FILE = join(__dirname, "..", ".env");

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
    // Windows: DPAPI via PowerShell could be added here
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

export function set(key, value) {
  try {
    setInKeystore(key, value);
  } catch {
    // Keystore not available → .env fallback
    const envKey = ENV_MAP[key];
    if (!envKey) throw new Error(`Unknown credential key: ${key}`);
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
