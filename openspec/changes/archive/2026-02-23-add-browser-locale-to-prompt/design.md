## Context

目前系統在所有語言相關的地方都硬編碼 `'zh-TW'`：
- `useContentGeneration.ts` 中 `language: 'zh-TW'` 和 `locale: 'zh-TW'`
- `/api/generate/route.ts` 中 `language: 'zh-TW'` 和 `locale: 'zh-TW'`
- `buildModularPrompt` 中 system prompt 固定寫 `請使用繁體中文撰寫`

使用者無論瀏覽器語系為何，看到的內容都是中文。需要讓語系從瀏覽器偵測後一路傳遞到 prompt builder。

## Goals / Non-Goals

**Goals:**
- 偵測瀏覽器語系並傳遞至 prompt builder，讓 LLM 使用對應語言生成內容
- 新聞抓取的 locale 也連動瀏覽器語系
- 保持 `zh-TW` 為預設值（SSR 或無法偵測時的 fallback）

**Non-Goals:**
- 不做 UI 國際化（i18n）——介面文字語系不在此次範圍
- 不支援使用者手動選擇語系（未來可加入 settings）
- 不改變已快取內容的語系（新生成的內容才會受影響）

## Decisions

### 1. 語系偵測位置：瀏覽器端（client-side）

語系偵測使用 `navigator.language`，這只能在瀏覽器環境取得。

- **方案 A（採用）**：在前端 hook 中偵測，透過 API request body 傳到後端
- **方案 B**：在後端從 `Accept-Language` header 解析 → 較複雜，且 browser-side Ollama 呼叫不走後端 API

選擇方案 A，因為 `useContentGeneration` 已經直接從瀏覽器呼叫 Ollama，語系在前端取得最直接。後端 `/api/generate` route 則從 request body 接收 locale。

### 2. Locale 格式：BCP 47 標準字串

使用 `navigator.language` 回傳的 BCP 47 格式（如 `zh-TW`、`en-US`、`ja`），不做額外轉換。prompt builder 直接用此字串建構語言指令。

### 3. 語言指令對應策略：locale-to-instruction 映射表

在 prompt builder 中新增一個映射表，將常見 locale 對應到 LLM 語言指令：

```
zh-TW → 繁體中文
zh-CN → 简体中文
en    → English
ja    → Japanese
ko    → Korean
其他  → 使用 locale 字串本身作為語言名稱
```

比較細的 locale（如 `en-US` vs `en-GB`）統一取語言部分（`en`）做主要匹配，完整 locale 作為次要匹配。

### 4. 新增工具函式位置：`lib/locale-utils.ts`

新建一個小型工具模組處理：
- `getBrowserLocale()`: 取得瀏覽器語系，fallback 為 `'zh-TW'`
- `getLanguageInstruction(locale: string)`: 將 locale 轉為 LLM 可理解的語言指令字串

### 5. API 傳遞方式：`GenerateRequest` 新增 `locale` 欄位

在 `types/index.ts` 的 `GenerateRequest` 中新增可選的 `locale?: string` 欄位，讓後端 route 也能接收前端傳來的語系。

## Risks / Trade-offs

- **LLM 語言能力差異** → 某些模型（如 gemma3）對非中英文的語言品質較差。短期內可接受，未來可加入語言品質偵測。
- **新聞來源語系不匹配** → Google News 的 locale 參數可能找不到該語系的新聞。Mitigation：news-fetcher 已有容錯處理，回傳空結果時不影響生成。
- **快取語系混合** → 不同語系的使用者可能看到不同語言的快取內容。短期內快取命中率可能降低，但不影響正確性。
