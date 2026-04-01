/**
 * Multi-source search module.
 * Extends beyond GitHub with Tavily (web), X/Twitter, LinkedIn, and YouTube.
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

/**
 * Tavily web search — broad web coverage, great for tech blogs, news, docs.
 */
export async function searchTavily(query, { maxResults = 5, searchDepth = "basic" } = {}) {
  if (!TAVILY_API_KEY) {
    console.warn("[search] Tavily not configured — set TAVILY_API_KEY");
    return [];
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answer: true,
    }),
  });

  if (!res.ok) {
    console.error(`[search] Tavily error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return {
    answer: data.answer || null,
    results: (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 150),
      score: r.score,
      source: "tavily",
    })),
  };
}

/**
 * Search X/Twitter via Tavily with site filter.
 * (Direct X API requires expensive enterprise access — Tavily site: filter is pragmatic)
 */
export async function searchX(query, { maxResults = 5 } = {}) {
  return searchTavily(`${query} site:x.com OR site:twitter.com`, { maxResults });
}

/**
 * Search LinkedIn via Tavily with site filter.
 */
export async function searchLinkedIn(query, { maxResults = 5 } = {}) {
  return searchTavily(`${query} site:linkedin.com`, { maxResults });
}

/**
 * Search YouTube via Tavily with site filter.
 */
export async function searchYouTube(query, { maxResults = 5 } = {}) {
  return searchTavily(`${query} site:youtube.com`, { maxResults });
}

/**
 * Search HackerNews / tech community discussions.
 */
export async function searchHackerNews(query, { maxResults = 5 } = {}) {
  return searchTavily(`${query} site:news.ycombinator.com OR site:lobste.rs`, { maxResults });
}

/**
 * Unified multi-source search — queries all enabled sources in parallel.
 */
export async function multiSearch(query, { sources = ["tavily", "x", "youtube"], maxPerSource = 3 } = {}) {
  const searchMap = {
    tavily: () => searchTavily(query, { maxResults: maxPerSource }),
    x: () => searchX(query, { maxResults: maxPerSource }),
    linkedin: () => searchLinkedIn(query, { maxResults: maxPerSource }),
    youtube: () => searchYouTube(query, { maxResults: maxPerSource }),
    hackernews: () => searchHackerNews(query, { maxResults: maxPerSource }),
  };

  const tasks = sources
    .filter((s) => searchMap[s])
    .map(async (s) => {
      try {
        const result = await searchMap[s]();
        return { source: s, ...result };
      } catch (err) {
        console.warn(`[search] ${s} failed: ${err.message}`);
        return { source: s, answer: null, results: [] };
      }
    });

  return Promise.all(tasks);
}
