# Phase 2：新聞整合與提示詞模組化

> **目標：** 整合 Google 新聞 RSS 作為內容素材，重構提示詞為模組化架構
>
> **前置條件：** Phase 1 已完成
>
> **預期成果：** 內容基於真實新聞生成，每次生成使用不同的角色/觀點組合

---

## 任務檢查表

- [ ] 2.1 實作 Google 新聞 RSS 抓取
- [ ] 2.2 新聞素材格式化
- [ ] 2.3 定義提示詞模組變體
- [ ] 2.4 實作模組選擇邏輯
- [ ] 2.5 重構 prompt-builder 為模組化架構
- [ ] 2.6 整合新聞到生成流程
- [ ] 2.7 階段驗證

---

## 任務 2.1：實作 Google 新聞 RSS 抓取

### 目標
建立 Google 新聞 RSS 抓取模組，根據用戶興趣取得相關新聞。

### 需新增檔案
- `lib/news-fetcher.ts`

### 執行步驟

**Step 1：建立 `lib/news-fetcher.ts`**

```typescript
// lib/news-fetcher.ts

import { INTEREST_CATEGORIES, InterestCategory } from '@/types'

export interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: Date
  source: string
}

export interface FetchNewsOptions {
  interests: InterestCategory[]
  maxItems?: number
  locale?: string
}

const RSS_BASE_URL = 'https://news.google.com/rss/search'

/**
 * 根據興趣取得 Google 新聞 RSS
 */
export async function fetchNews(options: FetchNewsOptions): Promise<NewsItem[]> {
  const { interests, maxItems = 5, locale = 'zh-TW' } = options

  if (interests.length === 0) {
    console.log('[NewsFetcher] No interests provided, skipping fetch')
    return []
  }

  // 組合搜尋關鍵字
  const keywords = interests
    .flatMap(interest => INTEREST_CATEGORIES[interest]?.keywords || [])
    .slice(0, 3)  // 取前 3 個關鍵字避免過於複雜
    .join(' OR ')

  const url = buildRssUrl(keywords, locale)
  console.log(`[NewsFetcher] Fetching: ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      },
      next: { revalidate: 300 }  // 5 分鐘快取
    })

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`)
    }

    const xml = await response.text()
    const items = parseRssXml(xml)

    // 篩選 48 小時內的新聞
    const recentItems = filterRecentNews(items, 48)

    console.log(`[NewsFetcher] Found ${recentItems.length} recent items`)
    return recentItems.slice(0, maxItems)

  } catch (error) {
    console.error('[NewsFetcher] Error:', error)
    return []
  }
}

function buildRssUrl(query: string, locale: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: locale,
    gl: locale === 'zh-TW' ? 'TW' : 'US',
    ceid: locale === 'zh-TW' ? 'TW:zh-Hant' : 'US:en'
  })
  return `${RSS_BASE_URL}?${params.toString()}`
}

function parseRssXml(xml: string): NewsItem[] {
  // 簡易 XML 解析（Server-side）
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]

    const title = extractTag(itemXml, 'title')
    const description = extractTag(itemXml, 'description')
    const link = extractTag(itemXml, 'link')
    const pubDate = extractTag(itemXml, 'pubDate')
    const source = extractTag(itemXml, 'source')

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        description: cleanHtml(description || ''),
        link,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        source: source || 'Google News'
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = regex.exec(xml)
  return match ? (match[1] || match[2] || '').trim() : null
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function filterRecentNews(items: NewsItem[], hours: number): NewsItem[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  return items.filter(item => item.pubDate.getTime() > cutoff)
}
```

### 驗收條件
- [ ] 檔案建立完成
- [ ] 無 TypeScript 錯誤

---

## 任務 2.2：新聞素材格式化

### 目標
將抓取的新聞轉換為 LLM 可理解的素材格式。

### 需修改檔案
- `lib/news-fetcher.ts`（新增函數）

### 執行步驟

**在 `lib/news-fetcher.ts` 新增格式化函數：**

```typescript
/**
 * 將新聞列表格式化為 LLM 素材
 */
export function formatNewsForPrompt(news: NewsItem[]): string {
  if (news.length === 0) {
    return '【無相關新聞素材】'
  }

  return news.map((item, index) => {
    const dateStr = formatRelativeTime(item.pubDate)
    return `【新聞素材 ${index + 1}】
