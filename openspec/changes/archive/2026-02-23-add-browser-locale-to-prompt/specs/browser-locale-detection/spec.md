## ADDED Requirements

### Requirement: Detect browser locale
The system SHALL detect the user's browser locale using `navigator.language` and provide a standardized BCP 47 locale string (e.g., `zh-TW`, `en-US`, `ja`) for use by the prompt builder and news fetcher.

#### Scenario: Browser provides locale
- **WHEN** the application runs in a browser environment where `navigator.language` returns `'en-US'`
- **THEN** `getBrowserLocale()` SHALL return `'en-US'`

#### Scenario: Browser locale unavailable (SSR or missing navigator)
- **WHEN** the application runs in a server-side environment or `navigator.language` is unavailable
- **THEN** `getBrowserLocale()` SHALL return `'zh-TW'` as the default fallback

### Requirement: Map locale to language instruction
The system SHALL provide a `getLanguageInstruction(locale: string)` function that converts a BCP 47 locale string into a human-readable language instruction suitable for LLM prompts.

#### Scenario: Known locale zh-TW
- **WHEN** `getLanguageInstruction('zh-TW')` is called
- **THEN** the function SHALL return an instruction string containing "Traditional Chinese" or equivalent guidance for the LLM to write in Traditional Chinese

#### Scenario: Known locale en-US
- **WHEN** `getLanguageInstruction('en-US')` is called
- **THEN** the function SHALL return an instruction string guiding the LLM to write in English

#### Scenario: Known locale ja
- **WHEN** `getLanguageInstruction('ja')` is called
- **THEN** the function SHALL return an instruction string guiding the LLM to write in Japanese

#### Scenario: Unknown or unsupported locale
- **WHEN** `getLanguageInstruction('xx-YY')` is called with an unrecognized locale
- **THEN** the function SHALL return a generic instruction using the locale's language subtag as a best-effort language name

### Requirement: Locale passed via API request
The `GenerateRequest` type SHALL include an optional `locale?: string` field. When the front-end sends a generate request to `/api/generate`, it SHALL include the detected browser locale in the request body.

#### Scenario: Front-end sends locale in request
- **WHEN** the front-end calls `/api/generate` with `{ uid, count, locale: 'en-US' }`
- **THEN** the API route SHALL use `'en-US'` as the locale for prompt building and news fetching

#### Scenario: Front-end omits locale
- **WHEN** the front-end calls `/api/generate` without a `locale` field
- **THEN** the API route SHALL fall back to `'zh-TW'`
