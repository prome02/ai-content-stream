# 內容生成系統增強計畫

## 問題背景

目前生成的內容太貧乏，每篇只有兩三句話。根本原因：
- 提示詞明確要求「280 字元以下，Twitter 風格短貼文」
- 缺乏外部資訊來源，內容空泛
- 提示詞結構固定，缺乏變化

---

## 改善目標

1. 內容從「短貼文」升級為「豐富文章」（200-1200 字，根據情境調整）
2. 加入真實新聞素材，內容有依據
3. 提示詞模組化，產生多樣化內容
4. 根據用戶行為自動調整內容類型和深度

---

## 一、興趣分類調整（MVP 精簡）

### 保留的分類（Google 新聞友好）

| 新分類名稱 | 原分類 | 說明 |
|-----------|--------|------|
| 科技新知 | ai, tech, science | 合併為一類 |
| 商業財經 | business | 維持 |
| 健康生活 | health, food | 合併為一類 |
| 旅遊探索 | travel | 維持 |
| 運動體育 | sports | 維持 |
| 時尚潮流 | fashion | 維持 |

### 暫時移除的分類

- anime, games, music, movies, design, learning
- 原因：這些分類不適合從 Google 新聞取得內容
- 未來可視用戶需求再加入，並配置專門的內容來源

### 需修改的檔案

- `app/onboarding/interests/page.tsx` - 興趣選擇頁面
- `lib/prompt-builder.ts` - INTEREST_TO_HASHTAG 映射表
- `types/index.ts` - 興趣類型定義（如有）

---

## 二、外部內容來源整合

### 主要來源：Google 新聞 RSS

```
URL 格式：https://news.google.com/rss/search?q={關鍵字}&hl=zh-TW&gl=TW
```

- 根據用戶興趣組合搜尋關鍵字
- 地區偵測：使用瀏覽器語言設定（`navigator.language`）
- 每次抓取 5-10 則相關新聞

### 備用來源：Google 搜尋

- 當新聞結果不足時使用
- 搜尋「{興趣} 最新」或「{興趣} 趨勢」

### 新聞素材處理流程

```
1. 抓取 RSS → 解析 XML
2. 提取：標題、摘要、連結、發布時間
3. 篩選：24-48 小時內的新聞優先
4. 格式化為結構化摘要
```

### 給 LLM 的素材格式

```
【新聞素材 1】
標題：{標題}
關鍵事實：
  - {事實點 1}
  - {事實點 2}
  - {事實點 3}
來源連結：{URL}

【新聞素材 2】
...
```

### 需新增的檔案

- `lib/news-fetcher.ts` - Google 新聞 RSS 抓取與解析
- `lib/news-summarizer.ts` - 新聞摘要處理（可選，或直接用 RSS 摘要）

### 需修改的檔案

- `app/api/generate/route.ts` - 整合新聞抓取流程
- `lib/prompt-builder.ts` - 加入素材模組

---

## 三、用戶互動方式調整

### 互動類型（按重要性排序）

| 互動 | 觸發方式 | 用途 |
|------|---------|------|
| 讚 | 用戶點擊 | 正向信號，增加該主題/風格權重 |
| 不讚 | 用戶點擊 | 負向信號，減少該主題/風格權重 |
| 意見 | 用戶輸入文字 | 最高價值信號，直接注入提示詞給 LLM 解讀 |
| 無感覺 | 可見 >3 秒但無互動 | 中性偏負，內容可能需要換方向 |

### 行為推測邏輯

| 行為模式 | 推測 | 調整 |
|---------|------|------|
| 停留時間長 + 讚 | 想要深度內容 | 增加內容深度 |
| 快速滑過多篇 | 想要輕量瀏覽 | 減少內容長度 |
| 同主題連續讚 | 對主題有興趣 | 提供該主題深度文章 |
| 連續無感覺 | 內容不吸引人 | 換角度/風格/主題 |
| 有文字意見 | 明確需求 | 直接納入提示詞 |

### 需修改的檔案

- `app/components/ContentCard.tsx` - 加入意見輸入 UI
- `app/hooks/useInteractionTracking.ts` - 加入無感覺判定邏輯
- `app/api/interaction/route.ts` - 處理意見文字儲存
- `lib/user-data.ts` - 儲存用戶意見歷史

---

## 四、提示詞模組化架構

### 模組結構

