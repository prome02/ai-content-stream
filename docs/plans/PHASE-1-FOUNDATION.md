# Phase 1：基礎架構調整

> **目標：** 調整興趣分類、移除內容長度限制、加入無感覺判定邏輯
>
> **預期成果：** 系統能生成 200-1200 字的動態長度內容，並追蹤用戶的「無感覺」行為

---

## 任務檢查表

- [ ] 1.1 調整興趣分類（精簡為 6 類）
- [ ] 1.2 更新興趣選擇頁面 UI
- [ ] 1.3 移除 280 字元限制，改為動態深度
- [ ] 1.4 加入「無感覺」判定邏輯
- [ ] 1.5 階段驗證

---

## 任務 1.1：調整興趣分類定義

### 目標
將原本 12+ 個興趣分類精簡為 6 個 Google 新聞友好的分類。

### 需修改檔案
- `types/index.ts`
- `lib/prompt-builder.ts`

### 執行步驟

**Step 1：更新 `types/index.ts` 的興趣類型定義**

找到興趣相關的類型定義，更新為：

```typescript
// 新的興趣分類（Google 新聞友好）
export type InterestCategory =
  | 'tech'      // 科技新知（原 ai, tech, science）
  | 'business'  // 商業財經
  | 'health'    // 健康生活（原 health, food）
  | 'travel'    // 旅遊探索
  | 'sports'    // 運動體育
  | 'fashion'   // 時尚潮流

export const INTEREST_CATEGORIES: Record<InterestCategory, {
  label: string
  keywords: string[]  // 用於 Google 新聞搜尋
}> = {
  tech: {
    label: '科技新知',
    keywords: ['科技', 'AI', '人工智慧', '軟體', '網路']
  },
  business: {
    label: '商業財經',
    keywords: ['商業', '財經', '股市', '投資', '經濟']
  },
  health: {
    label: '健康生活',
    keywords: ['健康', '養生', '醫療', '飲食', '運動健身']
  },
  travel: {
    label: '旅遊探索',
    keywords: ['旅遊', '旅行', '景點', '自由行', '出國']
  },
  sports: {
    label: '運動體育',
    keywords: ['運動', '體育', 'NBA', '棒球', '足球']
  },
  fashion: {
    label: '時尚潮流',
    keywords: ['時尚', '穿搭', '美妝', '潮流', '品牌']
  }
}
```

**Step 2：更新 `lib/prompt-builder.ts` 的 INTEREST_TO_HASHTAG**

找到 `INTEREST_TO_HASHTAG` 或類似的映射表，更新為新分類。

### 驗收條件
- [ ] 類型定義已更新
- [ ] 無 TypeScript 編譯錯誤

---

## 任務 1.2：更新興趣選擇頁面 UI

### 目標
更新 onboarding 頁面，顯示新的 6 個分類。

### 需修改檔案
- `app/onboarding/interests/page.tsx`

### 執行步驟

**Step 1：更新興趣選項陣列**

找到興趣選項的定義，替換為：

```typescript
const INTEREST_OPTIONS = [
  { id: 'tech', label: '科技新知', icon: '💻', description: 'AI、軟體、網路趨勢' },
  { id: 'business', label: '商業財經', icon: '📈', description: '投資、經濟、產業動態' },
  { id: 'health', label: '健康生活', icon: '🏃', description: '養生、飲食、健身' },
  { id: 'travel', label: '旅遊探索', icon: '✈️', description: '景點、旅行、文化' },
  { id: 'sports', label: '運動體育', icon: '⚽', description: '賽事、球隊、運動員' },
  { id: 'fashion', label: '時尚潮流', icon: '👗', description: '穿搭、美妝、品牌' },
]
```

**Step 2：確保選擇邏輯正常運作**

檢查選擇/取消選擇的邏輯是否需要調整。

### 驗收條件
- [ ] 頁面顯示 6 個新分類
- [ ] 可正常選擇/取消選擇
- [ ] 選擇結果正確儲存

---

## 任務 1.3：移除 280 字元限制，改為動態深度

### 目標
將固定的 280 字元限制改為根據用戶行為決定的動態深度（200-1200 字）。

### 需修改檔案
- `lib/prompt-builder.ts`

### 執行步驟

**Step 1：新增深度等級定義**

在 `prompt-builder.ts` 中新增：

