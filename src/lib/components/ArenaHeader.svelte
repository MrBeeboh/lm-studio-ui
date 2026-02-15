<script>
  import ModelSelectorSlot from "$lib/components/ModelSelectorSlot.svelte";

  export let arenaPanelCount;
  export let running; // { A: boolean, B: boolean, C: boolean, D: boolean }
  export let arenaScores; // { B: number, C: number, D: number }
  export let windowWidth;

  const SLOT_COLORS = {
    A: "#3b82f6",
    B: "#10b981",
    C: "#f59e0b",
    D: "#8b5cf6",
  };
</script>

<header
  class="shrink-0 grid gap-2 px-3 py-1.5 border-b items-stretch"
  style="background-color: var(--ui-bg-sidebar); border-color: var(--ui-border); z-index: 100; grid-template-columns: {windowWidth <
  1200
    ? 'repeat(2, minmax(0, 1fr))'
    : 'repeat(' + arenaPanelCount + ', minmax(0, 1fr))'};"
>
  {#if arenaPanelCount >= 1}
    <div
      class="flex items-center gap-2 rounded border px-2 py-1 min-h-0 transition-all"
      class:model-card-active={running.A}
      style="background-color: var(--ui-bg-main); border-color: {running.A
        ? '#3b82f6'
        : 'var(--ui-border)'};"
    >
      <span
        class="text-[10px] font-bold w-4 shrink-0"
        style="color: var(--ui-text-secondary);">A</span
      >
      <div class="flex-1 min-w-0"><ModelSelectorSlot slot="A" /></div>
      <span
        class="text-[11px] font-bold shrink-0 w-6 text-right"
        style="color: #3b82f6;">—</span
      >
    </div>
  {/if}
  {#if arenaPanelCount >= 2}
    <div
      class="flex items-center gap-2 rounded border px-2 py-1 min-h-0 transition-all"
      class:model-card-active={running.B}
      style="background-color: var(--ui-bg-main); border-color: {running.B
        ? '#10b981'
        : 'var(--ui-border)'};"
    >
      <span
        class="text-[10px] font-bold w-4 shrink-0"
        style="color: var(--ui-text-secondary);">B</span
      >
      <div class="flex-1 min-w-0"><ModelSelectorSlot slot="B" /></div>
      <span
        class="text-[11px] font-bold shrink-0 tabular-nums"
        style="color: #10b981;">{arenaScores.B}</span
      >
    </div>
  {/if}
  {#if arenaPanelCount >= 3}
    <div
      class="flex items-center gap-2 rounded border px-2 py-1 min-h-0 transition-all"
      class:model-card-active={running.C}
      style="background-color: var(--ui-bg-main); border-color: {running.C
        ? '#f59e0b'
        : 'var(--ui-border)'};"
    >
      <span
        class="text-[10px] font-bold w-4 shrink-0"
        style="color: var(--ui-text-secondary);">C</span
      >
      <div class="flex-1 min-w-0"><ModelSelectorSlot slot="C" /></div>
      <span
        class="text-[11px] font-bold shrink-0 tabular-nums"
        style="color: #f59e0b;">{arenaScores.C}</span
      >
    </div>
  {/if}
  {#if arenaPanelCount >= 4}
    <div
      class="flex items-center gap-2 rounded border px-2 py-1 min-h-0 transition-all"
      class:model-card-active={running.D}
      style="background-color: var(--ui-bg-main); border-color: {running.D
        ? '#8b5cf6'
        : 'var(--ui-border)'};"
    >
      <span
        class="text-[10px] font-bold w-4 shrink-0"
        style="color: var(--ui-text-secondary);">D</span
      >
      <div class="flex-1 min-w-0"><ModelSelectorSlot slot="D" /></div>
      <span
        class="text-[11px] font-bold shrink-0 tabular-nums"
        style="color: #8b5cf6;">{arenaScores.D}</span
      >
    </div>
  {/if}
</header>