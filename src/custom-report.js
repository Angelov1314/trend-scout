/**
 * Custom topic report generator.
 * Takes any user-defined topic, gathers data from all sources,
 * then uses Claude to write a structured analysis report.
 */
import Anthropic from "@anthropic-ai/sdk";
import { searchRepos } from "./github.js";
import { searchTavily, searchHackerNews } from "./search-sources.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Gather raw data for a topic from all sources in parallel.
 */
async function gatherTopicData(topic) {
  const [ghRepos, hnResults, webResults] = await Promise.all([
    Promise.resolve().then(() => searchRepos(topic, { limit: 12 })).catch(() => []),
    searchHackerNews(topic, { maxResults: 8, days: 30 }).catch(() => ({ results: [] })),
    searchTavily(topic + " open source project 2025 2026", { maxResults: 8, searchDepth: "advanced" }).catch(() => ({ results: [] })),
  ]);

  return {
    repos: ghRepos,
    hn: hnResults.results || [],
    web: webResults.results || [],
  };
}

/**
 * Use Claude Sonnet to write the analysis from gathered data.
 */
async function analyzeWithClaude(topic, data) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const repoSummary = data.repos.slice(0, 8).map((r) =>
    `- ${r.fullName} (${r.stargazersCount}⭐, ${r.language || "?"}): ${r.description || "no description"}`
  ).join("\n");

  const hnSummary = data.hn.slice(0, 6).map((h) =>
    `- "${h.title}" — ${h.snippet}`
  ).join("\n");

  const webSummary = data.web.slice(0, 6).map((w) =>
    `- ${w.title}: ${w.snippet || ""}`
  ).join("\n");

  const prompt = `You are writing a concise tech analysis report for a developer newsletter about: "${topic}"

Here is the raw research data:

## GitHub Repos Found:
${repoSummary || "None found"}

## HackerNews Discussions (last 30 days):
${hnSummary || "None found"}

## Web Sources:
${webSummary || "None found"}

Write a structured analysis report with these exact sections:
1. **Overview** (2-3 sentences: what is this space, why it matters now)
2. **Key Projects** (pick top 3-4 from the GitHub data, 1-2 sentences each on what makes them notable)
3. **Community Pulse** (what are developers discussing, based on HN + web data)
4. **Trends to Watch** (2-3 forward-looking observations)
5. **Verdict** (1 sentence bottom line)

Rules:
- Be specific and technical, not vague
- Cite actual project names and star counts
- Keep each section tight — no padding
- Do NOT use markdown headers with #, use bold text instead
- Total length: 300-400 words`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.content[0].text.trim();
}

/**
 * Build HTML for the custom report.
 */
function buildCustomHtml(topic, analysis, data) {
  const formatStars = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k ⭐` : `${n} ⭐`;

  const repoRows = data.repos.slice(0, 10).map((r, i) => {
    const desc = (r.description || "—").slice(0, 65);
    const license = r.license?.spdxId || r.license?.key || "—";
    return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 8px;font-size:13px;color:#6b7280;">${i + 1}</td>
      <td style="padding:10px 8px;">
        <a href="${r.url}" style="color:#4f46e5;text-decoration:none;font-weight:600;font-size:13px;">${r.fullName}</a><br>
        <span style="color:#9ca3af;font-size:12px;">${desc}</span>
      </td>
      <td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.language || "—"}</td>
      <td style="padding:10px 8px;font-size:13px;color:#f59e0b;font-weight:600;white-space:nowrap;">${formatStars(r.stargazersCount)}</td>
      <td style="padding:10px 8px;font-size:12px;color:#9ca3af;">${license}</td>
    </tr>`;
  }).join("");

  const hnItems = data.hn.slice(0, 6).map((h) => `
    <li style="margin-bottom:8px;font-size:13px;">
      <a href="${h.url}" style="color:#4f46e5;text-decoration:none;">${h.title}</a>
      <span style="color:#9ca3af;font-size:11px;margin-left:6px;">${h.snippet}</span>
      <a href="${h.hnUrl}" style="color:#9ca3af;font-size:11px;margin-left:4px;">[discuss]</a>
    </li>`).join("");

  const analysisHtml = analysis
    ? analysis
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1f2937;">$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7;">')
        .replace(/\n/g, "<br>")
    : `<em style="color:#9ca3af;">AI analysis unavailable — set ANTHROPIC_API_KEY to enable.</em>`;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trend Scout: ${topic}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);border-radius:16px;padding:28px 24px;margin-bottom:24px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🔍</div>
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">Topic Report</h1>
    <p style="margin:6px 0 4px;color:#c4b5fd;font-size:22px;font-weight:700;">${topic}</p>
    <p style="margin:0;color:#a78bfa;font-size:13px;">${today}</p>
  </div>

  <!-- AI Analysis -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
    <h2 style="margin:0 0 16px;font-size:17px;color:#1f2937;">🤖 AI Analysis</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7;">${analysisHtml}</p>
  </div>

  <!-- GitHub Repos -->
  ${repoRows ? `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">📦 GitHub Projects</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af;">#</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af;">Repo</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af;">Lang</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af;">Stars</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#9ca3af;">License</th>
        </tr>
      </thead>
      <tbody>${repoRows}</tbody>
    </table>
  </div>` : ""}

  <!-- HN Discussions -->
  ${hnItems ? `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">💬 HackerNews Discussions</h2>
    <ul style="margin:0;padding-left:16px;">${hnItems}</ul>
  </div>` : ""}

  <!-- Footer -->
  <div style="text-align:center;color:#9ca3af;font-size:12px;padding:8px 0 16px;">
    <a href="https://github.com/Angelov1314/trend-scout" style="color:#6366f1;text-decoration:none;">Trend Scout</a>
    &nbsp;·&nbsp; ${new Date().toUTCString()}
  </div>

</div>
</body>
</html>`;
}

/**
 * Main entry point — generate a full custom topic report.
 */
export async function generateCustomReport(topic) {
  console.log(`[trend-scout] Gathering data for: "${topic}"...`);
  const data = await gatherTopicData(topic);

  console.log(`[trend-scout] Found ${data.repos.length} repos, ${data.hn.length} HN posts, ${data.web.length} web results`);
  console.log(`[trend-scout] Generating AI analysis...`);
  const analysis = await analyzeWithClaude(topic, data);

  const html = buildCustomHtml(topic, analysis, data);
  const markdown = analysis || `# Topic Report: ${topic}\n\nNo AI analysis available.`;

  return { html, markdown };
}
