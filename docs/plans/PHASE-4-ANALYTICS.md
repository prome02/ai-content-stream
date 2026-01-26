# Phase 4：數據記錄與整合驗證

> **目標：** 整合 Firebase Analytics 進行數據記錄，完成整體功能驗證
>
> **前置條件：** Phase 1、Phase 2、Phase 3 已完成
>
> **預期成果：** 所有互動事件正確記錄到 Firebase Analytics，系統整體運作正常

---

## 任務檢查表

- [ ] 4.1 初始化 Firebase Analytics
- [ ] 4.2 實作自訂事件記錄
- [ ] 4.3 在互動 Hook 中埋點
- [ ] 4.4 記錄內容生成事件（Server-side）
- [ ] 4.5 整合測試
- [ ] 4.6 最終驗證

---

## 任務 4.1：初始化 Firebase Analytics

### 目標
在專案中啟用 Firebase Analytics。

### 需修改檔案
- `lib/real-firebase.ts`

### 執行步驟

**Step 1：更新 Firebase 初始化**

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'

const firebaseConfig = {
  // ... 現有配置
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Analytics (client-side only)
let analytics: Analytics | null = null

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return null  // Server-side, no analytics
  }

  if (analytics) {
    return analytics
  }

  const supported = await isSupported()
  if (supported) {
    analytics = getAnalytics(app)
    console.log('[Firebase] Analytics initialized')
  } else {
    console.log('[Firebase] Analytics not supported in this environment')
  }

  return analytics
}
```

**Step 2：確認 Firebase Console 設定**

確保 Firebase Console 中已啟用 Analytics。

### 驗收條件
- [ ] Analytics 初始化無錯誤
- [ ] 開發環境可正常載入

---

## 任務 4.2：實作自訂事件記錄

### 目標
建立統一的事件記錄介面。

### 需新增檔案
- `lib/analytics.ts`

### 執行步驟

**建立 `lib/analytics.ts`：**

```typescript
// lib/analytics.ts

import { logEvent } from 'firebase/analytics'
import { getFirebaseAnalytics } from './real-firebase'

/**
 * 事件類型定義
 */
export type AnalyticsEventName =
  | 'content_like'
  | 'content_dislike'
  | 'content_skip'
  | 'keyword_click'
  | 'feedback_submit'
  | 'content_impression'
  | 'content_generated'

/**
 * 事件參數類型
 */
export interface ContentEventParams {
  content_id: string
  topics?: string[]
  style?: string
}

export interface KeywordClickParams {
  keyword: string
  content_id: string
}

export interface FeedbackParams {
  content_id: string
  feedback_length: number
}

export interface ContentGeneratedParams {
  role_module: string
  perspective_module: string
  format_module: string
  depth_module: string
  news_count: number
}

export interface ContentImpressionParams {
  content_id: string
  topics?: string[]
  position: number  // 在 feed 中的位置
}

/**
 * 記錄分析事件
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  params: Record<string, any>
): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics()

    if (!analytics) {
      // 開發環境或不支援時，只記錄到 console
      console.log(`[Analytics] Event: ${eventName}`, params)
      return
    }

    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString()
    })

    console.log(`[Analytics] Logged: ${eventName}`)
  } catch (error) {
    console.error(`[Analytics] Failed to log ${eventName}:`, error)
  }
}

/**
 * 便捷方法：記錄內容讚
 */
export function trackContentLike(params: ContentEventParams): Promise<void> {
  return trackEvent('content_like', params)
}

/**
 * 便捷方法：記錄內容不讚
 */
export function trackContentDislike(params: ContentEventParams): Promise<void> {
  return trackEvent('content_dislike', params)
}

/**
 * 便捷方法：記錄內容跳過（無感覺）
 */
export function trackContentSkip(params: ContentEventParams & { dwell_time: number }): Promise<void> {
  return trackEvent('content_skip', params)
}

/**
 * 便捷方法：記錄關鍵字點擊
 */
export function trackKeywordClick(params: KeywordClickParams): Promise<void> {
  return trackEvent('keyword_click', params)
}

/**
 * 便捷方法：記錄意見提交
 */
