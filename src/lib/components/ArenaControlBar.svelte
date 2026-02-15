<script>
  import { get } from "svelte/store";
  import { playClick } from "$lib/audio.js";
  import {
    arenaWebSearchMode,
    webSearchForNextMessage,
    webSearchConnected,
    isStreaming,
    arenaSlotAIsJudge,
    settings,
  } from "$lib/stores.js";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  // Props
  export let currentQuestionNum = 0;
  export let currentQuestionTotal = 0;
  export let parsedQuestions = [];
  export let runAllActive = false;
  export let runAllProgress = { current: 0, total: 0 };
  export let arenaWebWarmingUp = false;
  export let arenaWebWarmUpAttempted = false;
  export let arenaSlotAIsJudge = false;
  export let canRunJudgment = false;

  // Event dispatchers for the parent to handle
  export let prevQuestion = () => {};
  export let jumpToQuestion = (num) => {};
  export let advanceQuestionIndex = () => {};
  export let askCurrentQuestion = () => {};
  export let askNextQuestion = () => {};
  export let runAllQuestions = () => {};
  export let stopRunAll = () => {};
  export let runArenaWarmUp = () => {};
  export let runJudgment = () => {};
  export let startOver = () => {};
</script>

<!-- === Arena control bar: Question | Run | Web | Judge | Tools === -->
<div
  class="arena-question-bar shrink-0 flex items-center gap-0 px-4 py-2.5 border-b"
  style="background-color: var(--ui-bg-sidebar); border-color: var(--ui-border);"
