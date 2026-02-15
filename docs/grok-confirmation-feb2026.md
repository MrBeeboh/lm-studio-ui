# Grok API Integration Status – Confirmed Working with Real-Time (Feb 14, 2026)

**Source:** Response from Grok (xAI) confirming our integration. Kept for reference.

---

**Current setup summary (from our conversation):**

- **Endpoint used:** `POST https://api.x.ai/v1/responses`  
  (modern agentic/tool-enabled endpoint – correct choice in Feb 2026)

- **Request body includes (core real-time block):**
  ```json
  {
    "input": "...user prompt or messages...",
    "model": "grok-4",
    "tools": [
      { "type": "web_search" },
      { "type": "x_search" }
    ],
    "tool_choice": "auto",
    "stream": true,
    "temperature": 0.7,
    "max_tokens": 4096
  }
  ```
  (Plus any other params like `top_p`, etc., as needed.)

---

**Our implementation:** We use the same endpoint and shape; we send `input` (messages array), `model`, `tools`, `tool_choice: "auto"`, `stream: true`, `temperature`, and `max_output_tokens` (xAI Responses API name for max tokens). No further changes required.
