# ATOM UI — Agent handoff document

Use this when starting a **new chat/session** so the next agent can work without full prior context. Start a new Cursor chat and attach or paste this file (and optionally `handoff.json`).

---

## 1. Project summary

**lm-studio-ui** is a local LLM chat UI that talks to LM Studio’s OpenAI-compatible API. It has two main layouts:

- **Cockpit** — Single-model chat (conversation, attachments, voice, web search).
- **Arena** — Multi-model competition: 2–4 models (B/C/D) answer the same questions; slot A can act as a **judge** that scores responses 1–10. Questions and optional answers live in one combined “Questions & answers” block in Arena settings.

The app is Svelte 5 + Vite; state uses Svelte stores and runes (`$state`, `$derived`, `$effect`). No backend beyond LM Studio.

---

## 2. Key files (where to look)

| File | Purpose |
|------|--------|
| `src/App.svelte` | Root; switches between Cockpit and Arena by `layout` store. |
| `src/lib/stores.js` | Global state: `layout`, `dashboardModelA/B/C/D`, `arenaPanelCount`, `arenaSlotAIsJudge`, `arenaWebSearchMode`, `arenaSlotOverrides`, `webSearchForNextMessage`, `webSearchConnected`, `isStreaming`, `chatError`, `settings`, etc. |
| `src/lib/components/DashboardArena.svelte` | **Arena UI**: model cards, control bar, response panels, Judgment flow, Ask the Judge, draggable/resizable question panel, settings slide-out. Large file (~1900+ lines). |
| `src/lib/components/ChatView.svelte` | Cockpit chat: messages, send, web search integration. |
| `src/lib/components/ChatInput.svelte` | Shared input: text, attachments, voice, web globe (connect/disconnect). |
| `src/lib/api.js` | LM Studio API: `streamChatCompletion`, `getModels`, `loadModel`, `unloadModel`, `waitUntilUnloaded`, `unloadAllLoadedModels`. |
| `src/lib/duckduckgo.js` | Web search: `warmUpSearchConnection`, `searchDuckDuckGo`, `formatSearchResultForChat`. Uses CORS proxies (`corsproxy.org`, `api.allorigins.win/get`). |
| `src/app.css` | Global styles; Arena bar dividers, globe, resize handles. |

---

## 3. Arena — implemented behavior

### 3.1 Questions & answers (single block)

- **One text area** in Arena settings: “Questions & answers”. Format:
  - Numbered questions: `1. Question text`
  - Optional answer per question: `Answer: answer text` (on its own line under the question).
- **Parser:** `parseQuestionsAndAnswers(questionsAndAnswers)` in `DashboardArena.svelte` returns `{ questions: string[], answers: string[] }`. Questions drive the Q selector and Ask/Next; `answers[i]` is used only when judging question `i`.
- **If no answer for a question:** Judge is told to use web (if enabled) or its own knowledge. Stored in `arenaQuestionsAndAnswers` (localStorage). Migration from old `arenaQuestionsList` + `arenaAnswerKey` runs once on load.

### 3.2 Control bar (Arena)

- **Sections (left to right):** Question nav (← Q n ▼ / total →) | Run (Ask, Next) | Web (globe + None/All/Judge only) | Judge (Judgment button when slot A is judge) | Tools (Reset, Settings).
- **Dividers:** `arena-bar-divider` in CSS; sections are `arena-bar-section`.
- Ask = send current question to B/C/D. Next = advance to next question and send it.

### 3.3 Judgment (scoring)

- **Trigger:** “Judgment” button when slot A is “Use as judge” and B/C/D have responses.
- **Flow:** Eject all models → load judge (A) → build prompt with: competing models list (exact B/C/D from `slotsWithResponses`), answer key for **current question only** (`currentQuestionAnswer`), optional web search context, then ORIGINAL PROMPT and MODEL B/C/D sections.
- **Judge instructions:** Strong “no <think>”, “output only score lines”, “start with Model B:” (or first model). Answer key only included when `currentQuestionAnswer` is non-empty; otherwise judge uses web or own knowledge.
- **Stores:** No separate “answer key” store; answer per question comes from `parsedAnswers[currentIndex]`.

### 3.4 Ask the Judge

- **Floating panel** (draggable): user types a question to the judge (e.g. “Why did you give B a 6?”). Sent to judge model with context: current question’s answer (if any), contest rules, model responses, judge’s last scoring. Reply shown in-panel; does not change scores.

### 3.5 Draggable / resizable question panel

- **Question panel:** Shows full current question text. Draggable by header; resizable by right edge, bottom edge, bottom-right corner. Position in `arenaQuestionPanelPos`, size in `arenaQuestionPanelSize` (localStorage).
- **Ask the Judge panel:** Draggable; position in `arenaAskJudgePanelPos`.
- **Actions:** `makeDraggable`, `makeResizable` in `DashboardArena.svelte`; resize persists on pointerup.

### 3.6 Web search (Arena)

- **Globe** in bar: same behavior as Cockpit (connect/disconnect, red/green dot). Warm-up in Arena uses `runArenaWarmUp`; when layout is Arena, Cockpit’s warm-up effect is skipped.
- **None | All | Judge only:** Who gets web context when sending (None, all competitors, or judge only for fact-check when scoring).

### 3.7 System prompt templates (Arena per-slot options)

- **ARENA_SYSTEM_PROMPT_TEMPLATES** in `DashboardArena.svelte`: —, General, Code, Research, Creative, **Arena contestant**, **Arena judge**.
- **Arena contestant:** You are a contestant; follow rules strictly; rule breaks can mean zero; answer concisely within constraints.
- **Arena judge:** You are the judge; score 1–10 with one short reason; output only score lines; no <think>.

---

## 4. Technical notes

- **Svelte 5:** Use `$state`, `$derived`, `$effect`. Inside `$effect`, use `$storeName` (reactive), not `get(store)` for reactivity.
- **Stores:** `get(store)` for one-off read; `$store` in template or in `$effect` for reactive updates.
- **Message preservation:** If send fails (e.g. web fetch), `ChatInput.handleSubmit` restores the user’s message; `ChatView` / `DashboardArena` `sendUserMessage` should `throw` on error so the promise rejects.
- **Judge prompt** is built in `runJudgment()` in `DashboardArena.svelte` (no UI to edit it; could add optional “Judge instructions” field later).

---

## 5. What you need to do to hand off

1. **Start a new Cursor chat** (new conversation = fresh context).
2. **Attach this file:** `HANDOFF.md` (and optionally `handoff.json`).
3. **Say something like:** “I’m continuing work on the ATOM UI (lm-studio-ui). Use HANDOFF.md and handoff.json to get up to speed. [Then state your next task.]”

You do **not** need to paste the whole prior conversation. The new agent can rely on this document and the codebase.

---

## 6. Quick reference — where is X?

- **Judge prompt text** → `DashboardArena.svelte`, search for `COMPETING MODELS`, `BASIS FOR SCORING`, `ANSWER KEY`, `systemWithAnswerKey`.
- **Q&A parser** → `parseQuestionsAndAnswers`, `loadQuestionsAndAnswers`, `currentQuestionAnswer`, `parsedQuestions`, `parsedAnswers`.
- **Arena bar markup** → “Arena control bar” / `arena-question-bar`, sections 1–5 (Question, Run, Web, Judge, Tools).
- **Draggable/resizable logic** → `makeDraggable`, `makeResizable`, `questionPanelPos`, `questionPanelSize`, `askJudgePanelPos`.
- **Web search warm-up** → `runArenaWarmUp`, `arenaWebWarmingUp`, `warmUpSearchConnection` in `duckduckgo.js`.
