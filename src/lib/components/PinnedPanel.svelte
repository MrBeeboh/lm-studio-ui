<script>
  import { pinnedContent } from '$lib/stores.js';
  import { renderMarkdown } from '$lib/markdown.js';

  const html = $derived($pinnedContent ? renderMarkdown($pinnedContent) : '');
</script>

<div class="h-full flex flex-col" style="background-color: var(--ui-bg-sidebar);">
  <div class="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b" style="border-color: var(--ui-border);">
    <span class="text-xs font-medium uppercase tracking-wide" style="color: var(--ui-text-secondary);">Pinned</span>
    <button
      type="button"
      class="text-xs px-2 py-1 rounded border transition-colors"
      style="border-color: var(--ui-border); color: var(--ui-text-secondary);"
      onclick={() => pinnedContent.set(null)}
      disabled={!$pinnedContent}
    >
      Clear
    </button>
  </div>
  <div class="flex-1 overflow-y-auto p-4 min-h-0">
    {#if $pinnedContent}
      <div class="prose-chat prose dark:prose-invert max-w-none text-sm">
        {@html html}
      </div>
    {:else}
      <p class="text-sm" style="color: var(--ui-text-secondary);">Pin an assistant message from the chat to see it here.</p>
    {/if}
  </div>
</div>
