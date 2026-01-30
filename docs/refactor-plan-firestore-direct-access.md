# 重構計畫：Client 直接存取 Firestore

## 目標

將用戶資料存取從「Client → API Route → Firestore」改為「Client ↔ Firestore 直接存取」，API Route 只負責 LLM 生成。

---

## 問題分析

### 目前架構的問題

```
Client (browser)
    ↓
API Route (server-side)
    ↓ getUserPreferences()
    ↓ 使用 serverMemoryCache（與 client 的 localStorage 不同步）
    ↓
Firestore（實際上沒有被使用）
```

**問題：**
1. `user-data.ts` 使用 localStorage（client）和 serverMemoryCache（server），兩者不同步
2. Onboarding 存到 localStorage，但 API 讀 serverMemoryCache → 永遠讀不到
3. `real-firebase.ts` 在 server-side 只建立 stub，沒有真正連接 Firestore
4. Firestore Emulator 根本沒被用於用戶資料

### 目標架構

```
Client (browser)
    ↕ 直接讀寫
Firestore (Emulator)

Client → API Route (帶上 interests 參數) → Ollama LLM
```

**優點：**
1. 符合 Firebase 設計理念
2. 資料一致性（單一來源）
3. 利用 Firestore 的 offline persistence
4. API Route 簡化，只負責 LLM 生成

---

## 影響檔案清單

### 需要修改的檔案

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `lib/user-data.ts` | **重寫** | 改用 Firestore 直接存取 |
| `lib/real-firebase.ts` | **小改** | 確保 Firestore 正確 export |
| `app/api/generate/route.ts` | **修改** | 接收 client 傳來的 interests，移除 getUserPreferences 呼叫 |
| `app/feed/page.tsx` | **修改** | 直接從 Firestore 讀取偏好，呼叫 API 時帶上 interests |
| `app/onboarding/interests/page.tsx` | **修改** | 儲存時直接寫入 Firestore |
| `types/index.ts` | **小改** | 可能需要調整 GenerateRequest 介面 |

### 可能需要新增的檔案

| 檔案 | 說明 |
|------|------|
| `firestore.rules` | Firestore 安全規則（如果還沒有） |

---

## 詳細執行步驟

### Phase 1: 重寫 user-data.ts（使用 Firestore）

**目標：** 讓 `saveUserPreferences` 和 `getUserPreferences` 直接使用 Firestore

**步驟：**

1. 引入 Firestore 函數
   ```typescript
   import { db } from './real-firebase'
   import { doc, getDoc, setDoc, collection } from 'firebase/firestore'
   ```

2. 定義 Collection 名稱（遵循 `aipcs_` 前綴）
   ```typescript
   const USERS_COLLECTION = 'aipcs_users'
   ```

3. 重寫 `saveUserPreferences`
   ```typescript
   export async function saveUserPreferences(
     userId: string,
     preferences: UserPreferences
   ): Promise<void> {
     const userRef = doc(db, USERS_COLLECTION, userId)
     await setDoc(userRef, {
       preferences,
       updatedAt: new Date()
     }, { merge: true })
   }
   ```

4. 重寫 `getUserPreferences`
   ```typescript
   export async function getUserPreferences(
     userId: string
   ): Promise<UserPreferences | null> {
     const userRef = doc(db, USERS_COLLECTION, userId)
     const snapshot = await getDoc(userRef)
     if (snapshot.exists()) {
       return snapshot.data()?.preferences || null
     }
     return null
   }
   ```

5. 移除 localStorage 和 serverMemoryCache 相關程式碼

6. 同步更新其他函數（saveUserFeedback, saveKeywordClick 等）

### Phase 2: 修改 API Route

**目標：** API 不再自己讀取用戶偏好，改由 client 傳入

**步驟：**

1. 修改 `types/index.ts` 的 GenerateRequest 介面
   ```typescript
   export interface GenerateRequest {
     uid: string
     count?: number
     mode?: string
     interests?: string[]  // 新增：由 client 傳入
   }
   ```

