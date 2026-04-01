# Trend Scout

Daily AI-powered reports on trending GitHub projects and AI agent innovations, delivered to your Gmail/WhatsApp.

## Features

- **Daily Report** — Top new GitHub repos, AI agent innovations, and notable releases
- **Daily+ Report** — Enhanced daily with social media AI buzz (via Tavily)
- **On-Demand Search** — GitHub-only search with ranked results
- **Deep Search** — Multi-source: GitHub + Tavily + X/Twitter + LinkedIn + YouTube + HackerNews
- **Multi-Channel Delivery** — Gmail (HTML email) and WhatsApp (via Twilio)
- **GitHub Actions** — Automated daily cron, or trigger manually with custom queries
- **Claude Code Skill** — Use as `/trend` directly in Claude Code

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Angelov1314/trend-scout.git
cd trend-scout

# 2. Install
npm install

# 3. Run setup to check prerequisites
npm run setup

# 4. Generate a report (prints to stdout)
npm run report

# 5. GitHub-only search
node src/index.js --mode=search --query="flutter expense tracker"

# 6. Deep multi-source search (requires TAVILY_API_KEY)
node src/index.js --mode=deep --query="AI agent framework"

# 7. Enhanced daily with social buzz
node src/index.js --mode=daily+
```

## Delivery Setup

### Gmail

1. Enable 2FA on your Google account
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Set environment variables:
   ```bash
   export GMAIL_USER=you@gmail.com
   export GMAIL_APP_PASS=xxxx-xxxx-xxxx-xxxx
   export GMAIL_TO=you@gmail.com  # optional, defaults to GMAIL_USER
   ```

### WhatsApp (via Twilio)

1. Sign up at https://www.twilio.com
2. Activate the WhatsApp Sandbox
3. Set environment variables:
   ```bash
   export TWILIO_SID=ACxxx
   export TWILIO_AUTH_TOKEN=xxx
   export TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   export WHATSAPP_TO=whatsapp:+1234567890
   ```

### GitHub Actions (Automated Daily)

1. Push this repo to GitHub
2. Go to Settings > Secrets and variables > Actions
3. Add secrets: `GMAIL_USER`, `GMAIL_APP_PASS`, `GMAIL_TO`, `TAVILY_API_KEY` (and Twilio secrets if using WhatsApp)
4. The workflow runs daily at 8:00 AM UTC. Adjust the cron in `.github/workflows/daily-report.yml`
5. You can also trigger manually from the Actions tab with a custom search query

## Report Format

Reports are concise — designed to be scanned in under 2 minutes:

```
# Trend Scout Daily Report — 2026-04-02

## Hot New Repos This Week
| # | Repo | Stars | Lang | Description |
|---|------|-------|------|-------------|
| 1 | owner/cool-repo | 2.3k | Python | One-line description |

## AI Agent & MCP Innovations
| # | Repo | Stars | Topics | Description |
|---|------|-------|--------|-------------|

## Notable Releases
- **anthropics/claude-code** v2.2.0 — New features (2026-04-01)
```

## Claude Code Skill

Copy the skill to use `/trend` in Claude Code:

```bash
cp -r skill/ ~/.claude/skills/trend-scout/
```

Then use:
- `/trend` — Generate daily report
- `/trend search "query"` — GitHub search
- `/trend deep "query"` — Multi-source deep search (Tavily + X + YouTube + HN)

## License

MIT
