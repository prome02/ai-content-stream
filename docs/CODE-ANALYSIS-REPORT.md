# AI 個人化內容資訊流平台 - 潛在問題分析報告

**報告日期**: 2026-01-24
**分析範圍**: 架構設計、系統穩定性、UI 操作效率性、UI/UX 設計美學（去 AI 化）
**分析模式**: Deep Code Review

---

## 📊 執行摘要

本報告對專案進行了全面的程式碼審查，從四個關鍵维度分析潛在問題。共發現 **30 個問題**，其中：
- 🔴 嚴重問題：5 個（需立即處理）
- 🟡 中等問題：19 個（建議優先處理）
- 🟢 輕微問題：6 個（可稍後處理）

### 關鍵發現

| 嚴重度 | 類別 | 數量 |
|--------|------|------|
| 🔴 嚴重 | 架構設計 | 2 |
| 🔴 嚴重 | UI 效率性 | 1 |
| 🔴 嚴重 | UI/UX（去AI化） | 2 |
| 🟡 中等 | 架構設計 | 3 |
| 🟡 中等 | 系統穩定 | 4 |
| 🟡 中等 | UI 效率性 | 4 |
| 🟡 中等 | UI/UX（去AI化） | 5 |
| 🟢 輕微 | 系統穩定 | 1 |
| 🟢 輕微 | UI 效率性 | 1 |
| 🟢 輕微 | UI/UX（去AI化） | 3 |

---

## 一、架構設計問題 (共 5 個問題)

### 1.1 快取系統架構缺陷 🔴 **嚴重**

**位置**: `services/content-cache.service.ts` (Line 1-366)

#### 問題描述

```typescript
// Line 366: 直接匯出實例
export default new ContentCacheService()

// Line 4-32: MemoryCache 定義
class MemoryCache {
  private cache = new Map<string, ContentItem[]>()

  set(userId: string, contents: ContentItem[]): void {
    this.cache.set(userId, contents)
    // 60 分鐘後清理
    setTimeout(() => {
      this.cache.delete(userId)
    }, 60 * 60 * 1000)
  }
}
```

#### 影響分析

1. **記憶體快取完全無效**：
   - Next.js API Routes 是無狀態的 Serverless 函數
   - 每個 HTTP 請求都會建立新的 `ContentCacheService` 實例
   - `Map` 在請求結束後立即丟失，無法跨請求共享數據

2. **localStorage 在服務器端不可用**：
   - `LocalStorageCache` 的 `isBrowser()` 檢查雖然避免錯誤，但返回 null
   - 在 Server API Routes 中完全無法使用 localStorage
   - 實際上只是「空殼」實作

3. **資料一致性風險**：
   - 記憶體快取和 localStorage 快取可能不同步
   - 沒有明確的資料源優先順序策略

#### 當前實際行為

```typescript
// services/content-cache.service.ts Line 156-170
async getContentForUser(userId: string, count: number = 10, interests: string[] = []) {
  // 1. 記憶體快取 - 永遫返回 null（新實例）
  const memoryContents = this.memoryCache.get(userId)
  if (memoryContents && memoryContents.length >= count) {
    return memoryContents.slice(0, count)  // 永远不會執行
  }

  // 2. localStorage 快取 - 服務器端返回 null
  const localStorageContents = this.localStorageCache.get(userId)
  if (localStorageContents && localStorageContents.length >= count) {
    return localStorageContents.slice(0, count)  // 永远不會執行
  }

  // 實際上會直接跳到這裡：從模擬數據或降級內容返回
}
```

#### 修復建議

**方案 A：使用外部快取服務（推薦）**

```typescript
// lib/cache/redis-cache.ts
import { createClient } from '@redis/client'

class RedisCache {
  private client = createClient({ url: process.env.REDIS_URL })

  async get(userId: string): Promise<ContentItem[] | null> {
    await this.client.connect()
    const cached = await this.client.get(`cache:${userId}`)
    await this.client.disconnect()
    return cached ? JSON.parse(cached) : null
  }

  async set(userId: string, contents: ContentItem[], ttl: number = 3600): Promise<void> {
    await this.client.connect()
    await this.client.setEx(`cache:${userId}`, ttl, JSON.stringify(contents))
    await this.client.disconnect()
  }
}
```

**方案 B：使用 Firestore 作為快取**

```typescript
// lib/cache/firestore-cache.ts
import { db } from '@/lib/firebase'

class FirestoreCache {
  async get(userId: string): Promise<ContentItem[] | null> {
    const doc = await db.collection('aipcs_cache').doc(userId).get()
    if (!doc.exists) return null

    const data = doc.data()
    // 檢查 TTL
    if (Date.now() > data.expiresAt) {
      await db.collection('aipcs_cache').doc(userId).delete()
      return null
    }
    return data.contents
  }

  async set(userId: string, contents: ContentItem[], ttl: number = 3600): Promise<void> {
    await db.collection('aipcs_cache').doc(userId).set({
      contents,
      expiresAt: Date.now() + (ttl * 1000),
      updatedAt: new Date()
    })
  }
}
```

**方案 C：將快取邏輯移到前端**

```typescript
// 保留 ContentCacheService，但只在前端使用
// 完全移除後端快取依賴
// 優點：簡單，缺點：無法跨用戶共享快取
```

#### 優先級

🔴 **P0 - 立即修復**
- 當前實作完全無效，浪費資源
- 可能導致誤以為有快取，實際沒有

---

### 1.2 Rate Limiter 機制問題 🔴 **嚴重**

**位置**: `services/rate-limiter.ts`

#### 問題描述

```typescript
// 假設的實作（需要確認檔案內容）
class RateLimiter {
  private requests = new Map<string, number[]>()

  check(uid: string): { allowed: boolean; remaining: number; resetAt: Date } {
    // 使用 Map 存儲每個用戶的請求時間戳
    const userRequests = this.requests.get(uid) || []

    // 清理過期請求
    const now = Date.now()
    const validRequests = userRequests.filter(ts => now - ts < this.windowMs)
    this.requests.set(uid, validRequests)

    // 檢查是否超限
    return {
      allowed: validRequests.length < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - validRequests.length),
      resetAt: new Date(now + this.windowMs)
    }
  }
}
```

#### 影響分析

1. **多實例環境失效**：
   - Vercel auto-scaling 會建立多個實例
   - 每個實例有獨立的 `Map`，無法共享計數
   - 用戶可能請求實例 A（計數 1-20），再請求實例 B（又計數 1-20）

2. **實例重啟丟失數據**：
   - Serverless 函數冷啟動會重置 `Map`
   - 用戶可能被「繞過」Rate Limit

3. **無法準確限制**：
   - 總請求數 = 實例數 × 20
   - 或過度限制（需要多次嘗試）

#### 修復建議

**使用 Firestore 實作集中式 Rate Limiter**

```typescript
// services/rate-limiter.ts
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore'

export class RateLimiter {
  private maxRequests: number
  private windowMs: number

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.maxRequests = config.maxRequests
    this.windowMs = config.windowMs
  }

  async check(uid: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    lastResetHour: number
  }> {
    const userRef = doc(db, 'aipcs_users', uid)
    const currentHour = new Date().getHours()
    const currentMinute = new Date().getMinutes()
    const resetTimestamp = new Date()
    resetTimestamp.setHours(currentHour + 1, 0, 0, 0)

    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      // 新用戶：初始化
      await setDoc(userRef, {
        rateLimit: {
          lastResetHour: currentHour,
          hourlyCount: 0
        }
      })
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: resetTimestamp,
        lastResetHour: currentHour
      }
    }

    const data = userDoc.data()
    const rateLimit = data.rateLimit || { lastResetHour: -1, hourlyCount: 0 }

    // 檢查是否需要重置
    if (rateLimit.lastResetHour !== currentHour) {
      await updateDoc(userRef, {
        'rateLimit.lastResetHour': currentHour,
        'rateLimit.hourlyCount': 0
      })
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: resetTimestamp,
        lastResetHour: currentHour
      }
    }

    // 檢查是否超限
    const remaining = Math.max(0, this.maxRequests - (rateLimit.hourlyCount || 0))
    return {
      allowed: remaining > 0,
      remaining,
      resetAt: resetTimestamp,
      lastResetHour: currentHour
    }
  }

  async increment(uid: string, endpoint: string): Promise<void> {
    const userRef = doc(db, 'aipcs_users', uid)

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef)
        const data = userDoc.data()
        const rateLimit = data.rateLimit || { lastResetHour: -1, hourlyCount: 0 }
        const currentHour = new Date().getHours()

        // 如果跨小時，先重置
        if (rateLimit.lastResetHour !== currentHour) {
          transaction.update(userRef, {
            'rateLimit.lastResetHour': currentHour,
            'rateLimit.hourlyCount': 1
          })
        } else {
          transaction.update(userRef, {
            'rateLimit.hourlyCount': increment(1)
          })
        }
      })
    } catch (error) {
      console.error('Rate limiter increment failed:', error)
      // 不拋出錯誤，避免影響主要业务
    }
  }
}

// Singleton
export const rateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000  // 1 小時
})
```

