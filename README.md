# AI Content Stream

**AI-Powered Personalized Content Feed Platform**

[English](#english) | [繁體中文](#繁體中文)

---

<a name="english"></a>

## English

### Overview

An AI-powered infinite content feed platform that generates personalized content through behavioral feedback—without requiring any chat interaction. Users simply scroll, and the AI learns their preferences automatically.

### Key Features

- **Seamless Experience**: No chat prompts needed—maintains natural scrolling habits
- **Intelligent Learning**: Automatically optimizes content based on likes, dwell time, and scroll behavior
- **Infinite Content**: Continuously generates high-quality personalized content using LLM
- **Multi-model Support**: Works with Ollama Cloud (gpt-oss, gemma3) or local models

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firestore |
| LLM | Ollama API (Cloud or Local) |
| Data Fetching | SWR |

### Project Structure

```
app/
├── api/
│   ├── generate/route.ts    # LLM content generation endpoint
│   ├── interaction/route.ts # User interaction tracking
│   └── event-track/route.ts # Analytics events
├── components/
│   ├── ContentCard.tsx      # Content card with like/dislike
│   ├── settings/            # Settings drawer components
│   └── ui/                  # Reusable UI components
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useContentGeneration.ts
│   ├── useInfiniteScroll.ts
│   └── useInteractionTracking.ts
├── feed/page.tsx            # Main content feed
├── onboarding/interests/    # User interest selection
└── page.tsx                 # Landing/login page

lib/
├── ollama-client.ts         # Ollama LLM client
├── prompt-builder.ts        # Dynamic prompt construction
├── prompt-modules.ts        # Prompt templates with randomness
├── content-service.ts       # Content management
├── user-data.ts             # User preferences & settings
├── quality-scoring.ts       # Content quality algorithms
└── cache/                   # Two-layer caching (memory + localStorage)
```

### Quick Start

#### Prerequisites

- Node.js 18+
- npm or pnpm
- Firebase Project (for Auth & Database)
- Ollama API access (Cloud or Local)

#### 1. Clone & Install

```bash
git clone https://github.com/prome02/ai-content-stream.git
cd ai-content-stream
npm install
```

#### 2. Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI Generation Mode
NEXT_PUBLIC_USE_MOCK_DATA=false
OLLAMA_MODEL=gemma3:12b-cloud

# Ollama Cloud (recommended)
OLLAMA_API_KEY=your_ollama_cloud_api_key

# OR use local Ollama
# OLLAMA_BASE_URL=http://localhost:11434
```

#### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

#### Firebase Emulator (Recommended for Local Development)

If you don't want to connect to a real Firebase project while developing, you can run the Firebase Emulator Suite:

```bash
firebase emulators:start
```

This repo is configured for common emulators:
- Auth emulator (`9099`)
- Firestore emulator (`8080`)
- Emulator UI (`4000`)

Enable emulator mode via environment variable:

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

#### 4. (Optional) Use Mock Data for Development

If you don't have Ollama API access, you can use mock data:

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

This generates sample content without requiring a real LLM.

### Development Mode Options

| Mode | Mock Data | Firebase | Use Case |
|------|-----------|----------|----------|
| Full Mock | `true` | Emulator | Fast development, no external services |
| Hybrid | `false` | Emulator | Test real LLM with local auth |
| Production | `false` | Production | Deploy to live environment |

### Content Generation Flow

```
User signs in → Selects interests → AI generates content
                      ↓
              User interacts (like/dwell time)
                      ↓
              Content quality score updates
                      ↓
              Next generation uses feedback
                      ↓
              Personalization improves over time
```

### LLM Provider (Deployment Notes)

This project currently supports **Ollama only** as the LLM provider:

- **Ollama Cloud** (recommended): set `OLLAMA_API_KEY` and the server will call `https://ollama.com`.
- **Local Ollama**: do NOT set `OLLAMA_API_KEY`. The server will call `OLLAMA_BASE_URL` (default: `http://localhost:11434`).

LLM calls are made server-side through `POST /api/generate`, so API keys must be stored as **server secrets** (for production, use your hosting platform secret manager). Do NOT put secrets under `NEXT_PUBLIC_*`.

If you want to use another provider (OpenAI/Anthropic/etc.), replace the implementation behind `/app/api/generate/route.ts` (currently `lib/ollama-client.ts`).

### Firebase Project ID (Open Source Safety)

This repo intentionally uses a placeholder Firebase project ID (`demo-project`) in `.firebaserc` to reduce the risk of accidental deploys to a real project.

If you plan to deploy, update `.firebaserc` (or use `firebase use --add`) to point to your own Firebase project.

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Watch mode for tests
npm run test:coverage # Run tests with coverage
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<a name="繁體中文"></a>

## 繁體中文

### 專案概述

一個 AI 生成的無限資訊流平台，讓使用者在無需對話的情況下，透過行為反饋自動生成個人化內容。使用者只需滑動，AI 便會自動學習偏好。

### 核心特性

- **無縫體驗**：不需要與 AI 對話，維持使用者原有的滑動習慣
- **智能學習**：根據點讚、停留時間、滾動深度等行為自動優化內容
- **無限內容**：利用 LLM 持續生成高品質的個人化內容
- **多模型支援**：支援 Ollama Cloud (gpt-oss, gemma3) 或本地模型

### 技術堆疊

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS 4 |
| 認證 | Firebase Auth (Google 登入) |
| 資料庫 | Firestore |
| LLM | Ollama API (雲端或本地) |
| 資料獲取 | SWR |

### 專案架構

```
app/
├── api/
│   ├── generate/route.ts    # LLM 內容生成端點
│   ├── interaction/route.ts # 使用者互動追蹤
│   └── event-track/route.ts # 分析事件
├── components/
│   ├── ContentCard.tsx      # 內容卡片（含按讚/不喜歡）
│   ├── settings/            # 設定抽屜元件
│   └── ui/                  # 可重用 UI 元件
├── hooks/                   # 自訂 React Hooks
│   ├── useAuth.ts
│   ├── useContentGeneration.ts
│   ├── useInfiniteScroll.ts
│   └── useInteractionTracking.ts
├── feed/page.tsx            # 主要內容資訊流
├── onboarding/interests/    # 使用者興趣選擇
└── page.tsx                 # 登入頁面

lib/
├── ollama-client.ts         # Ollama LLM 客戶端
├── prompt-builder.ts        # 動態提示詞建構
├── prompt-modules.ts        # 含隨機性的提示詞模板
├── content-service.ts       # 內容管理
├── user-data.ts             # 使用者偏好與設定
├── quality-scoring.ts       # 內容品質演算法
└── cache/                   # 兩層快取（記憶體 + localStorage）
```

### 快速開始

#### 系統需求

- Node.js 18+
- npm 或 pnpm
- Firebase 專案（用於認證與資料庫）
- Ollama API 存取權限（雲端或本地）

#### 1. 複製專案並安裝

```bash
git clone https://github.com/prome02/ai-content-stream.git
cd ai-content-stream
npm install
```

#### 2. 環境變數設定

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：

```env
# Firebase 設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI 生成模式
NEXT_PUBLIC_USE_MOCK_DATA=false
OLLAMA_MODEL=gemma3:12b-cloud

# Ollama Cloud（推薦）
OLLAMA_API_KEY=your_ollama_cloud_api_key

# 或使用本地 Ollama
# OLLAMA_BASE_URL=http://localhost:11434
```

#### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

#### 4. （選用）使用模擬資料開發

如果沒有 Ollama API 存取權限，可以使用模擬資料：

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

這會生成範例內容，不需要真實的 LLM。

### 開發模式選項

| 模式 | 模擬資料 | Firebase | 使用場景 |
|------|----------|----------|----------|
| 完全模擬 | `true` | Emulator | 快速開發，無需外部服務 |
| 混合模式 | `false` | Emulator | 測試真實 LLM，使用本地認證 |
| 生產模式 | `false` | Production | 部署至正式環境 |

### 內容生成流程

```
使用者登入 → 選擇興趣 → AI 生成內容
                    ↓
            使用者互動（按讚/停留時間）
                    ↓
            內容品質分數更新
                    ↓
            下次生成使用回饋資料
                    ↓
            個人化持續改善
```

### 指令

```bash
npm run dev          # 啟動開發伺服器
npm run build        # 建置生產版本
npm run start        # 啟動生產伺服器
npm run test         # 執行測試
npm run test:watch   # 測試監控模式
npm run test:coverage # 執行測試並產生覆蓋率報告
```

### 貢獻指南

歡迎任何形式的貢獻！請隨時提交 Pull Request。

1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Feed Page  │  │  Onboarding │  │  Settings Drawer        │ │
│  │  (Content)  │  │  (Interests)│  │  (Preferences)          │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              useContentGeneration Hook                       │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │ │
│  │  │ Prompt Build │→ │ Ollama Client │→ │ Content Parser │  │ │
│  │  │ (Dynamic)    │  │ (LLM API)    │  │ (Structure)     │  │ │
│  │  └──────────────┘  └───────────────┘  └────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server (Next.js API)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ /api/       │  │ /api/       │  │ /api/event-track       │ │
│  │ generate    │  │ interaction │  │ (Analytics)            │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Firestore Database                         │ │
│  │  ┌───────────────┐  ┌─────────────┐  ┌──────────────────┐ │ │
│  │  │ Users         │  │ Content     │  │ Interactions     │ │ │
│  │  │ (Preferences) │  │ (Generated) │  │ (Feedback)      │ │ │
│  │  └───────────────┘  └─────────────┘  └──────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Roadmap

- [ ] Multi-language support (i18n)
- [ ] Content bookmarking
- [ ] Share content to social media
- [ ] Advanced personalization settings
- [ ] Content topics customization
- [ ] Reading history
- [ ] Content export

---

## Author

**prome02**

- GitHub: [@prome02](https://github.com/prome02)

---

*Last updated: 2025-03-08*
