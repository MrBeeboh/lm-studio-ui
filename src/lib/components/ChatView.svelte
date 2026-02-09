<script>
  import { onMount } from 'svelte';
  import { activeConversationId, activeMessages, conversations, settingsOpen, chatError, insertIntoInput, insertAppend, suggestionExpanded, chatCommand } from '$lib/stores.js';
  import { getMessages, addMessage, updateConversation, clearMessages, deleteMessage, getMessageCount } from '$lib/db.js';
  import { streamChatCompletion } from '$lib/api.js';
  import { searchDuckDuckGo, formatSearchResultForChat } from '$lib/duckduckgo.js';
  import { settings, effectiveModelId, isStreaming, webSearchInProgress, lastResponseTokPerSec, lastResponseTokens, liveTokens, pushTokSample, liveTokPerSec } from '$lib/stores.js';
  import { playClick, playComplete } from '$lib/audio.js';
  import MessageList from '$lib/components/MessageList.svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import { generateId } from '$lib/utils.js';

  const convId = $derived($activeConversationId);
  let responseCompleteFlash = $state(false);
  let prevStreaming = $state(false);

  $effect(() => {
    const streaming = $isStreaming;
    if (prevStreaming && !streaming) {
      responseCompleteFlash = true;
      const t = setTimeout(() => {
        responseCompleteFlash = false;
      }, 500);
      prevStreaming = false;
      return () => clearTimeout(t);
    }
    prevStreaming = streaming;
  });

  async function loadMessages(id = convId) {
    if (!id) {
      activeMessages.set([]);
      return;
    }
    const msgs = await getMessages(id);
    activeMessages.set(msgs);
  }

  $effect(() => {
    loadMessages(convId);
  });

  $effect(() => {
    const cmd = $chatCommand;
    if (!cmd?.type) return;
    if (cmd.type === 'regen') regenerate();
    if (cmd.type === 'export') exportChat();
    if (cmd.type === 'clear') clearChat();
    chatCommand.set(null);
  });

  let abortController = null;
  let lastSampleAt = 0;
  let lastSampleTokens = 0;

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

  /** Run DuckDuckGo web search and send results into the chat, then get a model response. */
  async function runWebSearch(query) {
    const q = String(query || '').trim();
    if (!q) {
      chatError.set('Enter a search query in the input box, then click Search web.');
      return;
    }
    if (!convId) return;
    chatError.set(null);
    webSearchInProgress.set(true);
    try {
      const result = await searchDuckDuckGo(q);
      const formatted = formatSearchResultForChat(q, result);
      await sendUserMessage(formatted);
    } catch (e) {
      chatError.set('Web search failed: ' + (e?.message || 'network error'));
    } finally {
      webSearchInProgress.set(false);
    }
  }

  async function sendUserMessage(text, imageDataUrls = []) {
    if (!convId || !text.trim()) return;
    chatError.set(null);

    if (!$effectiveModelId) {
      chatError.set('Please select a model from the dropdown above.');
      return;
    }

    const content = imageDataUrls.length
      ? [
          { type: 'text', text: text.trim() },
          ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
        ]
      : text.trim();
    await addMessage(convId, { role: 'user', content });
    await loadMessages();

    const msgs = await getMessages(convId);
    const apiMessages = msgs.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = $settings.system_prompt?.trim();
    if (systemPrompt) {
      apiMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const assistantMsgId = generateId();
    const assistantPlaceholder = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      stats: null,
      modelId: $effectiveModelId,
      createdAt: Date.now(),
    };
    activeMessages.update((arr) => [...arr, assistantPlaceholder]);

    liveTokens.set(0);
    lastSampleAt = Date.now();
    lastSampleTokens = 0;
    isStreaming.set(true);
    abortController = new AbortController();
    let fullContent = '';
    let usage = null;
    let elapsedMs = 0;
    try {
      const result = await streamChatCompletion({
        model: $effectiveModelId,
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
        signal: abortController.signal,
        onChunk(chunk) {
          fullContent += chunk;
          if (detectLoop(fullContent)) {
            abortController?.abort();
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
          activeMessages.update((arr) => {
            const out = [...arr];
            const last = out[out.length - 1];
            if (last && last.role === 'assistant') out[out.length - 1] = { ...last, content: fullContent, modelId: $effectiveModelId };
            return out;
          });
        },
        onUsage(u) {
          usage = u;
        },
      });
      elapsedMs = result.elapsedMs ?? 0;
      if (result.usage) usage = result.usage;
      if (!$settings.audio_enabled) {
        // no-op
      } else if (!result?.aborted) {
        playComplete($settings.audio_volume);
      }
    } catch (err) {
      chatError.set(err?.message || 'Failed to get response. Is your model server running and the model loaded?');
      activeMessages.update((arr) => arr.filter((m) => m.id !== assistantMsgId));
      isStreaming.set(false);
      abortController = null;
      return;
    } finally {
      liveTokens.set(null);
      liveTokPerSec.set(null);
      isStreaming.set(false);
      abortController = null;
    }

    const estimatedTokens = Math.max(1, Math.ceil(fullContent.length / 4));
    const stats = {
      prompt_tokens: usage?.prompt_tokens ?? 0,
      completion_tokens: usage?.completion_tokens ?? estimatedTokens,
      elapsed_ms: elapsedMs,
      estimated: !usage?.completion_tokens,
    };

    const tokPerSec = elapsedMs > 0 ? (stats.completion_tokens / (elapsedMs / 1000)).toFixed(1) : null;
    lastResponseTokPerSec.set(tokPerSec);
    lastResponseTokens.set(stats.completion_tokens);

    await addMessage(convId, { role: 'assistant', content: fullContent, stats, modelId: $effectiveModelId });
    await loadMessages();

    const conv = $conversations.find((c) => c.id === convId);
    if (conv && conv.title === 'New chat' && fullContent) {
      const title = fullContent.slice(0, 50).replace(/\n/g, ' ').trim() || 'Chat';
      await updateConversation(convId, { title, model: $effectiveModelId });
      conversations.update((list) =>
        list.map((c) => (c.id === convId ? { ...c, title, model: $effectiveModelId, updatedAt: Date.now() } : c))
      );
    } else if (conv) {
      await updateConversation(convId, { model: $effectiveModelId });
      conversations.update((list) =>
        list.map((c) => (c.id === convId ? { ...c, model: $effectiveModelId, updatedAt: Date.now() } : c))
      );
    }
  }

  async function clearChat() {
    if (!convId) return;
    if (!confirm('Clear all messages in this chat?')) return;
    if ($settings.audio_enabled && $settings.audio_clicks) playClick($settings.audio_volume);
    chatError.set(null);
    await clearMessages(convId);
    await loadMessages();
    const n = await getMessageCount(convId);
    conversations.update((list) => list.map((c) => (c.id === convId ? { ...c, messageCount: n } : c)));
  }

  async function regenerate() {
    if (!convId || $activeMessages.length < 2) return;
    if ($settings.audio_enabled && $settings.audio_clicks) playClick($settings.audio_volume);
    const msgs = [...$activeMessages];
    const lastUser = msgs.filter((m) => m.role === 'user').pop();
    if (!lastUser) return;
    const lastUserIndex = msgs.findIndex((m) => m.id === lastUser.id);
    const toRemove = msgs.slice(lastUserIndex);
    for (const m of toRemove) await deleteMessage(m.id);
    await loadMessages();
    const text = typeof lastUser.content === 'string' ? lastUser.content : lastUser.content?.find((p) => p.type === 'text')?.text || '';
    if (text) sendUserMessage(text, []);
  }

  function exportChat() {
    if (!$activeMessages.length) return;
    if ($settings.audio_enabled && $settings.audio_clicks) playClick($settings.audio_volume);
    const lines = $activeMessages.map((m) => {
      const who = m.role === 'user' ? 'You' : 'Assistant';
      const body = typeof m.content === 'string' ? m.content : (m.content?.find((p) => p.type === 'text')?.text ?? '');
      return `### ${who}\n\n${body}`;
    });
    const blob = new Blob([lines.join('\n\n')], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${convId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div
  class="flex-1 flex flex-col min-h-0 transition-shadow duration-300"
  class:atom-streaming-glow={$isStreaming}
  class:atom-complete-flash={responseCompleteFlash}
  class:atom-error-shake={!!$chatError}
  role="application">
  {#if convId}
    {#if $activeMessages.length === 0}
      <!-- Nova-style: greeting, centered input, suggested prompts, disclaimer -->
      <div class="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div class="w-full max-w-2xl mx-auto text-center">
          <h1 class="text-2xl md:text-3xl font-semibold mb-6" style="color: var(--ui-text-primary);">What can I help with?</h1>
          {#if $chatError}
            <div class="mb-4 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-2">
              <span>{$chatError}</span>
              <button type="button" class="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" onclick={() => chatError.set(null)} aria-label="Dismiss">×</button>
            </div>
          {/if}
          <div class="rounded-2xl border shadow-lg p-2 mb-4" style="background-color: var(--ui-input-bg); border-color: var(--ui-input-border);">
            <ChatInput
              onSend={sendUserMessage}
              onStop={() => abortController?.abort()}
              onSearchWeb={runWebSearch} />
          </div>
          <p class="text-xs mb-5" style="color: var(--ui-text-secondary);">ATOM may not always get it right. Check important answers.</p>
          <div class="flex flex-wrap justify-center gap-2">
            {#each [
              { label: 'Write a draft', elaborations: ['Write a draft for me. Include a clear structure and main points.', 'Write a short email summarizing the key points.', 'Write a draft outline for a presentation or report.'] },
              { label: 'Compare and contrast', elaborations: ['Compare and contrast two different ecosystems, like forests and deserts.', 'Compare and contrast the lifestyles of ancient civilizations, such as the Egyptians and the Romans.', 'Compare and contrast the principles of two major world religions, like Buddhism and Christianity.'] },
              { label: 'Explain how', elaborations: ['Explain how this works step by step in simple terms.', 'Explain how to get started and what I need to prepare.', 'Explain how the main parts connect and why it matters.'] },
              { label: 'Tell me about', elaborations: ['Tell me about this topic: give a concise overview and the most important facts.', 'Tell me about the history and how it developed over time.', 'Tell me about common misconceptions and what’s actually true.'] },
              { label: 'Help me brainstorm', elaborations: ['Help me brainstorm ideas. Suggest several options and pros and cons.', 'Help me brainstorm names or titles for a project.', 'Help me brainstorm ways to solve this problem.'] },
              { label: 'Suggest ideas', elaborations: ['Suggest some creative ideas I could try.', 'Suggest a few practical next steps.', 'Suggest resources or tools that would help.'] },
            ] as item}
              <button
                type="button"
                class="ui-pill-suggestion px-4 py-2.5 rounded-full text-sm font-medium border"
                onclick={() => {
                  insertIntoInput.set(item.label);
                  suggestionExpanded.set({ baseText: item.label, options: item.elaborations });
                }}>
                {item.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- Has messages: toolbar, list, input at bottom -->
      <div class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div class="max-w-3xl mx-auto w-full flex flex-wrap items-center gap-2">
          <button type="button" class="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors" onclick={clearChat} title="Clear all messages (Ctrl+Shift+L)">Clear</button>
          <button type="button" class="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors" onclick={regenerate} disabled={$activeMessages.length < 2} title="Regenerate last response">Regenerate</button>
          <button type="button" class="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors" onclick={exportChat} disabled={!$activeMessages.length} title="Export as Markdown (Ctrl+Shift+E)">Export</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <MessageList />
      </div>
      <div class="shrink-0 border-t border-zinc-200/60 dark:border-zinc-800/80 p-4">
        <div class="max-w-3xl mx-auto">
          {#if $chatError}
            <div class="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-2">
              <span>{$chatError}</span>
              <button type="button" class="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" onclick={() => chatError.set(null)} aria-label="Dismiss">×</button>
            </div>
          {/if}
          <div class="flex flex-wrap items-center gap-1.5 mb-2">
            <span class="text-[10px] uppercase tracking-wider px-1" style="color: var(--ui-text-secondary);">Quick:</span>
            {#each [
              { label: 'Shorter', append: 'Keep the response to 2–3 sentences.' },
              { label: 'Longer', append: 'Expand with more detail and examples.' },
              { label: 'Simplify', append: 'Explain in simpler terms, avoid jargon.' },
              { label: 'Explain more', append: 'Go deeper and explain the reasoning.' },
              { label: 'Add code', append: 'Include a short code example if relevant.' },
            ] as chip}
              <button type="button" class="text-[11px] px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors" style="color: var(--ui-text-secondary);" onclick={() => insertAppend.set(chip.append)} title={chip.append}>{chip.label}</button>
            {/each}
          </div>
          <p class="text-xs text-zinc-400 dark:text-zinc-500 mb-2 px-1">Ctrl+Enter send · Esc stop · Ctrl+Shift+C copy last</p>
          <ChatInput
            onSend={sendUserMessage}
            onStop={() => abortController?.abort()}
            onSearchWeb={runWebSearch} />
        </div>
      </div>
    {/if}
  {:else}
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-sm">
        <p class="text-xl font-semibold text-zinc-800 dark:text-zinc-200">Start a conversation</p>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Create a new chat from the sidebar or select an existing one.</p>
      </div>
    </div>
  {/if}
</div>
