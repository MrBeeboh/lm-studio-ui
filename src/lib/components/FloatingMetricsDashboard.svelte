<script>
  import {
    floatingMetricsOpen,
    floatingMetricsMinimized,
    floatingMetricsPosition,
    tokSeries,
    liveTokPerSec,
    lastResponseTokPerSec,
  } from '$lib/stores.js';

  let pos = $state({ x: 24, y: 24 });
  let dragStart = $state(null);

  $effect(() => {
    const unsub = floatingMetricsPosition.subscribe((p) => {
      pos = p ? { x: p.x, y: p.y } : { x: 24, y: 24 };
    });
    return () => unsub();
  });

  function startDrag(e) {
    if (e.button !== 0) return;
    dragStart = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }
  function onMove(e) {
    if (!dragStart) return;
    const x = Math.max(0, e.clientX - dragStart.x);
    const y = Math.max(0, e.clientY - dragStart.y);
    floatingMetricsPosition.set({ x, y });
  }
  function endDrag() {
    dragStart = null;
  }

  $effect(() => {
    if (typeof document === 'undefined') return;
    if (!dragStart) return;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
    };
  });

  let seriesArr = $state([]);
  $effect(() => {
    const unsub = tokSeries.subscribe((v) => (seriesArr = Array.isArray(v) ? v : []));
    return () => unsub();
  });
  const maxVal = $derived(Math.max(1, ...seriesArr));
  const w = 180;
  const h = 56;
  const pathPoints = $derived.by(() => {
    if (!seriesArr.length) return '';
    return seriesArr
      .map((v, i) => {
        const x = (i / Math.max(1, seriesArr.length - 1)) * w;
        const y = h - (Number(v) / maxVal) * h;
        return `${x},${y}`;
      })
      .join(' ');
  });

  function toggleMinimize() {
    floatingMetricsMinimized.update((v) => !v);
  }
  function closePanel() {
    floatingMetricsOpen.set(false);
  }
</script>

{#if $floatingMetricsOpen}
  <div
    class="fixed z-40 rounded-xl border shadow-lg flex flex-col overflow-hidden atom-layout-transition select-none"
    class:atom-streaming-glow={$liveTokPerSec != null}
    style="
      left: {pos.x}px;
      top: {pos.y}px;
      width: {$floatingMetricsMinimized ? '200px' : '220px'};
      height: {$floatingMetricsMinimized ? '36px' : 'auto'};
      background-color: var(--ui-bg-sidebar);
      border-color: var(--ui-border);
    "
    role="region"
    aria-label="Metrics dashboard"
  >
    <div
      class="flex items-center justify-between gap-2 px-2 py-1.5 cursor-grab active:cursor-grabbing border-b shrink-0"
      style="border-color: var(--ui-border); color: var(--ui-text-secondary);"
      onmousedown={startDrag}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && startDrag({ button: 0, clientX: pos.x, clientY: pos.y })}
    >
      <span class="text-xs font-medium uppercase tracking-wide">Metrics</span>
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          onclick={(e) => { e.stopPropagation(); toggleMinimize(); }}
          aria-label="{$floatingMetricsMinimized ? 'Expand' : 'Minimize'}"
        >
          {$floatingMetricsMinimized ? '⊕' : '−'}
        </button>
        <button
          type="button"
          class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          onclick={(e) => { e.stopPropagation(); closePanel(); }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
    {#if !$floatingMetricsMinimized}
      <div class="p-2 border-t border-zinc-200/60 dark:border-zinc-700/60" style="border-color: var(--ui-border);">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">tok/s</span>
          <span class="text-sm font-mono font-semibold" style="color: var(--atom-teal);">
            {$liveTokPerSec != null ? $liveTokPerSec.toFixed(1) : $lastResponseTokPerSec != null ? $lastResponseTokPerSec.toFixed(1) : '—'}
          </span>
        </div>
        <svg width={w} height={h} class="block" aria-hidden="true">
          <polyline
            fill="none"
            stroke="var(--atom-teal)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            points={pathPoints}
          />
        </svg>
      </div>
    {/if}
  </div>
{/if}
