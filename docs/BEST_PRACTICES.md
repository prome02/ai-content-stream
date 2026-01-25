# Firestore Rate Limiter 最佳實踐指南

## 1. Firestore runTransaction 原子操作模式

### 為什麼使用 Transaction？
- **ACID 特性**：Firestore Transaction 確保所有操作要么全部成功，要么全部失敗
- **避免競爭條件**：在多實例環境中防止計數不準確
- **數據一致性**：確保讀取和寫入在同一瞬間完成

### 實現方式：
```typescript
// 錯誤示例 - 不使用 Transaction
const docRef = doc(collection, userId);
const snapshot = await getDoc(docRef);
const currentCount = snapshot.data()?.hourlyCount || 0;
await updateDoc(docRef, { hourlyCount: currentCount + 1 }); // 存在競爭風險

// 正確示例 - 使用 Transaction
await runTransaction(db, async (transaction) => {
  const docSnap = await transaction.get(docRef);
  const currentCount = docSnap.data()?.hourlyCount || 0;
  transaction.update(docRef, { hourlyCount: currentCount + 1 });
});
```

## 2. 小時重置邏輯實作

### 實現重點：

1. **基於系統時間而非固定時間窗口**
   - 每小時檢測而不是每小時固定時間點
   - 使用 `new Date().getHours()` 做小時比較

2. **高效的重置檢測**
   - 每次請求只需額外幾毫秒判斷
   - 不需要排程任務或背景處理

### 代碼示例：
```typescript
private shouldReset(docSnap: any): boolean {
  if (!docSnap.exists()) return true;
  
  const currentHour = new Date().getHours();
  const data = docSnap.data() as FirestoreRateLimitDocument;
  
  return typeof data.lastResetHour === 'number' 
    ? data.lastResetHour !== currentHour 
    : false;
}
```

## 3. 並發請求處理（多實例環境）

### 保護措施：

1. **事務重試機制**
   - 使用指數退避防止雪崩效應
   - 設置最大重試次數避免無限循環

2. **降級策略**
   - Firestore 不可用時仍允許業務流程繼續
   - 頁面功能不因 Rate Limiter 失敗而中斷

### 實現代碼：
```typescript
private async checkWithTransaction(userId: string): Promise<FirestoreRateLimitResult> {
  const maxAttempts = this.config.maxRetries || 3;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // 執行事務...
      break;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      // 指數退避
      await this.sleep(Math.pow(2, attempts) * 100);
    }
  }
}
```

## 4. 錯誤處理和降級策略

### 完整的錯誤處理層級：

1. **Transaction 層級錯誤處理**
   - 捕獲 Firestore 瞬間故障
   - 通過重試機制恢復

2. **Service 層級錯誤處理**
   - 捕獲系統級別錯誤
   - 記錄但不中斷業務流程

3. **API 層級錯誤處理**
   - 最終的安全網
   - 返回合理的默認行為

### 程式碼示例：
```typescript
async check(options: FirestoreRateLimitOptions): Promise<FirestoreRateLimitResult> {
  try {
    const result = await this.checkWithTransaction(options.userId);
    return result;
  } catch (error) {
    console.error(`Rate limit 檢查失敗 ${options.userId}:`, error);
    
    // 降級策略：允許請求繼續執行
    return this.createAllowedResult(); // 允許請求通過
  }
}
```

## 5. 成本優化（讀寫次數最小化）

### 優化策略：

1. **批量操作減少網絡往返**
   - 單一事務內完成讀取和寫入
   
2. **避免不必要的索引字段**
   - 專注於真正需要的功能字段
   
3. **有效的文件結構**
   - 簡化結構減少存儲空間
   
4. **冷熱數據分離**
   - 實時計數保存至 Firestore
   - 歷史統計可保存至 BigQuery

### 實際應用：
```typescript
// 最小化字段的 Firestore 文件結構
interface FirestoreRateLimitDocument {
  // 核心所需字段
  hourlyCount: number        // 必需：計數
  lastResetHour: number      // 必需：重置檢測
  lastUpdatedAt: Date        // 必需：最新更新時間

  // 選擇性附帶信息（僅建立時存儲）
  metadata?: {
    createdAt: Date          // 只在新建時設置
    userId: string           // 方便排查問題
  };
}
```

## 安全考量

### 數據安全：

1. **防止枚舉攻擊**
   - Firestore Security Rules 控制訪問權限
   - 不暴露用戶 ID 猜測可能性

2. **防止篡改**
   - 字段級別 Security Rules
   - 服務端決定性寫入

### 示例：
```javascript
// Firestore Security Rules 片段
match /rate_limits/{userId} {
  // 僅允許用戶創建和讀取自己的 rate limit 記錄
  allow read, create: if request.auth != null && request.auth.uid == userId;
  // 不允許任何更新或刪除操作（全由服務端 Transaction 控制）
  allow update, delete: if false;
}
```

## 性能監控

### 建議的監控指標：

1. **請求成功率**
   - 跟蹤 Rate Limiter 本身的狀態健康程度

2. **Transaction 成功率**
   - 發現潛在的 Firestore 問題

3. **平均響應時間**
   - 確保 Rate Limiter 不拖慢整體性能

### 示例代碼：
```typescript
async check(options: FirestoreRateLimitOptions): Promise<FirestoreRateLimitResult> {
  const startTime = Date.now();
  
  try {
    const result = await this.checkWithTransaction(options.userId);
    
    // 記錄性能指標
    const duration = Date.now() - startTime;
    console.log(`Rate limiter check took ${duration}ms for user ${options.userId}`);
    
    return result;
  } catch (error) {
    // 記錄錯誤時間
    const duration = Date.now() - startTime;
    console.error(`Rate limiter failed after ${duration}ms`, error);
    
    return this.createAllowedResult();
  }
}
```

## 總結

該 Firestore Transaction Rate Limiter 實現提供了以下優勢：

1. **強一致性和可靠性**：使用 Firestore Transaction 確保數據的一致性
2. **自動適配性**：依據實際系統時間自動跨小時重置
3. **高容錯能力**：多層錯誤處理和降級策略保證核心業務不受影響
4. **資源效率**：最小化 Firestore 讀寫操作，降低運營成本
5. **易於集成**：符合常見 Web API 設計習慣，容易嵌入現有項目

通過上述設計和最佳實踐，我們實現了一個既高效又可靠的 Rate Limiter 解決方案。
