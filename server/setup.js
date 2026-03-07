import { createInterface } from "readline";
import { platform } from "os";
import { execFileSync, spawn } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { set } from "./credentials.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, "..", ".env");

const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\x1b[G";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function spinner(message) {
  let i = 0;
  process.stdout.write(HIDE_CURSOR);
  const id = setInterval(() => {
    process.stdout.write(
      `${CLEAR_LINE}  ${BLUE}${SPINNER_FRAMES[i++ % SPINNER_FRAMES.length]}${RESET} ${message}`,
    );
  }, 80);
  return {
    update(msg) {
      message = msg;
    },
    succeed(msg) {
      clearInterval(id);
      process.stdout.write(`${CLEAR_LINE}  ${GREEN}✔${RESET} ${msg}\n`);
      process.stdout.write(SHOW_CURSOR);
    },
    fail(msg) {
      clearInterval(id);
      process.stdout.write(`${CLEAR_LINE}  ${RED}✖${RESET} ${msg}\n`);
      process.stdout.write(SHOW_CURSOR);
    },
  };
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function select(label, options) {
  return new Promise((resolve) => {
    let selected = 0;

    function render() {
      for (let i = 0; i < options.length; i++) {
        process.stdout.write(`\x1b[A`);
      }
      for (let i = 0; i < options.length; i++) {
        process.stdout.write(CLEAR_LINE);
        if (i === selected) {
          process.stdout.write(`  ${BLUE}${BOLD}● ${options[i].label}${RESET}\n`);
        } else {
          process.stdout.write(`  ${DIM}○ ${options[i].label}${RESET}\n`);
        }
      }
    }

    console.log(`  ${label}\n`);
    for (const opt of options) {
      process.stdout.write(`  ${DIM}○ ${opt.label}${RESET}\n`);
    }
    process.stdout.write(HIDE_CURSOR);
    render();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");

    function onData(key) {
      if (key === "\x1b[A" || key === "k") {
        selected = (selected - 1 + options.length) % options.length;
        render();
      } else if (key === "\x1b[B" || key === "j") {
        selected = (selected + 1) % options.length;
        render();
      } else if (key === "\r" || key === " ") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write(SHOW_CURSOR);
        resolve(options[selected].value);
      } else if (key === "\x03" || key === "q") {
        process.stdout.write(SHOW_CURSOR + "\n");
        process.exit(0);
      }
    }

    process.stdin.on("data", onData);
  });
}

async function testConnection(url, apiKey) {
  const s = spinner("Testing connection...");
  try {
    const res = await fetch(`${url}/users/current.json`, {
      headers: { "X-Redmine-API-Key": apiKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    s.succeed(`Connected as ${BOLD}${data.user.firstname} ${data.user.lastname}${RESET}`);
    return true;
  } catch (e) {
    s.fail(`Connection failed: ${e.message}`);
    console.error(`\n  Check your URL and API key.\n`);
    return false;
  }
}

function dockerCompose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], {
      cwd: join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim()));
    });
    child.on("error", reject);
  });
}

async function setupLocal() {
  const storeLabel =
    platform() === "darwin"
      ? "macOS Keychain"
      : platform() === "linux"
        ? "secret-tool (GNOME Keyring / KWallet)"
        : ".env file";

  console.log(`\n  Credentials will be stored in: ${DIM}${storeLabel}${RESET}\n`);

  const url = await ask(`  ${DIM}Redmine URL${RESET}  `);
  const apiKey = await ask(`  ${DIM}API Key${RESET}     `);

  if (!url || !apiKey) {
    console.error(`\n  ${RED}✖${RESET} Both fields are required.\n`);
    process.exit(1);
  }

  const cleanUrl = url.replace(/\/$/, "");
  console.log();
  if (!(await testConnection(cleanUrl, apiKey))) process.exit(1);

  set("redmine-url", cleanUrl);
  set("redmine-api-key", apiKey);

  console.log(`\n  ${GREEN}✔${RESET} Saved to ${storeLabel}\n`);
  console.log(`  Run ${BOLD}npm run dev${RESET} to start the application.\n`);
}

function checkDocker() {
  try {
    execFileSync("docker", ["info"], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

async function setupDocker() {
  const s1 = spinner("Checking Docker...");
  if (!checkDocker()) {
    s1.fail("Docker is not running");
    console.error(`\n  Please start the Docker daemon and try again.\n`);
    process.exit(1);
  }
  s1.succeed("Docker is running");

  console.log();
  const url = await ask(`  ${DIM}Redmine URL${RESET}  `);
  const apiKey = await ask(`  ${DIM}API Key${RESET}     `);

  if (!url || !apiKey) {
    console.error(`\n  ${RED}✖${RESET} Both fields are required.\n`);
    process.exit(1);
  }

  const cleanUrl = url.replace(/\/$/, "");
  console.log();
  if (!(await testConnection(cleanUrl, apiKey))) process.exit(1);

  const envContent = `REDMINE_URL=${cleanUrl}\nREDMINE_API_KEY=${apiKey}\n`;
  writeFileSync(ENV_FILE, envContent, "utf-8");

  const s2 = spinner("Building image...");
  try {
    await dockerCompose(["build"]);
    s2.succeed("Image built");
  } catch (e) {
    s2.fail("Build failed");
    console.error(`\n  ${DIM}${e.message}${RESET}\n`);
    process.exit(1);
  }

  const s3 = spinner("Starting container...");
  try {
    await dockerCompose(["up", "-d"]);
    s3.succeed("Container started");
  } catch (e) {
    s3.fail("Container failed to start");
    console.error(`\n  ${DIM}${e.message}${RESET}\n`);
    process.exit(1);
  }

  console.log(`\n  ${GREEN}Ready!${RESET} Open ${BOLD}http://localhost:9500${RESET}\n`);
}

// --- Main ---
console.log(`\n  ${BOLD}Redmine Tracker${RESET} ${DIM}— Setup${RESET}\n`);

const mode = await select("How do you want to run the application?", [
  { label: "Local    Node.js on your machine", value: "local" },
  { label: "Docker   Containerized", value: "docker" },
]);

if (mode === "docker") {
  await setupDocker();
} else {
  await setupLocal();
}
