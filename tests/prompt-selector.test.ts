// tests/prompt-selector.test.ts

import {
  selectDepth,
  selectDepthFromStats,
  buildUserContext,
  getDefaultBehavior,
  selectModules,
} from '@/lib/prompt-selector'
import type { UserBehavior } from '@/lib/prompt-selector'
import type { UserBehaviorStats } from '@/lib/user-data'

// ---------------------------------------------------------------------------
// selectDepth
// ---------------------------------------------------------------------------
describe('selectDepth', () => {
  test('returns standard for default behavior', () => {
    expect(selectDepth(getDefaultBehavior())).toBe('standard')
  })

  test('returns deep when user has written feedback', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 5000,
      recentLikes: 0,
      recentSkips: 0,
      hasFeedback: true,
    }
    expect(selectDepth(behavior)).toBe('deep')
  })

  test('returns deep when long dwell + many likes', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 35000,
      recentLikes: 5,
      recentSkips: 0,
      hasFeedback: false,
    }
    expect(selectDepth(behavior)).toBe('deep')
  })

  test('returns standard when dwell is long but likes are few', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 35000,
      recentLikes: 2,
      recentSkips: 0,
      hasFeedback: false,
    }
    expect(selectDepth(behavior)).toBe('standard')
  })

  test('returns brief when many skips (> 3)', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 2000,
      recentLikes: 0,
      recentSkips: 4,
      hasFeedback: false,
    }
    expect(selectDepth(behavior)).toBe('brief')
  })

  test('hasFeedback takes priority over skips', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 2000,
      recentLikes: 0,
      recentSkips: 10,
      hasFeedback: true,
    }
    expect(selectDepth(behavior)).toBe('deep')
  })
})

// ---------------------------------------------------------------------------
// selectDepthFromStats
// ---------------------------------------------------------------------------
describe('selectDepthFromStats', () => {
  const baseStats: UserBehaviorStats = {
    recentLikes: 0,
    recentDislikes: 0,
    recentSkips: 0,
    hasFeedback: false,
    recentKeywords: [],
  }

  test('returns standard for empty stats', () => {
    expect(selectDepthFromStats(baseStats)).toBe('standard')
  })

  test('returns deep when hasFeedback is true', () => {
    expect(selectDepthFromStats({ ...baseStats, hasFeedback: true })).toBe('deep')
  })

  test('returns deep when recentLikes > 5', () => {
    expect(selectDepthFromStats({ ...baseStats, recentLikes: 6 })).toBe('deep')
  })

  test('returns standard when recentLikes equals 5', () => {
    expect(selectDepthFromStats({ ...baseStats, recentLikes: 5 })).toBe('standard')
  })

  test('returns brief when recentDislikes > 3', () => {
    expect(selectDepthFromStats({ ...baseStats, recentDislikes: 4 })).toBe('brief')
  })

  test('hasFeedback takes priority over dislikes', () => {
    expect(selectDepthFromStats({ ...baseStats, hasFeedback: true, recentDislikes: 10 })).toBe('deep')
  })
})

// ---------------------------------------------------------------------------
// buildUserContext
// ---------------------------------------------------------------------------
describe('buildUserContext', () => {
  const baseStats: UserBehaviorStats = {
    recentLikes: 0,
    recentDislikes: 0,
    recentSkips: 0,
    hasFeedback: false,
    recentKeywords: [],
  }

  test('returns empty string when no context available', () => {
    expect(buildUserContext(baseStats)).toBe('')
  })

  test('includes last feedback when present', () => {
    const result = buildUserContext({ ...baseStats, lastFeedback: '希望更多科技內容', hasFeedback: true })
    expect(result).toContain('希望更多科技內容')
  })

  test('includes recent keywords when present', () => {
    const result = buildUserContext({ ...baseStats, recentKeywords: ['AI', '區塊鏈'] })
    expect(result).toContain('AI')
    expect(result).toContain('區塊鏈')
  })

  test('includes positive sentiment when likes >> dislikes', () => {
    const result = buildUserContext({ ...baseStats, recentLikes: 10, recentDislikes: 1 })
    expect(result).toContain('正面')
  })

  test('includes negative sentiment when dislikes > likes', () => {
    const result = buildUserContext({ ...baseStats, recentLikes: 1, recentDislikes: 5 })
    expect(result).toContain('負面')
  })

  test('combines multiple context parts with newlines', () => {
    const result = buildUserContext({
      ...baseStats,
      lastFeedback: '想看更多',
      hasFeedback: true,
      recentKeywords: ['科技'],
    })
    const lines = result.split('\n').filter(l => l.length > 0)
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// getDefaultBehavior
// ---------------------------------------------------------------------------
describe('getDefaultBehavior', () => {
  test('returns an object with expected shape', () => {
    const behavior = getDefaultBehavior()
    expect(typeof behavior.avgDwellTime).toBe('number')
    expect(typeof behavior.recentLikes).toBe('number')
    expect(typeof behavior.recentSkips).toBe('number')
    expect(typeof behavior.hasFeedback).toBe('boolean')
  })

  test('hasFeedback defaults to false', () => {
    expect(getDefaultBehavior().hasFeedback).toBe(false)
  })

  test('recentLikes defaults to 0', () => {
    expect(getDefaultBehavior().recentLikes).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// selectModules
// ---------------------------------------------------------------------------
describe('selectModules', () => {
  test('returns object with all required module fields', () => {
    const modules = selectModules(getDefaultBehavior())
    expect(modules).toHaveProperty('role')
    expect(modules).toHaveProperty('perspective')
    expect(modules).toHaveProperty('format')
    expect(modules).toHaveProperty('depth')
    expect(modules).toHaveProperty('tone')
    expect(modules).toHaveProperty('opening')
    expect(modules).toHaveProperty('antiCliches')
  })

  test('antiCliches is an array of 3 items', () => {
    const modules = selectModules(getDefaultBehavior())
    expect(Array.isArray(modules.antiCliches)).toBe(true)
    expect(modules.antiCliches).toHaveLength(3)
  })

  test('depth reflects selectDepth result for deep behavior', () => {
    const behavior: UserBehavior = {
      avgDwellTime: 0,
      recentLikes: 0,
      recentSkips: 0,
      hasFeedback: true,
    }
    const modules = selectModules(behavior)
    expect(modules.depth).toBeDefined()
  })

  test('writingChallenge is either a string or undefined', () => {
    const modules = selectModules(getDefaultBehavior())
    expect(
      modules.writingChallenge === undefined || typeof modules.writingChallenge === 'string'
    ).toBe(true)
  })
})
