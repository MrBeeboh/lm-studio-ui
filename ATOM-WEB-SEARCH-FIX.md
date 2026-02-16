# ATOM Web Search Fix — Complete Instructions for Coding Agent

## CRITICAL: Read This First

- **Project path on disk:** `C:\CURSOR\lm-studio-ui` — ALL files go here. Never use any other path.
- **Project type:** Svelte 5 + Vite + Tailwind CSS. `package.json` has `"type": "module"` so all `.js` files are ESM.
- **Node version:** v24.12.0 — has native `fetch()` globally available in ESM files.
- **What broke:** The original web search used public CORS proxies (corsproxy.org, allorigins) to fetch DuckDuckGo Lite HTML from the browser. Those proxies went down. A previous agent attempted to fix this but created a mess of half-working files, wrong paths, and module-type mismatches.
- **What needs to happen:** Replace the broken CORS-proxy approach with a local Express backend that calls the Brave Search API. The user has a Brave API key: `BSAYDx375UgZ0UpEDP08YkBfi_0U8rJ`. The key must be configurable from the ATOM Settings panel, stored in localStorage, and sent to the backend.

---

## Architecture Overview

```
Browser (Svelte UI on localhost:5173)
  │
  ├── User types query with web search enabled (globe button)
  │
  ├── Frontend calls:  /api/search?q=encoded_query
  │       (Vite dev server proxies this to localhost:5174)
  │
  └── Backend (Express on localhost:5174)
          │
          ├── Reads Brave API key from:
          │     1. In-memory (set via POST /api/set-brave-key)
          │     2. config/brave_key.txt (persisted)
          │     3. Environment variable BRAVE_API_KEY
          │
          └── Calls: https://api.search.brave.com/res/v1/web/search?q=...
                Headers: { "X-Subscription-Token": BRAVE_API_KEY }
                Returns JSON array of { title, url, snippet, thumbnail }
```

---

## Step 1: Clean Up Previous Agent's Mess

Delete these files if they exist (they are broken/incomplete):

```
C:\CURSOR\lm-studio-ui\scripts\search-proxy.cjs
C:\CURSOR\lm-studio-ui\scripts\search-proxy.mjs
C:\CURSOR\lm-studio-ui\scripts\local-cors-proxy.js
C:\CURSOR\lm-studio-ui\scripts\local-cors-proxy.cjs
C:\CURSOR\lm-studio-ui\scripts\start-cors-proxy.bat
C:\CURSOR\lm-studio-ui\scripts\check_cors_proxy.py
```

---

## Step 2: Install Dependencies

Run in `C:\CURSOR\lm-studio-ui`:

```bash
npm install express cors
```

Note: Do NOT install `node-fetch` — Node v24 has native `fetch()` in ESM.

---

## Step 3: Create the Backend Search Proxy

Create file: `C:\CURSOR\lm-studio-ui\scripts\search-proxy.mjs`

