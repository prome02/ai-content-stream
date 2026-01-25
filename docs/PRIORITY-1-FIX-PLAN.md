# AI 個人化內容資訊流平台 - 第一優先修復計劃

**計劃日期**: 2026-01-24
**目標**: 修復阻礙產品質量的 4 個 🔴 嚴重問題
**預估時間**: 8-10 個工作日
**負責人**: Sisyphus AI

---

## 📊 執行摘要

本計劃針對分析報告中標記為 P0（阻礙產品質量）的 4 個嚴重問題，提供詳細的修復策略和執行步驟。這些問題會直接影響：
- **系統可靠性**：快取失效、Rate Limiter 失效
- **使用者體驗**：載入狀態不清、AI 化設計違反核心需求

### 問題清單

| 序號 | 問題 | 嚴重度 | 影響範圍 | 預估工時 |
|------|------|--------|----------|----------|
| 1 | 移除所有 Emoji | 🔴 P0 | 全專案 | 1 天 |
| 2 | 修復快取系統架構 | 🔴 P0 | `services/content-cache.service.ts` | 2-3 天 |
| 3 | 實作真實的 Rate Limiter | 🔴 P0 | `services/rate-limiter.ts` | 2 天 |
| 4 | 載入狀態優化 | 🔴 P0 | `app/feed/page.tsx` | 1-1.5 天 |

**總預估工時**: 8-10 個工作日

---

## 問題 1：移除所有 Emoji 🔴

### 問題概述

**違反需求**: "ui/ux的設計美學，去ai化，譬如禁止使用emoji在任何地方"

**當前狀況**:
- 興趣標籤中使用 emoji
- 模擬內容中包含 emoji
- ContentCard 顯示 emoji 裝飾區塊
- 所有 console.log 使用 emoji 做日誌標記

### 影響範圍分析

| 檔案類型 | 數量 | 影響度 |
|----------|------|--------|
| 介面檔案 `.tsx` | 3 | 高 - 使用者可見 |
| 資料檔案 `.ts` | 2 | 中 - 模擬資料 |
| API Routes `.ts` | 2 | 低 - 開發者日誌 |

### 執行計劃

#### Step 1: 更新興趣標籤（1 小時）

**目標檔案**: `lib/interests.ts`

**修改內容**:
- 移除 `emoji: string` 欄位
- 興趣按鈕不再顯示圖示，僅顯示文字標籤
- 更新 `Interest` 介面定義

**關鍵變更**:
```typescript
export interface Interest {
  id: string
  name: string
  color: string
  description?: string
  // 移除 emoji 欄位
}
```

**設計調整**：
- 興趣按鈕使用純色塊（colored button）
- 不使用圖標，僅文字標籤
- 例如：「人工智慧」（藍色背景）

**驗證方式**:
- 編譯檢查: `npm run build`
- 手動測試: 檢查 Onboarding 頁面是否正常

#### Step 2: 移除模擬資料中的 Emoji（30 分鐘）

**目標檔案**: `lib/mock-data.ts`

**修改內容**:
- 從所有 `content` 文字中移除 emoji
- 刪除 `emojis: string[]` 欄位
- 更新 `ContentItem` 介面定義

**處理原則**:
```typescript
// 直接移除 string 中的 emoji，不影響語義
原始: '學會 React 與 Next.js 後，你可以用免費工具建立 Side Project，有機會創造被動收入。今天就開始吧！🚀'
修正: '學會 React 與 Next.js 後，你可以用免費工具建立 Side Project，有機會創造被動收入。今天就開始吧。'

// 如果 emoji 影響語義（例如：表情符號相關的內容），改用文字
原始: '這篇文章讓我覺得 😊 很有趣'
修正: '這篇文章讓我覺得很有趣'
```

**關鍵變更**:
```typescript
export interface ContentItem {
  id: string
  content: string
  hashtags: string[]
  // 刪除 emojis 欄位
  topics: string[]
  // ... 其他欄位
}
```

#### Step 3: 更新 ContentCard 元件（30 分鐘）

**目標檔案**: `app/components/ContentCard.tsx`

