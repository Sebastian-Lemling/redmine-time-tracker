import { createInterface } from "readline";
import { platform } from "os";
import { set } from "./credentials.js";

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const storeLabel =
  platform() === "darwin"
    ? "macOS Keychain"
    : platform() === "linux"
      ? "secret-tool (GNOME Keyring / KWallet)"
      : ".env file";

console.log("\n  Redmine Tracker — Setup\n");
console.log(`  Credentials will be stored in: ${storeLabel}\n`);

const url = await ask("  Redmine URL: ");
const apiKey = await ask("  API Key:     ");

if (!url || !apiKey) {
  console.error("\n  Both fields are required.\n");
  process.exit(1);
}

console.log("\n  Testing connection...");
try {
  const res = await fetch(`${url.replace(/\/$/, "")}/users/current.json`, {
    headers: { "X-Redmine-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  console.log(`  Connected as: ${data.user.firstname} ${data.user.lastname}\n`);
} catch (e) {
  console.error(`\n  Connection failed: ${e.message}`);
  console.error("  Check your URL and API key.\n");
  process.exit(1);
}

set("redmine-url", url.replace(/\/$/, ""));
set("redmine-api-key", apiKey);

console.log(`  Saved to ${storeLabel}. Run: npm run dev\n`);
