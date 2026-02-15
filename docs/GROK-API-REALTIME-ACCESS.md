# Grok API: Enabling Real-Time / Internet Access

**Pass this on exactly when fixing or re-enabling Grok real-time data in the app.**

---

The xAI Grok API models do not have automatic internet/real-time access — it's tool-based.

To enable real-time data (web + X search):

1. **Add tool definitions to your chat completions request** (use `tools` array with `web_search` and/or `x_search`).
2. **Set `tool_choice: "auto"`** (or `"required"` for forcing it on every query that needs freshness).
3. **Handle the tool call loop:** if the response contains `tool_calls`, execute them via the xAI-provided endpoints (or server-side if supported), then send results back in a new message with `role: 'tool'`.

See official docs:

- https://docs.x.ai/developers/tools/web-search  
- https://docs.x.ai/developers/tools/x-search  

Without this, Grok acts like it has a knowledge cutoff and says it can't access current info.

---

*Implementation: Grok now uses xAI’s **Responses API** (`/v1/responses`) with `tools: [{ type: 'web_search' }, { type: 'x_search' }]` and `tool_choice: 'auto'`. The server is documented to run the tool loop for server-side tools. We parse SSE for `response.output_text.delta` and completion events; streaming and non-stream both use `/v1/responses` with `tools` and `tool_choice: auto`.*
