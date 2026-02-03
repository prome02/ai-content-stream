# Firestore 直接存取快速修復計畫

## TL;DR

> **Quick Summary**: 快速修復三個關鍵文件，打通Client直接存取Firestore的路徑，解決安全性阻擋和SSR樁問題。
> 
> **Deliverables**:
> - firestore.rules：新增 `aipcs_*` 集合存取規則
> - real-firebase.ts：修復server-side stub，與client-only架構兼容
> - user-data.ts：重寫為直接Firestore存取，移除localStorage/serverMemoryCache
> 
> **Estimated Effort**: Medium (~2-4小時)
> **Priority**: High - 打通Client↔Firestore直接存取通道

---

## Context

### Original Request
「快速打通小修正（我們最多3個變化文件）。直接輸出計畫的文件就好。」

### Core Principles
1. **先打通，後優化** - 解決阻塞性問題優先
2. **安全規則先行** - Firestore拒絕所有存取是最大阻塞
3. **Client-only架構** - 符合「Client↔Firestore直接存取」理念
4. **保持API簡化** - API只負責LLM生成，不碰用戶資料

### 已知問題彙整（來自draft-review.md）

1. **Firestore 規則阻塞**：
   - 現有規則：多站點架構 `{site}/users/{userId}`
   - 我們的結構：`aipcs_users/{userId}`
   - 結果：預設拒絕所有存取 `match /{document=**} { allow read, write: if false; }`

2. **SSR Stub 問題**：
   - `real-firebase.ts` server-side 返回錯誤stub
   - `db.get()` 拋出 `Error('Firebase 未初始化 - SSR')`

3. **Client-only 架構衝突**：
   - 計劃是Client直接存取Firestore
   - 但server components可能調用相關函數

---

## Work Objectives

### Core Objective
快速修復三個關鍵文件，打通Client↔Firestore直接存取路徑，解決核心阻塞問題。

### Concrete Deliverables
1. **firestore.rules** - 新增 `aipcs_*` 集合存取規則（解決安全性阻塞）
2. **real-firebase.ts** - 修復server-side stub，與client-only架構兼容
3. **user-data.ts** - 重寫為直接Firestore存取，移除localStorage/serverMemoryCache

### Definition of Done
- [ ] Firestore Emulator接受 `aipcs_users/{userId}` 寫入操作
- [ ] API不再因server-side stub而失敗
- [ ] User preferences成功儲存到Firestore
- [ ] User preferences成功從Firestore讀取
- [ ] Feed頁面能傳遞interests給API

---

## 技術架構目標

### 目標架構
```
Client (瀏覽器)
    ↑↓ 直接讀寫
Firestore (Emulator)
    ↗
API Route (只處理LLM生成)
```

### 關鍵技術決策
1. **Firestore 集合命名**：保持 `aipcs_users`, `aipcs_content_cache`, `aipcs_interactions`
2. **安全規則模式**：用戶只能存取自己的資料 (UID匹配)
3. **Client-only執行**：所有Firestore操作僅限client-side，必要時標記 `'use client'`

---

## TODOs

### Phase 1: Firestore 安全規則修正（緊急優先）

- [ ] 1. 修正 `firestore.rules` - 新增 `aipcs_*` 存取規則

  **What to do**:
  - 在當前多站點規則之後，預設拒絕之前，新增 `match /aipcs_users/{userId}`
  - 增加規則：`allow read, write: if request.auth != null && request.auth.uid == userId`
  - 新增 `match /aipcs_{collection}/{document}` 通用規則
  - 確保新規則位置恰當（在 `match /{document=**} { ... }` 之前）

  **Must NOT do**:
  - 移除現有多站點規則結構
  - 放寬至匿名存取
  - 破壞現有 `{site}/` 集合的安全性

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單規則新增，不改變既有邏輯
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (先行執行)
  - **Blocks**: Phase 2, Phase 3
  - **Blocked By**: 無

  **References**:
  - 現有規則第144-151行：預設拒絕規則
  - 新增規則應在第140-150行之間

  **Acceptance Criteria**:
  ```bash
  # 驗證: 規則包含 aipcs_users
  grep -q "match /aipcs_users" /path/to/firestore.rules
  
  # 驗證: UID驗證規則存在
  grep -q "request.auth.uid == userId" /path/to/firestore.rules
  
  # 驗證: 編譯規則測試
  firebase emulators:exec "firebase firestore:rules test"
  ```

### Phase 2: real-firebase.ts Stub 修復

- [ ] 2. 修正 `real-firebase.ts` - Server-side stub 兼容client-only架構

  **What to do**:
  - 分析第102-110行 server-side stub：
    ```typescript
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
          set: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
          update: () => Promise.reject(new Error('Firebase 未初始化 - SSR'))
        })
      })
    }
    ```
  - 修正策略選項之一：
    1. 將 `user-data.ts` 標記為 `'use client'`
    2. 修改stub返回可用介面（最少功能）
    3. 懶載入Firebase SDK避免SSR問題
  - 確保client-side Firebase初始化正常（已存在）

  **Must NOT do**:
  - 完全移除SSR檢查
  - 在server-side初始化真實Firebase實例
  - 破壞client-side Firestore連線

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 需要分析SSR架構影響，制定最佳策略
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO (需Phase 1完成)
  - **Blocks**: Phase 3
  - **Blocked By**: Phase 1

  **Acceptance Criteria**:
  ```bash
  # 驗證: server-side stub不再拋出錯誤
  # (需手工測試)
  
  # 驗證: client-side Firestore連線正常
  # Dev console無Firebase初始化錯誤
  
  # 驗證: TypeScript編譯通過
  npx tsc --noEmit lib/real-firebase.ts
  ```

