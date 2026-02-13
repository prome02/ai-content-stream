## Why

目前系統的語言設定全部硬編碼為 `zh-TW`，無論使用者的瀏覽器語系為何，生成的內容一律使用繁體中文。這限制了平台的國際化潛力，也不符合使用者期望——當使用者瀏覽器設定為英文或日文時，仍然只能看到中文內容。加入瀏覽器語系偵測後，prompt builder 能根據使用者實際語系生成對應語言的內容，提升使用者體驗。

## What Changes

- 新增瀏覽器語系偵測工具函式，從 `navigator.language` 取得使用者語系
- 將偵測到的語系傳遞至 prompt builder，取代硬編碼的 `'zh-TW'`
- 修改 `buildModularPrompt` 的 system prompt，根據語系動態切換語言指令（例如「請使用繁體中文撰寫」改為根據 locale 動態生成）
- 前端 `useContentGeneration` hook 和後端 `/api/generate` route 都需要傳入實際語系
- 新聞抓取的 locale 也應連動使用偵測到的語系

## Capabilities

### New Capabilities
- `browser-locale-detection`: 偵測瀏覽器語系並提供標準化的 locale 值給系統各層使用

### Modified Capabilities
- `content-generation`: prompt builder 的語言指令從硬編碼改為依據傳入的 locale 動態生成，影響 system prompt 中的語言要求段落

## Impact

- **前端 hooks**: `useContentGeneration.ts` — 需要取得瀏覽器語系並傳入 `ModularPromptContext.userPreferences.language`
- **Prompt Builder**: `lib/prompt-builder.ts` — `buildModularPrompt` 中的語言指令需要動態化
- **API Route**: `app/api/generate/route.ts` — 需要接收前端傳來的 locale 參數
- **News Fetcher**: `lib/news-fetcher.ts` 的 `locale` 參數需要連動
- **Types**: `GenerateRequest` 可能需要新增 `locale` 欄位
- **測試**: `tests/prompt-system.test.ts` 需要新增語系相關測試案例
