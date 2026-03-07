import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, "..");

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
  let msg = message;
  process.stdout.write(HIDE_CURSOR);
  const id = setInterval(() => {
    process.stdout.write(
      `${CLEAR_LINE}  ${BLUE}${SPINNER_FRAMES[i++ % SPINNER_FRAMES.length]}${RESET} ${msg}`,
    );
  }, 80);
  return {
    update(m) {
      msg = m;
    },
    succeed(m) {
      clearInterval(id);
      process.stdout.write(`${CLEAR_LINE}  ${GREEN}✔${RESET} ${m}\n`);
      process.stdout.write(SHOW_CURSOR);
    },
    fail(m) {
      clearInterval(id);
      process.stdout.write(`${CLEAR_LINE}  ${RED}✖${RESET} ${m}\n`);
      process.stdout.write(SHOW_CURSOR);
    },
  };
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: PROJECT_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim()));
    });
    child.on("error", reject);
  });
}

console.log(`\n  ${BOLD}Redmine Tracker${RESET} ${DIM}— Update${RESET}\n`);

const s1 = spinner("Pulling latest changes...");
try {
  const out = await run("git", ["pull"]);
  const label = out.includes("Already up to date") ? "Already up to date" : "Changes pulled";
  s1.succeed(label);
} catch (e) {
  s1.fail("Git pull failed");
  console.error(`\n  ${DIM}${e.message}${RESET}\n`);
  process.exit(1);
}

const s2 = spinner("Building image...");
try {
  await run("docker", ["compose", "build"]);
  s2.succeed("Image built");
} catch (e) {
  s2.fail("Build failed");
  console.error(`\n  ${DIM}${e.message}${RESET}\n`);
  process.exit(1);
}

const s3 = spinner("Restarting container...");
try {
  await run("docker", ["compose", "up", "-d"]);
  s3.succeed("Container restarted");
} catch (e) {
  s3.fail("Restart failed");
  console.error(`\n  ${DIM}${e.message}${RESET}\n`);
  process.exit(1);
}

console.log(`\n  ${GREEN}Updated!${RESET} Open ${BOLD}http://localhost:9500${RESET}\n`);