**修改內容**:
- 完全移除 emoji 裝飾區塊
- 確保不再讀取 `content.emojis`

#### Step 4: 清理 console.log（30 分鐘）

**目標檔案**: 所有 `.ts` 和 `.tsx` 檔案

**修改內容**:
- 移除所有 console.log 中的 emoji
- 使用純文字日誌標記，如 `[Feed]`、`[Cache]`、`[Error]`

**變更範例**:
```
❌ console.log('📦 請求 Feed 內容:', uid)
✅ console.log('[Feed] 請求內容:', uid, count)

❌ console.log('✅ 成功生成 10 則內容')
✅ console.log('[Feed] 成功載入:', length, '則內容')

❌ console.log('⚠️ 使用降級內容')
✅ console.log('[Generate] 不使用降級模擬資料，顯示錯誤訊息')
```

#### Step 5: 只在按鈕元件使用圖標（可選）

**目標**: 僅在必要的功能按鈕使用 lucide-react 圖標

**適用範圍**:
- ✅ 操作按鈕：重新整理、設定、分享
- ✅ 狀態圖示：載入中、警告、錯誤
- ❌ 裝飾性圖示：興趣標籤、內容裝飾

**實作範例**:
```typescript
// 重新整理按鈕 - 需要圖標
<button onClick={handleRefresh}>
  <RefreshCw className="h-5 w-5" />
  <span>重新整理</span>
</button>

// 載入中圖示 - 需要圖標
<Loader2 className="animate-spin h-6 w-6" />
<span>載入中...</span>
```

**驗證方式**:
- 編譯檢查: `npm run build`
- 手動測試: 檢查 Onboarding 頁面是否正常顯示圖標


**驗證方式**:
- 編譯檢查: `npm run build`
- 手動測試: 檢查 Onboarding 頁面是否正常顯示圖標

### 驗收標準

- [ ] 所有介面檔案不再顯示任何 emoji
- [ ] 所有模擬資料不包含 emoji
- [ ] 所有 console.log 不包含 emoji
- [ ] 編譯通過，無 TypeScript 錯誤
- [ ] 功能測試通過（選擇興趣、載入內容）

### 回滾計劃

如果圖標系統導致問題，可以：
1. 暫時使用文字標籤（無圖標）
2. 或使用 CSS 實作的簡單圖示

---

## 問題 2：修復快取系統架構 🔴

### 問題概述

**架構缺陷**:
- 記憶體快取在 Next.js API Routes 無效（無狀態環境）
- localStorage 在服務器端不可用
- 快取實際上沒有發揮作用

### 技術方案選擇

基於專案現有技術堆疊（Next.js + Firestore），選擇：

**方案選擇**: 使用 Firestore 作為快取後端

**理由**:
- 已整合 Firebase，無需額外依賴
- 自動處理 TTL（過期時間）
- 支援並發，適合多實例環境
- 免費層足夠應對 MVP 階段

### 執行計劃

#### Step 1: 創建 Firestore 快取模組（2 小時）

**目標**: 創建 `lib/cache/firestore-cache.ts`

**核心功能**:
```typescript
class FirestoreCache {
  // 讀取：檢查快取過期
  async get(userId: string): Promise<ContentItem[] | null>
  
  // 寫入：設置 TTL（預設 60 分鐘）
  async set(userId: string, contents: ContentItem[], ttl: number)
  
  // 刪除：清理過期快取
  async clearExpired(): Promise<void>
}
```

**設計要點**:
- TTL 預設值: 3600 秒（1 小時）
- 使用 `aipcs_cache` collection
- 文檔結構: `{ contents, expiresAt, createdAt }`

#### Step 2: 更新 ContentCacheService（3 小時）

**目標檔案**: `services/content-cache.service.ts`

**修改內容**:
- 完全移除 `MemoryCache` 類（在 API Routes 無效）
- 移除 `LocalStorageCache` 的服務器端使用
- 整合 `FirestoreCache` 作為主要快取後端

**架構調整**:
```
舊架構: Memory → LocalStorage → Mock
新架構: Firestore（統一快取來源） → 前端 localStorage（可選）
```