標題：${item.title}
摘要：${item.description || '無摘要'}
來源：${item.source}
時間：${dateStr}
連結：${item.link}
`
  }).join('\n')
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '剛剛'
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

/**
 * 從新聞中提取關鍵字（供 LLM 標記用）
 */
export function extractKeywordsFromNews(news: NewsItem[]): string[] {
  const keywords = new Set<string>()

  news.forEach(item => {
    // 簡易關鍵字提取：取標題中的重要詞彙
    const words = item.title
      .split(/[\s,，、。！？]+/)
      .filter(word => word.length >= 2 && word.length <= 10)

    words.forEach(word => keywords.add(word))
  })

  return Array.from(keywords).slice(0, 10)
}
```

### 驗收條件
- [ ] 格式化函數正常運作
- [ ] 輸出格式符合預期

---

## 任務 2.3：定義提示詞模組變體

### 目標
建立各種提示詞模組的變體定義。

### 需新增檔案
- `lib/prompt-modules.ts`

### 執行步驟

**建立 `lib/prompt-modules.ts`：**

```typescript
// lib/prompt-modules.ts

/**
 * 角色模組：定義內容創作者的角色
 */
export const ROLE_MODULES = [
  {
    id: 'analyst',
    name: '產業分析師',
    prompt: '你是一位專業的產業分析師，擅長從數據和趨勢中提取洞察，用清晰的邏輯解讀複雜議題。'
  },
  {
    id: 'storyteller',
    name: '說故事的人',
    prompt: '你是一位說故事的人，擅長用生動的敘事和具體的例子，讓抽象的概念變得有畫面感。'
  },
  {
    id: 'pragmatist',
    name: '實用主義者',
    prompt: '你是一位實用主義者，專注於「這對讀者有什麼用」，提供可行動的建議和具體步驟。'
  },
  {
    id: 'observer',
    name: '生活觀察家',
    prompt: '你是一位生活觀察家，擅長從日常生活的角度切入，讓讀者感到親切有共鳴。'
  },
  {
    id: 'critic',
    name: '獨立評論員',
    prompt: '你是一位獨立評論員，不盲從主流觀點，善於提出不同角度的思考和質疑。'
  }
] as const

export type RoleModuleId = typeof ROLE_MODULES[number]['id']

/**
 * 觀點模組：定義內容的切入角度
 */
export const PERSPECTIVE_MODULES = [
  {
    id: 'optimistic',
    name: '正面角度',
    prompt: '從正面角度出發，強調機會、好處、和樂觀的可能性。'
  },
  {
    id: 'critical',
    name: '批判角度',
    prompt: '從批判角度出發，探討風險、挑戰、和需要注意的潛在問題。'
  },
  {
    id: 'practical',
    name: '實用角度',
    prompt: '從實用角度出發，說明如何應用、具體的行動建議。'
  },
  {
    id: 'contextual',
    name: '脈絡角度',
    prompt: '從脈絡角度出發，解釋為什麼重要、歷史背景、來龍去脈。'
  },
  {
    id: 'futuristic',
    name: '未來角度',
    prompt: '從未來角度出發，預測趨勢、可能的發展方向和影響。'
  }
] as const

export type PerspectiveModuleId = typeof PERSPECTIVE_MODULES[number]['id']

/**
 * 形式模組：定義內容的結構
 */
export const FORMAT_MODULES = [
  {
    id: 'opinion',
    name: '觀點陳述',
    prompt: '使用「論點 -> 論據 -> 結論」的結構，清楚表達你的觀點。'
  },
  {
    id: 'qa',
    name: '問答形式',
    prompt: '使用「提出問題 -> 逐一解答」的形式，幫助讀者理解。'
  },
  {
    id: 'list',
    name: '清單條列',
    prompt: '使用「重點列舉」的形式，讓內容易於掃讀和記憶。'
  },
  {
    id: 'narrative',
    name: '故事敘述',
    prompt: '使用「情境 -> 轉折 -> 啟發」的敘事結構。'
  }
] as const

export type FormatModuleId = typeof FORMAT_MODULES[number]['id']

/**
 * 深度模組：定義內容的長度和深度（由行為決定）
 */
export const DEPTH_MODULES = {
  brief: {
    id: 'brief',
    name: '簡短',
    wordCount: { min: 200, max: 300 },
    prompt: '請簡潔扼要，用 200-300 字快速傳達重點。'
  },
  standard: {
    id: 'standard',
    name: '標準',
    wordCount: { min: 400, max: 600 },
    prompt: '請用 400-600 字，提供適中的深度和細節。'
  },
  deep: {
    id: 'deep',
    name: '深度',
    wordCount: { min: 800, max: 1200 },
    prompt: '請深入分析，用 800-1200 字提供詳細的內容和見解。'
  }
} as const

export type DepthModuleId = keyof typeof DEPTH_MODULES
```

