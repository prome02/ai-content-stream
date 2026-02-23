// Browser locale detection and language instruction utilities

// Mapping from locale (or language subtag) to LLM language instruction
const LOCALE_INSTRUCTION_MAP: Record<string, string> = {
  'zh-TW': 'Please write in Traditional Chinese (zh-TW).',
  'zh-CN': 'Please write in Simplified Chinese (zh-CN).',
  'zh': 'Please write in Chinese.',
  'en': 'Please write in English.',
  'ja': 'Please write in Japanese.',
  'ko': 'Please write in Korean.',
  'fr': 'Please write in French.',
  'de': 'Please write in German.',
  'es': 'Please write in Spanish.',
  'pt': 'Please write in Portuguese.',
  'th': 'Please write in Thai.',
  'vi': 'Please write in Vietnamese.',
}

/**
 * Detect the browser's locale from navigator.language.
 * Falls back to 'zh-TW' when running server-side or when navigator is unavailable.
 */
export function getBrowserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'zh-TW'
}

/**
 * Convert a BCP 47 locale string into an LLM-friendly language instruction.
 *
 * Lookup order:
 * 1. Exact match (e.g. 'zh-TW')
 * 2. Language subtag (e.g. 'zh' from 'zh-TW')
 * 3. Fallback using the subtag as a best-effort language name
 */
export function getLanguageInstruction(locale: string): string {
  // 1. Exact match
  if (LOCALE_INSTRUCTION_MAP[locale]) {
    return LOCALE_INSTRUCTION_MAP[locale]
  }

  // 2. Language subtag match
  const subtag = locale.split('-')[0]
  if (LOCALE_INSTRUCTION_MAP[subtag]) {
    return LOCALE_INSTRUCTION_MAP[subtag]
  }

  // 3. Best-effort fallback
  return `Please write in the language identified by locale "${locale}".`
}
