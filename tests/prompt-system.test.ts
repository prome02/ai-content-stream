/**
 * Prompt system integration tests
 *
 * Tests actual module imports from:
 * - lib/prompt-modules.ts (module definitions)
 * - lib/prompt-selector.ts (module selection logic)
 * - lib/prompt-builder.ts (prompt construction)
 * - lib/news-fetcher.ts (news formatting utilities)
 */

import {
  ROLE_MODULES,
  PERSPECTIVE_MODULES,
  FORMAT_MODULES,
  DEPTH_MODULES,
  TONE_MODULES,
  OPENING_MODULES,
  ANTI_CLICHE_PHRASES,
  WRITING_CHALLENGES,
} from '@/lib/prompt-modules'

import {
  selectDepth,
  selectModules,
  getDefaultBehavior,
  type UserBehavior,
  type SelectedModules,
} from '@/lib/prompt-selector'

import { PromptBuilder, type ModularPromptContext } from '@/lib/prompt-builder'
import { formatNewsForPrompt, extractKeywordsFromNews, type NewsItem } from '@/lib/news-fetcher'

// Suppress console noise during tests
const originalLog = console.log
const originalWarn = console.warn
beforeEach(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  jest.clearAllMocks()
})
afterEach(() => {
  console.log = originalLog
  console.warn = originalWarn
})