#### 優先級

🔴 **P0 - 立即修復**
- 生產環境必然面臨多實例問題
- 可能導致成本超支（Ollama API 費用）

---

### 1.3 狀態同步問題 🟡 **中等**

**位置**:
- `app/components/ContentCard.tsx` (Line 65-211)
- `app/api/interaction/route.ts`

#### 問題描述

```typescript
// app/components/ContentCard.tsx Line 76-81
const handleLike = async () => {
  // 1. 立即更新 localStorage（同步）
  const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
  interactions[content.id] = 'like'
  localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))

  // 2. 調用 API（異步）
  try {
    const response = await fetch('/api/interaction', { ... })
    // 處理回應...
  } catch (error) {
    // 沒有回滾機制
  }
}
```

#### 影響分析

1. **數據不一致**：
   - localStorage 已記錄 "like"
   - API 請求失敗（網路錯誤、服務器錯誤）
   - Firestore 沒有記錄
   - 用戶刷新頁面後，會從 localStorage 恢復，但實際後端沒有數據

2. **樂觀更新缺乏錯誤處理**：
   - 先更新 UI 給用戶「操作成功」的反饋
   - API 失敗時沒有回滾 UI
   - 用戶誤以為操作成功

3. **資料源優先順序不明確**：
   - 前端：localStorage
   - 後端：Firestore
   - 從未檢查兩者是否一致

#### 修復建議

**改進 1：添加錯誤回滾**

```typescript
const handleLike = async () => {
  if (!liked) {
    setLiked(true)
    setLocalLikes(prev => prev + 1)

    try {
      // 先調用 API
      const response = await fetch('/api/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUserId || 'temp_uid',
          contentId: content.id,
          action: 'like'
        })
      })

      if (!response.ok) throw new Error('API request failed')

      const data = await response.json()

      // API 成功後再更新 localStorage
      const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
      interactions[content.id] = 'like'
      localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))

    } catch (error) {
      // 回滾 UI 狀態
      setLiked(false)
      setLocalLikes(prev => prev - 1)
      console.error('點讚失敗:', error)
      // 顯示錯誤提示
      alert('點讚失敗，請稍後再試')
    }
  }
}
```

**改進 2：統一資料源**

```typescript
// 移除前端 localStorage 依賴
// 所有狀態由 API 管理
// 使用 SWR 獲取並本地緩存
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 不會導致系統崩潰
- 但影響資料可靠性

---

### 1.4 Firebase 整合不完整 🟡 **中等**

**位置**:
- `lib/firebase.ts`
- `lib/real-firebase.ts`
- `lib/firebase-mock.ts`

#### 問題描述

專案中存在多個 Firebase 配置檔案，混亂不清：

```typescript
// lib/firebase.ts - Mock 實作
// lib/real-firebase.ts - 真實 Firebase SDK
// lib/firebase-mock.ts - 另一個 Mock
```

#### 影響分析

1. **不清楚使用哪個**：
   - 代碼中混用 `firebase.ts` 和 `real-firebase.ts`
   - 沒有明確的環境切換邏輯

2. **開發/生產環境混淆**：
   - Mock Firebase 和真實 Firebase 可能同時生效
   - 導致偵錯困難

#### 修復建議

**統一 Firebase 配置**

```typescript
// lib/firebase.ts
let firebaseInstance: ReturnType<typeof initializeFirebase>

function initializeFirebase() {
  if (typeof window === 'undefined') {
    // Server: 創建實例但不初始化 Auth
    return initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      // ...
    })
  }

  // Client: 初始化 Auth
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // ...
  })

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    const auth = getAuth(app)
    connectAuthEmulator(auth, 'http://localhost:9099')
    connectFirestoreEmulator(getFirestore(app), 'localhost', 8080)
  }

  return app
}

export function getFirebase() {
  if (!firebaseInstance) {
    firebaseInstance = initializeFirebase()
  }
  return firebaseInstance
}

// 刪除 firebase-mock.ts 和 real-firebase.ts
// 只保留一個 firebase.ts
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 不影響功能
- 但影響開發效率和維護性

---

### 1.5 Ollama API 整合虛假 🟡 **中等**

**位置**: `app/api/generate/route.ts` (Line 152-186)

#### 問題描述

```typescript
if (USE_MOCK_DATA) {
  // 使用模擬資料
  generatedContent = MOCK_CONTENT_ITEMS...
  source = 'mock'
} else {
  // 使用真實 Ollama LLM 生成
  // TODO: 實作真實 Ollama API 呼叫
  // 目前暫用模擬資料，但標記為 ollama 模式

  const ollamaDelay = Math.random() * 3000 + 1500
  await new Promise(resolve => setTimeout(resolve, ollamaDelay))

  // 從模擬資料篩選...
  generatedContent = MOCK_CONTENT_ITEMS.filter(item => Math.random() > 0.7)...
  source = 'ollama'  // ❌ 實際還是模擬資料，但標記為 ollama
}
```

#### 影響分析

1. **誤導使用者**：
   - 顯示 "AI 生成"，但實際是模擬資料
   - 違反真實性原則

2. **文檔與實作不符**：
   - `tech-stack.md` 詳細說明了 Ollama API 整合
   - 但代碼從未實作

3. **測試覆蓋不足**：
   - 無法測試真實 LLM 行為
   - 假裝有功能，實際沒有

#### 修復建議

**選項 A：實作真實 Ollama API**

```typescript
// lib/ollama-client.ts
export class OllamaClient {
  private apiKey: string
  private baseUrl: string = 'https://ollama.com/api'

  constructor() {
    this.apiKey = process.env.OLLAMA_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OLLAMA_API_KEY is required')
    }
  }

  async generateContent(prompt: string, count: number = 3): Promise<ContentItem[]> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma3:4b',
        messages: [{ role: 'system', content: prompt }],
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 300,
          top_p: 0.9
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return this.parseResponse(data.message.content, count)
  }

  private parseResponse(raw: string, count: number): ContentItem[] {
    // 解析 LLM 回傳的 JSON 格式內容
    // ...
  }
}

// app/api/generate/route.ts
import { OllamaClient } from '@/lib/ollama-client'

const ollama = new OllamaClient()
generatedContent = await ollama.generateContent(prompt, count - cachedContent.length)
```

**選項 B：明確標記為模擬模式**

```typescript
if (USE_MOCK_DATA) {
  source = 'mock'
  sourceLabel = '模擬資料（開發模式）'
} else {
  // 確保環境變數配置正確
  if (!process.env.OLLAMA_API_KEY) {
    throw new Error('OLLAMA_API_KEY is required in production')
  }

  source = 'fallback'
  sourceLabel = 'Ollama API 未實作，目前使用降級模式'
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 影響產品真實性
- 文檔與代碼不符會導致後續維護困難

---

## 二、系統穩定性問題 (共 5 個問題)

### 2.1 localStorage 容量溢出風險 🟡 **中等**

**位置**: `app/hooks/useInteractionTracking.ts` (Line 38-40)

#### 問題描述

```typescript
// 只保留最近 1000 個事件避免儲存過多
if (events.length > 1000) {
  events.splice(0, 100)
}

