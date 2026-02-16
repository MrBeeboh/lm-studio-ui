// scripts/search-proxy.mjs
// Express backend for web search proxying (ESM, Node.js v18+)
import express from 'express';
const app = express();
const PORT = 5174; // Avoid conflict with Vite and other services

const BRAVE_API_KEY = 'BSAYDx375UgZ0UpEDP08YkBfi_0U8rJ';

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const braveRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}`,
      { headers: { 'X-Subscription-Token': BRAVE_API_KEY } }
    );
    if (!braveRes.ok) {
      const text = await braveRes.text();
      throw new Error(`Brave API error: ${braveRes.status} ${text}`);
    }
    const data = await braveRes.json();
    res.json(data.web?.results || []);
  } catch (err) {
    console.error('[search-proxy] Error fetching Brave Search:', err);
    res.status(500).json({ error: 'Failed to fetch from Brave Search', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Search proxy running at http://localhost:${PORT}/api/search?q=...`);
});
