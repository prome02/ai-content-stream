/**
 * Unit tests for lib/locale-utils.ts
 */

import { getBrowserLocale, getLanguageInstruction } from '@/lib/locale-utils'

// ---------------------------------------------------------------------------
// getBrowserLocale
// ---------------------------------------------------------------------------
describe('getBrowserLocale', () => {
  const originalNavigator = global.navigator

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  test('should return navigator.language when available', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    })
    expect(getBrowserLocale()).toBe('en-US')
  })

  test('should return zh-TW as fallback when navigator is undefined', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(getBrowserLocale()).toBe('zh-TW')
  })

  test('should return zh-TW when navigator.language is empty', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: '' },
      writable: true,
      configurable: true,
    })
    expect(getBrowserLocale()).toBe('zh-TW')
  })

  test('should return the exact BCP 47 string from navigator', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja' },
      writable: true,
      configurable: true,
    })
    expect(getBrowserLocale()).toBe('ja')
  })
})

// ---------------------------------------------------------------------------
// getLanguageInstruction
// ---------------------------------------------------------------------------
describe('getLanguageInstruction', () => {
  test('should return Traditional Chinese instruction for zh-TW', () => {
    const result = getLanguageInstruction('zh-TW')
    expect(result).toContain('Traditional Chinese')
  })

  test('should return Simplified Chinese instruction for zh-CN', () => {
    const result = getLanguageInstruction('zh-CN')
    expect(result).toContain('Simplified Chinese')
  })

  test('should return English instruction for en-US (exact match)', () => {
    // en-US is not in the map, but "en" subtag is
    const result = getLanguageInstruction('en-US')
    expect(result).toContain('English')
  })

  test('should return English instruction for en', () => {
    const result = getLanguageInstruction('en')
    expect(result).toContain('English')
  })

  test('should return Japanese instruction for ja', () => {
    const result = getLanguageInstruction('ja')
    expect(result).toContain('Japanese')
  })

  test('should return Korean instruction for ko', () => {
    const result = getLanguageInstruction('ko')
    expect(result).toContain('Korean')
  })

  test('should return French instruction for fr', () => {
    const result = getLanguageInstruction('fr')
    expect(result).toContain('French')
  })

  test('should return a best-effort fallback for unknown locale', () => {
    const result = getLanguageInstruction('xx-YY')
    expect(result).toContain('xx-YY')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should handle locale with region by subtag fallback', () => {
    // 'en-GB' is not an exact match, but 'en' subtag is
    const result = getLanguageInstruction('en-GB')
    expect(result).toContain('English')
  })
})