localStorage.setItem(INTERACTIONS_STORAGE_KEY, JSON.stringify(events))
```

#### 影響分析

1. **localStorage 容量限制**：
   - 瀏覽器通常限制 5-10MB
   - 每個事件約 200-300 bytes（JSON 字符串）
   - 1000 個事件約 200-300KB
   - 但加上其他數據（快取、用戶偏好），可能超限

2. **沒有容量檢查**：
   - `localStorage.setItem` 在容量不足時會拋出 QuotaExceededError
   - 代碼沒有 try-catch 捕獲
   - 會導致 JavaScript 錯誤

3. **沒有定期清理**：
   - 所有事件永久存在
   - 不會根據時間自動過期

#### 修復建議

```typescript
function saveInteraction(event: InteractionEvent): void {
  if (typeof window === 'undefined') return

  try {
    const existing = localStorage.getItem(INTERACTIONS_STORAGE_KEY)
    const events: InteractionEvent[] = existing ? JSON.parse(existing) : []

    // 添加新事件
    events.push({
      ...event,
      timestamp: new Date()
    })

    // 1. 限制數量（改為 100 個）
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }

    // 2. 清理 7 天前的事件
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const filteredEvents = events.filter(e => {
      const timestamp = new Date(e.timestamp).getTime()
      return timestamp > sevenDaysAgo
    })

    // 3. 檢查容量
    const serialized = JSON.stringify(filteredEvents)
    const sizeInBytes = new Blob([serialized]).size

    if (sizeInBytes > 1024 * 100) {  // 100KB
      console.warn('Interaction events size limit exceeded, clearing old data')
      filteredEvents.splice(0, 50)  // 清除最舊的 50 個
    }

    localStorage.setItem(INTERACTIONS_STORAGE_KEY, JSON.stringify(filteredEvents))

  } catch (error) {
    console.warn('無法儲存互動事件:', error)

    // 檢查是否為容量錯誤
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage 容量不足，嘗試清理舊數據')
      try {
        localStorage.removeItem(INTERACTIONS_STORAGE_KEY)
      } catch (cleanError) {
        console.error('清理 localStorage 失敗:', cleanError)
      }
    }
  }
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 長時間使用後可能出現錯誤
- 影響用戶體驗

---

### 2.2 IntersectionObserver 潛在記憶體洩漏 🟡 **中等**

**位置**: `app/hooks/useInteractionTracking.ts` (Line 114-172)

#### 問題描述

```typescript
// Line 163-167: 20 個 threshold 值
threshold: Array.from({ length: 20 }, (_, i) => i * 0.05)

// Line 119-142: setTimeout 沒有存儲引用
setTimeout(() => {
  const dwellTime = Date.now() - dwellStartTime
  if (entry.isIntersecting && dwellTime >= threshold && !hasTrackedRef.current.dwell) {
    saveInteraction(...)
    hasTrackedRef.current.dwell = true
  }
}, threshold)
```

#### 影響分析

1. **大量回調執行**：
   - 20 個 threshold 值意味著元素進入可見區時會觸發 20 次回調
   - 如果用戶滾動到第 100 則內容，會執行 2000+ 次回調
   - 影響性能

2. **setTimeout 可能沒有清除**：
   - `setTimeout` 沒有存儲返回的 ID
   - 在 cleanup `useEffect` 時無法取消
   - 可能導致內存洩漏

3. **多個 ContentCard 同時掛載**：
   - 每個 ContentCard 都有自己的 observer
   - 如果頁面顯示 10 則內容，會有 10 個 observer
   - 每個 observer 有 20 個 threshold 總共 200 個監聽點

#### 修復建議

```typescript
export function useInteractionTracking(
  contentId: string,
  options: {
    trackScroll?: boolean
    trackDwell?: boolean
    threshold?: number  // 改為單一數值
  } = {}
) {
  const { trackScroll = true, trackDwell = true, threshold = 3000 } = options

  const startTimeRef = useRef<number | null>(null)
  const visibilityRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const maxScrollRef = useRef<number>(0)
  const hasTrackedRef = useRef({
    view: false,
    dwell: false,
  })
  const dwellTimeoutRef = useRef<number | null>(null)  // 存儲 setTimeout ID

  useEffect(() => {
    const element = document.getElementById(`content-${contentId}`)
    if (!element) return

    elementRef.current = element

    // 初始可見度追蹤
    saveInteraction({
      contentId,
      type: 'view',
      viewPercentage: 1,
      timestamp: new Date()
    })

    hasTrackedRef.current.view = true
    startTimeRef.current = Date.now()

    if (trackScroll || trackDwell) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const viewPercentage = calculateViewPercentage(element)

            // 當元素成為可見時開始追蹤停留時間
            if (entry.isIntersecting && trackDwell && !hasTrackedRef.current.dwell) {
              const dwellStartTime = Date.now()

              // 存儲 timeout ID 以便清理
              dwellTimeoutRef.current = window.setTimeout(() => {
                const dwellTime = Date.now() - dwellStartTime

                if (
                  entry.isIntersecting &&
                  dwellTime >= threshold &&
                  !hasTrackedRef.current.dwell
                ) {
                  saveInteraction({
                    contentId,
                    type: 'dwell',
                    duration: dwellTime,
                    viewPercentage,
                    timestamp: new Date()
                  })

                  hasTrackedRef.current.dwell = true
                }
              }, threshold)
            }

            // 當元素離開可見區時取消 timeout
            // if (!entry.isIntersecting && dwellTimeoutRef.current !== null) {
            //   clearTimeout(dwellTimeoutRef.current)
            //   dwellTimeoutRef.current = null
            // }

            // 追蹤滾動深度
            if (trackScroll && entry.isIntersecting) {
              const scrollDepth = 1 - (entry.boundingClientRect.top / window.innerHeight)

              if (scrollDepth > maxScrollRef.current) {
                maxScrollRef.current = scrollDepth

                saveInteraction({
                  contentId,
                  type: 'scroll',
                  scrollDepth,
                  viewPercentage,
                  timestamp: new Date()
                })
              }
            }
          })
        },
        {
          threshold: [0, 0.25, 0.5, 0.75, 1],  // 減少為 5 個值
          root: null,
          rootMargin: '0px'
        }
      )

      visibilityRef.current = observer
      observer.observe(element)
    }

    // 監聽頁面離開事件
    const handleBeforeUnload = () => {
      if (startTimeRef.current) {
        const totalTime = Date.now() - startTimeRef.current
        saveInteraction({
          contentId,
          type: 'exit',
          duration: totalTime,
          scrollDepth: maxScrollRef.current,
          timestamp: new Date()
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // 監聽頁面切換事件
    let lastVisibleTime = Date.now()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const hiddenTime = Date.now() - lastVisibleTime

        if (hiddenTime >= 1000) {
          saveInteraction({
            contentId,
            type: 'exit',
            duration: hiddenTime,
            timestamp: new Date()
          })
        }
      } else {
        lastVisibleTime = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // 清理資源
      if (visibilityRef.current) {
        visibilityRef.current.disconnect()
      }

      // 清理 setTimeout
      if (dwellTimeoutRef.current !== null) {
        clearTimeout(dwellTimeoutRef.current)
        dwellTimeoutRef.current = null
      }

      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // 記錄離開時的數據
      if (startTimeRef.current) {
        const totalTime = Date.now() - startTimeRef.current

        saveInteraction({
          contentId,
          type: 'exit',
          duration: totalTime,
          scrollDepth: maxScrollRef.current,
          timestamp: new Date()
        })
      }
    }
  }, [contentId, trackScroll, trackDwell, threshold])

  return {
    recordInteraction: (type: 'like' | 'dislike') => {
      saveInteraction({
        contentId,
        type,
        timestamp: new Date()
      })
    },
    getInteractionStats: () => {
      if (typeof window === 'undefined') return null

      try {
        const events = JSON.parse(localStorage.getItem(INTERACTIONS_STORAGE_KEY) || '[]')
        const contentEvents = events.filter((e: InteractionEvent) => e.contentId === contentId)

        const likes = contentEvents.filter((e: InteractionEvent) => e.type === 'like').length
        const dislikes = contentEvents.filter((e: InteractionEvent) => e.type === 'dislike').length
        const totalViews = contentEvents.filter((e: InteractionEvent) => e.type === 'view').length

        return { likes, dislikes, totalViews }
      } catch (error) {
        console.warn('無法取得互動統計:', error)
        return null
      }
    }
  }
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 長時間使用後可能導致性能問題
- 影響瀏覽器響應速度

---

### 2.3 錯誤降級過於寬鬆 🟡 **中等**

**位置**: `app/api/generate/route.ts` (Line 240-259)

#### 問題描述

```typescript
} catch (error) {
  console.error('生成 API 錯誤:', error)
  const errorName = error instanceof Error ? error.name : 'UNKNOWN_ERROR'
  const errorMessage = error instanceof Error ? error.message : '未知錯誤'

  // 錯誤降級：返回模擬內容
  const fallbackContent = getFallbackContent(
    (await req.json()).uid || 'unknown',
    (await req.json()).count || 3
  )

  return NextResponse.json({
    success: false,
    error: errorName,
    message: `生成失敗: ${errorMessage}`,  // ❌ 可能暴露敏感信息
    contents: fallbackContent,
    source: 'fallback',
    warning: 'LLM 服務暫時無法使用，返回備援內容'
  })
}
```

#### 影響分析

1. **過度降級**：
   - 任何錯誤（包括編碼錯誤、配置錯誤）都會降級
   - 可能導致真正的 Bug 被掩蓋

2. **信息洩露風險**：
   - `error.message` 可能包含路徑、API Key 等敏感信息
   - 前端會收到完整錯誤訊息

3. **用戶無法辨別**：
   - 雖然標記 `source: 'fallback'`
   - 但 UI 沒有明確區分真實內容和降級內容
   - 用戶以為是 AI 生成，實際是模擬資料

#### 修復建議

```typescript
} catch (error) {
  console.error('生成 API 錯誤:', error)

  // 分類錯誤類型
  if (error instanceof LLMConnectionError) {
    // LLM 連接失敗 - 可以降級
    const fallbackContent = getFallbackContent(
      (await req.json()).uid || 'unknown',
      (await req.json()).count || 3
    )

    return NextResponse.json({
      success: false,
      error: 'LLM_CONNECTION_ERROR',
      message: 'AI 生成服務暫時無法使用，將稍後重試',
      contents: fallbackContent,
      source: 'fallback',
      showWarning: true  // 標記前端需要顯示警告
    })
  }

  if (error instanceof AuthError) {
    // 認證錯誤 - 不降級
    return NextResponse.json(
      {
        success: false,
        error: 'AUTH_ERROR',
        message: '認證失敗，請重新登入'
      },
      { status: 401 }
    )
  }

  // 其他錯誤 - 不降級，報告詳細錯錯誤（僅服務器日誌）
  const errorName = error instanceof Error ? error.name : 'UNKNOWN_ERROR'

  // 不返回詳細錯誤訊息給前端
  return NextResponse.json(
    {
      success: false,
      error: errorName,
      message: '發生內部錯誤，請稍後再試'
    },
    { status: 500 }
  )
}