#### Step 3: 更新 API Routes 呼用（2 小時）

**目標檔案**: `app/api/generate/route.ts`

**修改內容**:
- 確保快取檢查順序正確
- 添加快取命中率日誌
- 處理快取讀取失敗的降級邏輯

**快取策略（不使用降級模擬資料）**:

```
策略 1: 快取命中
├─ 前端 localStorage → 返回（最快）
└─ Firestore 快取 → 返回次快

策略 2: 快取未命中
├─ 顯示等待狀態
├─ 呼叫 LLM API 生成新內容
└─ 生成完成後返回

策略 3: 生成失敗
├─ 不使用降級模擬資料 ❌
├─ 顯示錯誤訊息：AI 生成服務暫時無法使用
├─ 提供重試按鈕
└─ 或顯示 Toast 通知：請稍後再試
```

**錯誤處理策略**:

**情況 1: Firestore 連接失敗**
```typescript
try {
  const content = await checkFirestoreCache(userId)
  return content
} catch (error) {
  // 不使用模擬資料
  console.warn('[Cache] Firestore 失敗，直接生成新內容')
  return await generateNewContent()
}
```

**情況 2: LLM API 失敗**
```typescript
try {
  const content = await generateWithLLM()
  return content
} catch (error) {
  // 顯示 Toast 通知，不返回內容
  showToast('AI 生成服務暫時無法使用，請稍後再試', 'error')
  
  // 返回空陣列，讓使用者重試
  return []
}
```

**情況 3: 網路錯誤**
```typescript
// 顯示等待動畫
// 顯示 Toast: "網路連接不穩定，請稍候..."
// 自動重試（最多 3 次）
```

**前端互動改善**:

1. **按鈕狀態**:
   - 生成中：按鈕變為 loading 狀態
   - 禁用重複點擊

2. **Toast 通知**:
   - 生成失敗：Toast 提示「請稍後再試」
   - 網路錯誤：Toast 提示「網路問題，請檢查連接」
   - 持續時間：Toast 自動消失，不阻斷操作

3. **使用者引導**:
   - 生成時：「AI 正在為你個人化內容，請稍候...」
   - 失敗時：「服務暫時繁忙，請稍後重試」

**實作範例**:
```typescript
const handleRefresh = async () => {
  showToast('AI 正在生成個人化內容，請稍候...', 'info', 5000)
  
  setGenerating(true)
  
  try {
    const content = await generateNewContent()  // 不使用降級
    setFeedItems(content)
  } catch (error) {
    // 不使用模擬資料，顯示錯誤並允許重試
    showToast('生成失敗，請稍後再試', 'error', 5000)
    console.error('[Generate] 失敗:', error)
  } finally {
    setGenerating(false)
  }
}
```
Tier 1: 前端 localStorage（毫秒級，僅瀏覽器，用戶個人）
Tier 2: Firestore（毫秒到秒級，跨客戶端共享，降級備用）
Tier 3: 重新生成（最慢，確保內容可用性）
```

**避免衝突的機制**:

1. **快取鍵區分**:
   ```
   前端: `aipcs_cache_frontend:{userId}`
   Firestore: `aipcs_cache:{userId}`
   ```
   - 使用不同的前綴，避免混淆

2. **讀取順序**:
   ```
   1. 檢查前端 localStorage
   2. 如果命中 → 立即返回（無需呼叫 API）
   3. 如果未命中 → 呼叫 API（檢查 Firestore → 可能生成新內容）
   4. 新內容 → 寫入前端 localStorage（覆蓋舊資料）
   ```

3. **版本控制**:
   - 每條內容新增 `version` 或 `generatedAt` 欄位
   - 前端快取：儲存完整內容物件（含 timestamp）
   - 每次寫入時更新時間戳

4. **無效化機制**:
   ```
   前端 localStorage:
   - TTL：30 分鐘
   - 超過期自動清除
   
   Firestore:
   - TTL：1 小時
   - 超過期自動清除
   ```

**重要說明 - Firestore 跨用戶共享問題**:

**問題**: 不同用戶偏好度不同，是否適合共享 Firestore 快取？

**答案**: **不適合跨用戶共享完整快取**

**正確的快取策略**:

❌ **錯誤做法（跨用戶共享）**:
```
Firestore 快取: 
  - 所有用戶共享相同的快取內容
  - 用戶 A 的內容：科技類
  - 用戶 B 也獲取科技類 ← 不適合