```
提示詞 = 組合以下模組
├── [角色模組]      誰在寫？（隨機抽選）
├── [素材模組]      新聞摘要（固定注入）
├── [觀點模組]      什麼角度？（隨機抽選）
├── [深度模組]      多長多深？（行為決定）
├── [形式模組]      什麼結構？（隨機抽選）
├── [語氣模組]      什麼口吻？（用戶偏好 + 隨機）
└── [用戶脈絡模組]  偏好 + 互動歷史 + 意見（固定注入）
```

### 各模組變體定義

#### 角色模組
```typescript
const ROLE_VARIANTS = [
  { id: 'analyst', name: '產業分析師', description: '專業、數據導向、洞察趨勢' },
  { id: 'storyteller', name: '說故事的人', description: '生動、有畫面感、引人入勝' },
  { id: 'pragmatist', name: '實用主義者', description: '直接、重點明確、可行動' },
  { id: 'observer', name: '生活觀察家', description: '貼近生活、有共鳴、輕鬆' },
  { id: 'critic', name: '獨立評論員', description: '批判思考、多角度、不盲從' },
]
```

#### 觀點模組
```typescript
const PERSPECTIVE_VARIANTS = [
  { id: 'optimistic', prompt: '從正面角度出發，強調機會、好處、樂觀面向' },
  { id: 'critical', prompt: '從批判角度出發，探討風險、挑戰、需要注意的地方' },
  { id: 'practical', prompt: '從實用角度出發，說明如何應用、具體行動建議' },
  { id: 'contextual', prompt: '從脈絡角度出發，解釋為什麼重要、歷史背景、來龍去脈' },
  { id: 'futuristic', prompt: '從未來角度出發，預測趨勢、可能的發展方向' },
]
```

#### 深度模組（根據用戶行為決定）
```typescript
const DEPTH_VARIANTS = [
  { id: 'brief', wordCount: '200-300', trigger: '快速滑過、短停留' },
  { id: 'standard', wordCount: '400-600', trigger: '一般互動' },
  { id: 'deep', wordCount: '800-1200', trigger: '長停留、連續讚、有意見' },
]
```

#### 形式模組
```typescript
const FORMAT_VARIANTS = [
  { id: 'opinion', structure: '觀點陳述：論點 → 論據 → 結論' },
  { id: 'qa', structure: '問答形式：提出問題 → 逐一解答' },
  { id: 'list', structure: '清單條列：重點列舉，易於掃讀' },
  { id: 'narrative', structure: '故事敘述：情境 → 轉折 → 啟發' },
]
```

### 組合邏輯

```typescript
function buildPrompt(context: PromptContext): string {
  // 固定模組
  const material = formatNewsMaterial(context.news)
  const userContext = formatUserContext(context.user)

  // 行為決定模組
  const depth = selectDepthByBehavior(context.recentBehavior)

  // 隨機抽選模組
  const role = randomSelect(ROLE_VARIANTS)
  const perspective = randomSelect(PERSPECTIVE_VARIANTS)
  const format = randomSelect(FORMAT_VARIANTS)

  // 組合
  return combineModules({ role, material, perspective, depth, format, userContext })
}
```

### 需修改的檔案

- `lib/prompt-builder.ts` - 重構為模組化架構
- 新增 `lib/prompt-modules.ts` - 各模組變體定義
- 新增 `lib/prompt-selector.ts` - 模組選擇邏輯

---

## 五、關鍵字快速意見功能

### 設計理念

- 超連結不是跳轉到外部網站，而是作為「快速意見輸入」的互動方式
- 比手動輸入文字更快、更直覺
- 用戶點擊關鍵字 = 表達對該主題/概念的興趣
- 點擊的關鍵字會作為下一篇文章生成的明確參考方向

### 規格

- 每篇文章包含 3-5 個可點擊的關鍵字
- LLM 在生成時標記可互動的關鍵字
- 點擊關鍵字後：
  1. 視覺反饋（高亮/動畫）
  2. 記錄到用戶意見歷史
  3. 下一篇文章會優先往該方向深入

### 互動流程

```
用戶閱讀文章
    ↓
看到關鍵字「量子運算」（可點擊樣式）
    ↓
點擊 → 記錄意見：{ type: 'keyword_click', value: '量子運算' }
    ↓
下一篇文章生成時，提示詞包含：「用戶對『量子運算』有興趣，請往這個方向深入」
```

### 輸出格式調整

```json
{
  "content": "文章內容，其中 {{keyword:量子運算}} 和 {{keyword:AI晶片}} 是可點擊的關鍵字",
  "keywords": ["量子運算", "AI晶片", "半導體"],
  "topics": ["科技", "硬體"],
  "style": "casual"
}
```

