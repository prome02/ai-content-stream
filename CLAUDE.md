# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 個人化內容資訊流平台 - 一個無需對話的 AI 生成無限資訊流平台，透過使用者行為反饋自動生成個人化內容。

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
```

## Environment Configuration

See `docs/ENVIRONMENT_SETUP.md` for complete setup guide. Key environment variables:

- `NEXT_PUBLIC_USE_MOCK_DATA`: `true` for mock data, `false` for real LLM
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`: `true` for Firebase Emulator
- `OLLAMA_BASE_URL`: Ollama API URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: LLM model name (default: `gemma3:12b-cloud`)

Development mode defaults to mock data + Firebase Emulator.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 with `clsx` + `tailwind-merge`
- **Auth**: Firebase Auth (Google Sign-In)
- **Database**: Firestore
- **LLM**: Ollama API (gemma3:12b-cloud model)
- **Data Fetching**: SWR

### Directory Structure

```
app/
├── api/
│   ├── generate/route.ts    # LLM content generation endpoint
│   ├── interaction/route.ts # User interaction tracking
│   └── event-track/route.ts # Analytics events
├── components/              # React components
│   ├── ContentCard.tsx      # Content card with like/dislike
│   ├── settings/            # Settings drawer components
│   │   └── SettingsDrawer.tsx
│   └── ui/                  # Reusable UI components
│       └── OptionSelector.tsx
├── hooks/                   # Custom hooks (useAuth, useInfiniteScroll, useInteractionTracking, useContentGeneration)
├── feed/page.tsx           # Main content feed
├── onboarding/interests/   # User interest selection
└── page.tsx                # Landing/login page

lib/
├── api-utils.ts            # API validation utilities
├── real-firebase.ts        # Real Firebase SDK with Emulator support
├── ollama-client.ts        # Ollama LLM client
├── prompt-builder.ts       # LLM prompt construction
├── mock-data.ts            # Mock content for development
├── quality-scoring.ts      # Content quality algorithms
└── user-data.ts            # User preference & content settings management

services/
├── content-cache.service.ts # Two-layer cache (memory + localStorage)
└── rate-limiter.ts          # Hourly rate limiting (20 req/hour)

types/
└── index.ts                 # TypeScript type definitions
```

### Data Flow

1. User authenticates via Google Sign-In
2. User selects interests on onboarding
3. User configures content preferences via Settings drawer (tone, style, depth, length, topic, freshness)
4. Feed generates content via browser-side Ollama calls with personalized prompt parameters
5. User interactions (like/dislike/dwell time) update quality scores
6. Personalization improves based on accumulated behavior data

### Firestore Collections

All collections use `aipcs_` prefix:
- `aipcs_users`: User profiles, preferences, rate limit state
- `aipcs_content_cache`: Generated content with quality scores
- `aipcs_interactions`: User behavior tracking (likes, dwell time, scroll depth)
- `aipcs_user_settings`: User content generation preferences (tone, style, depth, length, topic, freshness)

### Content Generation Modes

The `/api/generate` endpoint supports multiple sources:
- `ollama`: Real LLM generation
- `cache`: Previously generated content
- `mock`: Development mock data
- `fallback`: Degraded mode when LLM fails

### Rate Limiting

- 20 requests per hour per user
- Uses sliding window (timestamp-based, not hour boundary)
- Falls back to mock content when exceeded

### Content Format

- LLM response format: `{content, keywords, topics, style}`
- `keywords` are automatically converted to `hashtags` (with `#` prefix)
- Legacy array format is no longer supported

## Code Conventions

- Use TypeScript for all new code
- Console output must be in English
- No emojis in code (emojis in mock content are acceptable)
- Use繁體中文 for user-facing messages and comments
- Types are defined in `types/index.ts`

### TypeScript Tips

- Use `as const` for literal type inference: `style: 'casual' as const`
- API validation: use `lib/api-utils.ts` `validateRequest()` function

### Testing MVP

```bash
ollama serve                                  # Start Ollama
NEXT_PUBLIC_USE_MOCK_DATA=false npm run dev   # Real LLM mode
```
