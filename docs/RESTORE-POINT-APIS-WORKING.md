# Restore Point: Grok + DeepSeek APIs Working (with Internet)

**Date:** February 2026  
**State:** Both cloud APIs (Grok, DeepSeek) working with internet connectivity. Use this as the known-good baseline to return to if future changes break things.

---

## What’s Included in This Restore Point

- **Grok (xAI):** Uses **Responses API** (`POST https://api.x.ai/v1/responses`) with `web_search` and `x_search` tools; server-side real-time search; streaming parsed from `response.output_text.delta` and completion events.
- **DeepSeek:** Uses **chat completions** (`POST https://api.deepseek.com/v1/chat/completions`); OpenAI-compatible streaming; no native web search (user can use app’s globe/DuckDuckGo for injected context).
- **Cloud timeouts:** 120 seconds for all cloud requests.
- **Error handling:** Clear messages for invalid API key, rate limit, model not found, context length exceeded (DeepSeek-style codes).
- **API keys:** Trimmed on load and save (no copy-paste spaces); DeepSeek placeholder notes “paste without extra spaces.”

---

## Key Files (Don’t Revert Lightly)

| Area | Files |
|------|--------|
| API & cloud | `src/lib/api.js` (Grok Responses path, DeepSeek chat, timeout, parseChatApiError) |
| Keys | `src/lib/stores.js` (trim on load/save for DeepSeek & Grok keys) |
| Settings | `src/lib/components/SettingsPanel.svelte` (placeholders) |
| Docs | `docs/GROK-API-REALTIME-ACCESS.md`, `docs/deepseek-answers-from-support.json`, `docs/deepseek-questions-for-support.json` |

---

## How to Restore to This Point

1. **Git (recommended)**  
   A tag **`restore-apis-working-feb2026`** has been created. If you have uncommitted changes (API fixes, this doc), commit them first so the tag includes everything, then move the tag to the new commit:
   ```bash
   git add -A
   git commit -m "Grok + DeepSeek APIs working with internet"
   git tag -d restore-apis-working-feb2026
   git tag -a restore-apis-working-feb2026 -m "Restore point: Grok + DeepSeek APIs working with internet"
   ```
   Optional, if you use a remote: `git push origin restore-apis-working-feb2026`  
   To come back later:
   ```bash
   git checkout restore-apis-working-feb2026
   # or create a branch from it:
   git checkout -b fix-from-restore restore-apis-working-feb2026
   ```

2. **Without git**  
   Keep a copy of the repo (or at least `src/lib/api.js`, `src/lib/stores.js`, `src/lib/components/SettingsPanel.svelte`) dated when both APIs were working.

---

## Quick Sanity Check

- Select **Grok 4** → ask “What’s the latest news today?” → should get a real-time style answer (no endless spin).
- Select **DeepSeek** → send any message → should stream a reply (no timeout or invalid-key error if the key is set and trimmed).
- Settings → Cloud APIs: paste a key with spaces → save → reload; key should be stored trimmed.

You can come back to this restore point anytime things drift from this behavior.
