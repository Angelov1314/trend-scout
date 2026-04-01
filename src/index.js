#!/usr/bin/env node
/**
 * Trend Scout — Daily AI/GitHub trend reports delivered to your inbox.
 *
 * Usage:
 *   node src/index.js                                    # Daily report (stdout)
 *   node src/index.js --mode=daily                       # Daily report + deliver
 *   node src/index.js --mode=daily+                      # Enhanced daily (+ social buzz via Tavily)
 *   node src/index.js --mode=search --query="query"      # GitHub-only search
 *   node src/index.js --mode=deep --query="query"        # Deep search (GitHub + Tavily + X + YouTube + HN)
 *   node src/index.js --mode=deep --query="query" --sources=tavily,x,linkedin,youtube,hackernews
 */
import { generateDailyReport, generateSearchReport, generateDeepSearchReport, generateEnhancedDailyReport } from "./report.js";
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
    const lastArg = args[args.length - 1];
    if (lastArg && !lastArg.startsWith("--")) parsed.query = lastArg;
  }

  return parsed;
}

async function main() {
  const { mode, query, sources } = parseArgs();

  console.log(`[trend-scout] Mode: ${mode}`);

  let report;
  let subject;

  switch (mode) {
    case "search":
      if (!query) {
        console.error('Usage: node src/index.js --mode=search --query="your search terms"');
        process.exit(1);
      }
      console.log(`[trend-scout] GitHub search: "${query}"`);
      report = generateSearchReport(query);
      subject = `Trend Scout: "${query}"`;
      break;

    case "deep":
      if (!query) {
        console.error('Usage: node src/index.js --mode=deep --query="your search terms"');
        process.exit(1);
      }
      console.log(`[trend-scout] Deep multi-source search: "${query}"`);
      const srcList = sources
        ? sources.split(",")
        : ["tavily", "x", "youtube", "hackernews"];
      report = await generateDeepSearchReport(query, { sources: srcList });
      subject = `Trend Scout Deep: "${query}"`;
      break;

    case "daily+":
      console.log("[trend-scout] Generating enhanced daily report (+ social buzz)...");
      report = await generateEnhancedDailyReport();
      subject = `Trend Scout Daily+ — ${new Date().toISOString().slice(0, 10)}`;
      break;

    case "daily":
    default:
      console.log("[trend-scout] Generating daily report...");
      report = generateDailyReport();
      subject = `Trend Scout Daily — ${new Date().toISOString().slice(0, 10)}`;
      break;
  }

  if (process.env.GMAIL_USER || process.env.TWILIO_SID) {
    await deliver(report, subject);
  } else {
    console.log(report);
  }
}

main().catch((err) => {
  console.error("[trend-scout] Fatal error:", err.message);
  process.exit(1);
});
