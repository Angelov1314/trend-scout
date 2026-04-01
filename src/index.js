#!/usr/bin/env node
/**
 * Trend Scout — Daily AI/GitHub trend reports delivered to your inbox.
 *
 * Modes:
 *   daily        — Rich HTML email: SVG chart + AI summaries for top 3
 *   daily+       — Same + social media AI buzz (Tavily + X + HN)
 *   search       — GitHub-only search report
 *   deep         — Multi-source search (GitHub + Tavily + X + YouTube + HN)
 *   custom       — AI analysis report on any user-defined topic
 *
 * Examples:
 *   node src/index.js
 *   node src/index.js --mode=custom --topic="game AI agents"
 *   node src/index.js --mode=custom --topic="MCP servers for finance"
 *   node src/index.js --mode=deep --query="flutter expense tracker"
 */
import {
  generateDailyReport,
  generateSearchReport,
  generateDeepSearchReport,
  generateHtmlDailyReport,
} from "./report.js";
import { generateCustomReport } from "./custom-report.js";
import { deliver } from "./deliver.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { mode: "daily", query: "", topic: "", sources: "" };
  for (const arg of args) {
    if (arg.startsWith("--mode=")) parsed.mode = arg.slice(7);
    if (arg.startsWith("--query=")) parsed.query = arg.slice(8);
    if (arg.startsWith("--topic=")) parsed.topic = arg.slice(8);
    if (arg.startsWith("--sources=")) parsed.sources = arg.slice(10);
  }
  // positional fallback for topic/query
  const last = args[args.length - 1];
  if (last && !last.startsWith("--")) {
    if (parsed.mode === "custom" && !parsed.topic) parsed.topic = last;
    if ((parsed.mode === "search" || parsed.mode === "deep") && !parsed.query) parsed.query = last;
  }
  return parsed;
}

async function main() {
  const { mode, query, topic, sources } = parseArgs();
  console.log(`[trend-scout] Mode: ${mode}`);

  let markdownReport, htmlReport, subject;

  switch (mode) {
    case "custom":
      if (!topic) {
        console.error('Requires --topic="your topic here"');
        console.error('Example: node src/index.js --mode=custom --topic="game AI agents"');
        process.exit(1);
      }
      const customResult = await generateCustomReport(topic);
      htmlReport = customResult.html;
      markdownReport = customResult.markdown;
      subject = `🔍 Trend Scout: ${topic}`;
      break;

    case "search":
      if (!query) { console.error('Requires --query="..."'); process.exit(1); }
      console.log(`[trend-scout] GitHub search: "${query}"`);
      markdownReport = generateSearchReport(query);
      subject = `Trend Scout Search: "${query}"`;
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
    console.log(htmlReport || markdownReport);
  }
}

main().catch((err) => {
  console.error("[trend-scout] Fatal error:", err.message);
  process.exit(1);
});
