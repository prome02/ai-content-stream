# 內容生成系統增強 - 執行計畫

> **總覽：** 將內容從短貼文升級為豐富文章，整合新聞素材，實現個人化生成

---

## 執行進度總覽

| 階段 | 名稱 | 任務數 | 狀態 |
|------|------|--------|------|
| Phase 1 | [基礎架構調整](./PHASE-1-FOUNDATION.md) | 5 | [x] 已完成 |
| Phase 2 | [新聞整合與提示詞模組化](./PHASE-2-NEWS-AND-MODULES.md) | 7 | [x] 已完成 |
| Phase 3 | [互動增強](./PHASE-3-INTERACTION.md) | 6 | [x] 已完成 |
| Phase 4 | [數據記錄與整合驗證](./PHASE-4-ANALYTICS.md) | 6 | [ ] 未開始 |

**總任務數：24 個**

---

## 階段依賴關係

```
Phase 1 ─────┐
             ├──→ Phase 2 ─────┐
             │                  ├──→ Phase 3 ──→ Phase 4
             │                  │
             └──────────────────┘
```

- Phase 1 是基礎，必須先完成
- Phase 2 依賴 Phase 1 的類型定義
- Phase 3 依賴 Phase 2 的模組化架構
- Phase 4 是最後的整合與驗證

---

## 快速連結

### Phase 1：基礎架構調整
- [ ] 1.1 調整興趣分類（精簡為 6 類）
- [ ] 1.2 更新興趣選擇頁面 UI
- [ ] 1.3 移除 280 字元限制，改為動態深度
- [ ] 1.4 加入「無感覺」判定邏輯
- [ ] 1.5 階段驗證

### Phase 2：新聞整合與提示詞模組化
- [ ] 2.1 實作 Google 新聞 RSS 抓取
- [ ] 2.2 新聞素材格式化
- [ ] 2.3 定義提示詞模組變體
- [ ] 2.4 實作模組選擇邏輯
- [ ] 2.5 重構 prompt-builder 為模組化架構
- [ ] 2.6 整合新聞到生成流程
- [ ] 2.7 階段驗證

### Phase 3：互動增強
- [ ] 3.1 實作關鍵字渲染與點擊功能
- [ ] 3.2 加入意見輸入 UI
- [ ] 3.3 意見與關鍵字點擊儲存
- [ ] 3.4 完善行為推測邏輯
- [ ] 3.5 整合行為資料到生成流程
- [ ] 3.6 階段驗證

### Phase 4：數據記錄與整合驗證
- [ ] 4.1 初始化 Firebase Analytics
- [ ] 4.2 實作自訂事件記錄
- [ ] 4.3 在互動 Hook 中埋點
- [ ] 4.4 記錄內容生成事件（Server-side）
- [ ] 4.5 整合測試
- [ ] 4.6 最終驗證

---

## 新增/修改檔案總覽

### 新增檔案（5 個）
| 檔案 | 階段 | 用途 |
|------|------|------|
| `lib/news-fetcher.ts` | Phase 2 | Google 新聞 RSS 抓取 |
| `lib/prompt-modules.ts` | Phase 2 | 提示詞模組定義 |
| `lib/prompt-selector.ts` | Phase 2 | 模組選擇邏輯 |
| `lib/analytics.ts` | Phase 4 | Analytics 事件記錄 |

### 修改檔案（8 個）
| 檔案 | 階段 | 修改內容 |
|------|------|---------|
| `types/index.ts` | Phase 1, 3 | 類型定義更新 |
| `app/onboarding/interests/page.tsx` | Phase 1 | 興趣分類調整 |
| `lib/prompt-builder.ts` | Phase 1, 2 | 模組化重構 |
| `app/hooks/useInteractionTracking.ts` | Phase 1, 4 | 無感覺判定、Analytics 埋點 |
| `app/components/ContentCard.tsx` | Phase 3 | 關鍵字渲染、意見輸入 |
| `lib/user-data.ts` | Phase 3, 4 | 意見儲存、行為統計 |
| `app/api/interaction/route.ts` | Phase 3 | 處理新互動類型 |
| `app/api/generate/route.ts` | Phase 2, 4 | 整合新聞、記錄生成 |
| `lib/real-firebase.ts` | Phase 4 | Analytics 初始化 |

---

## 使用說明

1. **開始執行：** 從 [Phase 1](./PHASE-1-FOUNDATION.md) 開始
2. **追蹤進度：** 完成任務後在檢查表加上 `[x]`
3. **階段驗證：** 每個階段結束前執行驗證步驟
4. **問題排除：** 參考 Phase 4 的問題排除檢查表

---

## 相關文件

- [完整計畫說明](../CONTENT-ENHANCEMENT-PLAN.md)
- [專案 README](../../README.md)
- [環境設定指南](../ENVIRONMENT_SETUP.md)
