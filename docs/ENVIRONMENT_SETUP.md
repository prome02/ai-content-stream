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
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key-for-emulator
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
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:12b-cloud
OLLAMA_API_KEY=your_ollama_api_key_here
```

#### 可用的 Ollama 模型
| 模型 | 說明 |
|------|------|
| `gemma3:12b-cloud` | 預設，雲端版本，品質較佳 |
| `gemma3:4b` | 本地輕量版，速度較快 |
| `qwen2.5:7b` | 中文能力較強 |
| `llama3.1:8b` | 綜合能力較佳 |

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

### 生產模式（真實 LLM）
```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
OLLAMA_API_KEY=your_actual_api_key
```
- 使用真實 Ollama LLM 生成內容
- 使用真實 Firebase 服務
- 需要有效的 Ollama API 金鑰

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
| **Ollama Local** | 綠色 | 真實 LLM 生成 |
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