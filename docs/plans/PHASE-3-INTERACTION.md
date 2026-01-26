# Phase 3：互動增強

> **目標：** 實作意見輸入 UI、關鍵字點擊功能、完善行為推測邏輯
>
> **前置條件：** Phase 1、Phase 2 已完成
>
> **預期成果：** 用戶可以輸入文字意見、點擊關鍵字表達興趣，系統根據行為調整內容深度

---

## 任務檢查表

- [ ] 3.1 實作關鍵字渲染與點擊功能
- [ ] 3.2 加入意見輸入 UI
- [ ] 3.3 意見與關鍵字點擊儲存
- [ ] 3.4 完善行為推測邏輯
- [ ] 3.5 整合行為資料到生成流程
- [ ] 3.6 階段驗證

---

## 任務 3.1：實作關鍵字渲染與點擊功能

### 目標
將 LLM 輸出中的 `{{keyword:關鍵字}}` 格式渲染為可點擊的元素。

### 需修改檔案
- `app/components/ContentCard.tsx`
- `types/index.ts`

### 執行步驟

**Step 1：在 `types/index.ts` 新增類型**

```typescript
export interface ContentItem {
  // ... 現有欄位
  keywords?: string[]  // 可點擊的關鍵字列表
}

export interface KeywordClickEvent {
  contentId: string
  keyword: string
  timestamp: Date
}
```

**Step 2：建立關鍵字解析與渲染函數**

在 `ContentCard.tsx` 中新增：

```typescript
interface ContentRendererProps {
  content: string
  onKeywordClick: (keyword: string) => void
}

function ContentRenderer({ content, onKeywordClick }: ContentRendererProps) {
  // 解析 {{keyword:關鍵字}} 格式
  const parts = content.split(/(\{\{keyword:[^}]+\}\})/g)

  return (
    <>
      {parts.map((part, index) => {
        const keywordMatch = part.match(/\{\{keyword:([^}]+)\}\}/)

        if (keywordMatch) {
          const keyword = keywordMatch[1]
          return (
            <button
              key={index}
              onClick={() => onKeywordClick(keyword)}
              className="inline-block px-1.5 py-0.5 mx-0.5 text-blue-600
                         bg-blue-50 rounded hover:bg-blue-100
                         transition-colors cursor-pointer underline
                         decoration-dotted underline-offset-2"
              title={`Click to see more about: ${keyword}`}
            >
              {keyword}
            </button>
          )
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}
```

**Step 3：在 ContentCard 中使用**

```typescript
export function ContentCard({ item, onInteraction }: ContentCardProps) {
  const handleKeywordClick = (keyword: string) => {
    console.log(`[ContentCard] Keyword clicked: ${keyword}`)
    onInteraction?.({
      type: 'keyword_click',
      contentId: item.id,
      keyword,
      timestamp: new Date()
    })
  }

  return (
    <article className="...">
      {/* ... 其他內容 */}
      <div className="content-body">
        <ContentRenderer
          content={item.content}
          onKeywordClick={handleKeywordClick}
        />
      </div>
      {/* ... 其他內容 */}
    </article>
  )
}
```

### 驗收條件
- [ ] 關鍵字正確渲染為可點擊樣式
- [ ] 點擊關鍵字觸發回調函數
- [ ] Console 可看到點擊記錄

---

## 任務 3.2：加入意見輸入 UI

### 目標
在 ContentCard 中加入文字意見輸入功能。

### 需修改檔案
- `app/components/ContentCard.tsx`

### 執行步驟

**Step 1：新增意見輸入狀態和 UI**

```typescript
import { useState } from 'react'

export function ContentCard({ item, onInteraction }: ContentCardProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return

    setIsSubmitting(true)
    try {
      onInteraction?.({
        type: 'feedback',
        contentId: item.id,
        feedbackText: feedbackText.trim(),
        timestamp: new Date()
      })
      setFeedbackText('')
      setShowFeedback(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="...">
      {/* ... 內容區域 */}

      {/* 互動按鈕區 */}
      <div className="flex items-center gap-2 mt-4">
        {/* 讚/不讚按鈕（現有） */}

        {/* 意見按鈕 */}
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="px-3 py-1.5 text-sm text-gray-600
                     hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showFeedback ? 'Cancel' : 'Feedback'}
        </button>
      </div>

      {/* 意見輸入區 */}
      {showFeedback && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you want to see more of..."
            className="w-full p-2 text-sm border rounded-lg resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">
              {feedbackText.length}/200
            </span>
            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim() || isSubmitting}
              className="px-4 py-1.5 text-sm text-white bg-blue-500
                         rounded-lg hover:bg-blue-600
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
```

### 驗收條件
- [ ] 點擊按鈕可展開/收起意見輸入區
- [ ] 可輸入文字並送出
- [ ] 送出後清空輸入並收起

