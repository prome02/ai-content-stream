## 1. Fix Feed Content Ordering

- [x] 1.1 In `lib/content-service.ts`: change `subscribeToUserFeed` query from `orderBy('createdAt', 'desc')` to `orderBy('createdAt', 'asc')`
- [x] 1.2 In `lib/content-service.ts`: change `getUserFeed` query from `orderBy('createdAt', 'desc')` to `orderBy('createdAt', 'asc')`

## 2. Fix ContentSettings Priority in Prompt

- [x] 2.1 In `lib/prompt-builder.ts` `buildModularPrompt`: when `context.contentSettings` exists, replace `modules.depth.prompt` with empty string so that `settingsInstruction` is the sole depth/length source
- [x] 2.2 Verify that `buildSettingsInstruction` output includes all six settings fields (tone, style, depth, length, topic, freshness) and produces correct Chinese instructions

## 3. Keyword Click Triggered Generation

- [x] 3.1 In `app/components/ContentCard.tsx`: add `onKeywordClick?: (keyword: string) => void` prop to `ContentCardProps` interface
- [x] 3.2 In `ContentCard`: call `props.onKeywordClick?.(keyword)` inside existing `handleKeywordClick` (after tracking logic)
- [x] 3.3 In `app/hooks/useContentGeneration.ts`: add optional `userFeedback?: string` parameter to `generate()` function and pass it through to `ModularPromptContext`
- [x] 3.4 In `app/feed/page.tsx`: create `handleKeywordGenerate(keyword: string)` handler that scrolls to bottom and calls `generate(userId, 1, interests, contentSettings, keyword)`
- [x] 3.5 In `app/feed/page.tsx`: pass `onKeywordClick={handleKeywordGenerate}` to each `ContentCard` component

## 4. Verification

## 4. Manual Testing (Implementation Complete)

- [x] 4.1 Manual test: generate content and verify new articles appear at bottom of feed (not top)
- [x] 4.2 Manual test: change Settings depth to "brief", generate new content, verify shorter output  
- [x] 4.3 Manual test: click a keyword in an article, verify page scrolls to bottom and new related article appears
- [x] 4.4 Manual test: verify infinite scroll does not trigger continuously when idle at bottom
