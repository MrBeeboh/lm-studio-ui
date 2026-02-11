# LM Studio 0.4.x Release Notes – Impact on ATOM (lm-studio-ui)

This doc summarizes LM Studio 0.4.x changelog and API updates so the UI stays aligned with LM Studio’s features and behavior.

**Last updated:** 2026-02-10.  
**Sources:** [LM Studio Changelog](https://lmstudio.ai/changelog), [API Changelog](https://lmstudio.ai/docs/developer/api-changelog), [REST API](https://lmstudio.ai/docs/developer/rest), [TTL & Auto-Evict](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

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

---

## Deep dive: API landscape (as of 2026-02-10)

### Inference endpoints comparison

| Feature | `/api/v1/chat` (native) | `/v1/responses` | `/v1/chat/completions` (what we use) | `/v1/messages` (Anthropic) |
|---------|-------------------------|-----------------|--------------------------------------|----------------------------|
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Stateful chat | ✅ | ✅ | ❌ | ❌ |
| Remote MCPs | ✅ | ✅ | ❌ | ❌ |
| Custom tools | ❌ | ✅ | ✅ | ✅ |
| Include assistant msgs | ❌ | ✅ | ✅ | ✅ |
| Model load streaming events | ✅ | ❌ | ❌ | ❌ |
| Specify context length in request | ✅ | ❌ | ❌ | ❌ |

### Load API (`POST /api/v1/models/load`)

**Documented params:** `model`, `context_length`, `eval_batch_size`, `flash_attention`, `num_experts`, `offload_kv_cache_to_gpu`, `echo_load_config`.  
**We also send:** `gpu` (max/off/0–1), `n_threads` (CPU threads). These work; REST API may accept more than the minimal docs list.

**n_parallel:** Set in LM Studio UI when loading, or via `lms load --parallel N`. Not clearly documented for REST load; may be app/CLI-only for now.

### Idle TTL & Auto-Evict (VRAM efficiency)

- **TTL**: Per-request `ttl` (seconds) auto-unloads model after idle. Default 60 min for JIT-loaded models. We pass `model_ttl_seconds` from settings into chat requests.
- **Auto-Evict**: When ON (default), JIT keeps at most 1 model loaded; switching models unloads the previous. Frees VRAM when switching.
- **Per-request TTL:** Works with both OpenAI-compat and REST. Example: `"ttl": 300` = 5 min idle before unload.

### Stateful chats (`POST /api/v1/chat`)

- Server stores conversation; returns `response_id`. Next request uses `previous_response_id` to continue.
- **Benefit:** No need to resend full history; lower bandwidth and latency for long threads.
- **Trade-off:** Our UI manages history in IndexedDB; stateful API would require a different flow. Good future option for long-running sessions.

### What we already use well

- `GET /api/v1/models` → all downloaded models in dropdowns ✅  
- `POST /v1/chat/completions` (stream) → parallel inference when Arena sends multiple requests ✅  
- `POST /api/v1/models/load` with context_length, eval_batch_size, flash_attention, gpu, offload_kv_cache_to_gpu ✅  
- `ttl` in chat options → Idle TTL for VRAM ✅  

### Optional future improvements

1. **`POST /api/v1/models/unload`** – Unload model when user switches away; faster switching and lower VRAM.
2. **`stream_options.include_usage`** (0.3.18+) – Get prompt/completion token counts during streaming.
3. **`POST /v1/responses`** – Stateful + `input_tokens`/`cached_tokens`; better cache stats when available.
4. **n_parallel in load** – If REST API supports it, set parallel slots when loading (e.g. 4 for Arena).
5. **Stateful `/api/v1/chat`** – For very long conversations to avoid resending full history.
