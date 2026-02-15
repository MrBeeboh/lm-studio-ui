# Image Generation Models & Settings

**Source:** Exact models and settings from Hugging Face & official sources (Grok line-by-line; see verbatim doc). **Do not add, guess, or infer.**

---

## Together AI models in the app (3 only)

| Index | Label | Model ID |
|-------|--------|----------|
| 0 | FLUX.1 Schnell | `black-forest-labs/FLUX.1-schnell` |
| 1 | FLUX.1 Dev | `black-forest-labs/FLUX.1-dev` |
| 2 | FLUX.1 Pro | `black-forest-labs/FLUX.1-pro` |

Steps and resolutions per model from verified config (image-models-and-settings-for-verification.json). The UI uses per-engine step and size dropdowns.

---

## Grok (xAI)

Trigger: Grok chat model + Grok API key. No modal.  
Endpoint: `POST https://api.x.ai/v1/images/generations`  
App sends: model `grok-imagine-image`, n=1, aspect_ratio `1:1`, resolution `1k`.

---

## Together AI (DeepSeek path)

Trigger: DeepSeek chat model + Together API key. Modal: engine, steps, size, n.  
Endpoint: `POST https://api.together.xyz/v1/images/generations`  
Request body: model, prompt, width, height, steps, n, response_format (from selected engine and dropdowns).

---

## Files

| File | Purpose |
|------|--------|
| `docs/image-generation-models-reference-verbatim.md` | Verbatim spec (do not infer). |
| `docs/image-generation-models-and-settings.json` | Exact models and their step/size options. |
| `src/lib/components/ChatView.svelte` | Modal: 4 engines, per-engine steps and sizes. |
| `src/lib/api.js` | `requestTogetherImageGeneration`, `requestGrokImageGeneration`. |
