<script>
  import { focusMenuOpen, settingsOpen, activeConversationId, conversations } from '$lib/stores.js';
  import { createConversation, listConversations, getMessageCount } from '$lib/db.js';

  async function newChat() {
    const id = await createConversation();
    let list = await listConversations();
    list = await Promise.all(list.map(async (c) => ({ ...c, messageCount: await getMessageCount(c.id) })));
    conversations.set(list);
    activeConversationId.set(id);
    focusMenuOpen.set(false);
  }
</script>

{#if $focusMenuOpen}
  <div
    class="fixed inset-0 z-50 flex items-start justify-end pt-4 pr-4"
    role="dialog"
    aria-label="Focus menu"
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onclick={() => focusMenuOpen.set(false)}
      aria-label="Close menu"
    ></button>
    <div
      class="relative rounded-xl border shadow-2xl py-3 px-4 min-w-[200px] flex flex-col gap-3 transition-opacity duration-200 opacity-100"
      style="background-color: var(--ui-bg-sidebar); border-color: var(--ui-border);"
      role="presentation"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Escape') focusMenuOpen.set(false); }}
    >
      <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--ui-border);">
        <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--ui-accent);">Menu</span>
        <button type="button" class="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600" onclick={() => focusMenuOpen.set(false)} aria-label="Close">×</button>
      </div>
      <div class="flex flex-col gap-1.5 pt-1">
        <button type="button" class="text-left text-sm px-2 py-1.5 rounded-lg hover:opacity-90 w-full" style="color: var(--ui-text); background: color-mix(in srgb, var(--ui-accent) 15%, transparent);" onclick={newChat}>New chat</button>
        <button type="button" class="text-left text-sm px-2 py-1.5 rounded-lg w-full" style="color: var(--ui-text-secondary);" onclick={() => { settingsOpen.set(true); focusMenuOpen.set(false); }}>Settings</button>
      </div>
    </div>
  </div>
{/if}
