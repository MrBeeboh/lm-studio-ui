<script>
  import { get } from 'svelte/store';
  import { chatError, dashboardModelA, dashboardModelB, dashboardModelC, dashboardModelD, isStreaming, settings, liveTokens, pushTokSample, liveTokPerSec, arenaPanelCount } from '$lib/stores.js';
  import { playClick, playComplete } from '$lib/audio.js';
  import { streamChatCompletion } from '$lib/api.js';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import MessageBubble from '$lib/components/MessageBubble.svelte';
  import { generateId } from '$lib/utils.js';

  let messagesA = $state([]);
  let messagesB = $state([]);
  let messagesC = $state([]);
  let messagesD = $state([]);
  let running = $state({ A: false, B: false, C: false, D: false });
  let slotErrors = $state({ A: '', B: '', C: '', D: '' });
  let sequential = $state(
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem('arenaSequential') ?? '1') !== '0'
      : true
  );
  let runId = 0;
  let lastSampleAt = 0;
  let lastSampleTokens = 0;

  const aborters = { A: null, B: null, C: null, D: null };

  function getMessages(slot) {
    return slot === 'A' ? messagesA : slot === 'B' ? messagesB : slot === 'C' ? messagesC : messagesD;
  }
  function setMessages(slot, next) {
    if (slot === 'A') messagesA = next;
    else if (slot === 'B') messagesB = next;
    else if (slot === 'C') messagesC = next;
    else messagesD = next;
  }
  function pushMessage(slot, msg) {
    setMessages(slot, [...getMessages(slot), msg]);
  }
  function updateMessage(slot, id, nextProps) {
    const msgs = getMessages(slot);
    const idx = msgs.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const next = [...msgs];
    next[idx] = { ...next[idx], ...nextProps };
    setMessages(slot, next);
  }
  function setRunning(slot, value) {
    running = { ...running, [slot]: value };
  }
  function setSlotError(slot, message) {
    slotErrors = { ...slotErrors, [slot]: message || '' };
  }

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('arenaSequential', sequential ? '1' : '0');
    }
  });

  /** Detect repeating tail (runaway loop) and abort if seen */
  function detectLoop(content) {
    if (content.length < 200) return false;
    const tailLen = 80;
    const tail = content.slice(-tailLen);
    const beforeTail = content.slice(0, -tailLen);
    if (beforeTail.length < tailLen * 2) return false;
    const count = (beforeTail.match(new RegExp(tail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    return count >= 2;
  }

  function buildApiMessages(msgs) {
    const apiMessages = msgs.map((m) => ({ role: m.role, content: m.content }));
    const systemPrompt = $settings.system_prompt?.trim();
    if (systemPrompt) apiMessages.unshift({ role: 'system', content: systemPrompt });
    return apiMessages;
  }

  async function sendToSlot(slot, modelId, content) {
    setRunning(slot, true);
    setSlotError(slot, '');

    const userMsg = {
      id: generateId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    pushMessage(slot, userMsg);

    const assistantMsgId = generateId();
    pushMessage(slot, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      stats: null,
      modelId,
      createdAt: Date.now(),
    });

    const apiMessages = buildApiMessages(getMessages(slot));
    const controller = new AbortController();
    aborters[slot] = controller;

    let fullContent = '';
    let usage = null;
    let elapsedMs = 0;
    lastSampleAt = Date.now();
    lastSampleTokens = 0;

    try {
      const result = await streamChatCompletion({
        model: modelId,
        messages: apiMessages,
        options: {
          temperature: $settings.temperature,
          max_tokens: $settings.max_tokens,
          top_p: $settings.top_p,
          top_k: $settings.top_k,
          repeat_penalty: $settings.repeat_penalty,
          stop: $settings.stop?.length ? $settings.stop : undefined,
          ttl: $settings.model_ttl_seconds,
        },
        signal: controller.signal,
        onChunk(chunk) {
          fullContent += chunk;
          if (detectLoop(fullContent)) {
            controller.abort();
            return;
          }
          liveTokens.set(Math.max(1, Math.ceil(fullContent.length / 4)));
          const now = Date.now();
          if (now - lastSampleAt >= 1000) {
            const tok = Math.max(1, Math.ceil(fullContent.length / 4));
            const rate = (tok - lastSampleTokens) / ((now - lastSampleAt) / 1000);
            if (rate >= 0) pushTokSample(rate);
            lastSampleAt = now;
            lastSampleTokens = tok;
          }
          updateMessage(slot, assistantMsgId, { content: fullContent, modelId });
        },
        onUsage(u) {
          usage = u;
        },
      });
      elapsedMs = result.elapsedMs ?? 0;
      if (result.usage) usage = result.usage;
      if ($settings.audio_enabled && !result?.aborted) playComplete($settings.audio_volume);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setSlotError(slot, err?.message || 'Failed to get response. Is your model server running and the model loaded?');
      }
      updateMessage(slot, assistantMsgId, { content: '', stats: null, modelId });
      return;
    } finally {
      setRunning(slot, false);
      aborters[slot] = null;
    }

    const estimatedTokens = Math.max(1, Math.ceil(fullContent.length / 4));
    const stats = {
      prompt_tokens: usage?.prompt_tokens ?? 0,
      completion_tokens: usage?.completion_tokens ?? estimatedTokens,
      elapsed_ms: elapsedMs,
      estimated: !usage?.completion_tokens,
    };
    updateMessage(slot, assistantMsgId, { content: fullContent, stats, modelId });
  }

  async function sendUserMessage(text, imageDataUrls = []) {
    if (!text.trim() || $isStreaming) return;
    chatError.set(null);

    const n = get(arenaPanelCount);
    const slotsActive = ['A', ...(n >= 2 ? ['B'] : []), ...(n >= 3 ? ['C'] : []), ...(n >= 4 ? ['D'] : [])];
    const selected = [
      { slot: 'A', modelId: $dashboardModelA },
      { slot: 'B', modelId: $dashboardModelB },
      { slot: 'C', modelId: $dashboardModelC },
      { slot: 'D', modelId: $dashboardModelD },
    ].filter((s) => s.modelId && slotsActive.includes(s.slot));

    if (!selected.length) {
      chatError.set('Select at least one model (A–D) before sending.');
      return;
    }

    const content = imageDataUrls.length
      ? [
          { type: 'text', text: text.trim() },
          ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
        ]
      : text.trim();

    runId += 1;
    const currentRun = runId;
    liveTokens.set(0);
    isStreaming.set(true);
    if (sequential) {
      for (const s of selected) {
        if (runId !== currentRun) break;
        await sendToSlot(s.slot, s.modelId, content);
      }
    } else {
      await Promise.allSettled(selected.map((s) => sendToSlot(s.slot, s.modelId, content)));
    }
    isStreaming.set(false);
    liveTokens.set(null);
    liveTokPerSec.set(null);
  }

  function stopAll() {
    runId += 1;
    for (const slot of ['A', 'B', 'C', 'D']) {
      try { aborters[slot]?.abort(); } catch (_) {}
      aborters[slot] = null;
      setRunning(slot, false);
    }
    isStreaming.set(false);
    liveTokens.set(null);
    liveTokPerSec.set(null);
  }

  function lastTps(msgs) {
    const last = [...(msgs || [])].reverse().find((m) => m.role === 'assistant' && m.stats);
    if (!last?.stats) return null;
    const { completion_tokens, elapsed_ms } = last.stats;
    if (elapsed_ms <= 0) return null;
    return (completion_tokens / (elapsed_ms / 1000)).toFixed(1);
  }
  const tpsA = $derived(lastTps(messagesA));
  const tpsB = $derived(lastTps(messagesB));
  const tpsC = $derived(lastTps(messagesC));
  const tpsD = $derived(lastTps(messagesD));
</script>

<div class="h-full min-h-0 flex flex-col">
  <div
    class="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)] gap-2 p-2 atom-layout-transition"
    style="grid-template-columns: repeat({$arenaPanelCount}, minmax(0, 1fr));">
    {#if $arenaPanelCount >= 1}
    <div class="flex flex-col min-h-0 h-full overflow-hidden rounded-xl border atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-bg-main);">
      <div class="shrink-0 px-3 py-2 border-b" style="border-color: var(--ui-border);">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model A</span>
          {#if running.A}<span class="text-xs" style="color: var(--ui-accent);">Running…</span>{:else if tpsA}{@const c = Number(tpsA) >= 40 ? 'var(--atom-teal)' : Number(tpsA) >= 20 ? 'var(--atom-amber)' : 'var(--atom-accent)'}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded" style="background: color-mix(in srgb, {c} 20%, transparent); color: {c};">{tpsA} t/s</span>{/if}
        </div>
        <div class="text-xs truncate" style="color: var(--ui-text-secondary);">{$dashboardModelA || 'Select a model'}</div>
        {#if slotErrors.A}<div class="text-xs mt-1" style="color: var(--ui-accent-hot);">{slotErrors.A}</div>{/if}
      </div>
      <div class="flex-1 min-h-0 h-full overflow-y-auto p-3 overscroll-contain">
        {#if !$dashboardModelA}
          <div class="text-sm" style="color: var(--ui-text-secondary);">Select a model to start.</div>
        {:else if messagesA.length === 0}
          <div class="text-sm" style="color: var(--ui-text-secondary);">No responses yet.</div>
        {:else}
          <div class="space-y-4">
            {#each messagesA as msg (msg.id)}
              <MessageBubble message={msg} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}

    {#if $arenaPanelCount >= 2}
    <div class="flex flex-col min-h-0 h-full overflow-hidden rounded-xl border atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-bg-main);">
      <div class="shrink-0 px-3 py-2 border-b" style="border-color: var(--ui-border);">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model B</span>
          {#if running.B}<span class="text-xs" style="color: var(--ui-accent);">Running…</span>{:else if tpsB}{@const c = Number(tpsB) >= 40 ? 'var(--atom-teal)' : Number(tpsB) >= 20 ? 'var(--atom-amber)' : 'var(--atom-accent)'}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded" style="background: color-mix(in srgb, {c} 20%, transparent); color: {c};">{tpsB} t/s</span>{/if}
        </div>
        <div class="text-xs truncate" style="color: var(--ui-text-secondary);">{$dashboardModelB || 'Select a model'}</div>
        {#if slotErrors.B}<div class="text-xs mt-1" style="color: var(--ui-accent-hot);">{slotErrors.B}</div>{/if}
      </div>
      <div class="flex-1 min-h-0 h-full overflow-y-auto p-3 overscroll-contain">
        {#if !$dashboardModelB}
          <div class="text-sm" style="color: var(--ui-text-secondary);">Select a model to start.</div>
        {:else if messagesB.length === 0}
          <div class="text-sm" style="color: var(--ui-text-secondary);">No responses yet.</div>
        {:else}
          <div class="space-y-4">
            {#each messagesB as msg (msg.id)}
              <MessageBubble message={msg} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}

    {#if $arenaPanelCount >= 3}
    <div class="flex flex-col min-h-0 h-full overflow-hidden rounded-xl border atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-bg-main);">
      <div class="shrink-0 px-3 py-2 border-b" style="border-color: var(--ui-border);">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model C</span>
          {#if running.C}<span class="text-xs" style="color: var(--ui-accent);">Running…</span>{:else if tpsC}{@const c = Number(tpsC) >= 40 ? 'var(--atom-teal)' : Number(tpsC) >= 20 ? 'var(--atom-amber)' : 'var(--atom-accent)'}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded" style="background: color-mix(in srgb, {c} 20%, transparent); color: {c};">{tpsC} t/s</span>{/if}
        </div>
        <div class="text-xs truncate" style="color: var(--ui-text-secondary);">{$dashboardModelC || 'Select a model'}</div>
        {#if slotErrors.C}<div class="text-xs mt-1" style="color: var(--ui-accent-hot);">{slotErrors.C}</div>{/if}
      </div>
      <div class="flex-1 min-h-0 h-full overflow-y-auto p-3 overscroll-contain">
        {#if !$dashboardModelC}
          <div class="text-sm" style="color: var(--ui-text-secondary);">Select a model to start.</div>
        {:else if messagesC.length === 0}
          <div class="text-sm" style="color: var(--ui-text-secondary);">No responses yet.</div>
        {:else}
          <div class="space-y-4">
            {#each messagesC as msg (msg.id)}
              <MessageBubble message={msg} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}

    {#if $arenaPanelCount >= 4}
    <div class="flex flex-col min-h-0 h-full overflow-hidden rounded-xl border atom-panel-wrap" style="border-color: var(--ui-border); background-color: var(--ui-bg-main);">
      <div class="shrink-0 px-3 py-2 border-b" style="border-color: var(--ui-border);">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium" style="color: var(--ui-text-secondary);">Model D</span>
          {#if running.D}<span class="text-xs" style="color: var(--ui-accent);">Running…</span>{:else if tpsD}{@const c = Number(tpsD) >= 40 ? 'var(--atom-teal)' : Number(tpsD) >= 20 ? 'var(--atom-amber)' : 'var(--atom-accent)'}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded" style="background: color-mix(in srgb, {c} 20%, transparent); color: {c};">{tpsD} t/s</span>{/if}
        </div>
        <div class="text-xs truncate" style="color: var(--ui-text-secondary);">{$dashboardModelD || 'Select a model'}</div>
        {#if slotErrors.D}<div class="text-xs mt-1" style="color: var(--ui-accent-hot);">{slotErrors.D}</div>{/if}
      </div>
      <div class="flex-1 min-h-0 h-full overflow-y-auto p-3 overscroll-contain">
        {#if !$dashboardModelD}
          <div class="text-sm" style="color: var(--ui-text-secondary);">Select a model to start.</div>
        {:else if messagesD.length === 0}
          <div class="text-sm" style="color: var(--ui-text-secondary);">No responses yet.</div>
        {:else}
          <div class="space-y-4">
            {#each messagesD as msg (msg.id)}
              <MessageBubble message={msg} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}
  </div>

  <div class="shrink-0 border-t p-3" style="border-color: var(--ui-border); background-color: var(--ui-bg-sidebar);">
    <div class="max-w-4xl mx-auto">
      {#if $chatError}
        <div class="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-2">
          <span>{$chatError}</span>
          <button type="button" class="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" onclick={() => chatError.set(null)} aria-label="Dismiss">×</button>
        </div>
      {/if}
      <div class="flex flex-wrap items-center gap-4 mb-2 text-xs" style="color: var(--ui-text-secondary);">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={sequential}
            class="rounded border-zinc-300 dark:border-zinc-600 accent-red-600"
            onchange={() => { if ($settings.audio_enabled && $settings.audio_clicks) playClick($settings.audio_volume); }} />
          <span>Sequential (lower VRAM/CPU)</span>
        </label>
        <span class="text-xs">Parallel runs all models at once and uses more resources.</span>
      </div>
      <ChatInput
        onSend={sendUserMessage}
        onStop={stopAll} />
      <p class="text-xs mt-2" style="color: var(--ui-text-secondary);">One prompt → multiple model responses. Select Model A/B/C above, then send.</p>
    </div>
  </div>
</div>
