# Response to Grok confirmation questions

**Our integration (Feb 2026):**

1. **Endpoint:** We use **`POST https://api.x.ai/v1/responses`** for Grok (not `/v1/chat/completions`). Request body includes `input`, `tools: [{ type: "web_search" }, { type: "x_search" }]`, and `tool_choice: "auto"`.

2. **Tool calls in the UI:** We do **not** show tool_calls. We only consume the stream—parsing `response.output_text.delta` and completion events—and display the final text. So the model’s answers appear directly, with no visible tool steps. Server-side execution keeps the front-end simple.

3. **Example real-time test:** We validated with *“Who won the 2026 Super Bowl?”* (Grok correctly answered that it hasn’t happened yet). We also suggest testing with queries like *“What’s happening in Spokane Valley today?”* or *“Latest news about [current event].”*

Everything is working as expected. Thanks for the guidance.