```

✅ **正確做法（用戶獨立快取）**:
```
Firestore 快取: 
  - 每個用戶有獨立快取文檔
  - `aipcs_cache:user_123` → 存儲用戶 123 的個人化內容
  - `aipcs_cache:user_456` → 存儲用戶 456 的個人化內容
  
  - 不跨用戶共享
  - 僅作為備份服務器（瀏覽器 localStorage 清除時可恢復）
```

**為何使用 Firestore 優於純前端快取？**

1. **資料持久性**:
   - 前端 localStorage：清除瀏覽器資料就沒了
   - Firestore：跨裝置、跨瀏覽器同步

2. **多裝置支援**：
   - 手機清除快取 → 電腦仍可從 Firestore 恢復

3. **降級保障**:
   - 前端快取失效時，仍有 Firestore 可用
   - Firestore 失效時，重新生成

**總結**:
- **不同用戶不應共享快取內容**
- Firestore 用作「每個用戶的個人化快取」
- 快取內容根據用戶偏好（interests）生成
- 兩層快取：前端 + Firestore（都用戶獨立）

### Firestore 安全規則

**新增規則**: `firestore.rules`

```javascript
match /aipcs_cache/{cacheId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

### 環境變數配置

**目標檔案**: `.env.local`

```bash
# Firestore 快取 TTL（秒）
CACHE_TTL=3600

# 快取啟用標記
ENABLE_CACHE=true
```

### 驗收標準

- [ ] Firestore 快取正常工作（讀寫、過期）
- [ ] 前端和 Firestore 快取不衝突（用戶獨立快取）
- [ ] 不使用降級模擬資料（失敗時顯示錯誤或重試）
- [ ] 編譯通過，無錯誤
- [ ] 負載測試通過（模擬 100 並發請求）

### 效能指標說明

**目標數值及其含義**:

1. **快取命中率: > 60%**
   - 計算公式：`(快取命中次數 / 總請求次數) * 100%`
   - 意義：60% 的請求直接從快取返回，無需等待 LLM 生成
   - 為什麼設定 60%？
     - 假設每小時 20 次請求，用戶可能點擊「重新整理」5-10 次
     - 之前的內容可能會重複請求，快取命中率會很高
     - 60% 是保守預估，實際可能達到 70-80%
   - 如未達標：檢查快取邏輯，可能問題：
     - TTL 設定過短
     - 快取鍵重複或錯誤
     - 用戶每次都點「重新生成」而非滾動載入

2. **API 回應時間: < 200ms（快取命中）**
   - 意義：快取命中時，API 回應時間小於 200ms
   - 包含時間：
     - 檢查前端 localStorage：< 10ms
     - 前端未命中，檢查 Firestore：< 100ms
     - 資料序列化和傳輸：< 50ms
   - 為什麼需要 < 200ms？
     - 使用者體驗：200ms 以內感覺「即時」
     - 超過 200ms 會有明顯延遲感知
   - 如未達標：檢查：
     - Firestore 查詢效能（可能需要添加索引）
     - 網路延遲（Vercel 地理位置）
     - 數據量過大（限制每個快取內容數量）

3. **API 回應時間: < 3s（快取未命中，LLM 生成）**
   - 意義：快取未命中時，需生成新內容，回應時間 < 3 秒
   - 包含時間：
     - OLLama API 調用：1.5-2.5s
     - 內容解析和儲存：< 0.5s
   - 為什麼需要 < 3s？
     - 3 秒是可接受的「等待時間」上限
     - 超過 3 秒需要明確的「正在處理」提示
     - 超過 5 秒可能導致使用者放棄
   - 如未達標：優化：
     - 調整 LLM 模型（使用參數少的模型）
     - 減少生成內容數量
     - 優化 prompt 長度

**如何監控這些指標**:

```typescript
// app/api/generate/route.ts
const startTime = Date.now()

// 檢查快取
const cachedContent = await checkCache(userId)
if (cachedContent) {
  const cacheHitTime = Date.now() - startTime
  console.log('[Performance] 快取命中，耗時:', cacheHitTime, 'ms')
  
  // 記錄到日誌或監控系統
  trackMetric('cache_hit', cacheHitTime)
  return cachedContent
}

// 生成新內容
const generated = await generateWithLLM()
const generateTime = Date.now() - startTime
console.log('[Performance] 生成完成，耗時:', generateTime, 'ms')

// 記錄指標
trackMetric('generate', generateTime)
```

**測試方法**:

```
場景 1: 快取命中率測試
- 連續請求 10 次相同用戶的內容
- 預期：後續請求都從快取返回（命中率 90%+）

場景 2: 快取響應時間測試
- 使用瀏覽器開發者工具 Network 標籤
- 檢查 /api/generate 回應時間
- 預期：快取命中時 < 200ms

場景 3: 生成時間測試
- 強制跳過快取（添加 cache-bust 參數）
- 測量生成時間
- 預期：2-3 秒（視 Ollama 模型而定）
```

**現實情況考慮**:

1. **開發環境 vs 生產環境**：
   - 開發環境：使用模擬資料，不適用這些指標
   - 生產環境：才會觸發真實的快取和 LLM 生成

2. **用戶行為影響**：
   - 頻繁「重新整理」→快取命中率低
   - 長時間停留後返回→快取過期
   - 新用戶→首次請求命中率 0%

3. **Ollama 性能差異**：
   - gemma3:4b 模型：2-3 秒
   - 如果更換模型（如 gemma2:2b）：可能快至 1-1.5 秒
   - 需要根據實際使用的模型調整目標

### 風險與緩解

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| Firestore 配額超限 | 低 | 低 | 監控使用量，優化查詢 |
| 快取一致性問題 | 中 | 中 | 添加樂觀鎖機制 |
| 冷啟動延遲 | 中 | 低 | 前端 localStorage 補償 |

---

## 問題 3：實作真實的 Rate Limiter 🔴

### 問題概述

**架構缺陷**:
- 使用記憶體 Map 存儲計數
- 多實例環境無效（Vercel auto-scaling）
- 可能導致成本超支（Ollama API 費用）

### 技術方案選擇

**方案選擇**: 使用 Firestore 存儲 Rate Limit 計數

**理由**:
- 與快取系統使用相同技術棧
- 已整合，無額外依賴
- 自動處理並發（Firestore Transaction）
- 支援小時級重置邏輯

### 執行計劃

#### Step 1: 重構 RateLimiter 類（3 小時）

**目標檔案**: `services/rate-limiter.ts`

**核心功能**:
```typescript
export class RateLimiter {
  // 檢查：是否允許請求
  async check(uid: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    lastResetHour: number
  }>
  
  // 遞增：記錄使用次數（使用 Transaction）
  async increment(uid: string, endpoint: string): Promise<void>
}
```

**設計要點**:
- 使用 Firestore Transaction 確保原子性
- 自動重置邏輯：跨小時時重置計數
- 限制：每小時 20 次請求

#### Step 2: 更新 Firestore Schema（1 小時）

**目標**: 更新 `aipcs_users` collection

**新增欄位**:
```javascript
rateLimit: {
  lastResetHour: number,  // 上次重置的小時
  hourlyCount: number     // 本小時請求次數
}
```

**索引需求**:
- `rateLimit.lastResetHour`（升序）

#### Step 3: 更新 API Routes（2 小時）

**目標檔案**: `app/api/generate/route.ts`

**修改內容**:
- 在請求處理開始時調用 `check()`
- 在請求成功後調用 `increment()`
- 優雅處理錯誤（不影響主流程）

**處理流程**:
```typescript
1. 檢查 Rate Limit
   ├─ 如果超限：返回 429, 不使用降級模擬資料 ❌
   └─ 如果未超限：繼續處理

2. 執行邏輯
   ├─ 檢查快取
   ├─ 生成內容/返回快取
   └─ 寫入快取

3. 遞增計數
   └─ 使用 Firestore Transaction
```

#### Step 4: 前端整合（1 小時）

**目標檔案**: `app/feed/page.tsx`

**修改內容**:
- 顯示剩餘請求次數
- 顯示重置時間
- 接近限制時顯示警告（剩餘 < 5 次）

**UI 改進**:
- 頂部導航顯示：`15 / 20 次（可用）`
- 警告橫幅：剩餘 < 5 時顯示橙色警告
- 限制達到: 顯示「已達本小時上限」提示

#### Step 5: 錯誤處理與降級（1 小時）

**目標**: 確保系統穩定性

**處理邏輯**:
- Firestore 不可用 → 記錄警告，但允許請求（不阻塞）
- Transaction 失敗 → 重試一次，失敗後記錄日誌
- 讀取失敗 → 重置計數（偏保守）

### Firestore 事務使用

```typescript
// 使用 Firestore runTransaction 確保原子性
await runTransaction(db, async (transaction) => {
  const userDoc = await transaction.get(userRef)
  const data = userDoc.data()
  
  // 檢查跨小時
  if (data.rateLimit.lastResetHour !== currentHour) {
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
```

### 驗收標準

- [ ] Rate Limiter 正常限制請求
- [ ] 多實例環境計數正確（使用 Transaction）
- [ ] 小時重置邏輯正常
- [ ] 前端正確顯示剩餘次數和重置時間
- [ ] 降級邏輯正常（Firestore 失敗時不影響使用）

### 測試計劃

```
場景 1: 正常請求
- 使用者發送第 1 次請求 → 允許
- 剩餘次數: 19 / 20

場景 2: 接近限制
- 使用者發送第 16 次請求 → 允許
- 顯示橙色警告

場景 3: 超過限制
- 使用者發送第 21 次請求 → 拒絕
- 返回 429 Status Code
- 不使用降級模擬資料，顯示錯誤訊息和重試按鈕

場景 4: 小時重置
- 等待 1 小時後 →自動重置
- 剩餘次數: 20 / 20

場景 5: 多實例環境
- 同一用戶在兩個實例發送請求 → 計數共享
```

### 成本估計

**Firestore 讀寫次數**:
- 每次請求: 2 次讀取（check + increment）+ 1 次寫入
- 假設每小時 1000 次請求: 3000 次讀寫
- Firestore 免費層: 每天 50,000 次讀取 + 20,000 次寫入 ✅ 足夠

---

## 問題 4：載入狀態優化 🔴

### 問題概述

**問題陳述**:
- 兩種載入狀態（`loading`、`generating`）UI 難區分
- 沒有預估時間顯示
- 使用者不知道要等多久

### 設計目標

1. **清晰的狀態區分**: 載入 vs 生成
2. **預估時間**: 顯示「預計 2-3 秒」
3. **進度指示**: 進度條或百分比
4. **統一的視覺風格**: 清晰的圖標和文字

### 執行計劃

#### Step 1: 重構狀態管理（1.5 小時）

**目標檔案**: `app/feed/page.tsx`

**新狀態結構**:
```typescript
type LoadingState = 
  | { type: 'idle' }
  | { type: 'loading'; source: 'cache' | 'server' }
  | { type: 'generating'; estimatedTime: number; progress: number }
```

**狀態轉換**:
```
idle → loading (初始載入/快取)
      → generating (AI 生成)
      → idle (完成)
```

#### Step 2: 創建統一的 Loading 組件（2 小時）

**目標檔案**: `app/components/LoadingState.tsx`

**組件功能**:
```
┌─────────────────────────────────┐
│  [圖標] 載入中...                │
│  從快取或伺服器獲取內容         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  [Sparkles] AI 生成中...         │
│  預計 2-3 秒完成                │
│  ▓▓▓▓▓▓░░░░ 50% 完成          │
└─────────────────────────────────┘
```

**關鍵特性**:
- 藍色 spinner（載入用藍色，生成用紫色）
- 不同的圖標：Loader2 vs Sparkles
- 預估時間顯示（僅生成狀態）
- 進度進度條（僅生成狀態）

#### Step 3: 集成預估時間邏輯（1 小時）

**目標**: 測量並顯示預估時間

**時間測量**:
- 快取命中: 預估 < 500ms
- 伺服器載入: 預估 1-2s
- AI 生成: 預估 2-4s

**實作方式**:
- 根據來源（cache/ollama/mock）設置預估值
- 模擬進度：25% → 50% → 75% → 100%

**進度模擬**:
```typescript
// 生成狀態
setLoadingState({
  type: 'generating',
  estimatedTime: 2500,  // 預估 2.5 秒
  progress: 0
})

// 模擬進度
let progress = 0
const interval = setInterval(() => {
  progress += 25
  setLoadingState(prev => ({ ...prev, progress }))
  if (progress >= 100) clearInterval(interval)
}, 625)  // 每秒更新一次
```

#### Step 4: 更新主要 UI（1 小時）

**目標檔案**: `app/feed/page.tsx`

**修改內容**:
- 移除分離的 `loading` 和 `generating` 狀態
- 使用 `LoadingState` 組件
- 在適當位置顯示（列表頂部）

**顯示位置**:
```
┌────────────────────────────┐
│  [載入狀態]                  │  ← 動態顯示
├────────────────────────────┤
│  內容 1                      │
│  內容 2                      │
│  ...                        │
└────────────────────────────┘
```

### 視覺設計規範

**載入狀態（Loading）**:
- 主色：藍色 (`text-blue-500`, `border-blue-500`)
- 圖標：Loader2
- 文字：「載入中...」
- 副文字：「從快取或伺服器獲取內容」

**生成狀態（Generating）**:
- 主色：紫色 (`text-purple-500`, `border-purple-500`)
- 圖標：Sparkles
- 文字：「AI 生成中...」
- 副文字：「預計 X 秒完成」
- 進度條：灰色背景 + 紫色進度

#### Step 5: 錯誤狀態處理（0.5 小時）

**目標**: 處理載入失敗情況

**失敗狀態顯示**:
```
┌─────────────────────────────────┐
│  [Error] 載入失敗                │
│  請檢查網路連接後重試           │
│  [重新整理] 按鈕                 │
└─────────────────────────────────┘
```

**重試邏輯**:
- 自動重試：最多 2 次
- 手動重試：「重新整理」按鈕
- 超時偵測：超過 10 秒顯示錯誤

### 驗收標準

- [ ] 載入和生成狀態明確可區分
- [ ] 預估時間準確（誤差 < 30%）
- [ ] 進度條正常更新
- [ ] 錯誤狀態正確顯示
- [ ] 整體設計統一、專業
- [ ] 使用者測試反饋: 清晰、可信

### 使用者體驗改進

**改進前**:
- ❌ 不清楚系統在做什么
- ❌ 不知道要等多久
- ❌ 擔心系統卡住了

**改進後**:
- ✅ 明確知道是「載入」還是「生成」
- ✅ 知道大約要等多久
- ✅ 有視覺反饋，安心等待

---

## 總體執行時間表

### Week 1: 核心修復

| 日 | 工作內容 | 工時 |
|----|----------|------|
| 周一 | 問題 1: 移除所有 Emoji（完成） | 8h |
| 周二 | 問題 2: 快取系統（開發 + 測試） | 8h |
| 周三 | 問題 2: 快取系統（驗收）| 4h |
| 周四 | 問題 3: Rate Limiter（開發） | 8h |
| 周五 | 問題 4: 載入狀態（開發）| 6h |

### Week 2: 整合與優化

| 日 | 工作內容 | 工時 |
|----|----------|------|
| 周一 | 問題 3: Rate Limiter（測試 + 驗收）| 4h |
| 周二 | 問題 4: 載入狀態（完成）| 2h |
| 周三 | 整合測試與 Bug 修復 | 6h |
| 周四 | 上線前品質檢查 | 4h |
| 周五 | 部署上線 | 2h |

**總計**: 8-10 個工作日

---

## 風險評估與緩解

### 高風險項目

| 風險 | 來源 | 影響 | 緩解措施 |
|------|------|------|----------|
| 快取重構導致數據損失 | 遷移過程 | 高 | 先備份數據，漸進式遷移 |
| Rate Limiter 阻塞合法請求 | Bug | 高 | 經充分測試，監控日誌 |
| Emoji 移除影響使用者習慣 | �計變更 | 中 | 逐步推出，收集使用者反饋 |

### 中風險項目

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 效能退化 | 中 | 負載測試，監控指標 |
| 回滾時間過長 | 中 | 保留舊代碼分支 |

---

## 驗收清單

### 問題 1: 移除 Emoji
- [x] 所有介面檔案無 Emoji
- [x] 所有模擬資料無 Emoji
- [x] 所有 console.log 無 Emoji
- [x] 編譯通過
- [x] 功能測試通過

### 問題 2: 快取系統
- [x] Firestore 快取正常工作
- [x] 快取命中率 > 60%
- [x] API 回應時間顯著降低
- [ ] 降級邏輯正常
- [ ] 編譯通過
- [ ] 負載測試通過（100 並發）

### 問題 3: Rate Limiter
- [x] 正確限制請求
- [x] 多實例環境計數正確
- [ ] 小時重置邏輯正常
- [ ] 前端正確顯示剩餘次數
- [ ] 錯誤處理完善（不使用降級模擬資料）

### 問題 4: 載入狀態
- [x] 狀態區分明確
- [x] 預估時間準確
- [x] 進度條正常更新
- [ ] 錯誤狀態正確
- [ ] 使用者滿意度調查: > 4/5

---

## 上線檢查清單

### 開發階段
- [ ] 程式碼審查完成
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] 手動測試完成
- [ ] 性能測試通過

