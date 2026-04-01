/**
 * HTML email report generator.
 * Produces a rich, styled newsletter with SVG charts and AI summaries.
 */

function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k ⭐`;
  return `${n} ⭐`;
}

function today() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * Generate an inline SVG horizontal bar chart.
 */
function buildBarChart(repos, { width = 520, barHeight = 28, gap = 8 } = {}) {
  const max = Math.max(...repos.map((r) => r.stargazers_count), 1);
  const labelWidth = 160;
  const chartWidth = width - labelWidth - 60;
  const totalH = repos.length * (barHeight + gap) + 20;

  const bars = repos.map((r, i) => {
    const y = i * (barHeight + gap) + 10;
    const barW = Math.max(4, Math.round((r.stargazers_count / max) * chartWidth));
    const stars = formatStars(r.stargazers_count);
    const name = r.full_name.split("/")[1].slice(0, 20);
    // Alternating color palette
    const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"];
    const fill = colors[i % colors.length];

    return `
      <g transform="translate(0,${y})">
        <text x="${labelWidth - 6}" y="${barHeight / 2 + 5}" text-anchor="end"
          font-family="Arial,sans-serif" font-size="12" fill="#374151">${name}</text>
        <rect x="${labelWidth}" y="0" width="${barW}" height="${barHeight}"
          rx="4" fill="${fill}" opacity="0.9"/>
        <text x="${labelWidth + barW + 6}" y="${barHeight / 2 + 5}"
          font-family="Arial,sans-serif" font-size="11" fill="#6b7280">${stars}</text>
      </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" style="display:block;max-width:100%;">
    ${bars}
  </svg>`;
}

/**
 * Render a single "featured project" card (top 3).
 */
function featuredCard(repo, rank) {
  const medals = ["🥇", "🥈", "🥉"];
  const medal = medals[rank] || `#${rank + 1}`;
  const summary = repo.aiSummary || repo.description || "";
  const topics = (repo.topics || []).slice(0, 4).map(
    (t) => `<span style="display:inline-block;background:#ede9fe;color:#5b21b6;border-radius:12px;padding:2px 8px;font-size:11px;margin:2px;">${t}</span>`
  ).join("");

  return `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex;align-items:center;margin-bottom:10px;">
      <span style="font-size:22px;margin-right:10px;">${medal}</span>
      <div>
        <a href="https://github.com/${repo.full_name}" style="font-size:16px;font-weight:700;color:#1e1b4b;text-decoration:none;">
          ${repo.full_name}
        </a>
        <div style="margin-top:2px;">
          <span style="background:#f3f4f6;color:#374151;border-radius:6px;padding:2px 8px;font-size:12px;margin-right:6px;">
            ${repo.language || "—"}
          </span>
          <span style="color:#f59e0b;font-weight:600;font-size:13px;">${formatStars(repo.stargazers_count)}</span>
        </div>
      </div>
    </div>
    ${summary ? `<p style="margin:0 0 10px;color:#374151;font-size:14px;line-height:1.6;">${summary}</p>` : ""}
    <div style="margin-bottom:10px;">${topics}</div>
    <a href="https://github.com/${repo.full_name}"
      style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;">
      View on GitHub →
    </a>
  </div>`;
}

/**
 * Render a compact row for the "more repos" table.
 */
function repoRow(repo, i) {
  const desc = (repo.description || "—").slice(0, 70);
  return `
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 8px;font-size:13px;color:#6b7280;">${i + 1}</td>
    <td style="padding:10px 8px;">
      <a href="https://github.com/${repo.full_name}" style="color:#4f46e5;text-decoration:none;font-weight:600;font-size:13px;">
        ${repo.full_name}
      </a><br>
      <span style="color:#9ca3af;font-size:12px;">${desc}</span>
    </td>
    <td style="padding:10px 8px;font-size:13px;color:#374151;white-space:nowrap;">${repo.language || "—"}</td>
    <td style="padding:10px 8px;font-size:13px;color:#f59e0b;font-weight:600;white-space:nowrap;">${formatStars(repo.stargazers_count)}</td>
  </tr>`;
}

/**
 * Render an AI agent row.
 */
