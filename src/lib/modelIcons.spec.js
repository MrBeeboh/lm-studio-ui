import { describe, it, expect } from 'vitest'
import { getModelIcon, getQuantization } from './modelIcons.js'

describe('getModelIcon', () => {
  describe('edge cases', () => {
    it('returns default icon for null/undefined/empty input', () => {
      expect(getModelIcon(null)).toBe('/model-icons/default-model.svg')
      expect(getModelIcon(undefined)).toBe('/model-icons/default-model.svg')
      expect(getModelIcon('')).toBe('/model-icons/default-model.svg')
    })

    it('returns default icon for non-string input', () => {
      expect(getModelIcon(123)).toBe('/model-icons/default-model.svg')
    })
  })

  describe('pattern matching', () => {
    it('returns Llama icon for Meta/Llama models', () => {
      expect(getModelIcon('meta-llama-3-8b')).toBe('/model-icons/meta-llama-color.svg')
      expect(getModelIcon('llama-3.1-70b')).toBe('/model-icons/meta-llama-color.svg')
      expect(getModelIcon('Meta-Llama-3-8B-Instruct')).toBe('/model-icons/meta-llama-color.svg')
    })

    it('returns Microsoft icon for Phi models', () => {
      expect(getModelIcon('phi-3-mini')).toBe('/model-icons/microsoft-phi-color.svg')
      expect(getModelIcon('microsoft/phi-4')).toBe('/model-icons/microsoft-phi-color.svg')
      expect(getModelIcon('phi3-medium')).toBe('/model-icons/microsoft-phi-color.svg')
    })

    it('returns Qwen icon for Qwen models', () => {
      expect(getModelIcon('qwen2-7b')).toBe('/model-icons/qwen-color.svg')
      expect(getModelIcon('Qwen2.5-72B-Instruct')).toBe('/model-icons/qwen-color.svg')
      expect(getModelIcon('qwq-32b')).toBe('/model-icons/qwen-color.svg')
    })

    it('returns DeepSeek icon for DeepSeek models', () => {
      expect(getModelIcon('deepseek-coder-7b')).toBe('/model-icons/deepseek-color.svg')
      expect(getModelIcon('DeepSeek-R1-Lite')).toBe('/model-icons/deepseek-color.svg')
    })

    it('returns Mistral icon for Mistral models', () => {
      expect(getModelIcon('mistral-7b')).toBe('/model-icons/mistral-color.svg')
      expect(getModelIcon('Ministral-8B')).toBe('/model-icons/mistral-color.svg')
    })

    it('returns Gemma icon for Gemma/Google models', () => {
      expect(getModelIcon('gemma-2-9b')).toBe('/model-icons/gemma-color.svg')
      expect(getModelIcon('google/gemma-7b')).toBe('/model-icons/gemma-color.svg')
    })

    it('returns Falcon icon for Falcon models', () => {
      expect(getModelIcon('falcon-7b')).toBe('/model-icons/tii-falcon-color.svg')
      expect(getModelIcon('Falcon-40B')).toBe('/model-icons/tii-falcon-color.svg')
    })

    it('returns Dolphin icon for Dolphin models', () => {
      expect(getModelIcon('dolphin-2.6-mistral')).toBe('/model-icons/dolphin-color.svg')
    })

    it('returns GLM icon for GLM models', () => {
      expect(getModelIcon('glm-4-9b')).toBe('/model-icons/glmv-color.svg')
      expect(getModelIcon('glmv-4-9b')).toBe('/model-icons/glmv-color.svg')
    })

    it('returns Llama icon for CodeLlama models', () => {
      expect(getModelIcon('codellama-7b')).toBe('/model-icons/meta-llama-color.svg')
      expect(getModelIcon('code-llama-34b')).toBe('/model-icons/meta-llama-color.svg')
    })

    it('returns Baidu icon for ERNIE models', () => {
      expect(getModelIcon('ernie-4.0')).toBe('/model-icons/baidu-ernie-color.svg')
      expect(getModelIcon('baidu-ernie')).toBe('/model-icons/baidu-ernie-color.svg')
    })
  })

  describe('overrides parameter', () => {
    it('uses overrides when model not in patterns', () => {
      const overrides = { 'custom-model': '/custom/icon.svg' }
      expect(getModelIcon('custom-model', overrides)).toBe('/custom/icon.svg')
    })

    it('patterns take precedence over overrides', () => {
      const overrides = { 'llama-3-8b': '/custom/icon.svg' }
      // Pattern match should win
      expect(getModelIcon('llama-3-8b', overrides)).toBe('/model-icons/meta-llama-color.svg')
    })
  })
})

describe('getQuantization', () => {
  describe('edge cases', () => {
    it('returns null for null/undefined/empty input', () => {
      expect(getQuantization(null)).toBe(null)
      expect(getQuantization(undefined)).toBe(null)
      expect(getQuantization('')).toBe(null)
    })

    it('returns null for non-string input', () => {
      expect(getQuantization(123)).toBe(null)
    })

    it('returns null for models without quantization', () => {
      expect(getQuantization('llama-3-8b')).toBe(null)
      expect(getQuantization('qwen2-7b-instruct')).toBe(null)
    })
  })

  describe('quantization parsing', () => {
    it('parses Q4_K_M quantization', () => {
      expect(getQuantization('llama-3-8b-q4_k_m')).toBe('Q4_K_M')
      expect(getQuantization('Qwen2.5-7B-Q4_K_M')).toBe('Q4_K_M')
    })

    it('parses Q4_K_S quantization', () => {
      expect(getQuantization('model-q4_k_s')).toBe('Q4_K_S')
      expect(getQuantization('model-Q4_K_S')).toBe('Q4_K_S')
    })

    it('parses Q5_K_M quantization', () => {
      expect(getQuantization('model-q5_k_m')).toBe('Q5_K_M')
    })

    it('parses Q5_K_L quantization', () => {
      expect(getQuantization('model-q5_k_l')).toBe('Q5_K_L')
    })

    it('parses Q8_K quantization without suffix', () => {
      expect(getQuantization('model-q8_k')).toBe('Q8_K')
    })

    it('handles hyphen separators', () => {
      expect(getQuantization('model-q4-k-m')).toBe('Q4_K_M')
    })

    it('handles space separators', () => {
      expect(getQuantization('model-q4 k m')).toBe('Q4_K_M')
    })

    it('is case insensitive', () => {
      expect(getQuantization('model-Q4_K_M')).toBe('Q4_K_M')
      expect(getQuantization('model-q4_k_m')).toBe('Q4_K_M')
    })
  })
})
