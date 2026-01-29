# MVP 簡化任務：使用者行為追蹤系統簡化計劃

## TL;DR

> **Quick Summary**: 註解複雜追蹤機制，簡化儲存與會話，保留MVP核心追蹤（像/不按/關鍵字/簡單停留），優先系統穩定性和內容生成質量。
>
> **Deliverables**:
> - 註解複雜可見性追蹤（滾動深度/View %/Skip偵測）
> - 註解複雜評分演算法（用戶信證加權）
> - 註解A/B測試系統
> - 簡化localStorage從1000→100事件
> - 簡化會話管理邏輯
> - 保留MVP核心追蹤功能完整運作
>
> **Estimated Effort**: Low (主要是註解和邏輯簡化)
> **Priority**: Critical - MVP穩定性優先

---

## Context

### Original Request
「先從文件去找出 目前系統當中對於使用者的 瀏覽喜好的行為的追蹤方式」→ **更新為**: MVP簡化，優先穩定性

### User Confirmation (ALL SELECTED)
- ✅ 🔴 註解複雜可見性追蹤
- ✅ 🔴 註解複雜評分演算法
- ✅ 🔴 註解A/B測試系統
- ✅ 🟡 簡化儲存與會話
- ✅ 🟢 保留MVP核心追蹤

### Core Principles
1. **系統穩定性 > 複雜追蹤**
2. **內容生成質量是首要目標**
3. **註解不刪除**，方便未來恢復
4. **保留業界MVP常用簡單方法**

---

## Work Objectives

### Core Objective
簡化使用者行為追蹤系統，移除影響系統穩定性的複雜機制，確保MVP核心追蹤功能（像/不按/關鍵字/簡單停留）正常運作。

### Concrete Deliverables
1. `app/hooks/useInteractionTracking.ts` - 註解複雜可見性追蹤，保留簡單互動
2. `lib/quality-scoring.ts` - 註解用戶信證加權，使用固定權重
3. `lib/ab-testing.ts` - 完全註解所有A/B測試邏輯
4. `lib/user-data.ts` - 簡化統計提取，移除skip/avgDwell
5. `lib/event-tracking.ts` - 簡化會話管理
6. `app/api/interaction/route.ts` - 更新使用簡化邏輯

### Definition of Done
- [ ] 所有複雜追蹤已註解（不刪除）
- [ ] localStorage緩衝從1000減至100事件
- [ ] MVP核心追蹤（像/不按/關鍵字）完整運作
- [ ] 系統穩定性測試通過（dev server正常啟動）
- [ ] 內容生成功能不受影響

### Must Have
- 註解所有複雜追蹤代碼
- 保留像/不按點擊統計
- 保留關鍵字點擊記錄
- 保留簡單停留時間（>5秒）
- 保留基礎質量分數（+5/-8）

### Must NOT Have (Guardrails)
- 刪除任何現有代碼（只註解）
- 影響內容生成質量
- 引入新的複雜邏輯
- 破壞現有API接口

---

## TODOs

- [ ] 1. 簡化 `useInteractionTracking.ts` - 註解複雜可見性追蹤

  **What to do**:
  - 註解滾動深度追蹤（20閾值IntersectionObserver）
  - 註解view percentage計算
  - 註解skip偵測邏輯（3000ms無互動）
  - 保留簡單的like/dislike/keyword_click追蹤
  - 簡化停留時間為簡單的「可見>5秒」檢查
  - 保留記錄到localStorage的基本功能

  **Must NOT do**:
  - 刪除任何現有函數
  - 移除像/不按按鈕功能
  - 影響Firebase Analytics記錄

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單註解操作，不需要複雜邏輯
  - **Skills**: [`git-master`] (可能需要版本控制)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 2, 3

  **References**:

  **需要註解的代碼段**:
  - Line 29-31: SKIP_THRESHOLD_MS, SKIP_SCROLL_THRESHOLD定義
  - Line 128-142: `calculateViewPercentage()` 函數
  - Line 167-228: Skip偵測邏輯和相關IntersectionObserver設定
  - Line 256-271: 滾動深度追蹤
  - Line 200-283: 複雜的IntersectionObserver配置（20閾值）

  **需要保留的核心功能**:
  - Line 348-361: `recordInteraction()` 像按/不按鈕點擊
  - Line 50-61: localStorage基本儲存邏輯
  - Line 188-195: 簡單的view事件記錄

  **Acceptance Criteria**:

  ```bash
  # 驗證: 複雜追蹤已註解
  grep -c "// MVP: COMMENTED OUT - Complex tracking" /path/to/useInteractionTracking.ts

  # 驗證: 像按/不按鈕功能仍存在
  grep "recordInteraction" /path/to/useInteractionTracking.ts | grep -q "like\|dislike"

  # 驗證: 文件可編譯（TypeScript無誤）
  cd /path/to/project && npx tsc --noEmit app/hooks/useInteractionTracking.ts
  ```