export function trackFeedbackSubmit(params: FeedbackParams): Promise<void> {
  return trackEvent('feedback_submit', params)
}

/**
 * 便捷方法：記錄內容曝光
 */
export function trackContentImpression(params: ContentImpressionParams): Promise<void> {
  return trackEvent('content_impression', params)
}
```

### 驗收條件
- [ ] 檔案建立完成
- [ ] 類型定義正確

---

## 任務 4.3：在互動 Hook 中埋點

### 目標
在現有的互動追蹤中加入 Analytics 事件記錄。

### 需修改檔案
- `app/hooks/useInteractionTracking.ts`

### 執行步驟

**Step 1：引入 Analytics 模組**

```typescript
import {
  trackContentLike,
  trackContentDislike,
  trackContentSkip,
  trackKeywordClick,
  trackFeedbackSubmit,
  trackContentImpression
} from '@/lib/analytics'
```

**Step 2：在互動處理中加入埋點**

```typescript
// 處理按讚
async function handleLike(contentId: string, topics: string[]) {
  // 現有邏輯：儲存到 Firestore
  await saveInteraction({ type: 'like', contentId, /* ... */ })

  // 新增：記錄到 Analytics
  await trackContentLike({
    content_id: contentId,
    topics
  })
}

// 處理不讚
async function handleDislike(contentId: string, topics: string[]) {
  await saveInteraction({ type: 'dislike', contentId, /* ... */ })
  await trackContentDislike({
    content_id: contentId,
    topics
  })
}

// 處理無感覺（跳過）
async function handleSkip(contentId: string, dwellTime: number, topics: string[]) {
  await saveInteraction({ type: 'skip', contentId, dwellTime, /* ... */ })
  await trackContentSkip({
    content_id: contentId,
    topics,
    dwell_time: dwellTime
  })
}

// 處理關鍵字點擊
async function handleKeywordClick(contentId: string, keyword: string) {
  await saveKeywordClick({ contentId, keyword, /* ... */ })
  await trackKeywordClick({
    content_id: contentId,
    keyword
  })
}

// 處理意見提交
async function handleFeedbackSubmit(contentId: string, feedbackText: string) {
  await saveUserFeedback({ contentId, feedbackText, /* ... */ })
  await trackFeedbackSubmit({
    content_id: contentId,
    feedback_length: feedbackText.length
  })
}

// 處理內容曝光（進入視窗時）
async function handleContentImpression(contentId: string, topics: string[], position: number) {
  await trackContentImpression({
    content_id: contentId,
    topics,
    position
  })
}
```

### 驗收條件
- [ ] 所有互動類型都有 Analytics 埋點
- [ ] 事件正確發送

---

## 任務 4.4：記錄內容生成事件（Server-side）

### 目標
記錄每次內容生成時使用的模組組合。

### 需修改檔案
- `app/api/generate/route.ts`

### 說明

> **注意：** Firebase Analytics 是 client-side only。Server-side 事件需要使用
> Google Analytics Measurement Protocol 或改為記錄到 Firestore 供後續分析。
>
> MVP 階段建議先記錄到 Firestore，保持簡單。

### 執行步驟

**Step 1：建立生成記錄函數**

在 `lib/user-data.ts` 新增：

```typescript
export interface GenerationRecord {
  uid: string
  contentId: string
  modules: {
    role: string
    perspective: string
    format: string
    depth: string
  }
  newsCount: number
  timestamp: Date
}

/**
 * 記錄內容生成（供後續分析）
 */