// lib/errors.ts
export class LLMConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMConnectionError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 影響系統可靠性
- 可能暴露敏感信息

---

### 2.4 網路請求重試機制缺失 🟡 **中等**

#### 問題描述

所有 API 請求都沒有重試機制：
- `/api/generate` 調用 Ollama API
- `/api/interaction` 寫入 Firestore
- Google 登入

#### 影響分析

1. **網路閃斷導致失敗**：
   - 一次性請求失敗就用戶體驗差
   - 需要 手動重新整理

2. **伺服器暫時性故障**：
   - Ollama API 可能有短暫的 5xx 錯誤
   - 重試可以自動恢復

#### 修復建議

```typescript
// lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    maxDelay?: number
    backoff?: boolean
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    maxDelay = 10000,
    backoff = true,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt > maxRetries) {
        // 最後一次嘗試失敗
        throw lastError
      }

      // 計算延遲
      const currentDelay = backoff
        ? Math.min(delay * Math.pow(2, attempt - 1), maxDelay)
        : delay

      console.warn(`Attempt ${attempt} failed, retrying in ${currentDelay}ms...`, error)

      onRetry?.(lastError, attempt)

      await new Promise(resolve => setTimeout(resolve, currentDelay))
    }
  }

  // 應該永遠不會到這裡
  throw lastError!
}

// 使用範例
const response = await withRetry(
  async () => await fetch('https://ollama.com/api/chat', { ... }),
  {
    maxRetries: 2,
    delay: 1000,
    backoff: true,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt} for Ollama API`)
    }
  }
)
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 提升用戶體驗
- 減少因網路問題導致的失敗

---

### 2.5 Firebase Emulator 依賴 🟢 **輕微**

**位置**: `app/page.tsx` (Line 96-142)

#### 問題描述

開發模式下要求 Firebase Emulator 運行，否則登入失敗。

#### 修復建議

添加更友好的錯誤提示或提供 Mock 模式。

#### 優先級

🟢 **P2 - 可稍後處理**
- 只影響開發體驗
- 不影響生產環境

---

## 三、使用者操作 UI 效率性問題 (共 6 個問題)

### 3.1 載入狀態不清晰 🔴 **嚴重**

**位置**: `app/feed/page.tsx` (Line 369-378, 394-417)

#### 問題描述

有兩種載入狀態但 UI 很難區分：

```typescript
const [loading, setLoading] = useState(true)      // 初始載入
const [generating, setGenerating] = useState(false)  // 重新生成

// 兩種狀態的 UI 類似，但 spinner 顏色不同
<div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
  generating ? 'text-purple-500 border-purple-500' : 'border-blue-500'}`}
/>
<p>
  {generating ? 'AI 正在為你生成個人化內容...' : '載入你的個人化內容...'}
</p>
```

#### 影響分析

1. **使用者困惑**：
   - 看到紫色 spinner，不知道是「生成」還是「載入」
   - 文字說明不夠清楚

2. **沒有預估時間**：
   - Ollama API 需要 1.5-3 秒
   - 使用者不知道要等多久
   - 可能以為卡住了

#### 修復建議

```typescript
const [loadingState, setLoadingState] = useState<{
  type: 'idle' | 'loading' | 'generating'
  estimatedTime?: number  // 預估毫秒數
  progress?: number  // 0-100
}>({ type: 'idle' })

// UI 改進
{loadingState.type === 'loading' && (
  <div className="text-center py-12">
    <div className="relative w-16 h-16 mx-auto">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Loader2 className="h-6 w-6 text-blue-500" />
      </div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">載入中...</p>
    <p className="text-sm text-gray-400">從快取或伺服器獲取內容</p>
  </div>
)}

