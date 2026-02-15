import { describe, it, expect } from 'vitest'
import { getModelCapabilities } from './modelCapabilities.js'

describe('getModelCapabilities', () => {
  describe('edge cases', () => {
    it('returns all false for null/undefined/empty input', () => {
      expect(getModelCapabilities(null)).toEqual({ vision: false, tools: false, thinking: false, json: false })
      expect(getModelCapabilities(undefined)).toEqual({ vision: false, tools: false, thinking: false, json: false })
      expect(getModelCapabilities('')).toEqual({ vision: false, tools: false, thinking: false, json: false })
    })

    it('returns all false for non-string input', () => {
      expect(getModelCapabilities(123)).toEqual({ vision: false, tools: false, thinking: false, json: false })
      expect(getModelCapabilities({})).toEqual({ vision: false, tools: false, thinking: false, json: false })
    })
  })

  describe('vision capability', () => {
    it('detects VL suffix models', () => {
      expect(getModelCapabilities('qwen2-vl-7b').vision).toBe(true)
      expect(getModelCapabilities('qwen2.5-vl-7b').vision).toBe(true)
      expect(getModelCapabilities('qwen3-vl-8b').vision).toBe(true)
    })

    it('detects models with vision keyword', () => {
      expect(getModelCapabilities('phi-3-vision').vision).toBe(true)
      expect(getModelCapabilities('some-model-vision-7b').vision).toBe(true)
    })

    it('detects LLaVA models', () => {
      expect(getModelCapabilities('llava-1.5-7b').vision).toBe(true)
      expect(getModelCapabilities('llava-next-34b').vision).toBe(true)
    })

    it('detects MiniCPM-V models', () => {
      expect(getModelCapabilities('minicpm-v-8b').vision).toBe(true)
    })

    it('detects GLM-4-V models', () => {
      expect(getModelCapabilities('glm-4-9b-v').vision).toBe(true)
      expect(getModelCapabilities('glm-4v').vision).toBe(true)
    })

    it('detects multimodal models', () => {
      expect(getModelCapabilities('some-multimodal-model').vision).toBe(true)
    })

    it('returns false for text-only models', () => {
      expect(getModelCapabilities('llama-3-8b').vision).toBe(false)
      expect(getModelCapabilities('qwen2-7b').vision).toBe(false)
    })
  })

  describe('tools capability', () => {
    it('detects Qwen 2.5+ models', () => {
      expect(getModelCapabilities('qwen2.5-7b').tools).toBe(true)
      expect(getModelCapabilities('qwen3-8b').tools).toBe(true)
    })

    it('detects Llama 3.1+ models', () => {
      expect(getModelCapabilities('llama-3.1-8b').tools).toBe(true)
      expect(getModelCapabilities('llama-3.2-8b').tools).toBe(true)
      expect(getModelCapabilities('llama-4-8b').tools).toBe(true)
    })

    it('detects Schematron models', () => {
      expect(getModelCapabilities('schematron-7b').tools).toBe(true)
    })

    it('detects DeepSeek models', () => {
      expect(getModelCapabilities('deepseek-coder-7b').tools).toBe(true)
    })

    it('detects Mistral large models', () => {
      expect(getModelCapabilities('mistral-large-123b').tools).toBe(true)
    })

    it('detects Phi-4 models', () => {
      expect(getModelCapabilities('phi-4-mini').tools).toBe(true)
    })

    it('detects GLM-4 models', () => {
      expect(getModelCapabilities('glm-4-9b').tools).toBe(true)
    })

    it('detects models with tool/function keywords', () => {
      expect(getModelCapabilities('some-model-tool').tools).toBe(true)
      expect(getModelCapabilities('some-model-fc').tools).toBe(true)
      expect(getModelCapabilities('agent-model').tools).toBe(true)
    })

    it('returns false for basic models', () => {
      expect(getModelCapabilities('phi-2').tools).toBe(false)
    })
  })

  describe('thinking capability', () => {
    it('detects DeepSeek-R1 models', () => {
      expect(getModelCapabilities('deepseek-r1-7b').thinking).toBe(true)
      expect(getModelCapabilities('deepseek-r1-lite').thinking).toBe(true)
    })

    it('detects Phi-4-mini models', () => {
      expect(getModelCapabilities('phi-4-mini').thinking).toBe(true)
    })

    it('detects GLM-4 models', () => {
      expect(getModelCapabilities('glm-4-9b').thinking).toBe(true)
    })

    it('detects models with thinking/reasoning keywords', () => {
      expect(getModelCapabilities('some-thinking-model').thinking).toBe(true)
      expect(getModelCapabilities('reasoning-model').thinking).toBe(true)
    })

    it('returns false for standard models', () => {
      expect(getModelCapabilities('llama-3-8b').thinking).toBe(false)
      expect(getModelCapabilities('qwen2-7b').thinking).toBe(false)
    })
  })

  describe('json capability', () => {
    it('detects models with json keyword', () => {
      expect(getModelCapabilities('some-model-json').json).toBe(true)
    })

    it('detects Schematron models', () => {
      expect(getModelCapabilities('schematron-7b').json).toBe(true)
    })

    it('returns false for standard models', () => {
      expect(getModelCapabilities('llama-3-8b').json).toBe(false)
      expect(getModelCapabilities('qwen2-7b').json).toBe(false)
    })
  })

  describe('combined capabilities', () => {
    it('returns multiple capabilities for capable models', () => {
      const caps = getModelCapabilities('glm-4-9b-v')
      expect(caps.vision).toBe(true)
      expect(caps.tools).toBe(true)
      expect(caps.thinking).toBe(true)
    })

    it('returns correct mix for Schematron', () => {
      const caps = getModelCapabilities('schematron-7b')
      expect(caps.tools).toBe(true)
      expect(caps.json).toBe(true)
      expect(caps.vision).toBe(false)
    })
  })
})
