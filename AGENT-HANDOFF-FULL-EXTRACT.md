# ATOM UI — FULL AGENT HANDOFF
## For context-limited continuation sessions

**Created:** $(date)
**Last Commit:** 6fc3d79 (Add durable git workflow scripts and guide)
**Project:** lm-studio-ui (Local LLM chat UI for LM Studio API)

---

## 1. PROJECT OVERVIEW

### Core Architecture
- **Framework:** Svelte 5 (using runes: `$state`, `$derived`, `$effect`)
- **Build:** Vite + Tailwind CSS
- **Backend:** LM Studio's OpenAI-compatible API (localhost:1234)
- **State Management:** Svelte stores + localStorage persistence

### Two Main Layouts
1. **COCKPIT:** Single-model chat with attachments, voice, web search
2. **ARENA:** Multi-model competition (2-4 models) with optional judge scoring

---

## 2. RECENT CHANGES & CURRENT STATUS

### Recent Commits (Last 5):
1. **6fc3d79** - Add durable git workflow scripts and guide
2. **52585f5** - Add Copy/Pin buttons to user messages
3. **9957845** - Fix UI issues: parser, judge formatting, icons, rule hallucinations
4. **7ba6e5b** - Part 2: Replace inline panels with ArenaPanel loop
5. **2647f19** - Part 3: Remove verified dead code from DashboardArena

### Current Diff Highlights:
1. **src/lib/api.js** - Added retry logic with exponential backoff:
   - `RETRY_CONFIG` with Windows-compatible delays
   - `ApiError` class for better error handling
   - `withRetry()` wrapper with 2 retries, 1s/2s backoff
   - Don't retry 4xx errors or AbortError

2. **src/lib/components/DashboardArena.svelte** - Refactoring header extraction:
   - Extracted header section into new `ArenaHeader.svelte` component
   - Removed 91 lines of inline header markup
   - Passing props: `arenaPanelCount`, `running`, `arenaScores`, `windowWidth`

---

## 3. CURRENT FOCUS AREAS

### Active Refactoring (In Progress):
1. **Component Extraction from DashboardArena.svelte** (~1900 lines → smaller components)
   - ✅ ArenaHeader extracted
   - ⏳ ArenaPanel extraction in progress (mentioned in commit "Part 2")
   - ⏳ More components to extract for better maintainability

2. **API Reliability Improvements:**
   - ✅ Added retry logic with exponential backoff
   - ✅ Better error classification (ApiError class)
   - ⏳ Testing Windows compatibility (sleep utility, timeouts)

3. **UI/UX Polish:**
   - ✅ Copy/Pin buttons on user messages
   - ✅ Parser fixes and judge formatting improvements
   - ✅ Icon fixes and rule hallucination prevention
   - ⏳ More responsive layout improvements

---

## 4. KEY FILES & THEIR CURRENT STATE

### Core Files:
- **`src/lib/stores.js`** - All global stores intact:
  - `layout`, `dashboardModelA/B/C/D`, `arenaPanelCount`
  - `arenaSlotAIsJudge`, `arenaWebSearchMode`, `arenaSlotOverrides`
  - `webSearchForNextMessage`, `webSearchConnected`, `isStreaming`
  - `chatError`, `settings`, `arenaScores`

- **`src/lib/components/DashboardArena.svelte`** - Undergoing refactoring:
  - Header extracted to ArenaHeader.svelte
  - Still contains: control bar, judgment logic, Q&A parser, draggable panels
  - Still ~1800+ lines after recent extractions

- **`src/lib/components/ArenaHeader.svelte`** - NEW FILE (just created):
  - Contains the grid of model cards A-D with scores
  - Responsive grid based on `windowWidth` and `arenaPanelCount`
  - Slot indicators with running state colors

### API Layer:
- **`src/lib/api.js`** - Enhanced with retry logic:
  - `streamChatCompletion()` now uses `withRetry()` wrapper
  - `getModels()`, `loadModel()`, `unloadModel()` with error handling
  - Windows-compatible `sleep()` utility

### Web Search:
- **`src/lib/duckduckgo.js`** - CORS proxy web search:
  - `warmUpSearchConnection()` for arena/cockpit
  - `searchDuckDuckGo()` with multiple fallback proxies
  - `formatSearchResultForChat()` for LLM context

---

## 5. ARENA SYSTEM - COMPLETE FEATURE SET

### Questions & Answers Management:
- **Single textarea** format: `1. Question\nAnswer: answer text`
- **Parser:** `parseQuestionsAndAnswers()` returns `{questions[], answers[]}`
- **Storage:** `arenaQuestionsAndAnswers` in localStorage
- **Migration:** Old `arenaQuestionsList` + `arenaAnswerKey` auto-migrated