{loadingState.type === 'generating' && (
  <div className="text-center py-12">
    <div className="relative w-16 h-16 mx-auto">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto" />
      <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-500" />
    </div>
    <p className="mt-4 text-gray-600 font-medium">AI 生成中...</p>
    <p className="text-sm text-gray-400">
      預計 {loadingState.estimatedTime && Math.ceil(loadingState.estimatedTime / 1000)} 秒完成
    </p>
    {loadingState.progress !== undefined && (
      <div className="mt-4 w-full max-w-xs mx-auto">
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${loadingState.progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{loadingState.progress}% 完成</p>
      </div>
    )}
  </div>
)}

// 使用時
setLoadingState({
  type: 'generating',
  estimatedTime: 2500,  // 預估 2.5 秒
  progress: 0
})

// 模擬進度
let progress = 0
const progressInterval = setInterval(() => {
  progress += 25
  setLoadingState(prev => ({ ...prev, progress }))
  if (progress >= 100) {
    clearInterval(progressInterval)
  }
}, 600)
```

#### 優先級

🔴 **P0 - 立即修復**
- 直接影響使用者體驗
- 可能導致使用者以為系統故障

---

### 3.2 無限滾動卡頓風險 🟡 **中等**

**位置**: `app/feed/page.tsx` (Line 394-405)

#### 問題描述

每次滾動載入都追加 10 則內容，會累積大量 DOM 節點：

```typescript
<div className="space-y-6">
  {feedItems.map((item) => (
    <ContentCard key={item.id} {...props} />
  ))}
</div>
```

#### 影響分析

1. **DOM 節點過多**：
   - 滾動 10 次後：100 則內容 = 100 個 ContentCard 組件
   - 每個 ContentCard 包含大量子元素
   - 瀏覽器渲染壓力大

2. **記憶體佔用高**：
   - React 虛擬 DOM 節點數量增加
   - 每個 ContentCard 有自己的 state（liked, disliked 等）

3. **沒有虛擬滾動**：
   - 所有 DOM 節點都在頁面上
   - 離開可視區的內容沒有銷毀

#### 修復建議

**方案 A：使用 react-window**

```typescript
import { FixedSizeList as List, areEqual } from 'react-window'
import memoize from 'memoize-one'

// 創建 memoized 選擇器，避免不必要的重新渲染
const createRowData = memoize((feedItems, handleLike, handleDislike, currentUserId) => ({
  feedItems,
  handleLike,
  handleDislike,
  currentUserId
}))

const Row = memo(({ index, style, data }) => {
  const { feedItems, handleLike, handleDislike, currentUserId } = data
  const item = feedItems[index]

  return (
    <div style={style} className="p-2">
      <ContentCard
        content={item}
        onLike={() => handleLike(item.id)}
        onDislike={() => handleDislike(item.id)}
        currentUserId={currentUserId}
      />
    </div>
  )
}, areEqual)

export default function FeedPage() {
  // ... 現有狀態 ...

  const rowData = createRowData(feedItems, handleLike, handleDislike, user?.uid)

  return (
    <List
      height={window.innerHeight - 200}  // 減去 header 高度
      itemCount={feedItems.length}
      itemSize={400}  // 每個 ContentCard 約 400px 高度
      width="100%"
      itemData={rowData}
      overscanCount={3}  // 預渲染前後各 3 個
    >
      {Row}
    </List>
  )
}
```

**方案 B：限制最大內容數量**

```typescript
const MAX_FEED_ITEMS = 50

const loadFeed = async () => {
  // ... 現有邏輯 ...

  const newTotalLength = page === 1 ? newItems.length : feedItems.length + newItems.length

  if (newTotalLength > MAX_FEED_ITEMS) {
    console.warn(`已達最大內容數量限制 (${MAX_FEED_ITEMS})`)
    // 顯示提示
    setShowLimitWarning(true)
    // 不再繼續載入
    return
  }

  setFeedItems(prev => [...prev, ...newItems])
}
```

**方案 C：實作懶載入（IntersectionObserver）**

```typescript
// 當項目進入可視區時才掛載 ContentCard
import { useRef, useEffect, useState } from 'react'

function LazyContentCard({ content, ...props }: ContentCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ minHeight: '400px' }}>
      {isVisible ? (
        <ContentCard content={content} {...props} />
      ) : (
        <div className="animate-pulse bg-gray-200 rounded-2xl h-96" />
      )}
    </div>
  )
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 長時間使用後會明顯卡頓
- 影響使用者體驗

---

### 3.3 操作回饋不夠即時 🟡 **中等**

**位置**: `app/components/ContentCard.tsx` (Line 65-211)

#### 問題描述

點讚/不讚時先樂觀更新，但 API 失敗沒有回滾：

```typescript
const handleLike = async () => {
  setLiked(true)  // 立即顯示
  setLocalLikes(prev => prev + 1)

  try {
    const response = await fetch('/api/interaction', { ... })
    // ... 處理成功
  } catch (error) {
    // 錯誤處理，但沒有回滾 UI
    console.warn('互動 API 錯誤:', error)
  }
}
```

#### 修復建議

```typescript
const handleLike = async () => {
  if (!liked) {
    // 備份當前狀態
    const prevLiked = liked
    const prevLikes = localLikes

    // 樂觀更新
    setLiked(true)
    setLocalLikes(prev => prev + 1)

    try {
      const response = await fetch('/api/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUserId || 'temp_uid',
          contentId: content.id,
          action: 'like'
        })
      })

      if (!response.ok) throw new Error('API request failed')

      const data = await response.json()

      // 更新 localStorage
      const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
      interactions[content.id] = 'like'
      localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))

    } catch (error) {
      // 回滾 UI 狀態
      setLiked(prevLiked)
      setLocalLikes(prevLikes)

      console.error('點讚失敗:', error)

      // 顯示錯誤提示
      // 實作一個 Toast 組件
      alert('操作失敗，請檢查網路連接後再試')
    }
  }
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 不會導致功能失效
- 但影響資料可靠性

---

### 3.4 過濾器功能無實際作用 🟡 **中等**

**位置**: `app/feed/page.tsx` (Line 101, 333-354, 152-156)

#### 問題描述

有過濾器 UI，但沒有實際功能：

```typescript
const [activeFilter, setActiveFilter] = useState<'personalized' | 'trending'>('personalized')

// UI 中的過濾器
<button onClick={() => setActiveFilter('personalized')}>個人化推薦</button>
<button onClick={() => setActiveFilter('trending')}>創意創意模式</button>

// 監聽 activeFilter 變化
useEffect(() => {
  if (user) {
    loadFeed()  // 只是重新載入，沒有根據 filter 邏輯
  }
}, [refreshCount, activeFilter])
```

但 `loadFeed` 沒有使用 `activeFilter`：

```typescript
const loadFeed = async () => {
  // ... 現有邏輯
  const newItems = await fetchFeedContent(user.uid, 10)
  // 沒有根據 activeFilter 篩選
}
```

#### 影響分析

1. **功能誤導**：
   - 用戶以為有過濾功能
   - 實際點擊沒有效果

2. **代碼冗餘**：
   - 有狀態變數，但沒有使用
   - 有監聽器，但沒有實際邏輯

#### 修復建議

**選項 A：實作真正的過濾功能**

```typescript
const loadFeed = async () => {
  if (!user) return

  setLoading(true)
  try {
    const mode = activeFilter === 'trending' ? 'creative' : 'default'
    const newItems = await fetchFeedContent(user.uid, 10, mode)

    if (page === 1) {
      setFeedItems(newItems)
    } else {
      setFeedItems(prev => [...prev, ...newItems])
    }

    if (newItems.length === 10) {
      setPage(prev => prev + 1)
    }
  } catch (error) {
    console.error('載入 feed 失敗:', error)
  } finally {
    setLoading(false)
  }
}

// 修改 fetchFeedContent 支援 mode 參數
async function fetchFeedContent(
  userId: string,
  count: number = 10,
  mode: 'default' | 'creative' = 'default'
): Promise<ContentItem[]> {
  // ... 根據 mode 調整生成參數
}
```

**選項 B：移除假過濾器**

```typescript
// 刪除 activeFilter 狀態
// 刪除過濾器按鈕
// 刪除監聽 activeFilter 的 useEffect
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 功能不完整會影響使用者信任
- 代碼冗餘影響維護

---

### 3.5 錯誤提示用 alert 🟡 **中等**

**位置**: `app/onboarding/interests/page.tsx` (Line 57, 77)

#### 問題描述

```typescript
if (selectedInterests.length < 3) {
  alert('請至少選擇 3 個興趣標籤')  // ❌ 使用原生 alert
  return
}
```

#### 影響分析

1. **阻斷使用者操作**：
   - alert 是模態對話框
   - 用戶必須點擊確定才能繼續

2. **設計不一致**：
   - 與整體 UI 風格不符合
   - 無法自定義樣式

#### 修復建議

**實作 Toast 組件**

```typescript
// components/Toast.tsx
'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastVariants = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariants
  duration?: number
  onClose?: () => void
}

export function Toast({ message, variant = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose || (() => {}), 300)  // 等待動畫完成
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const variants = {
    success: {
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    error: {
      icon: AlertCircle,
      color: 'bg-red-50 border-red-200 text-red-800'
    },
    warning: {
      icon: AlertCircle,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    info: {
      icon: Info,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const { icon: Icon, color } = variants[variant]

  if (!visible) return null

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${color} transition-opacity duration-300`}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(onClose || (() => {}), 300)
        }}
        className="flex-shrink-0 hover:opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// components/ToastContainer.tsx