export async function recordGeneration(record: GenerationRecord): Promise<void> {
  try {
    await addDoc(collection(db, 'aipcs_generation_records'), {
      ...record,
      timestamp: new Date()
    })
    console.log(`[UserData] Generation recorded: ${record.contentId}`)
  } catch (error) {
    console.error('[UserData] Failed to record generation:', error)
  }
}
```

**Step 2：在生成流程中記錄**

```typescript
// 在成功生成內容後
for (const content of generatedContent) {
  await recordGeneration({
    uid,
    contentId: content.id,
    modules: promptContext._modules || {
      role: 'unknown',
      perspective: 'unknown',
      format: 'unknown',
      depth: 'unknown'
    },
    newsCount: news.length,
    timestamp: new Date()
  })
}
```

### 驗收條件
- [ ] 生成記錄正確儲存到 Firestore
- [ ] 包含使用的模組資訊

---

## 任務 4.5：整合測試

### 目標
測試完整的使用流程。

### 測試場景

**場景 1：新用戶流程**
1. 開啟首頁
2. 登入（Google Sign-In）
3. 完成興趣選擇（6 個分類）
4. 進入 feed 頁面
5. 確認內容正常生成

**場景 2：互動流程**
1. 對第一篇內容按「讚」
2. 滑過第二篇不互動（無感覺）
3. 點擊第三篇的關鍵字
4. 對第四篇輸入意見

**場景 3：個人化驗證**
1. 連續對「科技」主題按讚
2. 觀察後續內容是否偏向科技
3. 輸入意見「想看 AI 應用案例」
4. 觀察下一篇是否往該方向

### 檢查點

```
Console 應該看到：
- [NewsFetcher] Fetching: ...
- [NewsFetcher] Found X recent items
- [Generate] User behavior: likes=X, skips=X
- [Analytics] Logged: content_impression
- [Analytics] Logged: content_like
- [Analytics] Logged: content_skip
- [Analytics] Logged: keyword_click
- [Analytics] Logged: feedback_submit
```

### 驗收條件
- [ ] 新用戶流程順暢
- [ ] 互動正確記錄
- [ ] 個人化有效果

---

## 任務 4.6：最終驗證

### 功能驗證清單

#### Phase 1 功能
- [ ] 興趣選擇顯示 6 個分類
- [ ] 內容長度 200-1200 字（非短貼文）
- [ ] 無感覺判定正常運作

#### Phase 2 功能
- [ ] 新聞抓取正常
- [ ] 內容基於新聞素材生成
- [ ] 不同請求產生不同風格

#### Phase 3 功能
- [ ] 關鍵字可點擊
- [ ] 意見可輸入送出
- [ ] 行為影響內容深度
- [ ] 意見影響生成方向

#### Phase 4 功能
- [ ] Analytics 事件正確發送
- [ ] 生成記錄正確儲存
- [ ] Firestore 資料結構正確

### 資料驗證

**Firestore Collections 檢查：**

```
aipcs_users
├── 用戶資料正確

aipcs_interactions
├── 包含 like, dislike, skip 類型
├── 有 dwellTime, scrollDepth 欄位

aipcs_user_feedback
├── 包含 feedbackText
├── 有 timestamp

aipcs_keyword_clicks
├── 包含 keyword
├── 有 contentId

aipcs_generation_records
├── 包含 modules 資訊
├── 有 newsCount
```

### 效能驗證

- [ ] 首次載入時間 < 3 秒
- [ ] 內容生成時間 < 10 秒（LLM 回應）
- [ ] 互動回應時間 < 500ms

### 問題排除檢查表

如果遇到問題，依序檢查：

1. **新聞抓取失敗**
   - 檢查網路連線
   - 檢查 Google News RSS 是否可存取
   - 檢查 CORS 設定

2. **內容生成失敗**
   - 檢查 Ollama 是否運行
   - 檢查 API 回應格式
   - 檢查 prompt 是否正確

3. **Analytics 未記錄**
   - 確認 Firebase 專案設定
   - 檢查瀏覽器是否支援
   - 確認非 server-side 環境

4. **Firestore 寫入失敗**
   - 檢查安全規則
   - 確認用戶已登入
   - 檢查 Emulator 是否運行

---

## 完成

恭喜！所有階段已完成。

### 後續建議

1. **監控 Firebase Analytics Dashboard**
   - 設定自訂報表
   - 觀察用戶行為模式

2. **效能優化**
   - 新聞快取策略
   - 內容預生成

3. **A/B 測試**
   - 不同模組組合的效果比較
   - 內容深度偏好分析

4. **擴展內容來源**
   - 加入其他 RSS 來源
   - 支援更多興趣分類