---

## 任務 3.3：意見與關鍵字點擊儲存

### 目標
將用戶的意見和關鍵字點擊儲存到 Firestore。

### 需修改檔案
- `lib/user-data.ts`
- `app/api/interaction/route.ts`

### 執行步驟

**Step 1：在 `lib/user-data.ts` 新增儲存函數**

```typescript
import { db } from './real-firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

export interface UserFeedback {
  uid: string
  contentId: string
  feedbackText: string
  timestamp: Date
}

export interface KeywordClick {
  uid: string
  contentId: string
  keyword: string
  timestamp: Date
}

/**
 * 儲存用戶文字意見
 */
export async function saveUserFeedback(feedback: UserFeedback): Promise<void> {
  try {
    await addDoc(collection(db, 'aipcs_user_feedback'), {
      ...feedback,
      timestamp: new Date()
    })
    console.log(`[UserData] Feedback saved for user: ${feedback.uid}`)
  } catch (error) {
    console.error('[UserData] Failed to save feedback:', error)
  }
}

/**
 * 儲存關鍵字點擊
 */
export async function saveKeywordClick(click: KeywordClick): Promise<void> {
  try {
    await addDoc(collection(db, 'aipcs_keyword_clicks'), {
      ...click,
      timestamp: new Date()
    })
    console.log(`[UserData] Keyword click saved: ${click.keyword}`)
  } catch (error) {
    console.error('[UserData] Failed to save keyword click:', error)
  }
}

/**
 * 取得用戶最近的意見
 */
export async function getRecentFeedback(uid: string, count: number = 3): Promise<UserFeedback[]> {
  try {
    const q = query(
      collection(db, 'aipcs_user_feedback'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data() as UserFeedback)
  } catch (error) {
    console.error('[UserData] Failed to get recent feedback:', error)
    return []
  }
}

/**
 * 取得用戶最近點擊的關鍵字
 */
export async function getRecentKeywordClicks(uid: string, count: number = 5): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'aipcs_keyword_clicks'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data().keyword)
  } catch (error) {
    console.error('[UserData] Failed to get recent keyword clicks:', error)
    return []
  }
}
```

**Step 2：更新 `app/api/interaction/route.ts`**

新增處理 `feedback` 和 `keyword_click` 類型：

```typescript
import { saveUserFeedback, saveKeywordClick } from '@/lib/user-data'

// 在 POST handler 中加入
if (type === 'feedback' && feedbackText) {
  await saveUserFeedback({
    uid,
    contentId,
    feedbackText,
    timestamp: new Date()
  })
}

if (type === 'keyword_click' && keyword) {
  await saveKeywordClick({
    uid,
    contentId,
    keyword,
    timestamp: new Date()
  })
}
```

### 驗收條件
- [ ] 意見正確儲存到 Firestore
- [ ] 關鍵字點擊正確儲存
- [ ] 可查詢最近的意見和點擊

---

## 任務 3.4：完善行為推測邏輯

### 目標
根據用戶互動歷史計算行為特徵，決定內容深度。

### 需修改檔案
- `lib/prompt-selector.ts`
- `lib/user-data.ts`

### 執行步驟

**Step 1：在 `lib/user-data.ts` 新增行為統計函數**

```typescript
export interface UserBehaviorStats {
  avgDwellTime: number
  recentLikes: number
  recentDislikes: number
  recentSkips: number
  hasFeedback: boolean
  recentKeywords: string[]
  lastFeedback?: string
}

/**
 * 計算用戶最近的行為統計
 */
export async function getUserBehaviorStats(uid: string): Promise<UserBehaviorStats> {
  try {
    // 取得最近的互動記錄
    const interactionsQuery = query(
      collection(db, 'aipcs_interactions'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    )
    const interactionsSnapshot = await getDocs(interactionsQuery)
    const interactions = interactionsSnapshot.docs.map(doc => doc.data())

    // 統計各類型互動
    let totalDwellTime = 0
    let dwellTimeCount = 0
    let likes = 0
    let dislikes = 0
    let skips = 0

    interactions.forEach(interaction => {
      if (interaction.dwellTime) {
        totalDwellTime += interaction.dwellTime
        dwellTimeCount++
      }
      if (interaction.type === 'like') likes++
      if (interaction.type === 'dislike') dislikes++
      if (interaction.type === 'skip') skips++
    })

    // 取得最近的意見和關鍵字
    const recentFeedback = await getRecentFeedback(uid, 1)
    const recentKeywords = await getRecentKeywordClicks(uid, 5)

    return {
      avgDwellTime: dwellTimeCount > 0 ? totalDwellTime / dwellTimeCount : 10000,
      recentLikes: likes,
      recentDislikes: dislikes,
      recentSkips: skips,
      hasFeedback: recentFeedback.length > 0,
      recentKeywords,
      lastFeedback: recentFeedback[0]?.feedbackText
    }
  } catch (error) {
    console.error('[UserData] Failed to get behavior stats:', error)
    return {
      avgDwellTime: 10000,
      recentLikes: 0,
      recentDislikes: 0,
      recentSkips: 0,
      hasFeedback: false,
      recentKeywords: []
    }
  }
}
```