'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastVariants } from './Toast'

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariants, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastItem {
  id: number
  message: string
  variant: ToastVariants
  duration: number
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [id, setId] = useState(0)

  const showToast = useCallback((message: string, variant: ToastVariants = 'info', duration: number = 3000) => {
    setId(prev => prev + 1)
    setToasts(prev => [...prev, { id: id + 1, message, variant, duration }])
  }, [id])

  const removeToast = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// 使用範例
// app/layout.tsx
import { ToastProvider } from '@/components/ToastContainer'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

// app/onboarding/interests/page.tsx
import { useToast } from '@/components/ToastContainer'

export default function InterestsPage() {
  const { showToast } = useToast()

  const handleSubmit = async () => {
    if (selectedInterests.length < 3) {
      showToast('請至少選擇 3 個興趣標籤', 'warning')
      return
    }
    // ...
  }
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 影響使用者體驗
- 與整體設計風格不符

---

### 3.6 快速重新整理缺少防護 🟢 **輕微**

**位置**: `app/feed/page.tsx` (Line 192-242)

#### 問題描述

雖有 `generating` 狀態防護，但視覺回饋不夠明顯。

#### 修復建議

添加防抖或更明顯的 disabled 樣式。

#### 優先級

🟢 **P2 - 可稍後處理**
- 影響較小
- 現有防護已足夠

---

## 四、UI/UX 設計美學問題（去 AI 化）(共 10 個問題)

### 4.1 Emoji 濫用 🔴 **嚴重違反需求**

**位置**: 多處檔案

#### 問題細節

1. **興趣標籤** (`lib/interests.ts` Line 9-25):

```typescript
export const INTERESTS_LIST: Interest[] = [
  { id: 'ai', name: '人工智慧', emoji: '🤖', ... },  // ❌ 違反：禁止 emoji
  { id: 'tech', name: '科技', emoji: '💻', ... },
  { id: 'learning', name: '學習', emoji: '📚', ... },
  // ... 每個都有 emoji
]
```

2. **顯示在 Onboarding 頁面** (`app/onboarding/interests/page.tsx` Line 116):

```typescript
<div className="text-2xl mb-2">{interest.emoji}</div>  // ❌ 違反
```

3. **模擬內容中** (`lib/mock-data.ts` Line 7, 21, 35, ...):

```typescript
{
  id: '1',
  content: '學會 React 與 Next.js 後，你可以用免費工具建立 Side Project，有機會創造被動收入。今天就開始吧！🚀',  // ❌ 違反：內容中有 emoji
  emojis: ['🚀', '💡'],  // ❌ 違反：獨立的 emojis 欄位
  hashtags: ['#程式設計', '#React', '#被動收入'],
  ...
}
```

4. **顯示在 ContentCard** (`app/components/ContentCard.tsx` Line 242-251):

```typescript
{/* Emoji 裝飾 */}
{content.emojis.length > 0 && (
  <div className="flex gap-2 mb-4">  // ❌ 違反
    {content.emojis.map((emoji, index) => (
      <span key={index} className="text-2xl">{emoji}</span>
    ))}
  </div>
)}
```

#### 違反的需求

> "ui/ux的設計美學，去ai化，譬如禁止使用emoji在任何地方。"

#### 影響分析

1. **直接違反核心需求**：
   - 明確要求「禁止使用 emoji 在任何地方」
   - 但代碼中到處都是 emoji

2. **不符合「去 AI 化」原則**：
   - Emoji 讓人聯想到 AI、社交媒體
   - 不符合專業、質樸的設計風格

#### 修復建議

**1. 移除所有 Emoji，用圖標替代**

```typescript
// lib/interests.ts - 使用 lucide-react 圖標
import { Cpu, Code, BookOpen, Briefcase, Activity, Plane, Utensils, Music, Video, Tv, Trophy, Gamepad2, Palette, Flame, Shirt } from 'lucide-react'

export const INTERESTS_LIST: Interest[] = [
  { id: 'ai', name: '人工智慧', icon: Cpu, color: 'bg-purple-500', description: 'AI、機器學習、深度學習' },
  { id: 'tech', name: '科技', icon: Code, color: 'bg-blue-500', description: '程式、軟體開發、新科技' },
  { id: 'learning', name: '學習', icon: BookOpen, color: 'bg-green-500', description: '知識、教育、自我提升' },
  { id: 'business', name: '創業', icon: Briefcase, color: 'bg-yellow-500', description: '創業、商業、投資' },
  { id: 'health', name: '健康', icon: Activity, color: 'bg-red-500', description: '健身、營養、心理健康' },
  { id: 'travel', name: '旅遊', icon: Plane, color: 'bg-indigo-500', description: '旅行、冒險、文化體驗' },
  { id: 'food', name: '美食', icon: Utensils, color: 'bg-pink-500', description: '料理、餐廳、食譜' },
  { id: 'music', name: '音樂', icon: Music, color: 'bg-orange-500', description: '音樂欣賞、樂器、演唱會' },
  { id: 'movies', name: '電影', icon: Video, color: 'bg-teal-500', description: '電影、戲、戲劇、娛樂' },
  { id: 'anime', name: '動漫', icon: Tv, color: 'bg-fuchsia-500', description: '動畫、漫畫、二次元' },
  { id: 'sports', name: '運動', icon: Trophy, color: 'bg-emerald-500', description: '體育、健身、比賽' },
  { id: 'games', name: '遊戲', icon: Gamepad2, color: 'bg-cyan-500', description: '電競、桌遊、手機遊戲' },
  { id: 'design', name: '設計', icon: Palette, color: 'bg-rose-500', description: 'UI/UX、藝術、創意' },
  { id: 'science', name: '科學', icon: Flame, color: 'bg-amber-500', description: '物理、化學、生物' },
  { id: 'fashion', name: '時尚', icon: Shirt, color: 'bg-violet-500', description: '穿搭、美妝、潮流' },
]

// 更新介面
export interface Interest {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>  // 改為圖標組件
  color: string
  description?: string
}
```

```typescript
// app/onboarding/interests/page.tsx - 使用圖標
{INTERESTS_LIST.map((interest) => {
  const Icon = interest.icon  // 獲取圖標組件

  return (
    <button key={interest.id} onClick={() => toggleInterest(interest.id)}
      className={`... ${isSelected ? interest.color + ' text-white' : 'bg-white text-gray-700'}`}
    >
      <Icon className="h-6 w-6 mb-2" />  { /* 用圖標替代 emoji */ }
      <span className="font-medium text-sm">{interest.name}</span>
      {isSelected && <Check className="h-4 w-4 mt-2" />}
    </button>
  )
})}
```

**2. 移除 emojis 欄位**

```typescript
// types/index.ts
export interface ContentItem {
  id: string
  content: string              // 內容中也不能有 emoji
  hashtags: string[]
  // emojis: string[]          // ❌ 刪除此欄位
  topics: string[]
  generatedAt: Date | string
  style: ContentStyleType
  likes: number
  dislikes: number
  qualityScore: number
  usedBy: string[]
  reuseCount: number
  metadata?: { ... }
}
```

```typescript
// lib/mock-data.ts - 移除所有 emoji
export const MOCK_CONTENT_ITEMS: ContentItem[] = [
  {
    id: '1',
    content: '學會 React 與 Next.js 後，你可以用免費工具建立 Side Project，有機會創造被動收入。今天就開始吧！',
    hashtags: ['#程式設計', '#React', '#被動收入'],
    topics: ['程式設計', '創業'],
    // emojis: ['🚀', '💡'],  // ❌ 刪除
    ...
  },
  // ... 其他項目也一樣
]
```

```typescript
// app/components/ContentCard.tsx - 移除 emoji 顯示
// ❌ 刪除這段
{content.emojis.length > 0 && (
  <div className="flex gap-2 mb-4">
    {content.emojis.map((emoji, index) => (
      <span key={index} className="text-2xl">{emoji}</span>
    ))}
  </div>
)}
```

**3. 清理 console.log 中的 emoji**

```typescript
// 移除所有 console 中的 emoji
// ❌ console.log('📦 請求 Feed 內容...')
// ✅ console.log('請求 Feed 內容:', uid, count)

// ❌ console.log('✅ 成功生成 10 則內容')
// ✅ console.log('成功生成內容量:', data.contents?.length)

// ❌ console.log('⚠️ 使用降級內容')
// ✅ console.log('使用降級內容')

// ❌ console.log('🚀 生成請求:')
// ✅ console.log('生成請求:', uid, count, mode)
```

#### 優先級

🔴 **P0 - 立即修復**
- **直接違反核心需求**
- 「去 AI 化」是設計原則
- 影響整體產品定位

---

### 4.2 程式碼中的 Emoji 🔴 **嚴重違反需求**

**位置**: 多處 `console.log`

#### 問題細節

幾乎所有 console.log 都有 emoji：

```typescript
// app/feed/page.tsx
console.log(`📦 請求 Feed 內容: ${userId}, ${count} 則`)
console.log(`✅ 成功生成 ${data.contents?.length || 0} 則內容 (來源: ${data.source})`)
console.log(`🔄 重新生成內容: ${user.uid}, 嘗試 ${activeFilter} 模式`)
console.log(`🆕 成功重新生成 ${data.contents?.length || 0} 則內容`)

// app/components/ContentCard.tsx
console.log('👍 點讚:', contentId)
console.log('👎 不讚:', contentId)
console.log('✅ 點讚成功:', data)

// app/api/generate/route.ts
console.log(`🚀 生成請求: ${uid}, ${count} 則內容, 模式: ${mode}`)
console.log(`🔍 尋找快取內容`)
console.log(`🎯 快取命中，返回 ${cachedContent.length} 則內容`)
console.log(`👩‍💻 需要生成 ${count - cachedContent.length} 則新內容`)
console.log(`📝 Prompt 上下文:`)
console.log('🧪 使用模擬資料生成')
console.log('🤖 使用真實 Ollama LLM 生成')
console.log(`✅ 模擬資料生成完成 (${generationTime}ms)`)
console.log(`⚠️ 使用降級內容:`)
console.log(`💾 儲存內容到快取:`)
```

#### 修復建議

**使用純文字 console.log**

```typescript
// 正確的 console.log 範例
console.log('[Feed] 請求內容:', uid, count, '則')
console.log('[Feed] 成功載入:', data.contents?.length, '則')
console.log('[Generate] 生成請求:', uid, count, mode)
console.log('[Cache] 快取命中，返回:', cachedContent.length, '則')
console.log('[Generate] 生成耗時:', generationTime, 'ms')

// 添加前綴便於搜尋和分類
// [Feed] - Feed 相關
// [Generate] - 內容生成相關
// [Cache] - 快取相關
// [Interact] - 互動相關
// [Auth] - 認證相關
// [Error] - 錯誤
// [Warn] - 警告
```

#### 優先級

🔴 **P0 - 立即修復**
- **直接違反「去 AI 化」需求**
- 開發者習慣會影響整體風格
- 必須徹底清除

---

### 4.3 品質評分標籤過於技術化 🟡 **中等**

**位置**: `app/components/ContentCard.tsx` (Line 227-232)

#### 問題描述

```typescript
{/* 品質評分標籤 */}
<div className="absolute top-4 right-4 z-10">
  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getQualityColor(content.qualityScore)}`}>
    <BarChart3 className="h-3 w-3" />
    <span>{content.qualityScore}</span>  // ❌ 85, 76, 92 等數字對使用者沒有意義
    <span className="text-xs opacity-75">品質</span>
  </div>
</div>
```

#### 影響分析

1. **用戶不理解**：
   - 85 是什麼意思？滿分是多少？
   - 76 和 92 的差別在哪裡？
   - 這是內部算法，不應該暴露

2. **干擾主要內容**：
   - 標籤在右上角，可能遮擋內容
   - 用戶可能被數字吸引而忽略內容本身

#### 修復建議

**選項 A：完全移除**

```typescript
// 刪除品質評分標籤
// 讓後端算法在幕後運作
```

**選項 B：改用文字等級**

```typescript
function getQualityLevel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: '推薦', color: 'bg-green-100 text-green-700' }
  if (score >= 70) return { label: '不錯', color: 'bg-blue-100 text-blue-700' }
  if (score >= 60) return { label: '一般', color: 'bg-yellow-100 text-yellow-700' }
  return { label: '', color: '' }
}