2. 修改 `app/api/generate/route.ts`
   - 移除 `getUserPreferences` 呼叫
   - 從 request body 取得 interests
   ```typescript
   const { uid, count = 3, mode = 'default', interests = [] } = body
   ```
   - 移除相關的 userPreferences 變數
   - 直接使用傳入的 interests 抓取新聞

3. 簡化 prompt 建構邏輯
   - 不再需要 await getUserPreferences
   - 直接使用傳入的 interests

### Phase 3: 修改 Feed 頁面

**目標：** 直接從 Firestore 讀取偏好，呼叫 API 時帶上 interests

**步驟：**

1. 修改 `loadUserPreferences` 函數
   - 保持使用 `getUserPreferences`（但現在它會讀 Firestore）
   - 儲存 interests 到 state

2. 修改 `fetchFeedContent` 函數
   ```typescript
   async function fetchFeedContent(
     userId: string,
     count: number = 10,
     interests: string[] = []
   ): Promise<ContentItem[]> {
     const response = await fetch('/api/generate', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ uid: userId, count, interests })
     })
     // ...
   }
   ```

3. 修改 `loadFeed` 呼叫，傳入 interests

4. 修改 `handleRefresh` 呼叫，傳入 interests

### Phase 4: 修改 Onboarding 頁面

**目標：** 確保興趣儲存到 Firestore

**步驟：**

1. 檢查 `app/onboarding/interests/page.tsx`
2. 確認使用 `saveUserPreferences`（現在會寫入 Firestore）
3. 確保儲存成功後才導向 feed

### Phase 5: 清理與測試

**步驟：**

1. 移除 `user-data.ts` 中所有 localStorage 相關程式碼
2. 移除 serverMemoryCache
3. 移除 `isBrowser()` 函數（不再需要區分環境）
4. 確認 Firestore Emulator 正在運行
5. 測試完整流程：
   - 登入 → Onboarding → 選擇興趣 → 儲存
   - 進入 Feed → 確認有新聞素材 → 確認內容生成正常

---

## Firestore 資料結構

### Collection: `aipcs_users`

```javascript
{
  // Document ID: userId (Firebase Auth UID)
  "preferences": {
    "interests": ["tech", "business", "health"],
    "style": "casual",
    "language": "zh-TW"
  },
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### 安全規則（firestore.rules）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用戶只能讀寫自己的資料
    match /aipcs_users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 其他 collection 的規則...
    match /aipcs_content_cache/{docId} {
      allow read: if request.auth != null;
      allow write: if false; // 只允許 server 寫入
    }

    match /aipcs_interactions/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 風險與注意事項

### 風險

1. **Firestore Emulator 必須運行** - 開發環境依賴 Emulator
2. **Offline 狀態處理** - 需確認 Firestore offline persistence 正常運作
3. **Migration** - 現有 localStorage 資料會丟失（開發環境影響小）

### 注意事項

1. **不要在 server-side 呼叫新的 user-data.ts** - 它只能在 client 使用
2. **API Route 必須信任 client 傳入的 interests** - 可考慮加驗證
3. **Firestore 讀取是非同步的** - 注意 loading state 處理

---

## 預估工作量

| Phase | 預估複雜度 | 說明 |
|-------|-----------|------|
| Phase 1 | 中 | 重寫 user-data.ts |
| Phase 2 | 低 | 修改 API route |
| Phase 3 | 中 | 修改 Feed 頁面 |
| Phase 4 | 低 | 修改 Onboarding 頁面 |
| Phase 5 | 低 | 清理與測試 |

---

## 驗收標準

1. [ ] Onboarding 選擇的興趣成功儲存到 Firestore Emulator
2. [ ] Feed 頁面能正確讀取 Firestore 中的興趣
3. [ ] API 能收到 client 傳來的 interests
4. [ ] 新聞抓取正常（不再顯示「無相關新聞素材」）
5. [ ] LLM 生成的內容品質改善（有新聞素材作為基礎）
6. [ ] 移除所有 localStorage/serverMemoryCache 相關程式碼