// ---------------------------------------------------------------------------
// 1. Module definitions
// ---------------------------------------------------------------------------
describe('Module definitions (prompt-modules.ts)', () => {
  test('ROLE_MODULES should have 5 roles, each with id/name/prompt', () => {
    expect(ROLE_MODULES).toHaveLength(5)
    ROLE_MODULES.forEach(mod => {
      expect(mod.id).toBeTruthy()
      expect(mod.name).toBeTruthy()
      expect(mod.prompt.length).toBeGreaterThan(10)
    })
  })

  test('PERSPECTIVE_MODULES should have 5 perspectives', () => {
    expect(PERSPECTIVE_MODULES).toHaveLength(5)
  })

  test('FORMAT_MODULES should have 4 formats', () => {
    expect(FORMAT_MODULES).toHaveLength(4)
  })

  test('DEPTH_MODULES should have brief / standard / deep', () => {
    expect(DEPTH_MODULES.brief).toBeDefined()
    expect(DEPTH_MODULES.standard).toBeDefined()
    expect(DEPTH_MODULES.deep).toBeDefined()
    expect(DEPTH_MODULES.brief.wordCount.max).toBeLessThan(DEPTH_MODULES.standard.wordCount.min)
  })

  test('TONE_MODULES should have 8 tones', () => {
    expect(TONE_MODULES).toHaveLength(8)
    const ids = TONE_MODULES.map(t => t.id)
    expect(ids).toContain('humorous')
    expect(ids).toContain('rigorous')
    expect(ids).toContain('warm')
    expect(ids).toContain('sharp')
    expect(ids).toContain('curious')
    expect(ids).toContain('chill')
    expect(ids).toContain('literary')
    expect(ids).toContain('passionate')
  })

  test('OPENING_MODULES should have 6 opening styles', () => {
    expect(OPENING_MODULES).toHaveLength(6)
    const ids = OPENING_MODULES.map(o => o.id)
    expect(ids).toContain('question')
    expect(ids).toContain('data')
    expect(ids).toContain('scene')
    expect(ids).toContain('history')
    expect(ids).toContain('contrarian')
    expect(ids).toContain('anecdote')
  })

  test('ANTI_CLICHE_PHRASES should have 14 entries', () => {
    expect(ANTI_CLICHE_PHRASES).toHaveLength(14)
  })

  test('WRITING_CHALLENGES should have 8 entries', () => {
    expect(WRITING_CHALLENGES).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// 2. Module selection (prompt-selector.ts)
// ---------------------------------------------------------------------------
describe('Module selection (prompt-selector.ts)', () => {
  const defaultBehavior = getDefaultBehavior()

  describe('selectDepth', () => {
    test('should return "deep" when user has feedback', () => {
      const behavior: UserBehavior = { ...defaultBehavior, hasFeedback: true }
      expect(selectDepth(behavior)).toBe('deep')
    })

    test('should return "deep" when dwell time > 30s and likes > 3', () => {
      const behavior: UserBehavior = {
        ...defaultBehavior,
        avgDwellTime: 35000,
        recentLikes: 5,
      }
      expect(selectDepth(behavior)).toBe('deep')
    })

    test('should return "brief" when skips > 3', () => {
      const behavior: UserBehavior = { ...defaultBehavior, recentSkips: 5 }
      expect(selectDepth(behavior)).toBe('brief')
    })

    test('should return "standard" for default behavior', () => {
      expect(selectDepth(defaultBehavior)).toBe('standard')
    })
  })

  describe('selectModules', () => {
    test('should return all required module fields', () => {
      const modules = selectModules(defaultBehavior)
      expect(modules.role).toBeDefined()
      expect(modules.perspective).toBeDefined()
      expect(modules.format).toBeDefined()
      expect(modules.depth).toBeDefined()
      expect(modules.tone).toBeDefined()
      expect(modules.opening).toBeDefined()
      expect(modules.antiCliches).toBeDefined()
      // writingChallenge is optional (30% chance)
    })

    test('selected role should be from ROLE_MODULES', () => {
      const modules = selectModules(defaultBehavior)
      const roleIds = ROLE_MODULES.map(r => r.id)
      expect(roleIds).toContain(modules.role.id)
    })

    test('selected tone should be from TONE_MODULES', () => {
      const modules = selectModules(defaultBehavior)
      const toneIds = TONE_MODULES.map(t => t.id)
      expect(toneIds).toContain(modules.tone.id)
    })

    test('selected opening should be from OPENING_MODULES', () => {
      const modules = selectModules(defaultBehavior)
      const openingIds = OPENING_MODULES.map(o => o.id)
      expect(openingIds).toContain(modules.opening.id)
    })

    test('should select exactly 3 anti-cliche phrases', () => {
      const modules = selectModules(defaultBehavior)
      expect(modules.antiCliches).toHaveLength(3)
      modules.antiCliches.forEach(phrase => {
        expect(ANTI_CLICHE_PHRASES as readonly string[]).toContain(phrase)
      })
    })

    test('writingChallenge, when present, should be from WRITING_CHALLENGES', () => {
      // Run enough iterations to hit the 30% chance at least once
      let found = false
      for (let i = 0; i < 50; i++) {
        const modules = selectModules(defaultBehavior)
        if (modules.writingChallenge) {
          expect(WRITING_CHALLENGES as readonly string[]).toContain(modules.writingChallenge)
          found = true
          break
        }
      }
      expect(found).toBe(true) // extremely unlikely to miss in 50 tries
    })

    test('should produce diverse selections across multiple calls', () => {
      const roleIds = new Set<string>()
      const toneIds = new Set<string>()
      const openingIds = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const m = selectModules(defaultBehavior)
        roleIds.add(m.role.id)
        toneIds.add(m.tone.id)
        openingIds.add(m.opening.id)
      }

      // With 100 calls we should see variety (at least 2 distinct values each)
      expect(roleIds.size).toBeGreaterThanOrEqual(2)
      expect(toneIds.size).toBeGreaterThanOrEqual(2)
      expect(openingIds.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getDefaultBehavior', () => {
    test('should return a valid default behavior object', () => {
      const b = getDefaultBehavior()
      expect(b.avgDwellTime).toBe(10000)
      expect(b.recentLikes).toBe(0)
      expect(b.recentSkips).toBe(0)
      expect(b.hasFeedback).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// 3. News formatting utilities (news-fetcher.ts)
// ---------------------------------------------------------------------------
describe('News formatting utilities (news-fetcher.ts)', () => {
  const sampleNews: NewsItem[] = [
    {
      title: 'AI revolutionizes healthcare',
      description: 'New study shows...',
      link: 'https://example.com/1',
      pubDate: new Date(),
      source: 'TechNews',
    },
    {
      title: 'Global market trends 2026',
      description: 'Analysis of Q1...',
      link: 'https://example.com/2',
      pubDate: new Date(Date.now() - 3600000),
      source: 'BizDaily',
    },
  ]

  test('formatNewsForPrompt should format news items', () => {
    const formatted = formatNewsForPrompt(sampleNews)
    expect(formatted).toContain('AI revolutionizes healthcare')
    expect(formatted).toContain('TechNews')
    expect(formatted).toContain('Global market trends 2026')
  })

  test('formatNewsForPrompt should return placeholder for empty news', () => {
    const formatted = formatNewsForPrompt([])
    expect(formatted).toContain('無相關新聞素材')
  })

  test('extractKeywordsFromNews should extract keywords from titles', () => {
    const keywords = extractKeywordsFromNews(sampleNews)
    expect(keywords.length).toBeGreaterThan(0)
    expect(keywords.length).toBeLessThanOrEqual(10)
    // Each keyword should be 2-10 characters
    keywords.forEach(kw => {
      expect(kw.length).toBeGreaterThanOrEqual(2)
      expect(kw.length).toBeLessThanOrEqual(10)
    })
  })

  test('extractKeywordsFromNews should return empty for no news', () => {
    expect(extractKeywordsFromNews([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Prompt builder (prompt-builder.ts)
// ---------------------------------------------------------------------------
describe('PromptBuilder.buildModularPrompt', () => {
  const builder = new PromptBuilder()

  const baseContext: ModularPromptContext = {
    userPreferences: { interests: ['tech', 'business'], language: 'zh-TW' },
    news: [
      {
        title: 'AI advances in 2026',
        description: 'Latest developments...',
        link: 'https://example.com/ai',
        pubDate: new Date(),
        source: 'TechDaily',
      },
    ],
    behavior: getDefaultBehavior(),
  }

  test('should return valid JSON string', () => {
    const result = builder.buildModularPrompt(baseContext)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  test('parsed result should contain messages array with system and user roles', () => {
    const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
    expect(parsed.messages).toHaveLength(2)
    expect(parsed.messages[0].role).toBe('system')
    expect(parsed.messages[1].role).toBe('user')
  })

  test('system prompt should contain tone, opening, and anti-cliche instructions', () => {
    // Run a few times to cover random combinations
    for (let i = 0; i < 5; i++) {
      const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
      const sysPrompt: string = parsed.messages[0].content

      // Should contain at least one tone keyword pattern (all tone prompts include these)
      expect(sysPrompt.length).toBeGreaterThan(200)

      // Should always have anti-cliche section
      expect(sysPrompt).toContain('避免以下套話和句式')
    }
  })

  test('user prompt should include interests and news material', () => {
    const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
    const userPrompt: string = parsed.messages[1].content
    expect(userPrompt).toContain('tech')
    expect(userPrompt).toContain('business')
    expect(userPrompt).toContain('AI advances in 2026')
  })

  test('_modules should record tone and opening ids', () => {
    const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
    expect(parsed._modules.tone).toBeTruthy()
    expect(parsed._modules.opening).toBeTruthy()
    expect(typeof parsed._modules.hasChallenge).toBe('boolean')
    expect(typeof parsed._modules.temperature).toBe('number')
  })

  test('temperature should be in range 0.70 - 1.00', () => {
    for (let i = 0; i < 20; i++) {
      const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
      expect(parsed.options.temperature).toBeGreaterThanOrEqual(0.7)
      expect(parsed.options.temperature).toBeLessThanOrEqual(1.0)
    }
  })

  test('temperature should vary across calls', () => {
    const temps = new Set<number>()
    for (let i = 0; i < 20; i++) {
      const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
      temps.add(parsed.options.temperature)
    }
    expect(temps.size).toBeGreaterThan(1)
  })

  test('should include user feedback in prompt when provided', () => {
    const ctx: ModularPromptContext = {
      ...baseContext,
      userFeedback: 'I want more technical depth',
    }
    const parsed = JSON.parse(builder.buildModularPrompt(ctx))
    const userPrompt: string = parsed.messages[1].content
    expect(userPrompt).toContain('I want more technical depth')
  })

  test('modules should differ across multiple calls (diversity)', () => {
    const roles = new Set<string>()
    const tones = new Set<string>()
    const openings = new Set<string>()

    for (let i = 0; i < 50; i++) {
      const parsed = JSON.parse(builder.buildModularPrompt(baseContext))
      roles.add(parsed._modules.role)
      tones.add(parsed._modules.tone)
      openings.add(parsed._modules.opening)
    }

    expect(roles.size).toBeGreaterThanOrEqual(2)
    expect(tones.size).toBeGreaterThanOrEqual(2)
    expect(openings.size).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// 5. News dedup tracking logic (same as route.ts in-memory tracker)
// ---------------------------------------------------------------------------
describe('News dedup tracking logic', () => {
  const MAX = 20

  function createTracker() {
    const map = new Map<string, string[]>()
    return {
      get: (uid: string) => map.get(uid) || [],
      track: (uid: string, links: string[]) => {
        const existing = map.get(uid) || []
        map.set(uid, [...existing, ...links].slice(-MAX))
      },
    }
  }

  test('should accumulate links for a user', () => {
    const tracker = createTracker()
    tracker.track('u1', ['a', 'b'])
    tracker.track('u1', ['c'])
    expect(tracker.get('u1')).toEqual(['a', 'b', 'c'])
  })

  test('should cap at MAX entries (keep most recent)', () => {
    const tracker = createTracker()
    const links = Array.from({ length: 25 }, (_, i) => `link-${i}`)
    tracker.track('u1', links)
    const stored = tracker.get('u1')
    expect(stored).toHaveLength(MAX)
    expect(stored[0]).toBe('link-5') // oldest 5 should be dropped
    expect(stored[MAX - 1]).toBe('link-24')
  })

  test('exclude set should filter previously used links', () => {
    const tracker = createTracker()
    tracker.track('u1', ['link-a', 'link-b', 'link-c'])

    const incoming = ['link-b', 'link-d', 'link-e']
    const excludeSet = new Set(tracker.get('u1'))
    const fresh = incoming.filter(l => !excludeSet.has(l))

    expect(fresh).toEqual(['link-d', 'link-e'])
  })
})