**Step 2：更新 `lib/prompt-selector.ts` 的選擇邏輯**

```typescript
import { UserBehaviorStats } from './user-data'

/**
 * 根據完整行為統計選擇深度
 */
export function selectDepthFromStats(stats: UserBehaviorStats): DepthModuleId {
  // 有意見或長停留 + 高按讚率 -> 深度內容
  if (stats.hasFeedback) {
    return 'deep'
  }

  if (stats.avgDwellTime > 30000 && stats.recentLikes > stats.recentSkips) {
    return 'deep'
  }

  // 連續無感覺或多不讚 -> 簡短內容
  if (stats.recentSkips > 5 || stats.recentDislikes > 3) {
    return 'brief'
  }

  // 快速瀏覽模式
  if (stats.avgDwellTime < 5000) {
    return 'brief'
  }

  return 'standard'
}

/**
 * 組合用戶意見和關鍵字為提示詞脈絡
 */
export function buildUserContext(stats: UserBehaviorStats): string {
  const parts: string[] = []

  if (stats.lastFeedback) {
    parts.push(`用戶最近表示：「${stats.lastFeedback}」`)
  }

  if (stats.recentKeywords.length > 0) {
    parts.push(`用戶對以下主題有興趣：${stats.recentKeywords.join('、')}`)
  }

  if (stats.recentLikes > stats.recentDislikes * 2) {
    parts.push('用戶對近期內容反應正面')
  } else if (stats.recentDislikes > stats.recentLikes) {
    parts.push('用戶對近期內容反應較負面，請嘗試不同角度')
  }

  return parts.join('\n')
}
```

### 驗收條件
- [ ] 可正確計算用戶行為統計
- [ ] 深度選擇邏輯合理

---

## 任務 3.5：整合行為資料到生成流程

### 目標
在生成內容時使用真實的用戶行為資料。

### 需修改檔案
- `app/api/generate/route.ts`

### 執行步驟

**Step 1：引入行為統計**

```typescript
import { getUserBehaviorStats } from '@/lib/user-data'
import { selectDepthFromStats, buildUserContext } from '@/lib/prompt-selector'
```

**Step 2：在生成流程中使用**

```typescript
// 取得用戶行為統計
const behaviorStats = await getUserBehaviorStats(uid)
console.log(`[Generate] User behavior: likes=${behaviorStats.recentLikes}, skips=${behaviorStats.recentSkips}`)

// 建構提示詞脈絡
const userContext = buildUserContext(behaviorStats)

// 使用模組化提示詞建構
const promptContext = {
  userPreferences: {
    interests: userPreferences?.interests || [],
    language: 'zh-TW'
  },
  news,
  behavior: {
    avgDwellTime: behaviorStats.avgDwellTime,
    recentLikes: behaviorStats.recentLikes,
    recentSkips: behaviorStats.recentSkips,
    hasFeedback: behaviorStats.hasFeedback,
    lastKeywordClick: behaviorStats.recentKeywords[0]
  },
  userFeedback: behaviorStats.lastFeedback,
  userContext
}
```

### 驗收條件
- [ ] 生成時使用真實行為資料
- [ ] Console 可看到行為統計記錄

---

## 任務 3.6：階段驗證

### 驗證步驟

1. **測試關鍵字點擊**
   - 找到包含關鍵字的內容
   - 點擊關鍵字，確認有視覺反饋
   - 檢查 Firestore 是否有記錄

2. **測試意見輸入**
   - 點擊意見按鈕，展開輸入區
   - 輸入意見並送出
   - 檢查 Firestore 是否有記錄

3. **測試行為推測**
   - 連續對多篇內容按「讚」
   - 觀察生成的內容是否變長（深度模式）
   - 連續滑過多篇不互動
   - 觀察生成的內容是否變短（簡短模式）

4. **測試意見影響**
   - 輸入意見如「想看更多關於 AI 的內容」
   - 檢查下一篇內容是否往該方向生成

### 驗收清單

- [ ] 關鍵字可點擊且正確記錄
- [ ] 意見可輸入且正確儲存
- [ ] 行為統計正確計算
- [ ] 內容深度根據行為調整
- [ ] 用戶意見影響生成方向
- [ ] 無 TypeScript 編譯錯誤
- [ ] 無 Console 錯誤

---

## 完成後

Phase 3 完成後，繼續執行 [Phase 4：數據記錄與整合驗證](./PHASE-4-ANALYTICS.md)
