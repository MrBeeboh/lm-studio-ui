import { describe, it, expect } from 'vitest'
import { generateId, formatTime, groupByDate, shouldSkipImageResizeForVision } from './utils.js'

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('generates unique ids', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })

  it('follows expected format (timestamp-random)', () => {
    const id = generateId()
    expect(id).toMatch(/^\d+-[a-z0-9]+$/)
  })
})

describe('formatTime', () => {
  it('returns "Just now" for dates within the last minute', () => {
    expect(formatTime(new Date())).toBe('Just now')
    expect(formatTime(Date.now() - 30_000)).toBe('Just now')
  })

  it('returns minutes ago for dates within the last hour', () => {
    const fiveMinAgo = Date.now() - 5 * 60_000
    expect(formatTime(fiveMinAgo)).toBe('5m ago')
    
    const thirtyMinAgo = Date.now() - 30 * 60_000
    expect(formatTime(thirtyMinAgo)).toBe('30m ago')
  })

  it('returns hours ago for dates within the last day', () => {
    const twoHoursAgo = Date.now() - 2 * 3600_000
    expect(formatTime(twoHoursAgo)).toBe('2h ago')
    
    const tenHoursAgo = Date.now() - 10 * 3600_000
    expect(formatTime(tenHoursAgo)).toBe('10h ago')
  })

  it('returns formatted date for older dates', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000)
    const result = formatTime(twoDaysAgo)
    // Should be a locale date string, not relative
    expect(result).not.toMatch(/ago$/)
    expect(result).not.toBe('Just now')
  })

  it('handles numeric timestamps', () => {
    expect(formatTime(Date.now())).toBe('Just now')
  })

  it('handles Date objects', () => {
    expect(formatTime(new Date())).toBe('Just now')
  })
})

describe('groupByDate', () => {
  it('returns empty groups for empty or undefined input', () => {
    expect(groupByDate([])).toEqual({ today: [], yesterday: [], week: [], older: [] })
    expect(groupByDate(null)).toEqual({ today: [], yesterday: [], week: [], older: [] })
    expect(groupByDate(undefined)).toEqual({ today: [], yesterday: [], week: [], older: [] })
  })

  it('groups conversations by date correctly', () => {
    const now = Date.now()
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    
    const conversations = [
      { id: '1', updatedAt: now }, // today
      { id: '2', updatedAt: now - 86400_000 - 1000 }, // yesterday
      { id: '3', updatedAt: now - 3 * 86400_000 }, // this week
      { id: '4', updatedAt: now - 10 * 86400_000 }, // older
    ]

    const groups = groupByDate(conversations)
    expect(groups.today.map(c => c.id)).toContain('1')
    expect(groups.older.map(c => c.id)).toContain('4')
  })

  it('uses createdAt as fallback when updatedAt is missing', () => {
    const now = Date.now()
    const conversations = [
      { id: '1', createdAt: now },
      { id: '2', createdAt: now - 10 * 86400_000 },
    ]

    const groups = groupByDate(conversations)
    expect(groups.today.map(c => c.id)).toContain('1')
    expect(groups.older.map(c => c.id)).toContain('2')
  })

  it('handles conversations with no timestamps (defaults to older)', () => {
    const conversations = [{ id: '1' }]
    const groups = groupByDate(conversations)
    expect(groups.older.map(c => c.id)).toContain('1')
  })
})

describe('shouldSkipImageResizeForVision', () => {
  it('returns false for null, undefined, or non-string input', () => {
    expect(shouldSkipImageResizeForVision(null)).toBe(false)
    expect(shouldSkipImageResizeForVision(undefined)).toBe(false)
    expect(shouldSkipImageResizeForVision('')).toBe(false)
    expect(shouldSkipImageResizeForVision(123)).toBe(false)
  })

  it('returns true for Qwen-VL 4B models', () => {
    expect(shouldSkipImageResizeForVision('qwen-vl-4b')).toBe(true)
    expect(shouldSkipImageResizeForVision('Qwen-VL-4B-Instruct')).toBe(true)
    expect(shouldSkipImageResizeForVision('qwen2-vl-4b')).toBe(true)
  })

  it('returns true for Qwen-VL 8B models', () => {
    expect(shouldSkipImageResizeForVision('qwen-vl-8b')).toBe(true)
    expect(shouldSkipImageResizeForVision('Qwen-VL-8B-Instruct')).toBe(true)
    expect(shouldSkipImageResizeForVision('qwen2-vl-8b')).toBe(true)
  })

  it('returns false for other Qwen-VL models', () => {
    expect(shouldSkipImageResizeForVision('qwen-vl-2b')).toBe(false)
    expect(shouldSkipImageResizeForVision('qwen-vl-72b')).toBe(false)
  })

  it('returns false for non-Qwen models', () => {
    expect(shouldSkipImageResizeForVision('llama-3-vision')).toBe(false)
    expect(shouldSkipImageResizeForVision('gpt-4-vision')).toBe(false)
    expect(shouldSkipImageResizeForVision('minicpm-v-8b')).toBe(false)
  })
})
