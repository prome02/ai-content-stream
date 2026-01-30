# Draft: Firestore Direct Access Refactor Plan Review

## 計劃概述
重構目標：將用戶資料存取從 Client → API Route → Firestore 改為 Client ↔ Firestore 直接存取

## 計劃中已明確的部分
- 問題分析清晰：localStorage 與 serverMemoryCache 不同步
- 影響檔案清單完整
- 詳細執行步驟（Phase 1-5）
- Firestore 資料結構定義
- 風險與注意事項

## 需要進一步確認的問題

### 1. Firestore 匯出問題 - **發現嚴重問題！**
**問題**：計劃中提到 `lib/real-firebase.ts` 需要「小改」以確保 Firestore 正確 export

**已經確認**：
- ✅ `real-firebase.ts` 確實 export 了 `db` 
- ✅ 有正確配置 Firestore Emulator 連接邏輯（端口 8080）
- ❌ **嚴重問題**：在 server-side 時，`db` 返回一個 stub 物件（第 102-110 行）
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
  
**影響**：重構後的 `user-data.ts` 如果被 server-side API 呼叫會失敗！

### 2. 安全規則現狀 - **發現不兼容問題！**
**問題**：計劃提到「可能需要新增 firestore.rules」，但未檢查是否已存在

**已經確認**：
- ✅ 專案已有 firestore.rules 文件
- ❌ **嚴重問題**：現有規則使用 **多站點架構**，與我們的 `aipcs_` 前綴集合完全無關！
  - 規則結構：`{site}/users/{userId}`（例如 `siteA/users/123`）
  - 我們的結構：`aipcs_users/{userId}`
  - 現有規則預設拒絕所有存取：`match /{document=**} { allow read, write: if false; }`

**影響**：新的 Firestore 存取會被現有規則完全阻擋！

### 3. real-firebase.ts 的 SSR 問題

### 3. API 參數驗證
**問題**：計劃提到「API Route 必須信任 client 傳入的 interests - 可考慮加驗證」
**需要確認**：
- 當前 API 的參數驗證機制（使用 lib/api-utils.ts 的 validateRequest）
- 是否需要新增 interests 欄位的驗證規則
- 如何防止惡意 interests 陣列（大小、內容等）

### 4. 資料遷移策略
**問題**：現有 localStorage 資料會丟失（開發環境影響小）
**需要確認**：
- 是否有重要資料需要從 localStorage 遷移到 Firestore
- 遷移腳本是否需要（特別是在 production 環境）
- 如何處理沒有 Firestore 用戶資料的 fallback

### 5. 錯誤處理與離線狀態
**問題**：提到需確認 Firestore offline persistence 正常運作，但沒有具體細節
**需要確認**：
- Firestore 離線持久性的配置
- 連接失敗時的 fallback 策略
- 錯誤處理和用戶回饋（loading states, error messages）

### 6. 類型定義更新
**問題**：計劃提到「可能需要調整 GenerateRequest 介面」
**需要確認**：
- 當前 `types/index.ts` 中的 GenerateRequest 定義
- 是否還需要其他相關類型的調整

## 技術決策待定
- Firestore collection naming: `aipcs_users`（已確定）
- 資料結構：preferences 物件包含 interests, style, language
- 時間戳記：createdAt, updatedAt

## 測試策略
計劃提到測試完整流程，但未明確：
- 單元測試是否需要更新
- 整合測試流程
- 自動化測試腳本

## 依賴檢查
- Firebase SDK 版本是否支援離線持久性
- Firestore Emulator 運行要求
- 環境變數配置（NEXT_PUBLIC_USE_FIREBASE_EMULATOR）