>
  <!-- 1. Question: nav only -->
  <div
    class="arena-bar-section flex items-center gap-1"
    aria-label="Question"
  >
    <div
      class="flex items-center h-8 rounded-md overflow-hidden border"
      style="border-color: var(--ui-border); background: var(--ui-input-bg);"
    >
      <button
        type="button"
        class="h-full px-2.5 text-xs font-medium disabled:opacity-40 transition-opacity"
        style="color: var(--ui-text-secondary);"
        disabled={currentQuestionTotal === 0 || currentQuestionNum <= 1}
        on:click={prevQuestion}
        aria-label="Previous question"
      >
        ←
      </button>
      {#if currentQuestionTotal > 0}
        <select
          class="h-full min-w-[4.5rem] max-w-[14rem] pl-2 pr-7 text-xs font-semibold tabular-nums border-l border-r bg-transparent cursor-pointer"
          style="border-color: var(--ui-border); color: var(--ui-text-primary);"
          aria-label="Current question"
          value={currentQuestionNum}
          on:change={(e) => jumpToQuestion(e.currentTarget.value)}
        >
          {#each Array(currentQuestionTotal) as _, i}
            {@const qPreview = parsedQuestions[i]
              ? parsedQuestions[i].slice(0, 50) +
                (parsedQuestions[i].length > 50 ? "…" : "")
              : ""}
            <option value={i + 1}>
              Q{i + 1}{qPreview ? ": " + qPreview : ""}
            </option>
          {/each}
        </select>
        <span
          class="h-full flex items-center px-2 text-xs tabular-nums"
          style="color: var(--ui-text-secondary);"
        >
          / {currentQuestionTotal}
        </span>
      {:else}
        <span class="px-2 text-xs" style="color: var(--ui-text-secondary);">
          —
        </span>
      {/if}
      <button
        type="button"
        class="h-full px-2.5 text-xs font-medium disabled:opacity-40 transition-opacity"
        style="color: var(--ui-text-secondary);"
        disabled={currentQuestionTotal === 0 ||
          currentQuestionNum >= currentQuestionTotal}
        on:click={advanceQuestionIndex}
        aria-label="Next question"
      >
        →
      </button>
    </div>
  </div>
  <div class="arena-bar-divider" aria-hidden="true"></div>
  <!-- 2. Run: Ask + Next -->
  <div class="arena-bar-section flex items-center gap-2" aria-label="Run">
    <button
      type="button"
      class="h-8 px-4 rounded-md text-xs font-semibold shrink-0 disabled:opacity-50 transition-opacity"
      style="background-color: var(--ui-accent); color: var(--ui-bg-main);"
      disabled={$isStreaming || currentQuestionTotal === 0}
      on:click={askCurrentQuestion}
      aria-label="Ask this question"
      title="Send the currently selected question to the models"
    >
      Ask
    </button>
    <button
      type="button"
      class="h-8 px-3 rounded-md text-xs font-semibold shrink-0 disabled:opacity-50 transition-opacity border"
      style="border-color: var(--ui-accent); color: var(--ui-accent); background: transparent;"
      disabled={$isStreaming ||
        currentQuestionTotal === 0 ||
        currentQuestionNum >= currentQuestionTotal}
      on:click={askNextQuestion}
      aria-label="Next question and ask"
      title="Advance to next question and send it"
    >
      Next
    </button>
    {#if runAllActive}
      <button
        type="button"
        class="h-8 px-3 rounded-md text-xs font-semibold shrink-0 transition-opacity"
        style="background: var(--ui-accent-hot, #dc2626); color: white;"
        on:click={stopRunAll}
        title="Stop Run All"
      >
        Stop ({runAllProgress.current}/{runAllProgress.total})
      </button>
    {:else}
      <button
        type="button"
        class="h-8 px-3 rounded-md text-xs font-medium shrink-0 disabled:opacity-50 transition-opacity border"
        style="border-color: var(--ui-border); color: var(--ui-text-secondary); background: var(--ui-input-bg);"
        disabled={$isStreaming || currentQuestionTotal < 2}
        on:click={runAllQuestions}
        aria-label="Run all questions"
        title="Run all questions sequentially{arenaSlotAIsJudge
          ? ' with judgment'
          : ''}"
      >
        Run All
      </button>
    {/if}
  </div>
  <div class="arena-bar-divider" aria-hidden="true"></div>
  <!-- 3. Web: globe + who gets it -->
  <div class="arena-bar-section flex items-center gap-2" aria-label="Web">
    <button
      type="button"
      class="arena-globe-btn relative flex items-center justify-center shrink-0 w-8 h-8 rounded-md border transition-colors"
      class:arena-globe-active={$webSearchForNextMessage}
      style="border-color: {$webSearchForNextMessage
        ? 'var(--ui-accent)'
        : 'var(--ui-border)'}; background: {$webSearchForNextMessage
        ? 'color-mix(in srgb, var(--ui-accent) 14%, transparent)'
        : 'var(--ui-input-bg)'};"
      disabled={$isStreaming}
      title={arenaWebWarmingUp
        ? "Connecting…"
        : $webSearchForNextMessage
          ? $webSearchConnected
            ? "Connected – click to disconnect"
            : "Not connected – click to retry"
          : "Connect to internet"}
      on:click={() => {
        const on = $webSearchForNextMessage;
        const connected = $webSearchConnected;
        if (on && !connected && !arenaWebWarmingUp) {
          arenaWebWarmUpAttempted = false;
          runArenaWarmUp();
          return;
        }
        if (on) {
          webSearchForNextMessage.set(false);
          webSearchConnected.set(false);
          return;
        }
        webSearchForNextMessage.set(true);
        runArenaWarmUp();
      }}
      aria-label={arenaWebWarmingUp
        ? "Connecting"
        : $webSearchForNextMessage
          ? "Web connected"
          : "Connect to web"}
      aria-pressed={$webSearchForNextMessage}
    >
      <span
        class="text-base leading-none"
        class:arena-globe-spin={arenaWebWarmingUp}
        aria-hidden="true"
      >
        🌐
      </span>
      {#if $webSearchForNextMessage}
        {#if $webSearchConnected}
          <span
            class="arena-globe-dot arena-globe-dot-green"
            aria-hidden="true"
          ></span>
        {:else}
          <span
            class="arena-globe-dot arena-globe-dot-red"
            class:arena-globe-dot-pulse={arenaWebWarmingUp}
            aria-hidden="true"
          ></span>
        {/if}
      {/if}
    </button>
    <div
      class="flex h-8 rounded-md border overflow-hidden"
      style="border-color: var(--ui-border); background: var(--ui-input-bg); opacity: {$webSearchForNextMessage &&
      $webSearchConnected
        ? '1'
        : '0.5'};"
    >
      <button
        type="button"
        class="arena-web-tab h-full px-2.5 text-[11px] font-medium"
        class:active={$arenaWebSearchMode === "none"}
        on:click={() => {
          arenaWebSearchMode.set("none");
          if ($settings.audio_enabled && $settings.audio_clicks)
            playClick($settings.audio_volume);
        }}
        title="No web"
      >
        None
      </button>
      <button
        type="button"
        class="arena-web-tab h-full px-2.5 text-[11px] font-medium border-l"
        class:active={$arenaWebSearchMode === "all"}
        style="border-color: var(--ui-border);"
        on:click={() => {
          arenaWebSearchMode.set("all");
          if ($settings.audio_enabled && $settings.audio_clicks)
            playClick($settings.audio_volume);
        }}
        title="All models"
      >
        All
      </button>
      <button
        type="button"
        class="arena-web-tab h-full px-2.5 text-[11px] font-medium border-l"
        class:active={$arenaWebSearchMode === "judge"}
        style="border-color: var(--ui-border);"
        on:click={() => {
          arenaWebSearchMode.set("judge");
          if ($settings.audio_enabled && $settings.audio_clicks)
            playClick($settings.audio_volume);
        }}
        title="Judge only"
      >
        Judge only
      </button>
    </div>
  </div>
  <div class="arena-bar-divider" aria-hidden="true"></div>
  <!-- 4. Judge: score B/C/D -->
  {#if arenaSlotAIsJudge}
    <div class="arena-bar-section flex items-center" aria-label="Judge">
      <button
        type="button"
        class="h-8 px-4 rounded-md text-xs font-semibold shrink-0 disabled:opacity-50 transition-opacity"
        style="background-color: var(--ui-accent); color: var(--ui-bg-main);"
        disabled={!canRunJudgment}
        on:click={() => {
          if (canRunJudgment) runJudgment();
          if ($settings.audio_enabled && $settings.audio_clicks)
            playClick($settings.audio_volume);
        }}
        title="Score B/C/D using slot A"
      >
        Judgment
      </button>
    </div>
    <div class="arena-bar-divider" aria-hidden="true"></div>
  {/if}
  <!-- Spacer: push tools right -->
  <div class="flex-1 min-w-4" aria-hidden="true"></div>
  <!-- 5. Tools: Reset + Settings -->
  <div class="arena-bar-section flex items-center gap-2" aria-label="Tools">
    <button
      type="button"
      class="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium shrink-0 transition-opacity hover:opacity-90"
      style="border-color: var(--ui-accent-hot, #dc2626); color: var(--ui-accent-hot, #dc2626); background: transparent;"
      on:click={startOver}
      aria-label="Start over"
      title="Clear all responses, reset scores, go back to Q1"
    >
      <span aria-hidden="true">⟲</span>
      <span>Start Over</span>
    </button>
    <button
      type="button"
      class="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium shrink-0 transition-opacity hover:opacity-90"
      style="border-color: var(--ui-border); background: var(--ui-input-bg); color: var(--ui-text-secondary);"
      on:click={() => {
        // Dispatch an event for the parent to handle opening settings
        dispatch("openSettings");
      }}
      aria-label="Arena settings"
      title="Questions, answer key, rules"
    >
      <span aria-hidden="true">⚙</span>
      <span>Settings</span>
    </button>
  </div>
</div>
