/**
 * GitHub data fetching module.
 * Uses `gh` CLI for authenticated access — no token management needed.
 */
import { execSync } from "child_process";

function ghApi(path) {
  const raw = execSync(`gh api "${path}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function ghSearch(args) {
  const raw = execSync(`gh search repos ${args}`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

/**
 * Get trending repos created in the last N days, sorted by stars.
 */
export function getTrendingRepos({ days = 7, language = "", limit = 10 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const langFilter = language ? ` language:${language}` : "";
  const query = `created:>=${since}${langFilter} stars:>10`;
  const data = ghApi(
    `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`
  );
  return (data.items || []).map((r) => ({
    full_name: r.full_name,
    description: r.description,
    stargazers_count: r.stargazers_count,
    html_url: r.html_url,
    language: r.language,
    created_at: r.created_at,
    topics: r.topics || [],
  }));
}

/**
 * Get trending AI/agent repos specifically.
 */
export function getAIAgentTrending({ days = 7, limit = 15 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const topicList = ["ai-agent", "llm-agent", "mcp", "claude", "agent-framework", "agentic"];
  const results = [];

  for (const topic of topicList) {
    try {
      const query = `topic:${topic} created:>=${since} stars:>5`;
      const data = ghApi(
        `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`
      );
      const repos = (data.items || []).map((r) => ({
        full_name: r.full_name,
        description: r.description,
        stargazers_count: r.stargazers_count,
        html_url: r.html_url,
        language: r.language,
        topics: r.topics || [],
      }));
      results.push(...repos);
    } catch {
      // Some topics may return empty
    }
  }

  const seen = new Set();
  return results
    .filter((r) => {
      if (seen.has(r.full_name)) return false;
      seen.add(r.full_name);
      return true;
    })
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit);
}

/**
 * Search repos by user query (for on-demand search mode).
 */
export function searchRepos(query, { limit = 15 } = {}) {
  return ghSearch(
    `"${query}" --sort=stars --json fullName,description,stargazersCount,url,license,updatedAt,language -L ${limit}`
  );
}

/**
 * Get notable releases from the past N days across key AI repos.
 */
export function getRecentReleases({ days = 7 } = {}) {
  const watchlist = [
    "anthropics/claude-code",
    "anthropics/anthropic-sdk-python",
    "langchain-ai/langchain",
    "microsoft/autogen",
    "crewAIInc/crewAI",
    "modelcontextprotocol/servers",
    "openai/openai-agents-python",
  ];

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const releases = [];

  for (const repo of watchlist) {
    try {
      const data = ghApi(`/repos/${repo}/releases?per_page=3`);
      const recent = data
        .filter((r) => r.published_at > since)
        .map((r) => ({
          repo,
          tag: r.tag_name,
          name: r.name,
          date: r.published_at,
          url: r.html_url,
        }));
      releases.push(...recent);
    } catch {
      // Repo may not have releases
    }
  }

  return releases;
}
