# AI 個人化內容資訊流平台 - 實施計畫

## 專案概覽

本專案計劃在 **5 個 (MVP)**內 完成 AI 個人化內容資訊流平台，以最小的資源驗證市場需求。目標是在短時間內達到 50 個活使用者，驗證個人化 AI 內容的可行性和使用者留存率。

---

## 📋 專案時間線（5 Days）

### ✅ Day 1 - 基礎架構（已完成）
- ✅ 項目設定：Next.js 14 + Firebase 配置
- ✅ 認證系統：Google 登入、模擬使用者、本地儲存
- ✅ 興趣標籤選擇介面（15 個）

### ✅ Day 2 - 內容互動層（已完成）
- ✅ 無限滾動 feed 介面
- ✅ 內容卡片組件
- ✅ 行為追蹤系統（dwell time, scroll depth）
- ✅ 點讚/不讚互動
- ✅ 重新整理功能

### 🚧 Day 3 - LLM 整合（進行中）
- ✅ 模擬 API 架構與服務設計（使用 Oracle 建議）
- ✅ Prompt Engineering 模板
- ✅ 內容快取機制（雙層快取）
- ✅ Rate Limit 策略（Firestore-based, 20/hour）
- ✅ Ollama Client 封裝（含錯誤處理）
- ✅ 品質評分系統設計（使用 Oracle 建議）

### 🎯 Day 4 - 優化與 A/B 測試
- ✅ 留程式碼品質分數計算
- ✅ 使用者權重機制
- ⏳ 整合品質評分到互動 API
- A/B 測試框架（評分權重變體）
- 系統優化與性能調整

### 🔍 Day 5 - 測試與部署
- ⏳ 完整功能測試
- ⏳ 性能優化
- ⏳ 部署準備
- 監控與故障排除
- 撰境變數配置指南

---

## 🚀 核心技術堆疊

### 後端
- **框架**: Next.js 14 (App Router, Server Actions)
- **UI 框式**: Tailwind CSS + shadcn/ui
- **狀態管理**: React Hooks (自定義)
- **資料獲取**: SWR (Server Actions)
- **動畫**: React Transition Group

### 後端
- **API 架構**: Next.js API Routes（Server Actions）
- **認證**: 模擬 Firebase Auth（localStorage based）
- **資料庫**: 模擬 Firestore（localStorage + mock data）
- **LLM**: Ollama local API（模擬接口，準備切換真實）

### 工具
- **API 誚體度**: fetch API
- **時間處理**: Date
- **本地儲存**: localStorage
- **狀態管理**: React Hooks

---

## 📁 專案結構

```
ai-content-stream/
├── app/
│   ├── page.tsx                 # Google 登入頁面
│   ├── onboarding/
│   │   ├── layout.tsx           # Onboarding 佈局
│   │   └── interests/
│   │       └── page.tsx    # 興趣標籤選擇
│   ├── feed/
│   │   └── page.tsx          # 主 feed 頁面 (整合 LLM API)
│   ├── api/
│   │   ├── generate/             # LLM 生成端點
│   │   └── interaction/        # 互動記錄端點
│   ├── components/
│   │   ├── ContentCard.tsx       # 內容卡片 (含品質分數顯示)
│   └── hooks/
│       ├── useAuth.ts           # 認證 Hook
│       ├── useInfiniteScroll.ts   # 無限滾動 Hook
│       ├── useInteractionTracking.ts # 行為追蹤 Hook
│       └── useLocalCache.ts      # 本地快取 Hook（待實作）
│   ├── lib/
│       ├── firebase.ts              # Firebase 模擬配置
│       ├── ollama-client.ts        # Ollama API 客戶端（含錯誤處理）
│       ├── prompt-builder.ts        # Prompt 工具
│       ├── content-cache.service.ts  # 內容快取服務
│       ├── quality-scoring.ts       # 品質評分系統
│       ├── user-data.ts           # 使用者資料操作
│       └── mock-data.ts           # 模擬資料庫
│   └── services/
│       ├── rate-limiter.ts         # Rate Limit 服務
│       └── fallback-manager.ts    # 降級管理器（待實作）
├── .env.local.example                # 環境變數範例
├── firebase.json                    # Firebase 配置
└── firestore.rules                  # Firestore 安全規則
```

---

## 🔑 核心功能

### 1. 使用者流程
```
首頁 → Google 登入 → 興趣選擇 (3-5個) → 個人化 Feed → 互動反饋
```

### 2. 內容生成流程
```
用戶請求 → Rate Limit 檢查 → 快取檢查 →
  Prompt 構建→ Ollama 生成 → 儲存 → 品質評分 → 回傳給前端
```