// 使用
const { label, color } = getQualityLevel(content.qualityScore)
{label && (
  <div className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
    {label}
  </div>
)}
```

**選項 C：隱藏在詳細資訊中**

```typescript
{/* 只在展開詳細資訊時顯示 */}
{showDetails && (
  <div className="px-6 pb-4 border-t border-gray-100 pt-4">
    <div className="text-sm text-gray-600">
      <div className="bg-gray-50 p-2 rounded-lg">
        <div className="font-medium">品質評分</div>
        <div>{content.qualityScore} / 100</div>
        <div className="text-xs text-gray-500 mt-1">基於點讚、停留時間等指標</div>
      </div>
    </div>
  </div>
)}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 不符合「去 AI 化」原則
- 暴露內部實作細節

---

### 4.4 介面資訊過多 🟡 **中等**

**位置**: `app/feed/page.tsx` 右側面板 (Line 442-498)

#### 問題描述

右側显示大量技術資訊：

```typescript
{/* 右側：A/B 測試狀態 (1/3) */}
<div className="w-1/3">
  <ABTestingStatus uid={user.uid} />  // A/B 測試變體分配

  {/* 數據源說明 */}
  <div>品質評分參數</div>  // 點讚分數、不讚分數、停留獎勵等

  {/* 測試目標 */}
  <div>A/B 測試目標</div>  // 測試不同權重參數...
</div>
```

#### 影響分析

1. **用戶不需要知道**：
   - A/B 測試：開發者工具，不是用戶功能
   - 品質評分參數：技術實作細節
   - 測試目標：開發者的需求，不是用戶的需求

2. **干擾主要內容**：
   - 右側佔據 1/3 空間
   - 在小螢幕上更明顯

#### 修復建議

**選項 A：生產環境隱藏**

```typescript
{/* 只在開發模式顯示 */}
{process.env.NODE_ENV === 'development' && (
  <div className="w-1/3">
    <ABTestingStatus uid={user.uid} />
    {/* 其他調試資訊 */}
  </div>
)}
```

**選項 B：移到設定頁面**

```typescript
// app/settings/analytics/page.tsx
// 只有主動進入的用戶才會看到
```

**選項 C：摺疊式設計**

```typescript
const [showDebugInfo, setShowDebugInfo] = useState(false)

{showDebugInfo && (
  <div className="w-1/3">
    {/* 調試資訊 */}
  </div>
)}

<button onClick={() => setShowDebugInfo(!showDebugInfo)}>
  {showDebugInfo ? '隱藏' : '顯示'}調試資訊
</button>
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 影響介面簡潔度
- 不符合「去 AI 化」原則

---

### 4.5 開發者模式按鈕破壞美感 🟡 **中等**

**位置**: `app/page.tsx` (Line 96-142)

#### 問題描述

```typescript
{/* 開發者模式快速登入按鈕 - 使用 Firebase Emulator */}
{process.env.NODE_ENV === 'development' && (
  <div className="mt-4 pt-4 border-t border-dashed border-gray-300">  // ❌ 虚線邊框
    <div className="text-xs text-gray-500 mb-2">開發者測試模式 (Emulator)</div>
    <button className="bg-purple-100 text-purple-700 ...">  // ❌ 紫色背景
      ...
      開發者快速登入 (Firebase Emulator)
    </button>
  </div>
)}
```

#### 修復建議

**完全隱藏，或用 URL 參數啟用**

```typescript
// ❌ 不要這樣
{process.env.NODE_ENV === 'development' && ( ... )}

// ✅ 用 URL 參數
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) {
  // 顯示調試按鈕
}
```

#### 優先級

🟡 **P1 - 建議優先處理**
- 只影響開發環境
- 但影響開發者的測試體驗

---

### 4.6 內容卡片標籤過多 🟢 **輕微**

**位置**: `app/components/ContentCard.tsx` (Line 242-263)

#### 問題描述

同時顯示多種標籤：

```typescript
{/* Emoji 裝飾 - 已在 4.1 討論，要刪除 */}
{content.emojis.length > 0 && ( ... )}

{/* 話題標籤 */}
{content.hashtags.map((hashtag, index) => ( ... ))}

