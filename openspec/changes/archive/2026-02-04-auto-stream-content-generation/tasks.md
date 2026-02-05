# Tasks: Auto-Stream Content Generation

## Task 1: Update onboarding redirect URL

**File:** `app/onboarding/interests/page.tsx`

**Changes:**
1. In `handleSubmit` function, change:
   ```typescript
   router.push('/feed')
   ```
   to:
   ```typescript
   router.push('/feed?autoGenerate=true')
   ```

**Acceptance:**
- After clicking "Start AI Experience", URL includes `?autoGenerate=true`

---

## Task 2: Add URL parameter detection to feed page

**File:** `app/feed/page.tsx`

**Changes:**
1. Add import at top:
   ```typescript
   import { useSearchParams } from 'next/navigation'
   ```
2. Add hook call inside `FeedPage` component (after router declaration):
   ```typescript
   const searchParams = useSearchParams()
   const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true'
   ```

**Acceptance:**
- Component can detect `autoGenerate` query parameter
- No runtime errors

---

## Task 3: Implement auto-generation trigger

**File:** `app/feed/page.tsx`

**Changes:**
1. Add new `useEffect` after the existing user preferences loading effect:
   ```typescript
   // Auto-generate content when coming from onboarding
   useEffect(() => {
     if (!user || !shouldAutoGenerate || isGenerating || feedItems.length > 0) return
     if (userInterests.length === 0) return

     // Clean URL (remove autoGenerate param)
     const url = new URL(window.location.href)
     url.searchParams.delete('autoGenerate')
     window.history.replaceState({}, '', url.pathname)

     // Start generation
     console.log('[Feed] Auto-generating content for new user')
     generate(user.uid, 5, userInterests)
   }, [user, shouldAutoGenerate, isGenerating, feedItems.length, userInterests, generate])
   ```

**Acceptance:**
- Generation starts automatically when `autoGenerate=true` is in URL
- URL is cleaned to `/feed` after generation starts
- Does not trigger if user already has content
- Does not trigger if already generating

---

## Task 4: Update empty state UI for auto-generation

**File:** `app/feed/page.tsx`

**Changes:**
1. Update the empty state conditional rendering (around line 293-307):
   ```typescript
   {feedItems.length === 0 && !isGenerating && !shouldAutoGenerate ? (
     // Empty state with manual generate button (existing)
     <div className="text-center py-12">
       <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-gray-100">
         <Sparkles className="h-12 w-12 text-gray-400" />
       </div>
       <h3 className="text-xl font-semibold text-gray-800 mb-2">Start generating content</h3>
       <p className="text-gray-600 mb-6">Click the button below, AI will generate personalized content for you</p>
       <button
         onClick={handleRefresh}
         disabled={isGenerating}
         className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
       >
         Generate Content
       </button>
     </div>
   ) : feedItems.length === 0 ? (
     // Auto-generating state (new)
     <div className="text-center py-12">
       <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
         <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
       </div>
       <h3 className="text-xl font-semibold text-gray-800 mb-2">
         Generating your personalized content...
       </h3>
       <p className="text-gray-600">
         {currentIndex >= 0
           ? `Creating article ${currentIndex + 1} of ${totalCount}`
           : 'Initializing AI...'}
       </p>
       {isGenerating && (
         <button
           onClick={stop}
           className="mt-4 text-sm text-red-500 hover:underline"
         >
           Stop generation
         </button>
       )}
     </div>
   ) : (
     // Content cards (existing)
     <>
       {/* Content cards */}
       <div className="space-y-6">
         {feedItems.map((item) => (
           <ContentCard
             key={item.id}
             content={item}
             onLike={() => handleLike(item.id)}
             onDislike={() => handleDislike(item.id)}
             currentUserId={user?.uid}
           />
         ))}
       </div>

       {/* Generation progress */}
       {isGenerating && (
         <div className="text-center py-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
           <p className="mt-2 text-sm text-gray-500">
             AI 生成中... ({currentIndex + 1}/{totalCount})
           </p>
           <button
             onClick={stop}
             className="mt-2 text-xs text-red-500 hover:underline"
           >
             停止生成
           </button>
         </div>
       )}

       {/* Stats */}
       <div className="mt-12 pt-6 border-t border-gray-200">
         <div className="text-sm text-gray-500 text-center">
           <p>目前已為你推薦 {feedItems.length} 則個人化內容</p>
           <p className="mt-1">
             來源: <span className={getContentSourceColor(source || 'firestore')}>{getSourceLabel(source || 'firestore')}</span>
             {' '}| Firestore 即時同步
           </p>
         </div>
       </div>
     </>
   ))}
   ```

**Acceptance:**
- New users see "Generating your personalized content..." message
- Progress shows "Creating article X of Y"
- Manual users still see the button
- Stop button available during generation

---

## Implementation Order

1. Task 1 (onboarding redirect) - Foundation
2. Task 2 (URL detection) - Required for Task 3
3. Task 3 (auto-trigger) - Core logic
4. Task 4 (UI update) - Polish

---

## Verification

After all tasks complete:
1. Start fresh (clear localStorage, sign out)
2. Log in with Google
3. Select 3+ interests
4. Click "Start AI Experience"
5. Verify: Feed page shows loading state immediately
6. Verify: Articles appear one by one
7. Verify: URL is `/feed` (no query param)

---

## Completed Tasks

- [x] Task 1: Update onboarding redirect URL
- [x] Task 2: Add URL parameter detection to feed page
- [x] Task 3: Implement auto-generation trigger
- [x] Task 4: Update empty state UI for auto-generation