```typescript
// 內容深度等級
export const DEPTH_LEVELS = {
  brief: {
    id: 'brief',
    wordCount: { min: 200, max: 300 },
    description: '簡短摘要，快速瀏覽'
  },
  standard: {
    id: 'standard',
    wordCount: { min: 400, max: 600 },
    description: '標準長度，適中深度'
  },
  deep: {
    id: 'deep',
    wordCount: { min: 800, max: 1200 },
    description: '深度分析，詳細內容'
  }
} as const

export type DepthLevel = keyof typeof DEPTH_LEVELS
```

**Step 2：修改提示詞生成邏輯**

找到生成提示詞的函數，移除類似以下的限制：

```typescript
// 移除這類限制
// "請在 280 字元內完成"
// "Twitter 風格短貼文"
```

替換為動態深度指示：

```typescript
function getDepthInstruction(depth: DepthLevel): string {
  const config = DEPTH_LEVELS[depth]
  return `請撰寫 ${config.wordCount.min}-${config.wordCount.max} 字的內容。${config.description}。`
}
```

**Step 3：暫時使用預設深度**

在模組選擇邏輯完成前（Phase 2），先使用 `standard` 作為預設：

```typescript
const defaultDepth: DepthLevel = 'standard'
```

### 驗收條件
- [ ] 提示詞不再包含 280 字元限制
- [ ] 生成的內容長度明顯增加（400-600 字）

---

## 任務 1.4：加入「無感覺」判定邏輯

### 目標
當用戶看到內容超過 3 秒但沒有任何互動（讚/不讚），記錄為「無感覺」。

### 需修改檔案
- `app/hooks/useInteractionTracking.ts`
- `types/index.ts`

### 執行步驟

**Step 1：在 `types/index.ts` 新增互動類型**

```typescript
export type InteractionType =
  | 'like'
  | 'dislike'
  | 'skip'      // 無感覺（新增）
  | 'feedback'  // 文字意見（未來用）
  | 'keyword_click'  // 關鍵字點擊（未來用）
```

**Step 2：修改 `useInteractionTracking.ts`**

找到追蹤邏輯，加入無感覺判定：

```typescript
// 無感覺判定參數
const SKIP_THRESHOLD_MS = 3000  // 可見超過 3 秒
const SKIP_SCROLL_THRESHOLD = 0.5  // 滾動超過 50%

interface ContentVisibility {
  contentId: string
  visibleSince: number | null
  hasInteracted: boolean
}

// 在現有的追蹤邏輯中加入
function checkForSkip(visibility: ContentVisibility): boolean {
  if (visibility.hasInteracted) return false

  const visibleDuration = Date.now() - (visibility.visibleSince || Date.now())
  return visibleDuration >= SKIP_THRESHOLD_MS
}

// 當內容離開視窗時檢查
function onContentLeaveViewport(contentId: string) {
  const visibility = visibilityMap.get(contentId)
  if (visibility && checkForSkip(visibility)) {
    trackInteraction({
      contentId,
      type: 'skip',
      dwellTime: Date.now() - visibility.visibleSince!,
      scrollDepth: getCurrentScrollDepth(contentId)
    })
  }
}
```

**Step 3：整合到 Intersection Observer**

確保離開視窗時觸發判定邏輯。

### 驗收條件
- [ ] 可見超過 3 秒且無互動時，記錄 `skip` 事件
- [ ] Console 可看到 skip 事件記錄

---

## 任務 1.5：階段驗證

### 驗證步驟

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **測試興趣選擇頁面**
   - 訪問 `/onboarding/interests`
   - 確認顯示 6 個新分類
   - 選擇興趣並完成 onboarding

3. **測試內容生成長度**
   - 進入 feed 頁面
   - 確認生成的內容明顯比之前長（400-600 字）
   - 檢查 console 確認沒有 280 字元相關限制

4. **測試無感覺判定**
   - 在 feed 頁面停留在某篇內容 3 秒以上
   - 不進行任何互動，直接滾動到下一篇
   - 檢查 console 或 Network，確認有 `skip` 事件發送

### 驗收清單

- [ ] 興趣選擇頁面正常運作
- [ ] 內容長度增加（不再是短貼文）
- [ ] 無感覺事件正確記錄
- [ ] 無 TypeScript 編譯錯誤
- [ ] 無 Console 錯誤

---

## 完成後

Phase 1 完成後，繼續執行 [Phase 2：新聞整合與提示詞模組化](./PHASE-2-NEWS-AND-MODULES.md)
