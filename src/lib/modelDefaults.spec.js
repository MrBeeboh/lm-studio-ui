import { describe, it, expect } from 'vitest'
import { getDefaultsForModel, getRecommendedSettingsForModel, BATCH_SIZE_MIN, BATCH_SIZE_MAX } from './modelDefaults.js'

describe('constants', () => {
  it('exports batch size bounds', () => {
    expect(BATCH_SIZE_MIN).toBe(64)
    expect(BATCH_SIZE_MAX).toBe(4096)
  })
})

describe('getDefaultsForModel', () => {
  describe('family detection', () => {
    it('detects Qwen family', () => {
      const defaults = getDefaultsForModel('qwen2-7b')
      expect(defaults.family).toBe('qwen')
      expect(defaults.context_length).toBe(32768)
    })

    it('detects Llama family', () => {
      const defaults = getDefaultsForModel('llama-3-8b')
      expect(defaults.family).toBe('llama')
      expect(defaults.context_length).toBe(4096)
    })

    it('detects Phi family', () => {
      const defaults = getDefaultsForModel('phi-3-mini')
      expect(defaults.family).toBe('phi')
    })

    it('detects Mistral family', () => {
      const defaults = getDefaultsForModel('mistral-7b')
      expect(defaults.family).toBe('mistral')
      expect(defaults.context_length).toBe(32768)
    })

    it('detects Gemma family', () => {
      const defaults = getDefaultsForModel('gemma-2-9b')
      expect(defaults.family).toBe('gemma')
      expect(defaults.context_length).toBe(8192)
    })

    it('detects MiniCPM family', () => {
      const defaults = getDefaultsForModel('minicpm-v-8b')
      expect(defaults.family).toBe('minicpm')
      expect(defaults.context_length).toBe(32768)
    })

    it('detects DeepSeek family', () => {
      const defaults = getDefaultsForModel('deepseek-coder-7b')
      expect(defaults.family).toBe('deepseek')
    })

    it('detects CodeLlama family (more specific than Llama)', () => {
      const defaults = getDefaultsForModel('codellama-7b')
      expect(defaults.family).toBe('codellama')
      expect(defaults.context_length).toBe(16384)
      expect(defaults.temperature).toBe(0.2) // Lower temp for code
    })

    it('returns default family for unknown models', () => {
      const defaults = getDefaultsForModel('unknown-model-xyz')
      expect(defaults.family).toBe('default')
    })

    it('returns default family for null/undefined input', () => {
      expect(getDefaultsForModel(null).family).toBe('default')
      expect(getDefaultsForModel(undefined).family).toBe('default')
      expect(getDefaultsForModel('').family).toBe('default')
    })
  })

  describe('default values', () => {
    it('includes all expected keys', () => {
      const defaults = getDefaultsForModel('llama-3-8b')
      expect(defaults).toHaveProperty('context_length')
      expect(defaults).toHaveProperty('eval_batch_size')
      expect(defaults).toHaveProperty('flash_attention')
      expect(defaults).toHaveProperty('offload_kv_cache_to_gpu')
      expect(defaults).toHaveProperty('gpu_offload')
      expect(defaults).toHaveProperty('cpu_threads')
      expect(defaults).toHaveProperty('temperature')
      expect(defaults).toHaveProperty('max_tokens')
      expect(defaults).toHaveProperty('top_p')
      expect(defaults).toHaveProperty('top_k')
      expect(defaults).toHaveProperty('repeat_penalty')
    })

    it('sets flash_attention to true by default', () => {
      expect(getDefaultsForModel('llama-3-8b').flash_attention).toBe(true)
      expect(getDefaultsForModel('qwen2-7b').flash_attention).toBe(true)
    })

    it('sets offload_kv_cache_to_gpu to true by default', () => {
      expect(getDefaultsForModel('llama-3-8b').offload_kv_cache_to_gpu).toBe(true)
    })

    it('sets gpu_offload to max by default', () => {
      expect(getDefaultsForModel('llama-3-8b').gpu_offload).toBe('max')
    })
  })

  describe('hardware constraints', () => {
    it('caps cpu_threads based on hardware', () => {
      const defaults = getDefaultsForModel('llama-3-8b', { cpuLogicalCores: 4 })
      expect(defaults.cpu_threads).toBe(4)
    })

    it('uses model default when hardware has more cores', () => {
      const defaults = getDefaultsForModel('llama-3-8b', { cpuLogicalCores: 32 })
      expect(defaults.cpu_threads).toBe(8) // Model default is 8
    })

    it('handles missing hardware info', () => {
      const defaults = getDefaultsForModel('llama-3-8b', {})
      expect(defaults.cpu_threads).toBe(8)
    })
  })

  describe('HF overrides', () => {
    it('applies context_length from HF overrides', () => {
      const defaults = getDefaultsForModel('llama-3-8b', {}, { context_length: 8192 })
      expect(defaults.context_length).toBe(8192)
    })

    it('ignores non-numeric context_length overrides', () => {
      const defaults = getDefaultsForModel('llama-3-8b', {}, { context_length: 'invalid' })
      expect(defaults.context_length).toBe(4096) // Uses family default
    })
  })
})

describe('getRecommendedSettingsForModel', () => {
  it('returns generation settings for Qwen', () => {
    const settings = getRecommendedSettingsForModel('qwen2-7b')
    expect(settings.temperature).toBe(0.7)
    expect(settings.max_tokens).toBe(4096)
    expect(settings.top_p).toBe(0.95)
    expect(settings.top_k).toBe(64)
    expect(settings.repeat_penalty).toBe(1.15)
    expect(settings.system_prompt).toBe('You are a helpful assistant.')
  })

  it('returns lower temperature for CodeLlama', () => {
    const settings = getRecommendedSettingsForModel('codellama-7b')
    expect(settings.temperature).toBe(0.2)
    expect(settings.system_prompt).toContain('expert programmer')
  })

  it('returns vision-aware prompt for MiniCPM-V', () => {
    const settings = getRecommendedSettingsForModel('minicpm-v-8b')
    expect(settings.system_prompt).toContain('vision-language model')
    expect(settings.system_prompt).toContain('images')
  })

  it('returns vision-aware prompt for Qwen2-VL', () => {
    const settings = getRecommendedSettingsForModel('qwen2-vl-7b')
    expect(settings.system_prompt).toContain('vision-language model')
  })

  it('includes all expected keys', () => {
    const settings = getRecommendedSettingsForModel('llama-3-8b')
    expect(settings).toHaveProperty('temperature')
    expect(settings).toHaveProperty('max_tokens')
    expect(settings).toHaveProperty('top_p')
    expect(settings).toHaveProperty('top_k')
    expect(settings).toHaveProperty('repeat_penalty')
    expect(settings).toHaveProperty('system_prompt')
  })
})