### 驗收條件
- [ ] 檔案建立完成
- [ ] 包含 5 種角色、5 種觀點、4 種形式、3 種深度

---

## 任務 2.4：實作模組選擇邏輯

### 目標
建立根據情境選擇模組的邏輯。

### 需新增檔案
- `lib/prompt-selector.ts`

### 執行步驟

**建立 `lib/prompt-selector.ts`：**

```typescript
// lib/prompt-selector.ts

import {
  ROLE_MODULES,
  PERSPECTIVE_MODULES,
  FORMAT_MODULES,
  DEPTH_MODULES,
  RoleModuleId,
  PerspectiveModuleId,
  FormatModuleId,
  DepthModuleId
} from './prompt-modules'

export interface UserBehavior {
  avgDwellTime: number      // 平均停留時間（ms）
  recentLikes: number       // 近期按讚數
  recentSkips: number       // 近期無感覺數
  hasFeedback: boolean      // 是否有文字意見
  lastKeywordClick?: string // 最近點擊的關鍵字
}

export interface SelectedModules {
  role: typeof ROLE_MODULES[number]
  perspective: typeof PERSPECTIVE_MODULES[number]
  format: typeof FORMAT_MODULES[number]
  depth: typeof DEPTH_MODULES[DepthModuleId]
}

/**
 * 根據用戶行為選擇深度
 */
export function selectDepth(behavior: UserBehavior): DepthModuleId {
  // 有文字意見或長停留 + 多按讚 -> 深度內容
  if (behavior.hasFeedback || (behavior.avgDwellTime > 30000 && behavior.recentLikes > 3)) {
    return 'deep'
  }

  // 連續無感覺 -> 簡短內容
  if (behavior.recentSkips > 3) {
    return 'brief'
  }

  // 預設標準深度
  return 'standard'
}

/**
 * 隨機選擇模組
 */
function randomSelect<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * 根據情境選擇所有模組
 */
export function selectModules(behavior: UserBehavior): SelectedModules {
  return {
    role: randomSelect(ROLE_MODULES),
    perspective: randomSelect(PERSPECTIVE_MODULES),
    format: randomSelect(FORMAT_MODULES),
    depth: DEPTH_MODULES[selectDepth(behavior)]
  }
}

/**
 * 取得預設行為（新用戶或無資料時使用）
 */
export function getDefaultBehavior(): UserBehavior {
  return {
    avgDwellTime: 10000,
    recentLikes: 0,
    recentSkips: 0,
    hasFeedback: false
  }
}
```

### 驗收條件
- [ ] 檔案建立完成
- [ ] 深度選擇邏輯正確

---

## 任務 2.5：重構 prompt-builder 為模組化架構

### 目標
重構現有的 prompt-builder，使用模組化架構。

### 需修改檔案
- `lib/prompt-builder.ts`

### 執行步驟

**Step 1：引入新模組**

在檔案頂部加入：

```typescript
import { formatNewsForPrompt, extractKeywordsFromNews, NewsItem } from './news-fetcher'
import { selectModules, getDefaultBehavior, UserBehavior, SelectedModules } from './prompt-selector'
```

**Step 2：新增模組化建構函數**

