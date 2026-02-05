# Proposal: Enhance Content Generation UI

## Why

目前的使用者介面缺乏個人化調整能力，使用者無法根據自己的偏好調整 AI 內容生成的風格和方向。同時，現有的介面混合了管理功能和一般使用者功能，造成使用體驗混亂。為了提供更流暢和個人化的閱讀體驗，需要重新設計 UI 架構，讓使用者能夠輕鬆調整內容生成參數，並簡化一般使用者的介面。

## What Changes


### 1. Setting UI 增強

- 新增前端設定抽屜介面
- 提供語氣、風格、深度、長度、主題與新鮮度等選項
- 使用非技術性文字描述，貼合一般使用者理解
- 作為使用者開始閱讀時文章生成的預設方向設定

### 2. 自動無限滾動

- 當捲動至列表底部前 200px 時自動產生 5 篇新文章
- 優化偵測機制，確保在大量文章時仍能維持 200px 的觸發距離

### 3. 使用者版 UI 簡化

- 隱藏品質分數、統計圖表等管理資訊
- 保留核心功能：內容卡、讚/不讚、Setting 按鈕
- 提供更清爽的使用者體驗

## Capabilities

### New Capabilities

- `user-settings-drawer`: 使用者設定抽屜，提供語氣、風格、深度、長度、主題與新鮮度等個人化選項，包含即時微調功能
- `auto-infinite-scroll`: 自動無限滾動功能，在適當時機自動載入新內容
- `simplified-user-ui`: 簡化的使用者介面，隱藏管理功能，專注於核心閱讀體驗

### Modified Capabilities

- `content-generation`: 修改內容生成邏輯，整合個人化設定和即時微調功能

## Impact

### 受影響的代碼檔案

- `app/feed/page.tsx`: 主要的 feed 頁面，需要整合新的 UI 組件
- `app/components/ContentCard.tsx`: 內容卡片組件，移除意見按鈕
- `lib/prompt-builder.ts`: Prompt 建構器，整合個人化設定
- `lib/content-service.ts`: 內容服務，支援無限滾動
- 新增設定抽屜組件
- 新增設定抽屜組件

### API 變更

- 可能需要新增或修改內容生成 API 端點以支援個人化參數
- 設定儲存和讀取的 API 端點

### 依賴項

- 可能需要新增 UI 組件庫或滾動偵測相關的依賴項
- 現有的 Firestore 和 Ollama 整合保持不變

### 系統影響

- 提升使用者參與度和滿意度
- 減少內容載入的手動操作
- 提供更個人化的內容體驗
