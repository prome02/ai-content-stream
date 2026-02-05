## Why

Feed 頁面存在三個嚴重的行為缺陷：(1) 新生成的文章未按正確順序追加到列表末尾，導致閱讀順序錯亂且 infinite scroll 持續觸發生成（因為 sentinel 始終可見）；(2) Settings drawer 中變更的設定（如深度、長度等）未能即時反映在下一次生成的 prompt 中；(3) 點擊文章內的 keyword link 僅做記錄，未能觸發生成與該關鍵字相關的新文章。

## What Changes

- **修復文章排序（同時修復 infinite scroll 無限觸發）**：Firestore 訂閱的 `orderBy('createdAt', 'desc')` 導致新文章出現在列表頂端，sentinel 始終留在視區內，造成 IntersectionObserver 反覆觸發。改為 `asc` 排序，新文章追加到底部，sentinel 自然被推出視區（超過 200px rootMargin），無限觸發問題自動消失。
- **修復 contentSettings 對 prompt 的影響**：`buildModularPrompt` 中 `selectModules(behavior)` 的 depth 模組覆蓋了 settings 指示。需讓 contentSettings 的 depth/length 優先於行為推測的 depth。
- **新增 keyword click 觸發生成**：點擊 keyword 後，自動滾動到列表底部，並立即觸發一篇與該關鍵字相關的文章生成（利用 `userFeedback` 機制傳遞關鍵字給 prompt）。

## Capabilities

### New Capabilities
- `keyword-triggered-generation`: 點擊文章內的 keyword link 時，觸發與該關鍵字相關的單篇文章生成，並自動滾動到列表底部。

### Modified Capabilities
- `infinite-scroll`: 修正 feed 文章排序為時間正序（舊到新），新文章追加到底部後 sentinel 自然被推出視區，無限觸發問題隨之消失。
- `content-generation`: 確保 contentSettings（tone, style, depth, length, topic, freshness）在 prompt 建構時被正確套用，settings 優先於行為推測。

## Impact

- **受影響檔案**：
  - `app/feed/page.tsx` - feed 主頁面：接收 keyword click 事件、觸發生成、滾動邏輯
  - `app/hooks/useContentGeneration.ts` - 生成 hook：支援單篇關鍵字生成模式
  - `app/components/ContentCard.tsx` - 內容卡片：向上層傳遞 keyword click 事件
  - `lib/content-service.ts` - 內容服務：修改 Firestore query 排序方向
  - `lib/prompt-builder.ts` - Prompt 建構器：確保 contentSettings 優先套用
  - `lib/prompt-selector.ts` - 模組選擇器：當有 contentSettings 時跳過行為推測的 depth
- **無 API 變更**：所有修改都在前端與 client-side 邏輯
- **無 Firestore schema 變更**：只是改 query 排序方向
- **無 breaking changes**
