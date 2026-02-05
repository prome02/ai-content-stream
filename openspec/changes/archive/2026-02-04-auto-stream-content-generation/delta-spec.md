# Delta Spec: Auto-Stream Content Generation

## Overview

This change modifies the user flow to automatically start content generation when users complete onboarding, eliminating the need to manually click "Generate Content".

## File Changes

### 1. app/onboarding/interests/page.tsx

**Current behavior:**

```typescript
router.push('/feed')
```

**New behavior:**

```typescript
router.push('/feed?autoGenerate=true')
```

**Rationale:** Pass a query parameter to signal the feed page should auto-start generation.

---

### 2. app/feed/page.tsx

#### 2.1 Add URL parameter detection

**Add import:**

```typescript
import { useSearchParams } from 'next/navigation'
```

**Add hook call inside component:**

```typescript
const searchParams = useSearchParams()
const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true'
```

#### 2.2 Auto-trigger generation effect

**Add new useEffect after user preferences load:**

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

#### 2.3 Update empty state UI

**Current empty state (lines ~293-307):**
Shows "Click to generate" message with button.

**New behavior:**
When `shouldAutoGenerate` is true OR `isGenerating` is true, show loading state instead of the "click to generate" prompt:

```typescript
{feedItems.length === 0 && !isGenerating && !shouldAutoGenerate ? (
  // Existing empty state with button
) : feedItems.length === 0 && (isGenerating || shouldAutoGenerate) ? (
  // New: Auto-generating state
  <div className="text-center py-12">
    <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
    </div>
    <h3 className="text-xl font-semibold text-gray-800 mb-2">
      AI is generating your personalized content...
    </h3>
    <p className="text-gray-600">
      {currentIndex >= 0 ? `Generating article ${currentIndex + 1}/${totalCount}` : 'Starting...'}
    </p>
  </div>
) : (
  // Existing content display
)}
```

## Data Flow

```
[Onboarding Page]
       |
       | router.push('/feed?autoGenerate=true')
       v
[Feed Page]
       |
       | useSearchParams() detects autoGenerate=true
       | useEffect triggers generate()
       | window.history.replaceState() cleans URL
       v
[useContentGeneration]
       |
       | Calls Ollama API
       | Saves each item to Firestore
       v
[Firestore onSnapshot]
       |
       | Real-time updates to feedItems
       v
[UI Updates]
       |
       | Each new item appears immediately
       v
[Complete]
```

## Edge Cases

| Scenario                                | Behavior                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| User refreshes during auto-generation   | URL is cleaned, no auto-generate; shows existing content or empty state |
| User manually navigates to /feed        | No autoGenerate param, shows normal empty state                         |
| Ollama unavailable                      | Falls back to mock data (existing behavior)                             |
| User already has content                | `feedItems.length > 0` check prevents re-generation                   |
| User clicks stop during auto-generation | `stop()` function works as before                                     |

## Testing Checklist

- [X] New user flow: Onboarding -> Feed auto-generates
- [X] Existing user: Direct /feed access shows empty state with button
- [X] URL is cleaned after auto-generation starts
- [X] Progress indicator shows correctly during generation
- [X] Each article appears as soon as it's generated
- [X] Stop button works during auto-generation
- [X] Ollama fallback to mock data works
