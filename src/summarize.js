/**
 * AI-powered project summaries using Claude API.
 * Uses claude-haiku-4-5 for speed and cost efficiency.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate a 2-sentence "why it matters" summary for a GitHub repo.
 */
export async function summarizeRepo(repo) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const prompt = `You are summarizing a trending GitHub project for a daily tech newsletter.

Repo: ${repo.full_name}
Description: ${repo.description || "No description"}
Language: ${repo.language || "Unknown"}
Stars gained this week: ${repo.stargazers_count}
Topics: ${(repo.topics || []).join(", ") || "none"}

Write exactly 2 sentences:
1. What it does (be specific and technical)
2. Why developers are excited about it right now

Be concise, no fluff, no "This project...". Start directly with the substance.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].text.trim();
  } catch (err) {
    console.warn(`[summarize] Failed for ${repo.full_name}: ${err.message}`);
    return null;
  }
}

/**
 * Summarize top N repos in parallel.
 */
export async function summarizeTopRepos(repos, n = 3) {
  const top = repos.slice(0, n);
  const summaries = await Promise.all(top.map(summarizeRepo));
  return top.map((repo, i) => ({ ...repo, aiSummary: summaries[i] }));
}