- [ ] 2. 簡化 `quality-scoring.ts` - 註解用戶信證加權

  **What to do**:
  - 註解`getUserWeight()`函數（年齡/正評/活動三重加權）
  - 修改`calculateQualityScore()`使用固定權重（weight = 1.0）
  - 註解停留時間獎勵公式（`Math.min(10, (dwellTime - 3000) * 0.003)`）
  - 保留基礎分數：like(+5), dislike(-8), view(+1), long_dwell(+8)
  - 保留分數邊界(0-100)

  **Must NOT do**:
  - 刪除基礎分數計算
  - 改變API返回值結構
  - 影響現有評分調用

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單函數修改，固定邏輯
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 4
  - **Blocked By**: 1

  **References**:

  **需要註解的代碼段**:
  - Line 38: `const weight = getUserWeight(...)` 調用
  - Line 75-92: `getUserWeight()` 完整函數（三重加權）
  - Line 58-62: 停留時間獎勵額外分數計算

  **需要修改的代碼**:
  - Line 67-69: 返回邏輯仍保留分數邊界(0-100)

  **Acceptance Criteria**:

  ```bash
  # 驗證: 用戶信證加權已註解
  grep -c "// MVP: COMMENTED OUT" /path/to/quality-scoring.ts

  # 驗證: 基礎分數仍計算
  grep -q "like.*5\|dislike.*8" /path/to/quality-scoring.ts

  # 驗證: 函數返回類型正確
  php -r "驗證return {...} 結構"
  ```

- [ ] 3. 註解 `ab-testing.ts` - 完全關閉A/B測試

  **What to do**:
  - 整個文件全部註解，或
  - 註解所有A/B測試相關函數和邏輯
  - 在`calculateQualityScoreWithVariant()`中直接返回基礎分數
  - 註解變體分配和記錄邏輯

  **Must NOT do**:
  - 刪除文件內容
  - 影響調用此模組的其他代碼

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單的全面註解操作
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 4
  - **Blocked By**: 1

  **References**:

  **需要處理的文件**:
  - `lib/ab-testing.ts`: 整個模組（檢查所有export函數）

  **需要更新的調用點**:
  - `app/api/interaction/route.ts`: 移除A/B測試調用

  **Acceptance Criteria**:

  ```bash
  # 驗證: AB測試相關代碼已註解
  grep -c "// MVP: COMMENTED" /path/to/ab-testing.ts

  # 驗證: API無調用A/B邏輯
  ! grep -q "AbTestingManager" /path/to/app/api/interaction/route.ts

  # 驗證: 編譯無錯誤
  npx tsc --noEmit lib/ab-testing.ts
  ```

- [ ] 4. 更新 `app/api/interaction/route.ts` - 使用簡化邏輯

  **What to do**:
  - 移除`AbTestingManager`的調用
  - 移除`EventTrackingManager`的A/B相關調用
  - 直接使用`calculateQualityScore()`（固定權重版本）
  - 保留基本的互動記錄和用戶統計更新
  - 保留feedback和keyword_click的直接處理

  **Must NOT do**:
  - 改變API endpoint路徑或基本參數
  - 影響feedback和keyword_click功能
  - 移除基礎的quality score計算

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單的API邏輯修改
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 5
  - **Blocked By**: 2, 3

  **References**:

  **需要移除的代碼**:
  - Line 19: `const abConfig = AbTestingManager.getUserConfig(uid)`
  - Line 20-27: `calculateQualityScoreWithVariant()`調用
  - Line 32-33: `AbTestingManager.recordInteraction(uid)`
  - Line 35-43: `EventTrackingManager.trackContentInteraction()`

  **需要保留的代碼**:
  - Line 52-72: feedback處理邏輯
  - Line 74-92: keyword_click處理邏輯
  - Line 145-154: 質量分數更新和mock數據
  - Line 176-195: 用戶統計更新

  **Acceptance Criteria**:

  ```bash
  # 驗證: API文件仍可編譯
  npx tsc --noEmit app/api/interaction/route.ts

  # 驗證: feedback/keyword_click路徑仍存在
  grep -q "action === 'feedback'\|action === 'keyword_click'" /path/to/app/api/interaction/route.ts

  # 驗證: basic scoring仍運作
  grep -q "calculateQualityScore" /path/to/app/api/interaction/route.ts
  ```