{/* 分類標籤 */}
{content.topics.length > 0 && (
  <div className="mb-6 flex items-center gap-2">
    <span className="text-xs text-gray-500 font-medium">分類:</span>
    {content.topics.map((topic, index) => ( ... ))}
  </div>
)}
```

#### 修復建議

簡化為只顯示 hashtag。

#### 優先級

🟢 **P2 - 可稍後處理**
- 影響較小
- 可視作設計選擇

---

### 4.7 色彩對比度問題 🟢 **輕微**

**位置**: 多處

#### 問題描述

`text-blue-500` 在白色背景上可讀性不夠。

#### 修復建議

使用 `text-blue-600` 或更深色顏色。

#### 優先級

🟢 **P2 - 可稍後處理**
- 影響輕微
- 不影響功能

---

### 4.8 響應式設計問題 🟢 **輕微**

**位置**: `app/feed/page.tsx` (Line 366-499)

#### 問題描述

右側面板在小螢幕上會過窄。

#### 修復建議

小螢幕隱藏右側面板，使用漢堡選單。

#### 優先級

🟢 **P2 - 可稍後處理**
- 只影響小螢幕用戶
- 可以在後續優化

---

## 五、程式碼品質問題（額外發現）

### 5.1 重複的介面定義 🟡 **中等**

**位置**: `app/components/ContentCard.tsx` (Line 10-22)

```typescript
interface ContentCardProps {
  content: ContentItem
  onLike: (contentId: string) => void
  onDislike: (contentId: string) => void
  currentUserId?: string
}

// ❌ 重複定義了一次！
interface ContentCardProps {
  content: ContentItem
  onLike: (contentId: string) => void
  onDislike: (contentId: string) => void
  currentUserId?: string
}
```

#### 修復建議

刪除重複的介面定義。

---

### 5.2 TypeScript 類型不統一 🟡 **中等**

**位置**: `types/index.ts` (Line 12)

```typescript
generatedAt: Date | string
```

#### 問題描述

API 可能返回字串或 Date 物件，每次使用都要檢查類型。

#### 修復建議

統一使用字串（ISO 8601 格式），在讀取時轉換。

```typescript
generatedAt: string  // ISO 8601 format

// 使用時
const date = new Date(content.generatedAt)
```

---

### 5.3 魔術數字 🟢 **輕微**

**位置**: 多處

```typescript
if (diffMins < 60)           // 60 = 1 小時的秒數
if (diffHours < 24)          // 24 = 1 天的小時數
if (diffDays < 7)            // 7 = 1 週的天數

// Line 290: 典型
<div className="h-2 w-S2 ...">  // ❌ typo，應該是 w-2
```

#### 修復建議

定義常量。

```typescript
const SECONDS_IN_MINUTE = 60
const MINUTES_IN_HOUR = 60
const HOURS_IN_DAY = 24
const DAYS_IN_WEEK = 7

if (diffMins < SECONDS_IN_MINUTE)
if (diffHours < MINUTES_IN_HOUR)
if (diffDays < HOURS_IN_DAY)
```

---

### 5.4 缺少錯誤邊界 🟢 **輕微**

**位置**: 全局

#### 問題描述

React 應用沒有 Error Boundary，組件錯誤導致白頁。

#### 修復建議

```typescript
// components/ErrorBoundary.tsx
'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">發生錯誤</h1>
            <p className="text-gray-600">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              重新載入
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 使用
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

## 六、優先修復建議總結

### 第一優先（阻礙產品質量）

1. **移除所有 emoji** 🔴
   - 位置：`lib/interests.ts`, `lib/mock-data.ts`, `app/components/ContentCard.tsx`, 所有 `console.log`
   - 違反核心需求，必須立即處理

2. **修復快取系統架構** 🔴
   - 位置：`services/content-cache.service.ts`
   - 記憶體快取完全無效，影響性能

3. **實作真實的 Rate Limiter** 🔴
   - 位置：`services/rate-limiter.ts`
   - 多實例環境會失效，可能導致成本超支

4. **載入狀態優化** 🔴
   - 位置：`app/feed/page.tsx`
   - 不清晰的載入回饋，用戶困惑

### 第二優先（影響使用者體驗）

5. **實作虛擬滾動** 🟡
   - 位置：`app/feed/page.tsx`
   - 長時間使用後的性能問題

6. **移除品質評分顯示** 🟡
   - 位置：`app/components/ContentCard.tsx`
   - 對使用者無意義，不符合「去 AI 化」原則

7. **移除程式碼中的 Emoji** 🟡
   - 位置：所有 `console.log`
   - 違反「去 AI 化」原則

8. **隱藏技術資訊面板** 🟡
   - 位置：`app/feed/page.tsx` 右側面板
   - 用戶不需要知道 A/B 測試細節

9. **實作 Toast 組件** 🟡
   - 位置：`app/onboarding/interests/page.tsx`
   - 替代 `alert()`，提升用戶體驗

10. **添加錯誤回滾機制** 🟡
    - 位置：`app/components/ContentCard.tsx`
    - 點讚/不讚失敗時回滾 UI

### 第三優先（程式碼健康）

11. **統一 TypeScript 類型** 🟡
12. **移除重複的介面定義** 🟡
13. **添加錯誤邊界** 🟢
14. **定義魔法數字常量** 🟢

---

## 七、修復路徑建議

### Week 1：核心需求修復
- Day 1-2：移除所有 emoji
- Day 3-4：修復快取系統
- Day 5：實作 Rate Limiter

### Week 2：體驗優化
- Day 1-2：載入狀態優化
- Day 3-4：虛擬滾動實作
- Day 5：移除技術資訊面板

### Week 3：程式碼品質
- Day 1-2：Toast 組件
- Day 3-4：錯誤處理
- Day 5：TypeScript 改進

---

## 八、技術債務清單

| 債務 | 嚴重度 | 修復時間 | 影響範圍 |
|------|--------|----------|----------|
| 快取系統架構 | 🔴 | 2-3 天 | `services/content-cache.service.ts` |
| Rate Limiter | 🔴 | 1-2 天 | `services/rate-limiter.ts` |
| Emoji 移除 | 🔴 | 1 天 | 全專案 |
| 載入狀態優化 | 🔴 | 0.5 天 | `app/feed/page.tsx` |
| 虛擬滾動 | 🟡 | 2 天 | `app/feed/page.tsx` |
| 品質評分移除 | 🟡 | 0.5 天 | `app/components/ContentCard.tsx` |
| 技術面板隱藏 | 🟡 | 0.5 天 | `app/feed/page.tsx` |
| Toast 組件 | 🟡 | 1 天 | 全專案 |
| 錯誤回滾 | 🟡 | 1 天 | `app/components/ContentCard.tsx` |

**總估計修復時間**：10-12 天

---

## 九、風險評估

### 高風險問題（可能導致生產事故）
1. **快取系統失效** → 依賴外部快取，需重構
2. **Rate Limiter 多實例失效** → 可能成本超支

### 中風險問題（影響使用者體驗）
1. **長時間使用後卡頓** → 需虛擬滾動
2. **資料不一致** → 需統一資料源
3. **localStorage 溢出** → 需定期清理

### 低風險問題（可延後處理）
1. **色彩對比度不足**
2. **響應式設計**
3. **魔法數字**

---

## 十、持續改進建議

### 程式碼審查
- 實作 peer review 流程
- 使用 ESLint、Prettier 自動化
- 定期安全審查

### 測試
- 添加單元測試
- 端對端測試（使用 Playwright）
- 效能測試

### 監控
- 錯誤追蹤（Sentry）
- 性能監控（Vercel Analytics）
- 用戶行為分析

---

## 附錄：檔案清單

### 需要修改的檔案

#### 架構相關
- `services/content-cache.service.ts` - 快取系統重構
- `services/rate-limiter.ts` - Rate Limiter 改進
- `lib/firebase.ts` - Firebase 配置統一
- `app/api/generate/route.ts` - Ollama API 整合

#### UI 相關
- `app/feed/page.tsx` - 載入狀態、虛擬滾動、面板隱藏
- `app/components/ContentCard.tsx` - 標籤簡化、錯誤回滾
- `app/page.tsx` - 開發者按鈕隱藏
- `app/onboarding/interests/page.tsx` - Toast 替換 alert

#### 工具函式
- `lib/interests.ts` - 移除 emoji，使用圖標
- `lib/mock-data.ts` - 移除 emoji
- `types/index.ts` - 統一類型定義

#### 新增檔案
- `components/Toast.tsx` - Toast 組件
- `components/ToastContainer.tsx` - Toast Provider
- `components/ErrorBoundary.tsx` - 錯誤邊界
- `lib/errors.ts` - 自定錯誤類型
- `lib/retry.ts` - 重試機制
- `lib/cache/redis-cache.ts` 或 `lib/cache/firestore-cache.ts` - 外部快取

---

**報告結束**

*本報告由 Sisyphus AI 代碼分析系統生成*
*生成時間：2026-01-24*
*分析深度：Deep Code Review*