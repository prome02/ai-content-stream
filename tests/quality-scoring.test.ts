// tests/quality-scoring.test.ts

import {
  calculateQualityScore,
  getUserAge,
  getPositiveRate,
} from '@/lib/quality-scoring'
import type { UserData } from '@/lib/quality-scoring'

// ---------------------------------------------------------------------------
// calculateQualityScore
// ---------------------------------------------------------------------------
describe('calculateQualityScore', () => {
  const baseArgs = { userAge: 30, positiveRate: 0.7, recentLikes: 2 }

  describe('like', () => {
    test('adds 5 points', () => {
      const result = calculateQualityScore('like', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(55)
    })

    test('adds 5 + 8 bonus when dwellTime > 3000ms', () => {
      const result = calculateQualityScore('like', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 5000)
      expect(result.newScore).toBe(63)
    })

    test('does not add dwell bonus when dwellTime <= 3000ms', () => {
      const result = calculateQualityScore('like', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 3000)
      expect(result.newScore).toBe(55)
    })

    test('does not exceed 100', () => {
      const result = calculateQualityScore('like', 98, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(100)
    })

    test('includes reason string', () => {
      const result = calculateQualityScore('like', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.reason.length).toBeGreaterThan(0)
    })
  })

  describe('dislike', () => {
    test('subtracts 8 points', () => {
      const result = calculateQualityScore('dislike', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(42)
    })

    test('does not go below 0', () => {
      const result = calculateQualityScore('dislike', 5, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(0)
    })
  })

  describe('view', () => {
    test('adds 1 point', () => {
      const result = calculateQualityScore('view', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(51)
    })
  })

  describe('long_dwell', () => {
    test('adds 8 points when dwellTime > 3000ms', () => {
      const result = calculateQualityScore('long_dwell', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 5000)
      expect(result.newScore).toBe(58)
    })

    test('adds 0 when dwellTime is undefined', () => {
      const result = calculateQualityScore('long_dwell', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBe(50)
    })

    test('adds 0 when dwellTime <= 3000ms', () => {
      const result = calculateQualityScore('long_dwell', 50, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 1000)
      expect(result.newScore).toBe(50)
    })

    test('does not exceed 100', () => {
      const result = calculateQualityScore('long_dwell', 95, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 5000)
      expect(result.newScore).toBe(100)
    })
  })

  describe('score boundaries', () => {
    test('score is always >= 0', () => {
      const result = calculateQualityScore('dislike', 0, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes)
      expect(result.newScore).toBeGreaterThanOrEqual(0)
    })

    test('score is always <= 100', () => {
      const result = calculateQualityScore('like', 100, baseArgs.userAge, baseArgs.positiveRate, baseArgs.recentLikes, 5000)
      expect(result.newScore).toBeLessThanOrEqual(100)
    })
  })
})

// ---------------------------------------------------------------------------
// getUserAge
// ---------------------------------------------------------------------------
describe('getUserAge', () => {
  test('returns 0 when createdAt is undefined', () => {
    expect(getUserAge(undefined)).toBe(0)
  })

  test('returns 0 when createdAt is today', () => {
    expect(getUserAge(new Date())).toBe(0)
  })

  test('returns 7 when createdAt is 7 days ago', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    expect(getUserAge(sevenDaysAgo)).toBe(7)
  })

  test('returns 30 when createdAt is 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    expect(getUserAge(thirtyDaysAgo)).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// getPositiveRate
// ---------------------------------------------------------------------------
describe('getPositiveRate', () => {
  test('returns 0.5 when user has no interactions', () => {
    const user: UserData = { uid: 'user1' }
    expect(getPositiveRate(user)).toBe(0.5)
  })

  test('returns 0.5 when stats exist but both counts are 0', () => {
    const user: UserData = {
      uid: 'user1',
      stats: { totalLikes: 0, totalDislikes: 0, totalViews: 0, totalLongDwells: 0 }
    }
    expect(getPositiveRate(user)).toBe(0.5)
  })

  test('returns 1.0 when all interactions are likes', () => {
    const user: UserData = {
      uid: 'user1',
      stats: { totalLikes: 10, totalDislikes: 0, totalViews: 0, totalLongDwells: 0 }
    }
    expect(getPositiveRate(user)).toBe(1.0)
  })

  test('returns 0.0 when all interactions are dislikes', () => {
    const user: UserData = {
      uid: 'user1',
      stats: { totalLikes: 0, totalDislikes: 10, totalViews: 0, totalLongDwells: 0 }
    }
    expect(getPositiveRate(user)).toBe(0.0)
  })

  test('returns correct ratio for mixed interactions', () => {
    const user: UserData = {
      uid: 'user1',
      stats: { totalLikes: 3, totalDislikes: 1, totalViews: 0, totalLongDwells: 0 }
    }
    expect(getPositiveRate(user)).toBe(0.75)
  })
})