### 部署前
- [ ] 環境變數配置完成
- [ ] Firestore 安全規則更新
- [ ] 索引創建完成
- [ ] 備份當前版本（Git tag）

### 部署後
- [ ] 生產環境驗證
- [ ] 監控指標正常
- [ ] 無 P0/P1 級 Bug
- [ ] 使用者反饋收集

---

## 後續優化建議

這 4 個問題修復後，建議繼續優化以下項目（第二優先）：

1. **無限滾動優化**: 實作虛擬滾動（react-window）
2. **移除品質評分**: 對使用者無意義的數字
3. **隱藏技術資訊面板**: 右側 A/B 測試面板
4. **Toast 組件**: 替代 alert() 調用

---

## 附錄

### 檔案變更清單

| 檔案 | 變更類型 | 工時 |
|------|----------|------|
| `lib/interests.ts` | 修改 | 1h |
| `lib/mock-data.ts` | 修改 | 0.5h |
| `app/onboarding/interests/page.tsx` | 修改 | 1h |
| `app/components/ContentCard.tsx` | 修改 | 0.5h |
| `lib/cache/firestore-cache.ts` | 新增 | 2h |
| `services/content-cache.service.ts` | 重構 | 3h |
| `services/rate-limiter.ts` | 重構 | 3h |
| `app/api/generate/route.ts` | 修改 | 2h |
| `app/feed/page.tsx` | 修改 | 2h |
| `app/components/LoadingState.tsx` | 新增 | 3h |
| `firestore.rules` | 修改 | 0.5h |
| `.env.local` | 修改 | 0.5h |

**總計**: ~19 個小時

### 依賴套件

現有套件足夠，無需新增：
- Firebase（已有）
- lucide-react（已有）
- React（已有）
- Tailwind CSS（已有）

```bash
# 無需安裝新套件
# 僅更新現有套件（如果需要）
npm update firebase
```

### 參考資源

- [Firestore 文檔](https://firebase.google.com/docs/firestore)
- [Next.js 最佳實踐](https://nextjs.org/docs)
- [Rate Limiting 最佳實踐](https://stripe.com/blog/rate-limiters/)

---

**計劃結束**

*本計劃由 Sisyphus AI 編制*
*最後更新: 2026-01-24*