### Control Bar (Left → Right):
1. **Question Navigation:** ← Q n ▼ / total →
2. **Run Controls:** Ask (send current), Next (advance + send)
3. **Web Search:** Globe + None/All/Judge only modes
4. **Judge:** Judgment button (when slot A = judge)
5. **Tools:** Reset, Settings slide-out

### Judgment System:
- **Trigger:** Button when slot A is judge AND B/C/D have responses
- **Flow:** 
  1. Eject all models
  2. Load judge (A)
  3. Build prompt with competing models list + current answer only
  4. Strong "no <think>", "output only score lines" instructions
- **Scoring:** 1-10 with short reason per model

### Draggable/Resizable Panels:
- **Question Panel:** Shows current question text
  - Draggable by header, resizable by edges/corner
  - Position: `arenaQuestionPanelPos`, Size: `arenaQuestionPanelSize`
- **Ask Judge Panel:** User questions to judge
  - Draggable, position: `arenaAskJudgePanelPos`
  - Context includes: current answer, contest rules, responses

### System Prompt Templates (ARENA_SYSTEM_PROMPT_TEMPLATES):
1. **—** (empty)
2. **General** - Default chat assistant
3. **Code** - Programming-focused
4. **Research** - Factual/analytical
5. **Creative** - Storytelling/ideas
6. **Arena contestant** - Competition rules follower
7. **Arena judge** - Scoring judge with strict formatting

---

## 6. TECHNICAL NOTES & GOTCHAS

### Svelte 5 Reactivity:
```javascript
// CORRECT in $effect:
$effect(() => {
  console.log($storeName); // Reactive
});

// WRONG in $effect:
$effect(() => {
  console.log(get(store)); // Not reactive!
});
```

### Error Handling Pattern:
- **ChatInput.handleSubmit()** saves message, clears input, restores on error
- **sendUserMessage()** MUST throw on error for message restoration
- **API errors** now use `ApiError` class with status codes

### Windows Compatibility:
- All timeouts/delays use `setTimeout` (not `setImmediate`)
- File paths use forward slashes or `path.join()`
- Batch scripts in root for development workflows

---

## 7. IMMEDIATE NEXT TASKS (CONTINUE HERE)

### 1. Complete DashboardArena Refactoring:
- Extract remaining inline panels into components
- Create `ArenaControlBar.svelte` for the 5-section bar
- Extract `ArenaQuestionPanel.svelte` with drag/resize logic
- Extract `ArenaAskJudgePanel.svelte`

### 2. API Testing & Error Handling:
- Test retry logic with simulated network failures
- Add timeout handling for `streamChatCompletion()`
- Implement cancelation with AbortController

### 3. UI/UX Improvements:
- Add loading states for model switching
- Improve responsive design for mobile
- Add keyboard shortcuts (Ctrl+Enter to send, etc.)

### 4. Feature Enhancements:
- Export/import arena questions as JSON
- Judge prompt customization UI
- Model performance statistics (avg score, response time)

---

## 8. GIT WORKFLOW & DEVELOPMENT SCRIPTS

### Recent Addition: Durable Git Workflow
- Check `scripts/` directory for new workflow scripts
- Includes rebase strategies, commit organization
- Windows batch files for common operations

### Development Commands:
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview build
npm run test         # Run tests
```

### Windows Development:
- Use `.bat` scripts in root for UI management
- `START-EVERYTHING.bat` launches full stack
- LM Studio API expected at `http://localhost:1234`

---

## 9. TROUBLESHOOTING & COMMON ISSUES

### Web Search Failures:
1. Check CORS proxy availability (`corsproxy.org`, `api.allorigins.win`)
2. Warm-up connection before first use
3. Arena vs Cockpit warm-up separation

### Model Loading Issues:
1. Verify LM Studio API is running (port 1234)
2. Check model paths in LM Studio
3. Use `unloadAllLoadedModels()` for cleanup

### State Persistence Problems:
1. localStorage vs sessionStorage usage
2. JSON parse errors on malformed data
3. Migration from old storage formats

---

## 10. QUICK START FOR NEXT AGENT

1. **Read this file** + existing `HANDOFF.md` + `handoff.json`
2. **Check git status:** `git log --oneline -10`
3. **Review recent diff:** Current extraction of ArenaHeader
4. **Continue with:** Component extraction from DashboardArena
5. **Test:** API retry logic with network simulation

**Remember:** User prefers being challenged - suggest better approaches when appropriate!

---

**END OF HANDOFF** - Next agent should continue from section 7 "Immediate Next Tasks"
</contents>