```javascript
// search-proxy.mjs — Brave Search API proxy for ATOM
// This is an ES module (.mjs) — Node v24 provides native fetch()

import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const CONFIG_DIR = join(PROJECT_ROOT, 'config');
const KEY_FILE = join(CONFIG_DIR, 'brave_key.txt');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5174;

// --- Brave API Key Management ---

let braveApiKey = '';

function loadKeyFromFile() {
  try {
    if (existsSync(KEY_FILE)) {
      const key = readFileSync(KEY_FILE, 'utf-8').trim();
      if (key && key !== 'YOUR_BRAVE_API_KEY_HERE') {
        braveApiKey = key;
        console.log('[search-proxy] Loaded Brave API key from config/brave_key.txt');
        return;
      }
    }
  } catch (e) {
    // ignore
  }
  // Fallback to environment variable
  if (process.env.BRAVE_API_KEY && process.env.BRAVE_API_KEY !== 'YOUR_BRAVE_API_KEY_HERE') {
    braveApiKey = process.env.BRAVE_API_KEY;
    console.log('[search-proxy] Loaded Brave API key from environment variable');
  }
}

function saveKeyToFile(key) {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(KEY_FILE, key, 'utf-8');
    console.log('[search-proxy] Saved Brave API key to config/brave_key.txt');
  } catch (e) {
    console.error('[search-proxy] Failed to save key file:', e.message);
  }
}

loadKeyFromFile();

// --- Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brave_key_present: !!braveApiKey && braveApiKey.length > 5,
    port: PORT
  });
});

// Set Brave API key (called from Settings UI)
app.post('/api/set-brave-key', (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string' || key.trim().length < 5) {
    return res.status(400).json({ error: 'Invalid API key' });
  }
  braveApiKey = key.trim();
  saveKeyToFile(braveApiKey);
  res.json({ status: 'ok', message: 'Brave API key saved' });
});

// Web search endpoint
app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }
  if (!braveApiKey) {
    return res.status(500).json({
      error: 'Brave API key not configured. Go to Settings and enter your Brave Search API key.'
    });
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`;
    console.log(`[search-proxy] Searching Brave for: "${q}"`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[search-proxy] Brave API error ${response.status}: ${text}`);
      return res.status(response.status).json({
        error: `Brave API returned ${response.status}`,
        details: text
      });
    }

    const data = await response.json();
    const webResults = data.web?.results || [];

    // Map to clean result objects with thumbnails
    const results = webResults.map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
      thumbnail: r.thumbnail?.src || r.profile?.img || ''
    }));

    console.log(`[search-proxy] Returned ${results.length} results for "${q}"`);
    res.json(results);

  } catch (err) {
    console.error('[search-proxy] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch from Brave Search', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[search-proxy] Running at http://localhost:${PORT}`);
  console.log(`[search-proxy] Search endpoint: http://localhost:${PORT}/api/search?q=test`);
  console.log(`[search-proxy] Health check:    http://localhost:${PORT}/api/health`);
  if (!braveApiKey) {
    console.log('[search-proxy] WARNING: No Brave API key configured!');
    console.log('[search-proxy] Set it via Settings UI, or create config/brave_key.txt, or set BRAVE_API_KEY env var.');
  }
});
```

---

## Step 4: Update Vite Config to Proxy /api Requests

Edit: `C:\CURSOR\lm-studio-ui\vite.config.js`

Add the proxy configuration to the `server` section. If there's already a `server` key, merge the `proxy` into it. If not, add the full block.

```javascript
// Inside defineConfig, add or merge into server:
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5174',
      changeOrigin: true
    }
  }
}
```

**Important:** If `vite.config.js` already has other `server` properties (like `port`), keep those and just add the `proxy` key inside the existing `server` object. Do not overwrite existing config.

---

## Step 5: Replace the Frontend Search Logic

Replace the ENTIRE contents of: `C:\CURSOR\lm-studio-ui\src\lib\duckduckgo.js`

```javascript
// duckduckgo.js — Web search integration for ATOM
// Uses local Express proxy -> Brave Search API
// No CORS proxies, no DuckDuckGo scraping

/**
 * Search the web via the local Brave Search proxy.
 * Returns: { abstract, related: [{ text, url, snippet, thumbnail }] }
 */
