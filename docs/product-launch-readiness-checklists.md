# Product Hunt 導向任務清單

> 原則：先「產品準備（Product Readiness）」再「發佈準備（Launch Readiness）」。

## A. 產品準備（先做）

### P0（立即執行）
- [x] `/api/generate` 改為使用 client 傳入的 `interests`，不再由 API 自行讀取偏好。
- [x] `interaction API` 從記憶體 mock 改為 Firestore 寫入/讀取。
- [x] `ContentCard` 移除 like/dislike localStorage 狀態儲存（避免與 Firestore 雙寫不同步）。

### P1（下一階段）
- [ ] 用真實互動資料替換 `calculateDiversityScore()` 與 `getRecentLikes()` 的模擬資料。
- [ ] 補上互動與生成路徑的結構化觀測（成功率、延遲、fallback 原因）。

### P2（產品穩定後）
- [ ] A/B 測試系統決策：恢復實驗或正式移除。

## B. 發佈準備（產品準備完成後）

### L0（上線前 7-10 天）
- [ ] Product Hunt 文案：Tagline、短描述、首則留言。
- [ ] 素材包：Logo、縮圖、5 張截圖、Demo 影片。
- [ ] 社會證明：早期用戶回饋與核心指標。

### L1（上線前 3-5 天）
- [ ] 發佈日 runbook（貼文節奏、回覆分工、社群轉發時程）。
- [ ] 故障預案（LLM 不可用時的 fallback 與公告話術）。

### L2（上線後 72 小時）
- [ ] 回饋分流與優先級排序（價值/品質/bug/收費）。
- [ ] 至少一輪「回饋 → 修正 → 對外更新」。