- [ ] 5. 簡化 `user-data.ts` - 移除複雜統計

  **What to do**:
  - 註解avgDwellTime計算（Line 280-290）
  - 註解recentSkips統計（Line 282-283）
  - 保留recentLikes/recentDislikes
  - 保留recentKeywords提取
  - 保留feedback儲存/讀取

  **Must NOT do**:
  - 移除feedback和keyword儲存功能
  - 改變API接口參數

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單的統計函數修改
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 6
  - **Blocked By**: 1

  **References**:

  **需要註解的代碼**:
  - Line 250-258: `UserBehaviorStats`介面中的avgDwellTime和recentSkips
  - Line 280-290: 停留時間統計計算循環
  - Line 283: skips計算

  **需要保留的代碼**:
  - Line 281-282: likes和dislikes統計
  - Line 296-298: feedback和keyword讀取
  - Line 38-67, 72-106: 偏好儲存/讀取（保持不變）

  **Acceptance Criteria**:

  ```bash
  # 驗證: 複雜統計已移除
  ! grep -q "avgDwellTime\|recentSkips" /path/to/user-data.ts

  # 驗證: feedback/keyword仍可用
  grep -q "saveUserFeedback\|saveKeywordClick" /path/to/user-data.ts

  # 驗證: 編譯正常
  npx tsc --noEmit lib/user-data.ts
  ```

- [ ] 6. 簡化 `useInteractionTracking.ts` - localStorage緩衝從1000→100

  **What to do**:
  - 將Line 50的 `events.length > 1000` 改為 `> 100`
  - 將Interactions取樣數據限制也相應減少

  **Must NOT do**:
  - 移除localStorage功能
  - 影響現有的儲存邏輯

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 簡單的數值修改
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: 驗證
  - **Blocked By**: 1

  **References**:

  **需要修改的代碼**:
  - Line 59: `events.length > 1000` → `> 100`

  **Acceptance Criteria**:

  ```bash
  # 驗證: 緩衝限制已更改
  grep -q "events.length > 100" /path/to/useInteractionTracking.ts

  # 驗證: 編譯正常
  npx tsc --noEmit app/hooks/useInteractionTracking.ts
  ```

---

## Commit Strategy

| 完成後 | 提交訊息 | 文件 | 內容摘要 |
|--------|----------|------|----------|
| 複雜追蹤註解 | `refactor(mvp): comment out complex visibility tracking` | `app/hooks/useInteractionTracking.ts` | 註解滾動、view%、skip偵測；保留核心互動 |
| 評分簡化 | `refactor(mvp): simplify quality scoring, remove user reputation` | `lib/quality-scoring.ts` | 註解用戶信證加權；使用固定權重 |
| AB測試停用 | `refactor(mvp): comment out A/B testing system` | `lib/ab-testing.ts` | 完全註解A/B測試邏輯 |
| API簡化 | `refactor(mvp): use simplified scoring in API` | `app/api/interaction/route.ts` | 移除A/B調用，直接使用基礎評分 |
| 統計簡化 | `refactor(mvp): remove complex user behavior stats` | `lib/user-data.ts` | 移除avgDwell和skips統計 |
| 緩衝減少 | `refactor(mvp): reduce localStorage buffer from 1000 to 100` | `app/hooks/useInteractionTracking.ts` | 減少本地儲存負擔 |

---

## Success Criteria

### Final Checklist
- [ ] 所有複雜追蹤已註解（滾動、view%、skip）
- [ ] 用戶信證加權已移除，使用固定權重
- [ ] A/B測試系統已完全註解
- [ ] localStorage緩衝減至100事件
- [ ] 像按/不按鈕追蹤正常運作
- [ ] 關鍵字點擊追蹤正常運作
- [ ] 簡單停留時間（>5秒）追蹤運作
- [ ] TypeScript編譯無錯誤
- [ ] Dev server正常啟動
- [ ] 內容生成功能不受影響

### 系統穩定性驗證

```bash
# 1. TypeScript編證驗證
npx tsc --noEmit

# 2. Dev server啟動測試
npm run dev  # 應正常啟動無錯誤

# 3. 基本功能測試
# - 像按按鈕點擊 → localStorage記錄
# - 不按鈕點擊 → localStorage記錄
# - 關鍵字點擊 → localStorage記錄
# - 內容生成 → 質量評分計算

# 4. localStorage檢查（開發者工具）
# 確認 aipcs_interaction_logs 最多100事件
# 確認簡單事件（like/dislike/keyword_click）正常記錄
```

---

## MVP核心追蹤維持功能驗證

| 功能 | 狀態 | 驗證方法 |
|------|------|----------|
| 像按點擊 | ✅ 保留 | Click按鈕 → localStorage有記錄 |
| 不按點擊 | ✅ 保留 | Click按鈕 → localStorage有記錄 |
| 關鍵字點擊 | ✅ 保留 | Click關鍵字 → localStorage有記錄 |
| 簡單停留時間 | ✅ 保留 | 停留>5秒 → 記錄dwell事件 |
| 基礎質量分數 | ✅ 保留 | API返回+5/-8分數 |
| feedback輸入 | ✅ 保留 | 輸入文字 → localStorage有記錄 |