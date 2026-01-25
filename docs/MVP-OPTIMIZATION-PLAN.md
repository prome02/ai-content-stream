# MVP 優化執行計劃

> 目標：以最小可行產品(MVP)概念完成核心功能，進行初步市場測試
> 原則：從嚴重度高的問題先改，暫時使用 Firebase Emulator

---

## 現況評估

### 核心問題優先級

| 優先級 | 問題 | 嚴重度 | MVP 影響 | 處理方式 |
|--------|------|--------|----------|----------|
| P0 | LLM 整合虛假 | 高 | 核心功能無法展示 | 立即修復 |
| P1 | Rate Limiter 時間邏輯 | 中 | 跨天時計數異常 | 立即修復 |
| P2 | API 基本驗證 | 高 | MVP 測試可接受風險 | 簡化處理 |
| P3 | 資料持久化 | 高 | 使用 Emulator 暫緩 | 維持現狀 |

### MVP 範圍定義

**包含 (In Scope):**
- 真實 Ollama LLM 內容生成
- 基本的用戶互動追蹤
- Rate Limiting 正常運作
- Firebase Emulator 環境

**排除 (Out of Scope):**
- 實體 Firebase 部署
- 完整的 API 認證系統
- 跨裝置資料同步
- 生產級錯誤處理

---

## 執行計劃

### Phase 1: 核心功能修復 (P0)

#### Task 1.1: 整合真實 Ollama API

**目標：** 讓 `/api/generate` 真正呼叫 Ollama 生成內容

**現況分析：**
- `lib/ollama-client.ts` 已有完整的 OllamaClient 實作
- `/api/generate/route.ts` 沒有使用 OllamaClient，仍用 Mock 資料
- 需要整合兩者並處理降級邏輯

**修改檔案：**
```
app/api/generate/route.ts
```

**實作步驟：**
1. 引入 OllamaClient
2. 在非 Mock 模式下呼叫 `ollamaClient.generate()`
3. 解析 LLM 回應並轉換為 ContentItem 格式
4. 保留 fallback 機制（Ollama 不可用時使用 Mock）

**驗收標準：**
- [ ] `NEXT_PUBLIC_USE_MOCK_DATA=false` 時實際呼叫 Ollama
- [ ] Ollama 不可用時自動降級到 Mock
- [ ] 生成的內容格式正確（包含 hashtags, topics）

---

### Phase 2: Rate Limiter 修復 (P1)

#### Task 2.1: 修復時間計算邏輯

**目標：** 使用 timestamp 滑動窗口取代小時數比對

**現況問題：**
```typescript
// 現行邏輯 - 跨天時會誤判
const currentHour = new Date().getHours()  // 0-23
if (record.lastResetHour !== currentHour) {
  // 23:50 開始 → 00:10 檢查會誤判為新小時
}
```

**修改檔案：**
```
services/rate-limiter.ts
```

**修正方案：**
```typescript
// 改用 timestamp 計算
interface RateLimitRecord {
  uid: string
  count: number
  windowStart: number  // timestamp
  history: Array<{ timestamp: number; endpoint: string }>
}

// 檢查邏輯
const now = Date.now()
const windowExpired = now - record.windowStart > this.config.windowMs
if (windowExpired) {
  // 重置窗口
}
```

**驗收標準：**
- [ ] 跨天時計數不會異常重置
- [ ] 1 小時滑動窗口正確運作
- [ ] 現有測試通過

---

### Phase 3: 簡化 API 驗證 (P2)

#### Task 3.1: 基本 UID 驗證

**目標：** 確保 API 請求必須包含有效的 uid

**MVP 策略：**
- 不實作完整的 JWT/Firebase Token 驗證
- 只檢查 uid 是否存在且格式正確
- 記錄可疑請求（可選）

**修改檔案：**
```
app/api/generate/route.ts
app/api/interaction/route.ts
app/api/event-track/route.ts
```

**實作步驟：**
1. 建立共用的 `validateRequest()` 函數
2. 檢查 uid 格式（非空、長度合理）
3. 返回標準化錯誤響應

**驗收標準：**
- [ ] 無 uid 的請求返回 400 錯誤
- [ ] 格式異常的 uid 返回 400 錯誤
- [ ] 錯誤訊息清晰

---

### Phase 4: 清理與優化 (P3)

#### Task 4.1: 移除開發標記

**目標：** 清理程式碼中的開發標記和 TODO

**修改內容：**
- 移除 `message: 'Day 3 整合品質評分系統'`
- 移除 `// TODO: 實作真實 Ollama API 呼叫`
- 移除 `(LLM 生成)` 假標記

#### Task 4.2: 優化 Console 輸出

**目標：** 統一 console 輸出為英文（符合 CLAUDE.md 規範）

**修改範圍：**
- API routes 的 console.log
- 服務層的 console.log

---

## 驗證計劃

### 手動測試清單

```bash
# 1. 啟動開發環境
npm run dev

# 2. 啟動 Ollama (另一個終端)
ollama serve

# 3. 測試 LLM 生成
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"uid": "test-user-123", "count": 3}'

# 4. 測試 Rate Limiting
# 連續發送 21 次請求，確認第 21 次被拒絕

# 5. 測試跨小時 Rate Limit
# 模擬時間跳動（需要調整系統時間或等待）
```

### 預期結果

| 測試項目 | 預期結果 |
|----------|----------|
| Ollama 可用時 | 返回真實 LLM 生成內容 |
| Ollama 不可用時 | 自動降級到 Mock 內容 |
| 超過 Rate Limit | 返回 429 + fallback 內容 |
| 無效 uid | 返回 400 錯誤 |

---

## 時間估算

| Phase | 預估時間 |
|-------|----------|
| Phase 1: Ollama 整合 | 1-2 小時 |
| Phase 2: Rate Limiter 修復 | 30 分鐘 |
| Phase 3: API 驗證 | 30 分鐘 |
| Phase 4: 清理優化 | 30 分鐘 |
| **總計** | **2.5-3.5 小時** |

---

## 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| Ollama 服務不穩定 | 生成失敗 | 完善的 fallback 機制 |
| LLM 生成格式不一致 | 解析錯誤 | 嚴格的格式驗證 + 預設值 |
| 測試環境差異 | 行為不一致 | 統一使用 Emulator |

---

## 後續規劃 (Post-MVP)

完成 MVP 測試後，根據使用者回饋決定：

1. **若反應正面：**
   - 實作完整 Firebase 認證
   - 遷移至實體 Firestore
   - 優化 LLM Prompt

2. **若需要調整：**
   - 根據回饋調整內容生成策略
   - 優化互動追蹤邏輯
   - 改善 UI/UX

---

*最後更新: 2026-01-25*
