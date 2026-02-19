# 環境變數設定指南

此專案支援兩種運行模式：**開發模式（模擬資料）** 和 **生產模式（真實 LLM）**。

## 環境變數設定

### 1. 複製環境變數範例檔

```bash
cp .env.local.example .env.local
```

### 2. 編輯 `.env.local` 檔案

根據你的需求設定以下變數：

#### Firebase 設定
```env
# 開發模式（預設使用 Emulator）
# 注意：即使使用 Emulator，Firebase Analytics 仍需要格式正確的 API key
# Firebase SDK 會驗證 API key 格式（必須類似 AIzaSy... 開頭）
# Emulator 模式下，API key 不需要是真實值，但格式必須正確
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDummyApiKeyForEmulatorUseOnly
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcd1234
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCD1234
```

#### AI 生成模式控制
```env
# AI 生成模式設定
## true: 使用模擬資料 (預設開發模式)
## false: 使用真實 LLM
NEXT_PUBLIC_USE_MOCK_DATA=true

# Ollama 設定 (真實 LLM 模式時需要)
# --- Local 模式 (預設) ---
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:12b-cloud

# --- Cloud 模式 (設定 OLLAMA_API_KEY 後自動啟用) ---
# 取得 API Key: https://ollama.com/settings/keys
# 設定後會自動使用 https://ollama.com 作為 endpoint，並帶入 Bearer token
# OLLAMA_BASE_URL 在 cloud 模式下會被忽略
OLLAMA_API_KEY=your_ollama_cloud_api_key_here
```

#### 可用的 Ollama 模型
| 模型 | 說明 | 適用模式 |
|------|------|---------|
| `gemma3:12b-cloud` | 預設，品質較佳 | Cloud / Local |
| `gpt-oss:120b` | 最強品質 | Cloud |
| `gpt-oss:20b` | 平衡品質與速度 | Cloud |
| `gemma3:4b` | 本地輕量版，速度較快 | Local |
| `qwen2.5:7b` | 中文能力較強 | Local |
| `llama3.1:8b` | 綜合能力較佳 | Local |

#### Firebase Emulator 控制
```env
# Firebase Emulator 設定
## true: 使用 Firebase Emulator (預設開發模式)
## false: 使用真實 Firebase 服務
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

## 運行模式說明

### 開發模式（模擬資料）
```env
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```
- 使用模擬內容生成
- 使用 Firebase Emulator 進行身份驗證
- 快速開發與測試

### 生產模式（Ollama Cloud）
```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
OLLAMA_API_KEY=your_actual_api_key
OLLAMA_MODEL=gpt-oss:120b
```
- 使用 Ollama Cloud API（`https://ollama.com/api/chat`）
- 自動帶入 `Authorization: Bearer <API_KEY>` header
- 無需本機安裝 Ollama
- 使用真實 Firebase 服務

### 生產模式（Ollama Local / Self-hosted）
```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
OLLAMA_BASE_URL=https://your-ollama-server.com
OLLAMA_MODEL=gemma3:12b-cloud
# OLLAMA_API_KEY 不設定，走本機/自架模式
```
- 使用自架 Ollama 服務
- 不需要 API Key

### 混合模式
```env
NEXT_PUBLIC_USE_MOCK_DATA=false     # 使用 LLM 生成內容
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true  # 使用 Firebase Emulator
```
- 使用真實 LLM 生成內容
- 但使用 Firebase Emulator 進行身份驗證
- 適合測試 LLM 品質但保持簡單的身份驗證

## 視覺指標

在 feed 頁面中，不同生成模式會有不同的標示：

| 來源 | 顏色 | 說明 |
|------|------|------|
| **Ollama** | 綠色 | 真實 LLM 生成（Cloud 或 Local） |
| **內容快取** | 藍色 | 從快取讀取 |
| **降級模式** | 橙色 | 降級到模擬資料 |
| **模擬資料** | 灰色 | 純模擬資料開發模式 |

## 環境變數覆蓋順序

1. `.env.local` - 本地開發環境變數
2. `.env.example` - 範本設定
3. 程式預設值 - 當環境變數未設定時使用

## 安全性注意事項

1. **不要提交 `.env.local` 到版本控制**
2. **API 金鑰應妥善保管**
3. **不同環境使用不同設定**
4. **生產環境的 OLLAMA_API_KEY 應使用環境變數注入**

## 測試

設定完成後，執行：

```bash
npm run build  # 測試編譯是否成功
npm run dev    # 啟動開發伺服器
```

前往 feed 頁面查看內容生成來源標示是否正確顯示設定模式。