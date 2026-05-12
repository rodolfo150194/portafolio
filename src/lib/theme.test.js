import { describe, it, expect } from 'vitest'
import { resolveTheme } from './theme.js'

describe('resolveTheme', () => {
  it('returns dark when stored value is null (first visit)', () => {
    expect(resolveTheme(null)).toBe('dark')
  })

  it('returns dark when stored value is "dark"', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns light when stored value is "light"', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns dark for unknown stored values', () => {
    expect(resolveTheme('system')).toBe('dark')
    expect(resolveTheme('')).toBe('dark')
    expect(resolveTheme(undefined)).toBe('dark')
  })
})
