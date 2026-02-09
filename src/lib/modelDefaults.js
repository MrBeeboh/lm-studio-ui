/**
 * Model-family detection and default load/generation settings.
 * Defaults follow creator/Hugging Face–style recommendations where applicable.
 * LM Studio load API: context_length, eval_batch_size, flash_attention, offload_kv_cache_to_gpu.
 */

/** Logical batch size bounds (same doubling/halving idea as max_tokens) */
export const BATCH_SIZE_MIN = 64;
export const BATCH_SIZE_MAX = 4096;

/** Defaults per model family. Include gpu_offload and cpu_threads; cpu_threads get capped by hardware. */
const FAMILY_DEFAULTS = {
  qwen: {
    name: 'Qwen / Qwen2',
    context_length: 32768,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.95,
    top_k: 64,
    repeat_penalty: 1.15,
  },
  llama: {
    name: 'Llama',
    context_length: 4096,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  phi: {
    name: 'Phi',
    context_length: 4096,
    eval_batch_size: 256,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
    top_k: 50,
    repeat_penalty: 1.1,
  },
  mistral: {
    name: 'Mistral',
    context_length: 32768,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  gemma: {
    name: 'Gemma',
    context_length: 8192,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.95,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  deepseek: {
    name: 'DeepSeek',
    context_length: 32768,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.95,
    top_k: 50,
    repeat_penalty: 1.1,
  },
  codellama: {
    name: 'Code Llama',
    context_length: 16384,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.2,
    max_tokens: 4096,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  default: {
    name: 'Default',
    context_length: 4096,
    eval_batch_size: 512,
    flash_attention: true,
    offload_kv_cache_to_gpu: true,
    gpu_offload: 'max',
    cpu_threads: 8,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.95,
    top_k: 64,
    repeat_penalty: 1.15,
  },
};

/** Match model id (lowercase) to family key. Order matters: more specific first. */
const FAMILY_PATTERNS = [
  { key: 'codellama', test: (id) => /codellama|code.?llama/i.test(id) },
  { key: 'qwen', test: (id) => /qwen/i.test(id) },
  { key: 'llama', test: (id) => /llama|meta/i.test(id) },
  { key: 'phi', test: (id) => /phi-|microsoft\/phi/i.test(id) },
  { key: 'mistral', test: (id) => /mistral/i.test(id) },
  { key: 'gemma', test: (id) => /gemma/i.test(id) },
  { key: 'deepseek', test: (id) => /deepseek/i.test(id) },
];

/**
 * Infer model family from LM Studio model id.
 * @param {string} modelId - e.g. "Qwen2.5-7B-Instruct-Q4_K_M"
 * @returns {keyof FAMILY_DEFAULTS}
 */
export function inferFamily(modelId) {
  if (!modelId || typeof modelId !== 'string') return 'default';
  const lower = modelId.toLowerCase();
  for (const { key, test } of FAMILY_PATTERNS) {
    if (test(lower)) return key;
  }
  return 'default';
}

/**
 * Get full defaults (load + generation) for a model id.
 * Optionally cap cpu_threads by hardware and override context_length from HF.
 * @param {string} modelId
 * @param {{ cpuLogicalCores?: number }} [hardware]
 * @param {{ context_length?: number }} [hfOverrides] - e.g. from getRecommendedFromHf()
 * @returns {typeof FAMILY_DEFAULTS.default & { family: string }}
 */
export function getDefaultsForModel(modelId, hardware = {}, hfOverrides = {}) {
  const family = inferFamily(modelId);
  const d = FAMILY_DEFAULTS[family] ?? FAMILY_DEFAULTS.default;
  const maxCpu = hardware?.cpuLogicalCores ?? 256;
  const cpuThreads = Math.min(maxCpu, d.cpu_threads ?? maxCpu);
  const merged = { ...d, family, cpu_threads: cpuThreads };
  if (typeof hfOverrides.context_length === 'number') merged.context_length = hfOverrides.context_length;
  return merged;
}
