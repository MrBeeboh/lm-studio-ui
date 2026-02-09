# LM Studio 0.4.x Release Notes – Impact on ATOM (lm-studio-ui)

This doc summarizes LM Studio 0.4.x changelog and API updates so the UI stays aligned with LM Studio’s features and behavior.

**Last updated:** 2026-02-08.  
**Sources:** [LM Studio Changelog](https://lmstudio.ai/changelog), [API Changelog](https://lmstudio.ai/docs/developer/api-changelog).

---

## Critical for multiple-model dropdowns (0.4.x)

- **GET /v1/models** (OpenAI-compat) returns only **currently loaded** models.
- **GET /api/v1/models** (LM Studio native REST) returns **all downloaded models** on the system (LLMs + embeddings), with `key` as the model id and `loaded_instances` for what’s in memory.
- ATOM now uses **GET /api/v1/models** first so the main selector and Dashboard (Model A / B / C) dropdowns show **every downloaded model**, not only the one that’s loaded. Fallback to GET /v1/models keeps older LM Studio versions working.

---

## 0.4.0 (Jan 28, 2026)

### Major features

- **llmster** – Headless daemon (no GUI). Run on servers/cloud; use `lms` CLI or APIs. Install: Windows `irm https://lmstudio.ai/install.ps1 | iex`; Linux/Mac `curl -fsSL https://lmstudio.ai/install.sh | bash`.
- **Parallel inference** – Multiple requests processed in parallel (continuous batching via llama.cpp 2.0.0). When loading a model, set **n_parallel** (default 4) for concurrent predictions. No extra memory with unified KV cache.
- **Stateful REST API** – New `POST /v1/chat` (LM Studio native) with local MCP server support. Our app uses OpenAI-compat `POST /v1/chat/completions`; both work.
- **Native v1 REST API** at `/api/v1/*`: model **download**, **load**, **unload**; MCP via API; authentication with API tokens.
- **Breaking:** In `POST /api/v1/models/load` response, `model_instance_id` was renamed to **`instance_id`**. Our code does not depend on this field.

### UI / CLI

- Revamped UI: split view (two chats side by side), developer mode, new model search (Cmd/Ctrl+Shift+M), chat export (PDF/markdown/text).
- **Split view** – Drag chat tabs to split the window; close with the pane’s “x”.
- **Developer Mode** – Replaces Developer/Power User/User 3; enable in Settings → Developer.
- New **model load** options: max concurrent predictions (n_parallel), unified KV cache.
- CLI: `lms load`, `lms chat` (slash commands: /model, /download, /system-prompt, /help, /exit), `lms runtime survey` for GPU info.
- **New endpoint:** `POST /api/v1/models/unload` to unload models.

### Implications for our UI

- We use **native** `GET /api/v1/models` to list all downloaded LLMs (so multi-model dropdowns work); fallback to **OpenAI-compat** `GET /v1/models` if native is unavailable.
- We use **OpenAI-compat** `POST /v1/chat/completions` for chat.
- We use **REST** `POST /api/v1/models/load` for “Apply” in Settings → we don’t use the response’s instance id; we’re compatible.
- **Parallel requests** are server-side; our app benefits when multiple tabs or the Dashboard send requests (LM Studio can batch them).
- Optional later: use **stateful** `POST /v1/chat` or **Anthropic** `POST /v1/messages` for specific flows.

---

## 0.4.1 (Jan 30, 2026)

### API / backend

- **Anthropic-compatible endpoint:** `POST /v1/messages` – use Claude Code–style clients with LM Studio.
- **`--parallel <N>`** on `lms load` – set max parallel predictions when loading headless.
- **Fixes:** `input_tokens` and `cached_tokens` in `/v1/responses` reported correctly; Codex/unsupported tools no longer error when tools are passed; token reporting in streaming/API improved.

### Other

- “Deep Dark” theme; Mac kernel fix on model load; non-ASCII in `lms chat` fixed; UI/API stability fixes.

### Implications for our UI

- We use **chat/completions** (not `/v1/responses`) for chat; usage from stream is still used where provided. If we ever switch to **OpenAI Responses** (`POST /v1/responses`) for usage/caching stats, 0.4.1’s fixes matter.
- **Tool calls:** 0.4.1 improves behavior when unsupported tools are sent – our UI doesn’t send tools today but is ready if we add them.
- **Headless:** If users run `lms server start` and `lms load --parallel N`, our UI works unchanged; parallel slots are used when we send concurrent requests.

---

## 0.4.2 (Feb 6, 2026)

### Features

- **Parallel requests with MLX** – Continuous batching in mlx-engine 1.0.0; **text-only** for now (VLM support planned).
- UI: scroll/layout fixes (plugin list, chat input), message file attachment styling, Qwen3-Coder-Next template fix, conversation-delete with attachments fix, visionAdapter null fix, `lms chat` paste newlines fix.

### Implications for our UI

- No API contract changes for our current endpoints. MLX parallel = better throughput when multiple requests hit an MLX model; we get that for free.
- If we add **vision** later, the visionAdapter fix reduces risk of null errors.

---

## Summary: What we use vs 0.4.x (as of 2026-02-08)

| Our usage              | LM Studio 0.4.x |
|------------------------|------------------|
| **List models**        | **`GET /api/v1/models`** first (all downloaded LLMs); fallback `GET /v1/models` (loaded only). Required so Dashboard and main selector show all models. |
| `POST /v1/chat/completions` (stream) | Unchanged; parallel requests improve throughput when we send multiple. |
| `POST /api/v1/models/load`           | Response uses `instance_id` (was `model_instance_id`); we don’t rely on it. |
| Load config (context_length, gpu, etc.) | Supported; n_parallel is set in LM Studio when loading (user sets in app or CLI). |

**Recommendation:** Use **LM Studio 0.4.x** (0.4.1+ preferred): parallel inference, correct model listing via `/api/v1/models`, better token reporting. Optional future: support **n_parallel** in our load request if exposed, or **POST /v1/responses** for richer usage/cache stats.
