// tests/rate-limiter.test.ts

import { RateLimiter } from '@/services/rate-limiter'

const UID = 'test_user_001'
const ONE_HOUR_MS = 60 * 60 * 1000

function makeLimiter(maxRequests = 5) {
  return new RateLimiter({ maxRequests, windowMs: ONE_HOUR_MS })
}

beforeEach(() => {
  localStorage.clear()
  jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// check()
// ---------------------------------------------------------------------------
describe('RateLimiter.check()', () => {
  test('allows first request and returns remaining = maxRequests - 1', async () => {
    const limiter = makeLimiter(5)
    const result = await limiter.check(UID)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  test('allows requests up to the limit', async () => {
    const limiter = makeLimiter(3)
    await limiter.increment(UID)
    await limiter.increment(UID)

    const result = await limiter.check(UID)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  test('blocks request when limit is reached', async () => {
    const limiter = makeLimiter(3)
    await limiter.increment(UID)
    await limiter.increment(UID)
    await limiter.increment(UID)

    const result = await limiter.check(UID)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test('returns resetAt as a Date in the future', async () => {
    const limiter = makeLimiter(5)
    const result = await limiter.check(UID)

    expect(result.resetAt).toBeInstanceOf(Date)
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
  })

  test('includes retryAfter when limit is exceeded', async () => {
    const limiter = makeLimiter(1)
    await limiter.increment(UID)

    const result = await limiter.check(UID)
    expect(result.allowed).toBe(false)
    expect(typeof result.retryAfter).toBe('number')
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  test('resets after time window expires', async () => {
    const limiter = makeLimiter(2)
    await limiter.increment(UID)
    await limiter.increment(UID)

    // Block confirmed
    let result = await limiter.check(UID)
    expect(result.allowed).toBe(false)

    // Move time forward past the window
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_HOUR_MS + 1000)

    result = await limiter.check(UID)
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// increment()
// ---------------------------------------------------------------------------
describe('RateLimiter.increment()', () => {
  test('increments count on each call', async () => {
    const limiter = makeLimiter(10)

    await limiter.increment(UID)
    await limiter.increment(UID)
    await limiter.increment(UID)

    const stats = await limiter.getUserStats(UID)
    expect(stats.currentCount).toBe(3)
  })

  test('resets count when window has expired', async () => {
    const limiter = makeLimiter(10)
    await limiter.increment(UID)

    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_HOUR_MS + 1000)

    await limiter.increment(UID)
    const stats = await limiter.getUserStats(UID)
    expect(stats.currentCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getUserStats()
// ---------------------------------------------------------------------------
describe('RateLimiter.getUserStats()', () => {
  test('returns zero counts for new user', async () => {
    const limiter = makeLimiter(10)
    const stats = await limiter.getUserStats('brand_new_user')

    expect(stats.currentCount).toBe(0)
    expect(stats.totalRequests).toBe(0)
    expect(Array.isArray(stats.recentRequests)).toBe(true)
  })

  test('totalRequests grows with each increment', async () => {
    const limiter = makeLimiter(10)
    await limiter.increment(UID)
    await limiter.increment(UID)

    const stats = await limiter.getUserStats(UID)
    expect(stats.totalRequests).toBe(2)
  })

  test('windowEnd is windowStart + windowMs', async () => {
    const limiter = makeLimiter(10)
    await limiter.increment(UID)

    const stats = await limiter.getUserStats(UID)
    expect(stats.windowEnd - stats.windowStart).toBe(ONE_HOUR_MS)
  })
})

// ---------------------------------------------------------------------------
// getConfig()
// ---------------------------------------------------------------------------
describe('RateLimiter.getConfig()', () => {
  test('returns config values set in constructor', () => {
    const limiter = new RateLimiter({ maxRequests: 42, windowMs: 30000 })
    const config = limiter.getConfig()

    expect(config.maxRequests).toBe(42)
    expect(config.windowMs).toBe(30000)
  })

  test('returns a copy that cannot mutate internal config', () => {
    const limiter = makeLimiter(5)
    const config = limiter.getConfig()
    config.maxRequests = 999

    expect(limiter.getConfig().maxRequests).toBe(5)
  })
})
