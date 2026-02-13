## 1. Locale Utility Module

- [x] 1.1 Create `lib/locale-utils.ts` with `getBrowserLocale()` function that returns `navigator.language` or falls back to `'zh-TW'`
- [x] 1.2 Add `getLanguageInstruction(locale: string)` function with locale-to-instruction mapping table (zh-TW, zh-CN, en, ja, ko, and fallback)

## 2. Type Definitions

- [x] 2.1 Add optional `locale?: string` field to `GenerateRequest` in `types/index.ts`

## 3. Prompt Builder Integration

- [x] 3.1 Import `getLanguageInstruction` in `lib/prompt-builder.ts`
- [x] 3.2 Replace hardcoded `請使用繁體中文撰寫。` in `buildModularPrompt` with dynamic language instruction based on `context.userPreferences.language`
- [x] 3.3 Update `buildSystemPrompt` language reference to use the locale-based instruction (legacy path)

## 4. Frontend Hook Update

- [x] 4.1 Import `getBrowserLocale` in `app/hooks/useContentGeneration.ts`
- [x] 4.2 Replace hardcoded `language: 'zh-TW'` with detected browser locale in `ModularPromptContext`
- [x] 4.3 Replace hardcoded `locale: 'zh-TW'` in `fetchNews()` call with detected browser locale

## 5. API Route Update

- [x] 5.1 Read `locale` from request body in `app/api/generate/route.ts`, default to `'zh-TW'`
- [x] 5.2 Pass received locale to `ModularPromptContext.userPreferences.language`
- [x] 5.3 Pass received locale to `fetchNews({ locale })` call

## 6. Tests

- [x] 6.1 Add unit tests for `getBrowserLocale()` in a new `tests/locale-utils.test.ts`
- [x] 6.2 Add unit tests for `getLanguageInstruction()` covering known locales and unknown fallback
- [x] 6.3 Add test case in `tests/prompt-system.test.ts` verifying that `buildModularPrompt` uses the provided language locale in system prompt
- [x] 6.4 Run existing test suite to ensure no regressions
