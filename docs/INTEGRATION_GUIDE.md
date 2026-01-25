# Firestore Rate Limiter 集成指南

## 項目集成步驟

### 1. 替換現有限制器

目前項目使用的是基於本地存儲的 Rate Limiter (`services/rate-limiter.ts`)。
要替換為 Firestore 版本需要修改以下文件：

#### 修改 `app/api/generate/route.ts`

**原代碼：**
```typescript
import { RateLimiter } from '@/services/rate-limiter'
// ...
const rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60 * 60 * 1000 })
```

**新代碼：**
```typescript
import { db } from '@/lib/real-firebase'
import { createFirestoreRateLimiter } from '@/services/firestore-rate-limiter'
// ...
const rateLimiter = createFirestoreRateLimiter(db, { maxRequests: 20, windowMs: 60 * 60 * 1000 })
```

### 2. 調整檢查邏輯

Firestore 版本返回相似但也略有不同的結果接口。

**主要差異：**
- 方法名不同: `check` 和 `increment` 接收配置物件
- 錯誤處理略有差異：Firestore 版本具有更好的重試機制

### 3. 更新依賴

確保 firebase/firestore 已安裝：
```bash
npm install firebase
```

或者如果已經安裝，則確認版本兼容性。

## 環境配置

### Firestore Security Rules 配置

為了保護 Rate Limiter 的數據，請在 Firestore Security Rules 中添加：

```javascript
match /aipcs_rate_limits/{userId} {
  // 僅允許已驗證用戶創建和讀取自己的 rate limit 記錄
  allow read, create: if request.auth != null && request.auth.uid == userId;
  
  // 不允許客戶端直接更新或刪除（由服務端 Transaction 處理）
  allow update, delete: if false;
}
```

## 部署考量

### 開發環境

在開發環境中，使用 Firebase Emulator 進行測試：

```bash
# 啟動 Firebase Emulator
firebase emulators:start --only firestore,auth

# 或使用 Docker 啟動（如果有 Dockerfile）
docker-compose up firebase-emulator
```

確保環境變量配置正確：
```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project
```

### 生產環境

在生產環境中，Firestore Rate Limiter 會自動使用真實的 Firestore 服務。

需要確保：
1. Firebase 配置正確設置在環境變數中
2. Firestore 數據庫已啟用
3. 部署的服務有足夠的權限訪問 Firestore

## 性能觀察

### 監控指標建議

推薦在部署後監控以下指標：

1. **Rate Limiter 檢查性能**
   - 平均耗時：< 50ms
   - 95th Percentile: < 100ms

2. **失敗率統計**
   - Transaction 失敗率 < 0.1%
   - 降級策略觸發頻率

3. **成本控制**
   - 監控 Firestore 讀寫次數
   - 確保合理增長而非爆炸式增長

### 雲端監控設置

可以通過 Firebase Console 或 Google Cloud Monitoring 設置警報：

- Firestore 延遲超過閾值
- Error rate 異常升高
- 成本預警通知

## 故障排除

### 常見問題及解決方法

1. **Transaction 超過最大重試次數 錯誤**
   - 可能原因：Firestore 臨時不可用或激烈競爭
   - 解決方法：增加 maxRetries 配置或臨時降級處理

2. **Permission denied 錯誤**
   - 可能原因：Security Rules 設置不正确
   - 解決方法：檢查 rules 配置並按上面說明修正

3. **Performance slow**
   - 可能原因：過多重複查詢或大量並發用戶
   - 解決方法：添加適當索引或考慮批量處理方式

## 後續改進方向

### 潛在擴展點

1. **自定義窗口大小支持**
   - 支持分鐘、小時甚至天級窗口
   - 更靈活的配置選擇

2. **多層級 Rate Limiting**
   - IP Level, User Level, API Key Level 各自獨立限制

3. **Sliding Window Algorithm**
   - 更精確地控制短時間內的請求頻率
   - 但須權衡 Complexity 與 Resource Usage

4. **Rate Limiting Metrics Visualization**
   - 添加儀表板可視化各 API 的使用趨勢
   - 幫助識別潛在的濫用或功能受歡迎度

以上就是在當前項目中集成 Firestore Rate Limiter 的完整指南。這種方式不僅提供了一個強大的解決方案，同時也保持了高度的可靠性與靈活性。
