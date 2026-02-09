<script>
  import { get } from 'svelte/store';
  import { models, selectedModelId, updateSettings, hardware } from '$lib/stores.js';
  import { getModelIcon, getQuantization, modelIconOverrides } from '$lib/modelIcons.js';
  import { getDefaultsForModel } from '$lib/modelDefaults.js';
  import { getRecommendedFromHf } from '$lib/huggingface.js';

  let modelsList = $state([]);
  let currentId = $state('');

  $effect(() => {
    const unsub = models.subscribe((v) => (modelsList = v ?? []));
    return () => unsub();
  });
  $effect(() => {
    const unsub = selectedModelId.subscribe((v) => (currentId = v ?? ''));
    return () => unsub();
  });

  async function applyDefaultsForModel(modelId) {
    const h = get(hardware) ?? { cpuLogicalCores: 4 };
    let hfOverrides = {};
    try {
      hfOverrides = await getRecommendedFromHf(modelId);
    } catch (_) {}
    const d = getDefaultsForModel(modelId, h, hfOverrides);
    updateSettings({
      context_length: d.context_length,
      eval_batch_size: d.eval_batch_size,
      flash_attention: d.flash_attention,
      offload_kv_cache_to_gpu: d.offload_kv_cache_to_gpu,
      gpu_offload: d.gpu_offload ?? 'max',
      cpu_threads: d.cpu_threads,
      temperature: d.temperature,
      max_tokens: d.max_tokens,
      top_p: d.top_p,
      top_k: d.top_k,
      repeat_penalty: d.repeat_penalty,
    });
  }

  async function select(modelId) {
    selectedModelId.set(modelId);
    await applyDefaultsForModel(modelId);
  }
</script>

<div
  class="model-bar flex items-center gap-2 overflow-x-auto py-2 px-3 border-t shrink-0 scrollbar-thin"
  style="background-color: var(--ui-bg-sidebar); border-color: var(--ui-border);">
  {#each modelsList as m}
    {@const id = m.id ?? m}
    {@const isCurrent = id === currentId}
    <button
      type="button"
      class="model-bar-pill shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
      class:model-bar-pill-active={isCurrent}
      style="border-color: {isCurrent ? 'var(--ui-accent)' : 'var(--ui-border)'}; background-color: {isCurrent ? 'color-mix(in srgb, var(--ui-accent) 18%, transparent)' : 'var(--ui-input-bg)'}; color: var(--ui-text-primary);"
      onclick={() => select(id)}
      title={id}>
      <img src={getModelIcon(id, $modelIconOverrides)} alt="" class="w-3.5 h-3.5 rounded object-contain shrink-0" />
      <span class="truncate max-w-[140px]">{id}</span>
      {#if getQuantization(id)}
        <span class="text-[9px] font-mono opacity-80 shrink-0">{getQuantization(id)}</span>
      {/if}
    </button>
  {/each}
  {#if modelsList.length === 0}
    <span class="text-xs opacity-60" style="color: var(--ui-text-secondary);">No models loaded</span>
  {/if}
</div>