### Phase 3: user-data.ts 重寫為Firestore存取

- [ ] 3. 重寫 `user-data.ts` - 使用Firestore直接存取

  **What to do**:
  - Import Firestore函數：`import { db } from './real-firebase'`
  - 定義集合名稱：`const USERS_COLLECTION = 'aipcs_users'`
  - 重寫 `saveUserPreferences`：使用 `doc(db, USERS_COLLECTION, userId)` → `setDoc()`
  - 重寫 `getUserPreferences`：使用 `getDoc()` 讀取資料
  - 移除所有localStorage和serverMemoryCache相關程式碼
  - 移除 `isBrowser()` 函數（不再需要環境區分）
  - 更新相關函數：`saveUserFeedback`, `saveKeywordClick` 等
  - 注意資料結構轉換：`new Date()` → Firestore Timestamp

  **Must NOT do**:
  - 改變函數簽名和返回值類型
  - 移除feedback和keyword點擊功能
  - 影響API路由現有調用（phase 4）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 直接的文件重寫，已有明確模式
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO (需Phase 2完成)
  - **Blocks**: Phase 4
  - **Blocked By**: Phase 2

  **Acceptance Criteria**:
  ```bash
  # 驗證: localStorage程式碼已移除
  ! grep -q "localStorage" /path/to/user-data.ts | head -5
  
  # 驗證: Firestore導入存在
  grep -q "import.*db.*from.*real-firebase" /path/to/user-data.ts
  
  # 驗證: TypeErrorScript編譯通過
  npx tsc --noEmit lib/user-data.ts
  ```

### Phase 4: API Route 調整（Optional，後續）

- [ ] 4. 調整 `app/api/generate/route.ts` - 移除getUserPreferences呼叫

  **What to do**:
  - 從GenerateRequest介面新增 `interests?: string[]`
  - 從request body直接讀取 `interests`
  - 移除 `await getUserPreferences(uid)` 呼叫
  - 直接使用傳入的interests抓取新聞

  **Must NOT do**:
  - 改變API接口基本結構
  - 移除速率限制和快取檢查
  - 影響LLM生成邏輯

  **Parallelization**:
  - **Can Run In Parallel**: YES (但需手動測試)
  - **Blocks**: 驗證測試
  - **Blocked By**: Phase 3

---

## 測試計畫

### 逐步驗證

1. **Firestore規則測試**：
   ```
   1. 啟動Firestore Emulator
   2. 使用test script寫入aipcs_users/{test_uid}
   3. 確認寫入成功，無權限錯誤
   ```

2. **Client存取測試**：
   ```
   1. 頁面載入：Feed頁面嘗試讀取preferences
   2. Onboarding：選擇興趣，儲存到Firestore
   3. Dev tools檢查Firestore Emulator資料
   ```

3. **API相容性測試**：
   ```
   1. API仍能正常生成內容
   2. Client傳遞interests給API後，內容正常生成
   ```

### 失敗處理策略

| 故障點 | 降級策略 | 復原方案 |
|--------|----------|----------|
| Firestore規則失敗 | 使用localStorage備份 | 回退到原rules |
| real-firebase stub拋錯 | 臨時註解server-side檢查 | 標記為 'use client' |
| user-data.ts轉換錯誤 | 保留原程式碼，標記TODO | 逐步轉換 |

---

## 工作時程與依賴

### 時程預估
- **Phase 1**: 15-30分鐘 (立即可執行)
- **Phase 2**: 30-60分鐘 (需分析決策)
- **Phase 3**: 60-90分鐘 (直接實作)
- **Phase 4**: 30分鐘 (後續優化)

### 總時程：~2-4小時

### 檔案依賴關係
```
firestore.rules (Phase 1)
       ↓
real-firebase.ts (Phase 2)
       ↓
user-data.ts (Phase 3)
       ↓
api/generate/route.ts (Phase 4, optional)
```

---

## 風險評估

### 高風險項目
1. **Firestore規則誤配**：可能導致生產環境資料暴露
2. **SSR拋錯**：導致server components崩潰
3. **資料遷移丟失**：從localStorage轉移時資料不一致

### 風險緩解
1. **規則測試**：在Emulator中充分測試security rules
2. **逐步部署**：先修正規則，再修正stub，最後重寫user-data
3. **備份策略**：保留原localStorage邏輯作為fallback

---

## 成功指標

### 主要指標
- [ ] Onboarding選擇的興趣成功儲存到Firestore Emulator
- [ ] Feed頁面能正確讀取Firestore中的interests
- [ ] API能收到client傳來的interests參數
- [ ] 內容生成正常（不再因權限問題失敗）
- [ ] Server-side沒有Firebase初始化錯誤

### 次要指標
- [ ] 移除localStorage/serverMemoryCache相關程式碼
- [ ] TypeScript編譯無錯誤
- [ ] Dev server啟動正常

---

## 執行指引

### 立即執行（Phase 1）
由Atlas啟動Phase 1任務，修正firestore.rules

### 分析後執行（Phase 2）
Phase 1完成後，分析SSR stub最佳策略，執行Phase 2

### 最終實作（Phase 3）
Phase 2完成後，重寫user-data.ts

### 後續優化（Phase 4）
全部完成後，可考慮API調整

---

**計畫狀態**: Ready to execute Phase 1
**優先級**: High (打通阻塞通道)
**複雜度**: Medium (需協調三個文件修正)