### 與「意見輸入」的關係

| 互動方式 | 速度 | 精確度 | 使用情境 |
|---------|------|--------|---------|
| 點擊關鍵字 | 快 | 中（LLM 預設選項） | 快速表達興趣方向 |
| 輸入文字意見 | 慢 | 高（用戶自訂） | 明確指定需求 |

兩者互補，點擊關鍵字是輕量版的意見輸入。

### 需修改的檔案

- `lib/prompt-builder.ts` - 輸出格式要求、關鍵字標記指示
- `app/api/generate/route.ts` - 解析關鍵字格式
- `app/components/ContentCard.tsx` - 渲染可點擊關鍵字、處理點擊事件
- `lib/user-data.ts` - 儲存關鍵字點擊記錄

---

## 六、實作順序與任務清單

### Phase 1：基礎調整

| 任務編號 | 任務名稱 | 狀態 | 需修改檔案 |
|---------|---------|------|-----------|
| 1-1 | 調整興趣分類（精簡為 6 類） | pending | `app/onboarding/interests/page.tsx`, `lib/prompt-builder.ts`, `types/index.ts` |
| 1-2 | 移除 280 字元限制，改為動態深度 | pending | `lib/prompt-builder.ts` |
| 1-3 | 加入「無感覺」判定邏輯 | pending | `app/hooks/useInteractionTracking.ts` |

### Phase 2：新聞整合

| 任務編號 | 任務名稱 | 狀態 | 需修改檔案 |
|---------|---------|------|-----------|
| 2-1 | 實作 Google 新聞 RSS 抓取 | pending | 新增 `lib/news-fetcher.ts` |
| 2-2 | 新聞素材格式化 | pending | `lib/news-fetcher.ts` |
| 2-3 | 整合新聞到生成流程 | pending | `app/api/generate/route.ts`, `lib/prompt-builder.ts` |

### Phase 3：提示詞模組化

| 任務編號 | 任務名稱 | 狀態 | 需修改檔案 |
|---------|---------|------|-----------|
| 3-1 | 定義提示詞各模組變體 | pending | 新增 `lib/prompt-modules.ts` |
| 3-2 | 實作模組選擇邏輯 | pending | 新增 `lib/prompt-selector.ts` |
| 3-3 | 重構 prompt-builder 為模組化架構 | pending | `lib/prompt-builder.ts` |

### Phase 4：互動增強

| 任務編號 | 任務名稱 | 狀態 | 需修改檔案 |
|---------|---------|------|-----------|
| 4-1 | 加入意見輸入 UI | pending | `app/components/ContentCard.tsx` |
| 4-2 | 意見文字儲存與使用 | pending | `app/api/interaction/route.ts`, `lib/user-data.ts` |
| 4-3 | 行為推測邏輯完善 | pending | `lib/prompt-selector.ts`, `lib/user-data.ts` |

### Phase 5：關鍵字快速意見功能

| 任務編號 | 任務名稱 | 狀態 | 需修改檔案 |
|---------|---------|------|-----------|
| 5-1 | 調整 LLM 輸出格式（支援關鍵字標記） | pending | `lib/prompt-builder.ts` |
| 5-2 | 實作可點擊關鍵字與意見記錄 | pending | `app/api/generate/route.ts`, `app/components/ContentCard.tsx`, `lib/user-data.ts` |

---

## 七、驗證方式

### 功能驗證
1. 選擇不同興趣，確認能抓到對應新聞
2. 多次生成同主題內容，確認風格有變化
3. 模擬不同互動行為，確認深度有調整
4. 輸入文字意見，確認下次生成有反映
5. 點擊關鍵字，確認下一篇文章往該方向深入

### 內容品質驗證
- 文章長度符合預期（200-1200 字）
- 內容基於真實新聞，非空泛生成
- 關鍵字可點擊且正確記錄用戶興趣
- 不同角色/觀點的內容風格明顯不同

---

## 八、需修改/新增的檔案總覽

### 新增檔案
| 檔案路徑 | 用途 |
|---------|------|
| `lib/news-fetcher.ts` | Google 新聞 RSS 抓取與解析 |
| `lib/prompt-modules.ts` | 提示詞模組變體定義 |
| `lib/prompt-selector.ts` | 模組選擇邏輯 |

