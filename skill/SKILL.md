---
name: trend-scout
description: Generate concise reports on trending GitHub repos, AI agent innovations, and on-demand project searches. Run daily or ad-hoc.
triggers:
  - trend
  - trending
  - github trending
  - ai agents trending
  - innovation report
---

# Trend Scout

Generate concise, scannable reports on trending GitHub projects and AI agent innovations.

## Commands

- **`/trend`** — Generate today's daily report (top repos + AI agents + releases)
- **`/trend search "query"`** — Search GitHub and generate a ranked report
- **`/trend send`** — Generate daily report and deliver via configured channels

## Daily Report Generation

When the user invokes `/trend` or asks for trending repos/AI news:

### Step 1: Fetch Trending Repos

Use `gh` CLI to find repos created in the last 7 days, sorted by stars:

```bash
# Top trending repos (any language)
gh api '/search/repositories?q=created:>=YYYY-MM-DD+stars:>10&sort=stars&order=desc&per_page=10' \
  --jq '.items | [.[] | {full_name, description, stargazers_count, html_url, language, topics}]'
```

Replace `YYYY-MM-DD` with the date 7 days ago.

### Step 2: Fetch AI/Agent Innovations

Search for repos with AI agent-related topics:

```bash
# Search across multiple topics
for topic in ai-agent llm-agent mcp claude agent-framework agentic; do
  gh api "/search/repositories?q=topic:${topic}+created:>=YYYY-MM-DD+stars:>5&sort=stars&order=desc&per_page=10" \
    --jq '.items | [.[] | {full_name, description, stargazers_count, html_url, language, topics}]'
done
```

Deduplicate by `full_name`, merge, and sort by stars.

### Step 3: Check Notable Releases

Check releases from key AI repos in the past 7 days:

```bash
for repo in anthropics/claude-code langchain-ai/langchain microsoft/autogen crewAIInc/crewAI modelcontextprotocol/servers; do
  gh api "/repos/${repo}/releases?per_page=3" --jq '[.[] | select(.published_at > "SINCE_DATE") | {repo: "'"$repo"'", tag: .tag_name, name: .name, date: .published_at, url: .html_url}]'
done
```

### Step 4: Format Report

Output a concise markdown report. Keep it scannable — under 2 minutes to read:

```markdown
# Trend Scout Daily — YYYY-MM-DD

## Hot New Repos This Week
| # | Repo | Stars | Lang | Description |
|---|------|-------|------|-------------|
| 1 | [owner/repo](url) | 2.3k | Python | Short description |

## AI Agent & MCP Innovations
| # | Repo | Stars | Topics | Description |
|---|------|-------|--------|-------------|
| 1 | [owner/repo](url) | 500 | mcp, agent | Short description |

## Notable Releases
- **repo** [v1.2.0](url) — Release name (date)
```

**Formatting rules:**
- Descriptions max 80 chars, truncate with `...`
- Stars: use `1.2k` format for 1000+
- Topics: show max 3
- Max 10 entries per section
- No fluff, no analysis paragraphs — just the data

## Search Mode

When the user invokes `/trend search "query"`:

```bash
gh search repos "<query>" --sort=stars --json fullName,description,stargazersCount,url,license,updatedAt,language,topics -L 10
```

Format as:
```markdown
# Trend Scout Search: "<query>" — YYYY-MM-DD

| # | Repo | Stars | Lang | License | Updated | Description |
|---|------|-------|------|---------|---------|-------------|
```

## Delivery (Send Mode)

When `/trend send` is invoked, check if the trend-scout Node.js app is available:

```bash
# If installed locally
cd ~/Projects/trend-scout && node src/index.js --mode=daily
```

If not installed, generate the report in-conversation and offer to:
1. Copy to clipboard
2. Draft a Gmail using the Gmail MCP tool (if available)
3. Save as a file

## What This Skill Does NOT Do

- Does not provide analysis or opinions — just curated data
- Does not track historical trends (each report is a snapshot)
- Does not require API keys (uses `gh` CLI authentication)
