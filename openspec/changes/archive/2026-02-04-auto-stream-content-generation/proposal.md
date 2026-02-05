# Proposal: Auto-Stream Content Generation

## Problem Statement

Currently, after a user completes onboarding (selects interests), they arrive at the `/feed` page with an empty content area. Users must manually click the "Generate Content" button to start AI content generation. This creates unnecessary friction and a confusing user experience.

**Current Flow:**
1. User logs in (Google Sign-In)
2. User selects interests on `/onboarding/interests`
3. User clicks "Start AI Experience" button
4. User arrives at empty `/feed` page
5. User must click "Generate Content" button to start generation
6. Content appears after generation completes

**Desired Flow:**
1. User logs in
2. User selects interests
3. User clicks "Start AI Experience" button
4. User arrives at `/feed` page where content is **already generating**
5. Content appears **one by one** as each article is generated (streaming UX)

## Proposed Solution

### 1. Auto-trigger Generation on First Visit

When a user navigates from onboarding to the feed page for the first time (no existing content), automatically start content generation.

**Approach A (Recommended): Query Parameter Flag**
- Pass `?autoGenerate=true` from onboarding page to feed page
- Feed page detects this flag and auto-triggers generation
- Clean URL after generation starts (using `router.replace`)

**Approach B: Firestore State Check**
- Feed page checks if user has any content in Firestore
- If empty AND coming from onboarding, auto-generate
- More complex, requires additional Firestore read

### 2. Streaming Display (Already Implemented)

The current `useContentGeneration` hook already supports streaming display:
- Uses Firestore `onSnapshot` for real-time updates
- Each generated item is saved to Firestore immediately
- UI updates automatically when new content arrives

This part requires **no changes** - it already works as expected.

### 3. UX Improvements

- Show loading skeleton or "Generating your first personalized content..." message
- Progress indicator showing "Generating 1/5..." etc.
- Remove the empty state "click to generate" prompt when auto-generating

## Files to Modify

| File | Change |
|------|--------|
| `app/onboarding/interests/page.tsx` | Add `?autoGenerate=true` to redirect URL |
| `app/feed/page.tsx` | Detect `autoGenerate` param, trigger generation, clean URL |

## Non-Goals

- **NOT** changing the content generation logic (Ollama API calls)
- **NOT** modifying Firestore data structure
- **NOT** adding new dependencies
- **NOT** changing the streaming mechanism (already works)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| User refreshes during generation | Generation state is tracked, can resume or show existing content |
| Ollama unavailable | Existing fallback to mock data already handles this |
| Rate limiting triggered | Existing rate limiter logic remains unchanged |

## Success Criteria

1. After completing onboarding, content generation starts automatically
2. Each article appears immediately after generation (no waiting for all 5)
3. No manual "Generate Content" button click required for first-time users
4. Existing users (with content) continue to see normal feed behavior