### 修改檔案
| 檔案路徑 | 修改內容 |
|---------|---------|
| `app/onboarding/interests/page.tsx` | 興趣分類調整為 6 類 |
| `app/api/generate/route.ts` | 整合新聞、移除字數限制、解析關鍵字格式 |
| `app/components/ContentCard.tsx` | 意見輸入 UI、可點擊關鍵字渲染 |
| `app/hooks/useInteractionTracking.ts` | 無感覺判定邏輯 |
| `app/api/interaction/route.ts` | 處理意見文字儲存 |
| `lib/prompt-builder.ts` | 模組化重構、輸出格式調整 |
| `lib/user-data.ts` | 意見儲存、行為資料存取 |
| `types/index.ts` | 新型別定義 |

---

## 九、數據記錄與研究分析

> **MVP 階段目標：** 先埋點記錄數據，未來再進行研究分析。

### 數據收集策略

| 用途 | 儲存位置 | 說明 |
|------|---------|------|
| 即時個人化 | Firestore | 需要即時查詢，用於生成下一篇文章 |
| 長期研究分析 | Firebase Analytics | 自動聚合、內建報表、可匯出 BigQuery |

### Firebase Analytics 自動收集（不需額外開發）

| 數據類型 | 自動事件 | 研究用途 |
|---------|---------|---------|
| 基本屬性 | 設備、語言、地區、OS | 用戶輪廓分析 |
| 會話數據 | `session_start`, `session_duration` | 使用頻率與時長 |
| 頁面瀏覽 | `screen_view` | 頁面流量分析 |
| 參與度 | `user_engagement`, `engagement_time` | 整體黏著度 |
| 留存率 | `first_open`, daily/weekly/monthly active | 用戶留存分析 |

### 需要自訂收集的事件（使用 `logEvent()`）

| 數據類型 | 事件名稱 | 記錄參數 | 研究用途 |
|---------|---------|---------|---------|
| 讚 | `content_like` | `content_id`, `topics`, `style` | 正向偏好分析 |
| 不讚 | `content_dislike` | `content_id`, `topics`, `style` | 負向偏好分析 |
| 關鍵字點擊 | `keyword_click` | `keyword`, `content_id` | 興趣方向追蹤 |
| 意見輸入 | `feedback_submit` | `feedback_text`, `content_id` | 明確需求收集 |
| 無感覺 | `content_skip` | `content_id`, `dwell_time`, `scroll_depth` | 內容無效信號 |
| 內容曝光 | `content_impression` | `content_id`, `topics`, `modules_used` | 曝光量基準 |

### 可選擇性記錄（進階研究用，MVP 可暫緩）

| 數據類型 | 事件名稱 | 記錄參數 |
|---------|---------|---------|
| 滾動深度 | `scroll_milestone` | `depth`: 25%, 50%, 75%, 100% |
| 閱讀時間 | `reading_time` | `duration_seconds` |
| 生成參數 | `content_generated` | `role`, `perspective`, `depth`, `format` |
| 新聞來源 | `news_source_used` | `source_url`, `source_title` |

### Firebase Analytics vs 自己做

| 功能 | 自己做 | 用 Firebase Analytics |
|------|--------|----------------------|
| 基本用戶統計 | 需寫 Firestore 查詢 | 自動有報表 |
| 留存率分析 | 需記錄每日活躍 | 自動計算 |
| 事件漏斗分析 | 需自己算轉換率 | 內建漏斗報表 |
| 用戶分群 | 需自己建立標籤 | 內建 Audiences |
| 資料匯出 | 需自己寫匯出功能 | 可匯出到 BigQuery |

### 實作建議

1. **MVP 階段：** 在現有互動追蹤 Hook 中加入 `logEvent()` 呼叫
2. **資料雙寫：** 即時個人化寫 Firestore，研究分析寫 Firebase Analytics
3. **事件命名規範：** 使用 snake_case，前綴 `content_` 或 `user_`

### 需修改的檔案

| 檔案路徑 | 修改內容 |
|---------|---------|
| `lib/real-firebase.ts` | 加入 Firebase Analytics 初始化 |
| `app/hooks/useInteractionTracking.ts` | 在互動事件中加入 `logEvent()` |
| `app/api/generate/route.ts` | 記錄 `content_generated` 事件（server-side）|

### 未來研究方向（MVP 後）

- 哪些主題組合最受歡迎？
- 哪種角色/觀點模組互動率最高？
- 用戶偏好的內容深度分布？
- 關鍵字點擊熱門排行？
- 意見文字的語意聚類分析？
