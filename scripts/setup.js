#!/usr/bin/env node
/**
 * Interactive setup for Trend Scout.
 * Checks prerequisites and guides through configuration.
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

function check(label, cmd) {
  try {
    execSync(cmd, { stdio: "pipe" });
    console.log(`  [OK] ${label}`);
    return true;
  } catch {
    console.log(`  [!!] ${label} — NOT FOUND`);
    return false;
  }
}

console.log("=== Trend Scout Setup ===\n");

console.log("1. Checking prerequisites...");
const hasGh = check("gh CLI", "gh --version");
const hasNode = check("Node.js >= 20", "node -e \"process.exit(+process.versions.node.split('.')[0] < 20)\"");
const hasAuth = check("gh authenticated", "gh auth status");

if (!hasGh) {
  console.log("\n   Install gh: https://cli.github.com/");
  console.log("   Then run: gh auth login");
}

console.log("\n2. Environment variables needed:\n");
console.log("   Gmail delivery (pick one):");
console.log("     GMAIL_USER       — Your Gmail address");
console.log("     GMAIL_APP_PASS   — App password (https://myaccount.google.com/apppasswords)");
console.log("     GMAIL_TO         — Recipient email (optional, defaults to GMAIL_USER)\n");
console.log("   WhatsApp delivery (optional):");
console.log("     TWILIO_SID            — Twilio Account SID");
console.log("     TWILIO_AUTH_TOKEN     — Twilio Auth Token");
console.log("     TWILIO_WHATSAPP_FROM  — Sandbox number (whatsapp:+14155238886)");
console.log("     WHATSAPP_TO           — Your number (whatsapp:+1XXXXXXXXXX)\n");

// Create .env.example
const envExample = `# Trend Scout Configuration
# Copy to .env and fill in your values

# Gmail delivery
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASS=xxxx-xxxx-xxxx-xxxx
GMAIL_TO=your.email@gmail.com

# WhatsApp delivery (optional — requires Twilio account)
# TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# WHATSAPP_TO=whatsapp:+1234567890
`;

writeFileSync(new URL("../.env.example", import.meta.url), envExample);
console.log("3. Created .env.example — copy to .env and fill in your values.\n");

if (hasGh && hasNode && hasAuth) {
  console.log("All prerequisites met. Run: npm run report");
} else {
  console.log("Fix the issues above, then run: npm run report");
}
