#!/usr/bin/env node
/**
 * Trend Scout — Daily AI/GitHub trend reports delivered to your inbox.
 *
 * Modes:
 *   daily     — Rich HTML email with SVG chart + AI summaries for top 3
 *   daily+    — Same + social media AI buzz section (Tavily + X + HN)
 *   search    — GitHub-only search report
 *   deep      — Multi-source deep search (GitHub + Tavily + X + YouTube + HN)
 */
import {
  generateDailyReport,
  generateSearchReport,
  generateDeepSearchReport,
  generateHtmlDailyReport,
} from "./report.js";
import { deliver } from "./deliver.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { mode: "daily", query: "", sources: "" };
  for (const arg of args) {
    if (arg.startsWith("--mode=")) parsed.mode = arg.slice(7);
    if (arg.startsWith("--query=")) parsed.query = arg.slice(8);
    if (arg.startsWith("--sources=")) parsed.sources = arg.slice(10);
  }
  if ((parsed.mode === "search" || parsed.mode === "deep") && !parsed.query) {
    const last = args[args.length - 1];
    if (last && !last.startsWith("--")) parsed.query = last;
  }
  return parsed;
}

async function main() {
  const { mode, query, sources } = parseArgs();
  console.log(`[trend-scout] Mode: ${mode}`);

  let markdownReport, htmlReport, subject;

  switch (mode) {
    case "search":
      if (!query) { console.error('Requires --query="..."'); process.exit(1); }
      console.log(`[trend-scout] GitHub search: "${query}"`);
      markdownReport = generateSearchReport(query);
      subject = `Trend Scout: "${query}"`;
      break;

    case "deep":
      if (!query) { console.error('Requires --query="..."'); process.exit(1); }
      console.log(`[trend-scout] Deep multi-source search: "${query}"`);
      const srcList = sources ? sources.split(",") : ["tavily", "x", "youtube", "hackernews"];
      markdownReport = await generateDeepSearchReport(query, { sources: srcList });
      subject = `Trend Scout Deep: "${query}"`;
      break;

    case "daily+":
      console.log("[trend-scout] Generating enhanced HTML report (with social buzz)...");
      htmlReport = await generateHtmlDailyReport({ withBuzz: true });
      markdownReport = generateDailyReport();
      subject = `🔭 Trend Scout Daily+ — ${new Date().toISOString().slice(0, 10)}`;
      break;

    case "daily":
    default:
      console.log("[trend-scout] Generating HTML report...");
      htmlReport = await generateHtmlDailyReport({ withBuzz: false });
      markdownReport = generateDailyReport();
      subject = `🔭 Trend Scout Daily — ${new Date().toISOString().slice(0, 10)}`;
      break;
  }

  if (process.env.GMAIL_USER || process.env.TWILIO_SID) {
    await deliver(markdownReport, subject, { html: htmlReport });
  } else {
    // Stdout: print HTML if available, else markdown
    console.log(htmlReport || markdownReport);
  }
}

main().catch((err) => {
  console.error("[trend-scout] Fatal error:", err.message);
  process.exit(1);
});
