## Context

Feed 頁面透過 Firestore `onSnapshot` 即時訂閱使用者的內容列表，使用 `orderBy('createdAt', 'desc')` 排序。新文章儲存後透過 snapshot 觸發 UI 更新。使用者可透過 Settings drawer 設定 contentSettings（tone, style, depth, length, topic, freshness），這些設定會傳入 `generate()` 並最終影響 prompt 建構。文章內含有 `{{keyword:關鍵字}}` 格式的可點擊關鍵字，目前點擊只做事件記錄。

目前的問題：
1. `desc` 排序讓新文章插入列表頂端，sentinel 始終在視區底部可見，IntersectionObserver 反覆觸發
2. `buildModularPrompt` 中 `selectModules(behavior).depth` 覆蓋了 contentSettings 的深度/長度指示
3. keyword click handler 只記錄事件，缺乏觸發生成的機制

## Goals / Non-Goals

**Goals:**
- 新文章按時間正序追加到列表底部，維持閱讀連續性
- contentSettings 的所有欄位在 prompt 建構時被正確且優先套用
- 點擊 keyword 後觸發與該關鍵字相關的單篇文章生成，並自動滾動到底部

**Non-Goals:**
- 不修改 `useInfiniteScroll.ts` 的核心邏輯（排序修正後問題自動消失）
- 不修改 Firestore schema 或新增 collection
- 不修改使用者認證流程或 onboarding 流程
- 不做 keyword click 的搜尋結果頁面（只生成一篇相關文章）

## Decisions

### 決策 1：Firestore query 排序方向改為 `asc`

將 `subscribeToUserFeed` 和 `getUserFeed` 的 `orderBy('createdAt', 'desc')` 改為 `orderBy('createdAt', 'asc')`。

**為什麼**：`desc` 讓最新文章排在陣列第一位，渲染時新文章出現在頂端。改為 `asc` 後，新文章追加到陣列末尾、渲染在列表底部，sentinel 被推出視區。

**替代方案**：在前端對 `desc` 結果做 `.reverse()` — 但這只是多一層不必要的轉換，直接在 query 層解決更乾淨。

### 決策 2：contentSettings 優先於 behavior-based depth 選擇

修改 `buildModularPrompt` 的邏輯：當 `contentSettings` 存在時，跳過 `selectModules(behavior)` 的 depth 結果，改用 `buildSettingsInstruction(contentSettings)` 作為深度/長度的唯一來源。

**具體做法**：在 `buildModularPrompt` 中，當 `context.contentSettings` 存在時，將 `modules.depth.prompt` 替換為空字串，完全依賴 `settingsInstruction` 中已有的深度/長度描述。

**為什麼**：`settingsInstruction` 已經包含了完整的深度（brief/moderate/deep/comprehensive）和長度（short/medium/long/detailed）描述，兩者同時存在會互相矛盾。使用者明確設定的偏好應該優先於行為推測。

### 決策 3：keyword click 觸發生成使用 `userFeedback` 機制

透過 `ContentCard` 的 `onKeywordClick` callback 向上傳遞 keyword 到 `FeedPage`，再呼叫 `generate()` 時將 keyword 作為 `userFeedback` 傳入 prompt context。

**具體做法**：
1. `ContentCard` 新增 `onKeywordClick` prop
2. `FeedPage` 接收後呼叫 `generate(userId, 1, interests, contentSettings, keyword)` — 生成 1 篇
3. `useContentGeneration.generate()` 新增可選的 `userFeedback` 參數
4. `ModularPromptContext.userFeedback` 已有現成的支援（prompt-builder.ts:498-501）
5. 生成前先 `window.scrollTo()` 滾動到頁面底部

**為什麼用 userFeedback 而非新機制**：prompt-builder 已有 `userFeedback` 欄位，且 user prompt 中已有相應的模板（「用戶表示：...請特別針對這個方向撰寫」），直接複用即可。

**替代方案**：新增獨立的 `keywordContext` 欄位 — 但 userFeedback 的語義完全適用，不需要新增概念。

## Risks / Trade-offs

**[排序變更影響既有使用者體驗]** → 使用者已習慣 `desc` 排序（最新在頂端），改為 `asc` 後需要向下滾動才能看到新文章。但這是 infinite scroll feed 的標準行為（如 Twitter、Facebook），且正好解決了無限觸發的系統性問題。

**[depth 模組被跳過可能影響新使用者]** → 新使用者可能尚未設定 contentSettings，此時仍使用預設的 `DEFAULT_CONTENT_SETTINGS`，其中 depth 為 `moderate`，與 behavior-based 的 `standard` 語義接近，影響極小。

**[keyword 生成只產生 1 篇]** → 如果生成失敗，使用者只會看到滾動到底部但沒有新文章。可在生成失敗時顯示簡短提示。

**[Firestore query limit 與 asc 排序]** → `asc` 排序配合 `limit(20)` 會取最舊的 20 筆而非最新的 20 筆。需要移除 limit 或改用其他分頁策略。目前 MVP 階段使用者的文章數量不會超過 limit，但後續需注意。
