/**
 * DuckDuckGo search for ATOM: real web results via Lite HTML (not just Instant Answer).
 * No API key. Uses CORS proxy in the browser.
 */

/**
 * CORS proxies for DuckDuckGo Lite. Browser can't fetch DDG directly (CORS).
 * We try each in order; if one is down the next is used automatically.
 * Tested 2026-02-09:
 *   corsproxy.org  → 200 OK (returns HTML body directly)
 *   allorigins /get → 200 OK (returns JSON { contents: "..." })
 *   corsproxy.io   → 403 DEAD
 *   allorigins /raw → 520 DEAD
 */

// Fetch Brave JSON results from backend search proxy
async function fetchViaProxy(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return await res.json();
}

/**
 * Search DuckDuckGo Lite (HTML) and return real search results (title, snippet, url).
 * This returns actual web results; the Instant Answer API often returns empty for most queries.
 */

async function searchDuckDuckGoLite(query) {
  const q = String(query || '').trim();
  if (!q) return [];


  const braveResults = await fetchViaProxy(q);
  if (!Array.isArray(braveResults)) return [];

  // Brave API: each result has { title, url, description, thumbnail, ... }
  const results = braveResults.slice(0, 5).map(r => ({
    title: r.title || '',
    url: r.url || '',
    thumbnail: r.thumbnail || ''
  })).filter(r => r.title && r.url);
  return results;
}

/**
 * Main search: use Lite HTML for real web results (used for chat).
 * @param {string} query - Search query
 * @returns {Promise<{ abstract: string, abstractUrl: string, abstractSource: string, related: Array<{ text: string, url: string }> }>}
 *   For compatibility we also return abstract/related; "related" is filled from Lite results.
 */
export async function searchDuckDuckGo(query) {
  const q = String(query || '').trim();
  if (!q) return { abstract: '', abstractUrl: '', abstractSource: '', related: [] };

  // Retry once on failure: first attempt may fail on cold proxy connection.
  let liteResults;
  try {
    liteResults = await searchDuckDuckGoLite(q);
  } catch (firstErr) {
    // Wait briefly, then retry the full proxy chain.
    await new Promise((r) => setTimeout(r, 1500));
    try {
      liteResults = await searchDuckDuckGoLite(q);
    } catch (secondErr) {
      throw new Error('Web search failed after retry. Check your internet connection and click the globe to reconnect.');
    }
  }

  const related = liteResults.map((r) => ({
    text: r.snippet ? `${r.title} — ${r.snippet}` : r.title,
    url: r.url,
    thumbnail: r.thumbnail
  }));

  return {
    abstract: liteResults[0]?.snippet || liteResults[0]?.title || '',
    abstractUrl: liteResults[0]?.url || '',
    abstractSource: '',
    related,
  };
}

/**
 * Prime the backend search proxy connection when the user turns on web search (globe click).
 * Resolves with true if warm-up succeeded, false otherwise (non-throwing).
 */
export function warmUpSearchConnection() {
  const WARMUP_TIMEOUT_MS = 12000;
  return fetch('/api/search?q=a', { signal: (typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(WARMUP_TIMEOUT_MS) : undefined) })
    .then((res) => res.ok)
    .catch(() => false);
}

/**
 * Format search result as a single string for the chat (user message).
 */
export function formatSearchResultForChat(query, result) {
  const lines = [
    'The user asked a question that required a web search. Use the following search results to answer. Base your answer on these results.',
    '',
    `Web search for: "${query}"`,
  ];
  if (result.abstract) {
    lines.push('');
    lines.push(result.abstract);
    if (result.abstractUrl) lines.push(`Source: ${result.abstractUrl}`);
  }
  if (result.related?.length) {
    lines.push('');
    lines.push('Search results:');
    result.related.slice(0, 8).forEach((r, i) => {
      if (r.thumbnail) {
        lines.push(`${i + 1}. ${r.text}`);
        lines.push(`   ${r.url}`);
        lines.push(`   [Image: ${r.thumbnail}]`);
      } else {
        lines.push(`${i + 1}. ${r.text}`);
        lines.push(`   ${r.url}`);
      }
    });
  }
  if (lines.length <= 3) lines.push('', '(No results found for this query.)');
  return lines.join('\n');
}
