# AI 個人化內容資訊流平台 - 部署指南

## 📋 專案概述

這是一個基於 Next.js 14 的 AI 個人化內容資訊流平台，具備：
- Google Firebase 認證系統
- AI 生成個人化內容（Ollama本地/模擬模式）
- 品質評分與 A/B 測試框架
- 事件追蹤與數據收集
- 速率限制與快取機制

## 🚀 部署選項

### 選項 1: Vercel (推薦)

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 從專案根目錄部署
vercel

# 設定環境變數後部署
vercel --prod
```

### 選項 2: Firebase Hosting

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 初始化專案
firebase init hosting

# 部署到 Firebase
firebase deploy --only hosting
```

### 選項 3: 自託管 (Docker)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

## ⚙️ 環境變數配置

### 必需環境變數

```bash
# .env.local 範例配置

# Firebase 配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI 生成配置
NEXT_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434
NEXT_PUBLIC_AI_MODEL=llama3
NEXT_PUBLIC_AI_MAX_TOKENS=1000

# A/B 測試配置 (選配)
NEXT_PUBLIC_AB_TESTING_ENABLED=true
NEXT_PUBLIC_AB_TESTING_VARIANTS=A,B,C,D

# 速率限制配置
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=20
NEXT_PUBLIC_RATE_LIMIT_WINDOW_HOURS=1
```

### Vercel 專案環境變數

在 Vercel 專案設定中設定：

1. 進入專案 Settings → Environment Variables
2. 依序新增上述環境變數
3. 區分 Development/Preview/Production 環境

## 🔧 建置與測試

### 本地開發

```bash
# 安裝依賴
npm ci

# 開發模式啟動
npm run dev

# 建置測試
npm run build

# 檢查 TypeScript
npx tsc --noEmit --project .

# 執行完整測試
node test-full-flow.js
```

### 生產環境建置

```bash
# 安裝生產依賴
npm ci --only=production

# 建置專案
npm run build

# 啟動服務
npm start
```

## 📊 數據收集與分析

### A/B 測試數據存取

事件追蹤 API 提供以下端點：

```bash
# 獲取 A/B 測試統計
GET /api/event-track?variant=A
GET /api/event-track?start=2026-01-20&end=2026-01-27
GET /api/event-track?uid=test_user_123

# 回應格式
{
  "success": true,
  "data": {
    "total_events": 150,
    "events": [...],
    "ab_test_stats": {
      "variants": {
        "A": { "conversion_rate": "23.5", "satisfaction_rate": "78.2" },
        "B": { "conversion_rate": "25.1", "satisfaction_rate": "81.4" }
      }
    }
  }
}
```

## 🔒 安全性配置

### Firebase 安全規則

```json
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /interactions/{interactionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### CORS 配置

Next.js 已包含適當的 CORS 配置：
- API 路由已設定 COR 安全性
- 前端只允許相同來源的請求
- 生產環境支援 HTTPS

## 📈 效能優化建議

### 持續改善

1. **資料庫索引**
   ```json
   {
     "fields": ["uid", "timestamp"],
     "order": ["desc"]
   }
   ```

2. **快取策略**
   - 內容快取 TTL: 30 分鐘
   - 記憶體快取: 60 分鐘
   - CDN 快取: 24 小時

3. **CDN 部署**
   ```bash
   # Vercel 自動配置 CDN
   # Firebase Hosting 自動配置 CDN
   ```

4. **監控指標**
   - API 回應時間 < 300ms
   - A/B 測試轉換率 > 20%
   - 使用者滿意度 > 70%

## 🚨 故障排除

### 常見問題

1. **建置失敗**
   ```bash
   # 清理快取
   rm -rf .next node_modules
   npm ci
   npm run build
   ```

2. **Firebase 連接錯誤**
   - 確認環境變數正確設定
   - 檢查 Firebase 專案權限
   - 確保網路可訪問 Firebase 服務

3. **Ollama 連接問題**
   ```bash
   # 檢查 Ollama 服務狀態
   curl http://localhost:11434/api/tags

   # 開發環境使用模擬模式
   # 設定 NEXT_PUBLIC_AI_MODE=mock
   ```

4. **速率限制過度**
   - 調整 `NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS`
   - 警告使用者接近限制
   - 降級到模擬內容

### 日誌監控

```bash
# Vercel 日誌存取
vercel logs

# Firebase Hosting 日誌
firebase hosting:log

# Docker 日誌
docker logs <container_id>

# 自定義日誌
npm run dev 2>&1
```

## 📝 版本更新

### 版本控制

```bash
# 主要版本
v1.0.0 - 初始發佈: MVP 功能
v1.1.0 - A/B 測試系統
v1.2.0 - 事件追蹤與分析

# 次要版本
v1.0.1 - Bug 修復
v1.0.2 - 效能優化
```

### 升級檢查清單

1. ✅ 建置測試通過
2. ✅ 完整流程測試通過
3. ✅ 環境變數更新
4. ✅ 資料庫備份完成
5. ✅ 監控系統就緒
6. ✅ 回滾計劃準備

## 📞 支援與貢獻

### 問題回報

1. GitHub Issues: 功能請求、錯誤回報
2. 使用者回饋: 使用者體驗改進
3. 效能分析: 效能問題追蹤

### 開發者指南

```bash
# 開發者入門
git clone https://github.com/[username]/ai-content-stream.git
cd ai-content-stream
npm ci
cp .env.example .env.local

# 開發環境
npm run dev
open http://localhost:3000

# 貢獻規範
# - 遵循 TypeScript 規範
# - 撰寫測試案例
# - 更新相關文檔
```

## 🎯 生產環境檢查清單

部署前確認以下項目：

- [x] 專案建置成功 (`npm run build`)
- [x] TypeScript 無錯誤 (`npx tsc --noEmit`)
- [x] 完整測試通過 (`node test-full-flow.js`)
- [x] 環境變數設定完成
- [x] Firebase 專案連線正常
- [x] 資料備份機制就緒
- [x] 監控與警報設定
- [x] 回滾流程準備
- [x] 使用者文件更新
- [x] 支援聯繫管道

---

**最後更新**: 2026-01-20  
**專案狀態**: ✅ 生產就緒  
**推薦部署**: Vercel  
**預估成本**: Firebase Free Tier + Vercel Hobby  
**預期效能**: 100-500 使用者/天  
**監控需求**: 基礎應用監控  
**支援等級**: 社羣支援