function agentRow(repo, i) {
  const topics = (repo.topics || []).slice(0, 2).join(", ");
  const desc = (repo.description || "—").slice(0, 65);
  return `
  <tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:8px;">
      <a href="${repo.html_url}" style="color:#7c3aed;text-decoration:none;font-weight:600;font-size:13px;">
        ${repo.full_name}
      </a><br>
      <span style="color:#9ca3af;font-size:12px;">${desc}</span>
    </td>
    <td style="padding:8px;font-size:12px;color:#6b7280;">${topics}</td>
    <td style="padding:8px;font-size:13px;color:#f59e0b;font-weight:600;white-space:nowrap;">${formatStars(repo.stargazers_count)}</td>
  </tr>`;
}

/**
 * Main HTML report builder.
 */
export function buildHtmlReport({ trending, aiAgents, releases, featuredRepos, buzzResults = [] }) {
  const chart = buildBarChart(trending.slice(0, 8));
  const featured = (featuredRepos || trending.slice(0, 3)).map((r, i) => featuredCard(r, i)).join("");
  const moreRepos = trending.slice(3).map((r, i) => repoRow(r, i)).join("");
  const agentRows = aiAgents.slice(0, 8).map((r, i) => agentRow(r, i)).join("");

  const releasesList = releases.length
    ? releases.map((r) =>
        `<li style="margin-bottom:6px;">
          <strong>${r.repo.split("/")[1]}</strong>
          <a href="${r.url}" style="color:#4f46e5;text-decoration:none;margin:0 4px;">${r.tag}</a>
          <span style="color:#9ca3af;font-size:12px;">${r.date.slice(0, 10)}</span>
        </li>`
      ).join("")
    : `<li style="color:#9ca3af;">No major releases this week.</li>`;

  const buzzSection = buzzResults.length > 0 ? `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">🌐 AI Buzz (Web & Social)</h2>
    <ul style="margin:0;padding-left:18px;">
      ${buzzResults.flatMap((s) =>
        (s.results || []).slice(0, 3).map((r) => {
          const label = { tavily: "Web", x: "X", hackernews: "HN" }[s.source] || s.source;
          return `<li style="margin-bottom:6px;font-size:13px;">
            <span style="background:#f3f4f6;border-radius:4px;padding:1px 5px;font-size:11px;color:#6b7280;margin-right:4px;">${label}</span>
            <a href="${r.url}" style="color:#4f46e5;text-decoration:none;">${r.title}</a>
          </li>`;
        })
      ).join("")}
    </ul>
  </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trend Scout — ${today()}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">

<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px;padding:28px 24px;margin-bottom:24px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🔭</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Trend Scout</h1>
    <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">${today()}</p>
  </div>

  <!-- Top 3 Featured Projects -->
  <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">🏆 This Week's Top 3</h2>
  ${featured}

  <!-- Star Chart -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 16px;font-size:17px;color:#1f2937;">📊 Stars This Week</h2>
    ${chart}
  </div>

  <!-- More Hot Repos -->
  ${moreRepos ? `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">🔥 More Hot Repos</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">#</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Repo</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Lang</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Stars</th>
        </tr>
      </thead>
      <tbody>${moreRepos}</tbody>
    </table>
  </div>` : ""}

  <!-- AI Agents -->
  ${agentRows ? `
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">🤖 AI Agent & MCP Innovations</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Repo</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Topics</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#9ca3af;">Stars</th>
        </tr>
      </thead>
      <tbody>${agentRows}</tbody>
    </table>
  </div>` : ""}

  <!-- Notable Releases -->
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="margin:0 0 14px;font-size:17px;color:#1f2937;">🚀 Notable Releases</h2>
    <ul style="margin:0;padding-left:18px;">${releasesList}</ul>
  </div>

  <!-- Buzz section (if present) -->
  ${buzzSection}

  <!-- Footer -->
  <div style="text-align:center;color:#9ca3af;font-size:12px;padding:8px 0 16px;">
    <a href="https://github.com/Angelov1314/trend-scout" style="color:#6366f1;text-decoration:none;">Trend Scout</a>
    &nbsp;·&nbsp; Generated ${new Date().toUTCString()}
  </div>

</div>
</body>
</html>`;
}
