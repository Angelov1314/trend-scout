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
 * Search HackerNews via official Algolia API — real-time, structured, free.
 * Much more accurate than Tavily site: filter.
 */
export async function searchHackerNews(query, { maxResults = 5, days = 7 } = {}) {
  const since = Math.floor((Date.now() - days * 86400000) / 1000);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=${maxResults}&attributesToRetrieve=title,url,points,num_comments,created_at,objectID`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HN API ${res.status}`);
    const data = await res.json();

    return {
      answer: null,
      results: (data.hits || []).map((h) => ({
        title: h.title,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: `${h.points} pts · ${h.num_comments} comments`,
        source: "hackernews",
      })),
    };
  } catch (err) {
    console.warn(`[search] HN Algolia failed: ${err.message}`);
    return { answer: null, results: [] };
  }
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