export async function searchDuckDuckGo(query) {
  if (!query || !query.trim()) {
    return { abstract: '', related: [] };
  }

  try {
    const url = `/api/search?q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[web-search] API error:', response.status, errorData);
      return {
        abstract: errorData.error || `Search failed (HTTP ${response.status})`,
        related: []
      };
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return { abstract: '', related: [] };
    }

    return {
      abstract: '',
      related: results.map(r => ({
        text: r.title || '',
        url: r.url || '',
        snippet: r.snippet || '',
        thumbnail: r.thumbnail || ''
      }))
    };
  } catch (err) {
    console.error('[web-search] Error:', err.message);
    return {
      abstract: `Web search failed: ${err.message}`,
      related: []
    };
  }
}

/**
 * Format search results into a string for the AI model prompt.
 * Includes thumbnail image URLs when available.
 */
export function formatSearchResultForChat(searchResult, query) {
  if (!searchResult) return '';

  const parts = [];
  parts.push(`Web search results for: "${query}"\n`);

  if (searchResult.abstract) {
    parts.push(`Summary: ${searchResult.abstract}\n`);
  }

  if (searchResult.related && searchResult.related.length > 0) {
    parts.push('Results:');
    searchResult.related.forEach((r, i) => {
      parts.push(`${i + 1}. ${r.text}`);
      if (r.snippet) parts.push(`   ${r.snippet}`);
      parts.push(`   URL: ${r.url}`);
      if (r.thumbnail) parts.push(`   [Image: ${r.thumbnail}]`);
    });
  } else {
    parts.push('(No results found for this query.)');
  }

  return parts.join('\n');
}

/**
 * Warm up the search connection by hitting the health endpoint.
 */
export async function warmUpSearchConnection() {
  try {
    await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
  } catch {
    // Silent — proxy may not be running yet
  }
}
```

---

## Step 6: Add Brave API Key Field to Settings Panel

Edit: `C:\CURSOR\lm-studio-ui\src\lib\components\SettingsPanel.svelte`

### 6a: Add the store import

In the `<script>` section at the top, find where other stores are imported from `'../stores.js'` (or `'$lib/stores.js'`). Add `braveApiKey` to that import list.

### 6b: Add the store to stores.js

Edit: `C:\CURSOR\lm-studio-ui\src\lib\stores.js`

Add this near the other persisted/writable stores:

```javascript
// Brave Search API key — persisted to localStorage
function createPersistedStore(key, defaultValue) {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  const initial = stored !== null ? stored : defaultValue;
  const store = writable(initial);
  store.subscribe(value => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  });
  return store;
}

export const braveApiKey = createPersistedStore('braveApiKey', '');
```

**Note:** If `stores.js` already has a helper function for persisted stores (check for patterns like `localStorage.getItem` or `persistedWritable`), use that existing pattern instead of adding a duplicate. Just add the `braveApiKey` export using whatever pattern already exists.

### 6c: Add the Settings UI section

In `SettingsPanel.svelte`, find the markup section where other settings fields are rendered. Add the following section — place it near other API-related settings if any exist, or at the end of the settings list:

```svelte
<!-- Brave Search API Key -->
<div class="settings-section">
  <h3 class="settings-heading">Web Search (Brave)</h3>
  <label class="settings-label" for="brave-api-key-input">
    Brave Search API Key
  </label>
  <div style="display: flex; gap: 0.5rem; align-items: center;">
    <input
      id="brave-api-key-input"
      type="password"
      placeholder="Enter your Brave Search API key"
      bind:value={$braveApiKey}
      class="settings-input"
      style="flex: 1;"
    />
    <button
      class="settings-button"
      on:click={saveBraveKey}
    >
      Save
    </button>
  </div>
  <p class="settings-hint">
    Get a free key at <a href="https://api-dashboard.search.brave.com" target="_blank" rel="noopener">brave.com/search/api</a>
  </p>
</div>
```

And add this function in the `<script>` section:

```javascript
async function saveBraveKey() {
  const key = $braveApiKey?.trim();
  if (!key) return;
  try {
    const res = await fetch('/api/set-brave-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Brave API key saved successfully!');
    } else {
      alert('Failed to save key: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Could not reach search proxy. Make sure START-EVERYTHING.bat is running.');
  }
}
```

**Important styling note:** Match the CSS classes used by the existing settings fields. Look at how other inputs and buttons are styled in the file and use the same class names. The class names above (`settings-section`, `settings-heading`, `settings-label`, `settings-input`, `settings-button`, `settings-hint`) are placeholders — replace them with whatever the actual project uses.

---

## Step 7: Update MessageBubble to Display Thumbnail Images

Edit: `C:\CURSOR\lm-studio-ui\src\lib\components\MessageBubble.svelte`

In the `<script>` section, add this reactive variable:

```javascript
// Extract image URLs from [Image: URL] tags in assistant messages
$: imageThumbUrls = (message?.role === 'assistant' && message?.content)
  ? [...message.content.matchAll(/\[Image:\s*(https?:\/\/[^\]]+)\]/g)].map(m => m[1])
  : [];
```

In the markup, find where the assistant message content is rendered (after the markdown/HTML output). Add this block right after it:

```svelte
{#if imageThumbUrls.length > 0}
  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
    {#each imageThumbUrls as thumbUrl}
      <img
        src={thumbUrl}
        alt="Search result thumbnail"
        style="max-width: 120px; max-height: 90px; border-radius: 6px; object-fit: cover; opacity: 0.9;"
        loading="lazy"
        on:error={(e) => e.target.style.display = 'none'}
      />
    {/each}
  </div>
{/if}
```

---

## Step 8: Update START-EVERYTHING.bat

Edit: `C:\CURSOR\lm-studio-ui\START-EVERYTHING.bat`

Add this line near the other server startup commands (before the Vite dev server line, after the LM Studio server start):

```bat
:: Start Brave Search proxy
start /min "Search Proxy" cmd /c "node scripts/search-proxy.mjs"
timeout /t 2 /noq >nul
```

**Do not change any existing lines.** Just add the search proxy startup.

Also ensure the LM Studio server start line includes `--cors`:

```bat
start /min "LM Studio Server" cmd /c "lms server start --port %LM_PORT% --cors"
```

---

## Step 9: Add config/ to .gitignore

Edit: `C:\CURSOR\lm-studio-ui\.gitignore`

Add this line (so the API key file doesn't get committed):

```
config/brave_key.txt
```

---

## Step 10: Verify

After all changes are made:

1. Run `npm install` in `C:\CURSOR\lm-studio-ui` (to ensure express and cors are installed)
2. Run `START-EVERYTHING.bat`
3. Open the app in Chrome
4. Go to Settings, paste the Brave API key: `BSAYDx375UgZ0UpEDP08YkBfi_0U8rJ`
5. Click Save — should get a success message
6. Start a new chat, enable web search (globe button), ask a question
7. Results should appear with titles, URLs, snippets, and thumbnail images where available

### Troubleshooting

- **If /api/search returns 404:** Vite proxy isn't configured. Check vite.config.js has the proxy block.
- **If /api/search returns 500:** Check the search proxy terminal window for errors.
- **If "fetch is not a function":** The file is NOT `.mjs` or something is importing it as CommonJS. Verify the file is named `search-proxy.mjs`.
- **If no images appear:** Brave doesn't return thumbnails for every result. Try searching for well-known topics like "NASA" or "Tesla" which tend to have thumbnails.
- **If Settings field doesn't appear:** The Vite dev server is serving a cached build. Stop it, run `npm run dev` again, and hard-refresh the browser (Ctrl+Shift+R).

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `scripts/search-proxy.mjs` | **CREATE** — New Express backend |
| `scripts/search-proxy.cjs` | **DELETE** — Broken CommonJS version |
| `scripts/local-cors-proxy.js` | **DELETE** — No longer needed |
| `scripts/local-cors-proxy.cjs` | **DELETE** — No longer needed |
| `scripts/start-cors-proxy.bat` | **DELETE** — No longer needed |
| `scripts/check_cors_proxy.py` | **DELETE** — Debug script, no longer needed |
| `vite.config.js` | **EDIT** — Add proxy for /api -> localhost:5174 |
| `src/lib/duckduckgo.js` | **REPLACE** — New clean Brave API frontend |
| `src/lib/stores.js` | **EDIT** — Add braveApiKey persisted store |
| `src/lib/components/SettingsPanel.svelte` | **EDIT** — Add Brave API key input field |
| `src/lib/components/MessageBubble.svelte` | **EDIT** — Add thumbnail image rendering |
| `START-EVERYTHING.bat` | **EDIT** — Add search proxy startup command |
| `.gitignore` | **EDIT** — Add config/brave_key.txt |