```typescript
export interface ModularPromptContext {
  userPreferences: {
    interests: string[]
    language: string
  }
  news: NewsItem[]
  behavior: UserBehavior
  userFeedback?: string  // 用戶的文字意見
}

export function buildModularPrompt(context: ModularPromptContext): string {
  const modules = selectModules(context.behavior)
  const newsMaterial = formatNewsForPrompt(context.news)
  const keywords = extractKeywordsFromNews(context.news)

  const systemPrompt = `${modules.role.prompt}

${modules.perspective.prompt}

${modules.format.prompt}

${modules.depth.prompt}

請使用繁體中文撰寫。`

  const userPrompt = `【用戶興趣】
${context.userPreferences.interests.join('、')}

【新聞素材】
${newsMaterial}

【可標記的關鍵字】
以下關鍵字可以在文章中使用 {{keyword:關鍵字}} 格式標記，讓用戶可以點擊：
${keywords.join('、')}

${context.userFeedback ? `【用戶意見】\n用戶表示：「${context.userFeedback}」\n請特別針對這個方向撰寫。\n` : ''}

請根據以上素材，撰寫一篇文章。

輸出格式（JSON）：
{
  "content": "文章內容，使用 {{keyword:關鍵字}} 標記可點擊的關鍵字",
  "keywords": ["關鍵字1", "關鍵字2"],
  "topics": ["主題1", "主題2"],
  "style": "casual"
}`

  // 保持與現有格式相容
  return JSON.stringify({
    model: process.env.OLLAMA_MODEL || 'gemma3:12b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    options: {
      temperature: 0.8,
      top_p: 0.9
    },
    // 記錄使用的模組（供分析用）
    _modules: {
      role: modules.role.id,
      perspective: modules.perspective.id,
      format: modules.format.id,
      depth: modules.depth.id
    }
  })
}
```

**Step 3：保留舊的 build 函數相容性**

確保現有的 `build()` 函數仍可運作，內部呼叫新的模組化函數。

### 驗收條件
- [ ] 新函數 `buildModularPrompt` 可正常運作
- [ ] 舊的 `build` 函數仍相容

---

## 任務 2.6：整合新聞到生成流程

### 目標
在 `/api/generate` 中整合新聞抓取和模組化提示詞。

### 需修改檔案
- `app/api/generate/route.ts`

### 執行步驟

**Step 1：引入新模組**

```typescript
import { fetchNews } from '@/lib/news-fetcher'
import { getDefaultBehavior } from '@/lib/prompt-selector'
```

**Step 2：在生成流程中加入新聞抓取**

找到呼叫 `promptBuilder.build()` 的地方，修改為：

```typescript
// 抓取相關新聞
const news = await fetchNews({
  interests: userPreferences?.interests || [],
  maxItems: 5,
  locale: 'zh-TW'
})

console.log(`[Generate] Fetched ${news.length} news items`)

// 使用模組化提示詞建構
const promptContext = {
  userPreferences: {
    interests: userPreferences?.interests || [],
    language: 'zh-TW'
  },
  news,
  behavior: getDefaultBehavior(),  // 暫時使用預設，Phase 3 會完善
  userFeedback: undefined
}

const prompt = promptBuilder.buildModularPrompt
  ? promptBuilder.buildModularPrompt(promptContext)
  : promptBuilder.build(/* 舊參數 */)
```

### 驗收條件
- [ ] 生成流程整合新聞抓取
- [ ] Console 可看到新聞抓取記錄

---

## 任務 2.7：階段驗證

### 驗證步驟

1. **測試新聞抓取**
   ```bash
   # 可以先寫一個測試腳本
   curl "https://news.google.com/rss/search?q=科技&hl=zh-TW&gl=TW"
   ```

2. **測試內容生成**
   - 進入 feed 頁面
   - 觀察生成的內容是否包含新聞相關資訊
   - 確認內容風格有變化（不同角色/觀點）

3. **檢查 Console 記錄**
   - 確認 `[NewsFetcher]` 記錄
   - 確認使用的模組組合

### 驗收清單

- [ ] 新聞抓取正常運作
- [ ] 內容基於新聞素材生成
- [ ] 不同請求產生不同風格的內容
- [ ] 無 TypeScript 編譯錯誤
- [ ] 無 Console 錯誤

---

## 完成後

Phase 2 完成後，繼續執行 [Phase 3：互動增強](./PHASE-3-INTERACTION.md)
