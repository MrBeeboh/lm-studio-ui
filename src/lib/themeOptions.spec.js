import { describe, it, expect } from 'vitest'
import { UI_THEME_OPTIONS } from './themeOptions.js'

describe('UI_THEME_OPTIONS', () => {
  it('is an array of theme options', () => {
    expect(Array.isArray(UI_THEME_OPTIONS)).toBe(true)
    expect(UI_THEME_OPTIONS.length).toBeGreaterThan(0)
  })

  it('each option has value and label properties', () => {
    for (const option of UI_THEME_OPTIONS) {
      expect(option).toHaveProperty('value')
      expect(option).toHaveProperty('label')
      expect(typeof option.value).toBe('string')
      expect(typeof option.label).toBe('string')
    }
  })

  it('has unique values', () => {
    const values = UI_THEME_OPTIONS.map(o => o.value)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('includes essential themes', () => {
    const values = UI_THEME_OPTIONS.map(o => o.value)
    expect(values).toContain('atom')
    expect(values).toContain('default')
    expect(values).toContain('hacker')
    expect(values).toContain('highcontrast')
  })

  it('has descriptive labels', () => {
    const atomTheme = UI_THEME_OPTIONS.find(o => o.value === 'atom')
    expect(atomTheme.label).toContain('ATOM')
    
    const hackerTheme = UI_THEME_OPTIONS.find(o => o.value === 'hacker')
    expect(hackerTheme.label).toContain('Hacker')
  })

  it('maintains expected theme count', () => {
    // Document the current count to catch accidental removals
    expect(UI_THEME_OPTIONS.length).toBe(24)
  })
})
