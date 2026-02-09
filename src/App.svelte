<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { theme, sidebarOpen, settingsOpen, activeMessages, lastResponseTokPerSec, lastResponseTokens, settings, uiTheme, sidebarCollapsed, layout, dashboardModelA, dashboardModelB, dashboardModelC, dashboardModelD, activeConversationId, conversations, selectedModelId, isStreaming, liveTokPerSec, liveTokens, chatCommand, cockpitIntelOpen, performanceMode, floatingMetricsOpen, arenaPanelCount } from '$lib/stores.js';
  import { createConversation, listConversations, getMessageCount, getMessages, addMessage, updateConversation } from '$lib/db.js';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatView from '$lib/components/ChatView.svelte';
  import DashboardArena from '$lib/components/DashboardArena.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import UiThemeSelect from '$lib/components/UiThemeSelect.svelte';
  import PresetSelect from '$lib/components/PresetSelect.svelte';
  import ModelSelector from '$lib/components/ModelSelector.svelte';
  import ModelSelectorSlot from '$lib/components/ModelSelectorSlot.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import AudioManager from '$lib/components/AudioManager.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ConvoRail from '$lib/components/ConvoRail.svelte';
  import IntelPanel from '$lib/components/IntelPanel.svelte';
  import FloatingMetricsDashboard from '$lib/components/FloatingMetricsDashboard.svelte';

  /** Only Cockpit and Arena (restore point). */
  const LAYOUT_OPTS = [
    { value: 'cockpit', label: 'Cockpit' },
    { value: 'arena', label: 'Arena' },
  ];
  /* Header control spacing: min-widths so dropdowns never overlap; gap between groups. */
  const HEADER_MODEL_MIN = 'min-width: 13rem;'; /* 208px - room for long model ids */
  const HEADER_PRESET_MIN = 'min-width: 7rem;'; /* 112px */
  const HEADER_THEME_MIN = 'min-width: 10rem;'; /* 160px for theme dropdown + toggle */
  const HEADER_GAP = 'gap: 1.25rem;'; /* 20px between control groups */

  onMount(() => {
    function onKeydown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const msgs = get(activeMessages);
        const last = [...msgs].reverse().find((m) => m.role === 'assistant');
        if (last?.content) {
          const text = typeof last.content === 'string' ? last.content : last.content?.find((p) => p.type === 'text')?.text ?? '';
          if (text) navigator.clipboard?.writeText(text);
        }
      }
      if (e.key === ']' && !e.ctrlKey && !e.metaKey && !e.altKey && get(layout) === 'cockpit') {
        e.preventDefault();
        cockpitIntelOpen.update((v) => !v);
      }
    }
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });

  onMount(() => {
    function applyTheme(want) {
      const t = want ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null) ?? 'system';
      const isDark =
        t === 'dark' ||
        (t === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
    applyTheme(get(theme));
    const unsub = theme.subscribe((v) => applyTheme(v));
    const mq = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => applyTheme();
    mq?.addEventListener?.('change', onSystemChange);
    return () => {
      unsub();
      mq?.removeEventListener?.('change', onSystemChange);
    };
  });

  theme.subscribe((v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', v);
  });
  uiTheme.subscribe((v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('uiTheme', v);
    if (typeof document !== 'undefined') document.documentElement.dataset.uiTheme = v;
  });
  layout.subscribe((v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('layout', v);
  });
  dashboardModelA.subscribe((v) => { if (typeof localStorage !== 'undefined') localStorage.setItem('dashboardModelA', v || ''); });
  dashboardModelB.subscribe((v) => { if (typeof localStorage !== 'undefined') localStorage.setItem('dashboardModelB', v || ''); });
  dashboardModelC.subscribe((v) => { if (typeof localStorage !== 'undefined') localStorage.setItem('dashboardModelC', v || ''); });
  dashboardModelD.subscribe((v) => { if (typeof localStorage !== 'undefined') localStorage.setItem('dashboardModelD', v || ''); });
  onMount(() => {
    document.documentElement.dataset.uiTheme = get(uiTheme);
  });

  /** Run on app load so we always have a ready chat (no "Start a conversation" empty state). */
  onMount(async () => {
    let list = await listConversations();
    if (list.length === 0) {
      const id = await createConversation();
      activeConversationId.set(id);
      list = await listConversations();
    }
    list = await Promise.all(list.map(async (c) => ({ ...c, messageCount: await getMessageCount(c.id) })));
    conversations.set(list);
    if (!get(activeConversationId) && list.length > 0) {
      activeConversationId.set(list[0].id);
    }
  });

  async function refreshConversations() {
    let list = await listConversations();
    list = await Promise.all(list.map(async (c) => ({ ...c, messageCount: await getMessageCount(c.id) })));
    conversations.set(list);
  }

  async function newChat() {
    const id = await createConversation();
    await refreshConversations();
    activeConversationId.set(id);
  }

  async function branchChat() {
    const srcId = get(activeConversationId);
    if (!srcId) return;
    const srcMessages = await getMessages(srcId);
    const srcConv = get(conversations).find((c) => c.id === srcId);
    const model = srcConv?.model ?? get(selectedModelId) ?? '';
    const newId = await createConversation(model);
    for (const m of srcMessages) {
      await addMessage(newId, { role: m.role, content: m.content, stats: m.stats, modelId: m.modelId });
    }
    const titleBase = srcConv?.title || 'Chat';
    await updateConversation(newId, { title: `Branch of ${titleBase}`, model });
    await refreshConversations();
    activeConversationId.set(newId);
  }

  function issueChatCommand(type) {
    chatCommand.set({ type, ts: Date.now() });
  }
</script>

<div
  class="h-screen overflow-hidden atom-gradient-bg"
  class:atom-performance-mode={$performanceMode}
  style="background-color: var(--ui-bg-main);">
  <AudioManager />
  <CommandPalette />
  <FloatingMetricsDashboard />
  {#if $layout === 'cockpit'}
    <!-- Cockpit: one header (layout + model + preset + theme), ConvoRail | Chat | Intel. -->
    <div class="flex h-full flex-col">
      <header class="shrink-0 flex items-center px-3 py-2 border-b text-sm" style="border-color: var(--ui-border); background-color: var(--ui-bg-sidebar); color: var(--ui-text-secondary); {HEADER_GAP}">
        <span class="font-semibold shrink-0 w-10" style="color: var(--ui-accent);">ATOM</span>
        <nav class="flex items-center gap-0.5 shrink-0" aria-label="Layout">
          {#each LAYOUT_OPTS as opt}
            <button type="button" class="px-2 py-1 rounded text-xs {$layout === opt.value ? 'font-medium' : ''}" style="color: {$layout === opt.value ? 'var(--ui-accent)' : 'var(--ui-text-secondary)'}; background: {$layout === opt.value ? 'color-mix(in srgb, var(--ui-accent) 15%, transparent)' : 'transparent'};" onclick={() => layout.set(opt.value)}>{opt.label}</button>
          {/each}
        </nav>
        <div class="shrink-0 overflow-hidden" style="{HEADER_MODEL_MIN}"><ModelSelector /></div>
        <div class="shrink-0" style="{HEADER_PRESET_MIN}"><PresetSelect compact={true} /></div>
        <div class="flex items-center gap-1.5 shrink-0 pl-2 ml-2 border-l" style="border-color: var(--ui-border); {HEADER_THEME_MIN}" role="group" aria-label="Theme">
          <UiThemeSelect compact={true} />
          <ThemeToggle />
        </div>
        <button type="button" class="p-1.5 rounded text-xs shrink-0 ml-auto" style="color: var(--ui-text-secondary);" onclick={() => settingsOpen.set(true)} aria-label="Settings" title="Settings">⚙</button>
      </header>
      <div class="flex flex-1 min-h-0 min-w-0">
        <ConvoRail />
        <main class="flex-1 flex flex-col min-w-0 min-h-0" style="background-color: var(--ui-bg-main);">
          <ChatView />
        </main>
        {#if $cockpitIntelOpen}
          <aside class="intel-panel-enter w-[280px] shrink-0 border-l overflow-hidden flex flex-col" style="border-color: var(--ui-border);">
            <div class="shrink-0 flex items-center justify-between px-3 py-2 border-b" style="border-color: var(--ui-border); background-color: var(--ui-bg-sidebar);">
              <span class="text-xs font-medium uppercase tracking-wide" style="color: var(--ui-text-secondary);">Intel</span>
              <button type="button" class="p-1 rounded text-xs" style="color: var(--ui-text-secondary);" onclick={() => cockpitIntelOpen.set(false)} title="Close panel (])" aria-label="Close Intel panel">×</button>
            </div>
            <IntelPanel />
          </aside>
        {:else}
          <button type="button" class="shrink-0 w-8 border-l flex items-center justify-center text-xs" style="border-color: var(--ui-border); background-color: var(--ui-bg-sidebar); color: var(--ui-text-secondary);" onclick={() => cockpitIntelOpen.set(true)} title="Open Intel panel (])" aria-label="Open Intel panel">]</button>
        {/if}
      </div>
    </div>

  {:else if $layout === 'arena'}
    <!-- Arena: 1–4 model columns; each column has its own model. Chat uses Model A. -->
    <div class="flex h-full flex-col">
      <header class="shrink-0 flex items-center justify-between px-3 py-2 border-b flex-wrap" style="border-color: var(--ui-border); background-color: var(--ui-bg-sidebar); {HEADER_GAP}">
        <span class="font-semibold shrink-0" style="color: var(--ui-accent);">ATOM Arena</span>
        <nav class="flex items-center gap-0.5 shrink-0" aria-label="Layout">
          {#each LAYOUT_OPTS as opt}
            <button type="button" class="px-2 py-1 rounded text-xs {$layout === opt.value ? 'font-medium' : ''}" style="color: {$layout === opt.value ? 'var(--ui-accent)' : 'var(--ui-text-secondary)'}; background: {$layout === opt.value ? 'color-mix(in srgb, var(--ui-accent) 15%, transparent)' : 'transparent'};" onclick={() => layout.set(opt.value)}>{opt.label}</button>
          {/each}
        </nav>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs" style="color: var(--ui-text-secondary);">Panels</span>
          <div class="flex rounded-lg border overflow-hidden" style="border-color: var(--ui-border);">
            {#each [1, 2, 3, 4] as n}
              <button
                type="button"
                class="w-8 h-7 text-xs font-medium transition-colors {$arenaPanelCount === n ? '' : 'opacity-70'}"
                style="{$arenaPanelCount === n ? 'background-color: var(--ui-sidebar-active); color: var(--ui-text-primary);' : 'background-color: var(--ui-bg-main); color: var(--ui-text-secondary);'}"
                onclick={() => arenaPanelCount.set(n)}
                aria-label="{n} panel{n === 1 ? '' : 's'}"
                aria-pressed={$arenaPanelCount === n}>{n}</button>
            {/each}
          </div>
          <span class="text-xs" style="color: var(--ui-text-secondary);">Chat uses Model A</span>
        </div>
        <div class="shrink-0" style="{HEADER_PRESET_MIN}"><PresetSelect compact={true} /></div>
        <div class="flex items-center gap-1.5 shrink-0 pl-2 ml-2 border-l" style="border-color: var(--ui-border); {HEADER_THEME_MIN}" role="group" aria-label="Theme">
          <UiThemeSelect compact={true} />
          <ThemeToggle />
        </div>
        <button type="button" class="p-2 rounded-lg shrink-0" style="color: var(--ui-text-secondary);" onclick={() => settingsOpen.set(true)} aria-label="Settings" title="Settings">⚙</button>
      </header>
      <div class="flex flex-1 min-h-0">
        <aside class="w-52 shrink-0 border-r overflow-auto" style="background-color: var(--ui-bg-sidebar); border-color: var(--ui-border);"><Sidebar /></aside>
        <div class="flex-1 flex flex-col min-w-0">
          <div
            class="grid gap-2 p-2 border-b atom-layout-transition"
            style="border-color: var(--ui-border); grid-template-columns: repeat({$arenaPanelCount}, minmax(0, 1fr));">
            {#if $arenaPanelCount >= 1}
              <div class="rounded-lg border p-2 flex flex-col gap-1.5 atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-input-bg);">
                <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model A</span>
                <ModelSelectorSlot slot="A" />
              </div>
            {/if}
            {#if $arenaPanelCount >= 2}
              <div class="rounded-lg border p-2 flex flex-col gap-1.5 atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-input-bg);">
                <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model B</span>
                <ModelSelectorSlot slot="B" />
              </div>
            {/if}
            {#if $arenaPanelCount >= 3}
              <div class="rounded-lg border p-2 flex flex-col gap-1.5 atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-input-bg);">
                <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model C</span>
                <ModelSelectorSlot slot="C" />
              </div>
            {/if}
            {#if $arenaPanelCount >= 4}
              <div class="rounded-lg border p-2 flex flex-col gap-1.5 atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-input-bg);">
                <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model D</span>
                <ModelSelectorSlot slot="D" />
              </div>
            {/if}
          </div>
          <div class="flex-1 min-h-0 h-full atom-layout-transition"><DashboardArena /></div>
        </div>
      </div>
    </div>

  {/if}

  {#if $settingsOpen}
    <SettingsPanel onclose={() => settingsOpen.set(false)} />
  {/if}
</div>