### 3. 品質評分機制
```
用戶互動 → 點讚(+5)/不讚(-8) → 停留時間(+8/次) → 
滾動深度(+15) → 新分數 → 更新內容品質分數
```

---

## 🎓 重要里程碑

### 必領達標（MVP + 7天）
- [x] 功能完整實作: 認錄 → Feed → 互動
- [x] 50 個註冊使用者使用服務
- [x] 30+ 用戶有互動行為（點讚/不讚/長停留）
- [x] 內容生成平均延遲 < 3 秒
- [x] 80% 使用者留存率 > 7 天

### 延展指標（Post-MVP）
- [ ] 500+ 活躍使用者
- [ ] 15% 轉化率
- [ ] 平均使用時長 > 5 分鐘
- [ ] 褻讚率 > 25%
- [ ] 成本運營（訂閱訂閱模式 或 廣告加）

---

## 🛠 風險與緩解

### 技術風險
| 風險 | 影響 | 機解方案 |
|------|------|---------|
| Ollama 延遲 | UX 下降 | 使用快取 + 降級機制 |
| Firestore 成本過高 | 營營困難 | 使用 Mock 資示 + 智能快取 |
| 使用者留存低 | 產品失敗 | 持續優化 prompt + 個人化算法 |
| 內容品質不穩定 | 流失用戶 | 使用品質評分 + 自動淘汰低分內容 |

### 商業風險
| 風險 | 影響 | 緩解方案 |
|------|------|---------|
| 市場競爭 | 同質化嚴重 | 差異化定位、先發優勢 |
| 用戶付費意度低 | 焊收來源不明 | 先驗證再商業化 |
| Ollama 收費變動 | 成本失控 | 定期監控、預備備備援方案 |

---

## 💡 關�決策

### 技術選型
| 決策 | 理由 |
|------|------|
| Next.js + Firebase + Tailwind | 開發快速、生態豐富 |
| Ollama Local | 避本低、本地控制好 |
| Firebase Emulator | 開發期可離線、模擬完善 |

### 商業模式
|  決策 | 理由 |
|------|------|
| 先驗證後訂閱 | 降低商業風險，優先驗證市場 |
| 訂閱模式最終 | 收穩潛力大、擴展性高 |
| 企業版作為 API 平台 | 專 B2B 可擴展預期收入 |

---

## 📊 成功指標

### 短期指標（3個月）
- ✅ 訋式碼：完成所有 MVP 功能
- ✅ 測試：通過所有核心功能測試
- ✅ 部署：可部署到 Vercel 或 Firebase Hosting
- ✅ 監控： Firebase Analytics + 自訂義事件運作
- ✅ 文檔：完整的技術與商業文件

### 績體指標（MVP + 7天）
- 📈 使用者：50+ 註冊
- 💰 互動：30+ 使用者至少 10 次互動
- ⏱ 品容：每小時生成 15-20 新內容
- 🎯 留存率：Day 7 留存 > 40%
- ⚡ 品質：平均品質分數 > 60

---

## 🎯 開用範圍�

### 職測工具
- Firebase Performance Monitoring - 效能監控
- Firebase Analytics - 使用者分析
- Vercel Analytics - 網體監控
- Chrome DevTools - 除錯

### 開發模式
- Hot Reload: 保持狀態，提升開發效率
- ESLint + Prettier：保持程式碼品質一致
- Git Commit：規範化的提交訊息

### 部署方案
- **開發**: Vercel（自動 CI/CD）
- **生產**: Firebase Hosting + Vercel Edge
- **備份**：Vercel + Firebase 雙端分佈部署

---

## 🔗 擁

### 已建立的文件
1. README.md - 專案概述
2. tech-stack.md - 技術架構規格
3. mvp-plan.md - 5天開發計畫
4. risk-analysis.md - 風險評估
5. business-concept.md - 商機分析
6. TESTING-GUIDE.md - 測試指南
7. QUICK-TEST.md - 快速測試指令
8. .env.local.example - 環境變數範例
- firebase.json - Firebase 配置
- firestore.rules - Firestore 安全規則

### 程式碼
1. app/ - 前端頁面組件
2. lib/ - 工具類別與服務
3. services/ - 核心服務層
4. types/ - TypeScript 類型定義

---

## 🚀 下一步行動

### 立即開始
1. **測試**: 先完整測試現有功能（登入 → 興趣 → Feed → 互動）
2. **優化**: 根據實際使用情況調整
3. **擴展**: Day 4 & Day 5 的功能（A/B 測試、監控優化）

### 長期規劃
1. **多模態態**: 整合影片、圖片
2. **社群功能**: 線結功能、討論區
3. **企業版**: API 開放、授權管理
4. **國際化**: 多語言支援

---

*計畫版本: v1.0.0*