interface RateLimitConfig {
  maxRequests: number           // 每小時最大請求數 (default: 20)
  windowMs: number              // 時間窗口 (default: 1 小時)
  message?: string              // 超過限制時顯示的訊息
}

interface RateLimitResult {
  allowed: boolean              // 是否允許請求
  remaining: number             // 剩餘請求次數
  resetAt: Date                 // 重置時間
  retryAfter?: number           // 重試等待秒數
}

interface RateLimitRecord {
  uid: string
  count: number                  // Current window request count
  windowStart: number            // Window start timestamp (ms)
  history: Array<{
    timestamp: number            // Request timestamp
    endpoint: string             // API endpoint
  }>
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,    // 1 小時
    message: '每小時生成限制已達上限，請稍後再試'
  }

  private config: RateLimitConfig
  private storagePrefix = 'aipcs_ratelimit_'
  
  // 記憶體快取用於伺服器端環境（無 localStorage 時使用）
  private memoryCache = new Map<string, RateLimitRecord>()

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...RateLimiter.DEFAULT_CONFIG, ...config }
  }

  /**
   * 獲取當前配置 (為了外部訪問)
   */
  getConfig(): RateLimitConfig {
    return { ...this.config } // 返回副本，避免外部修改
  }

  /**
   * Check if request is allowed
   */
  async check(uid: string): Promise<RateLimitResult> {
    try {
      console.log(`[RateLimit] Checking: ${uid}`)

      // Get user record
      const record = await this.getUserRecord(uid)
      const now = Date.now()

      // Check if window has expired (using timestamp sliding window)
      const windowExpired = now - record.windowStart > this.config.windowMs
      if (windowExpired) {
        console.log(`[RateLimit] Window expired, resetting`)
        await this.resetUserRecord(uid, now)
        return this.createResult(true, this.config.maxRequests - 1)
      }

      // Check if limit exceeded
      if (record.count >= this.config.maxRequests) {
        console.log(`[RateLimit] Limit exceeded: ${uid} (${record.count}/${this.config.maxRequests})`)
        return this.createLimitExceededResult(record.windowStart)
      }

      // Allow request
      const remaining = this.config.maxRequests - record.count - 1
      console.log(`[RateLimit] Allowed: ${uid} (${record.count}/${this.config.maxRequests})`)
      return this.createResult(true, remaining, record.windowStart)
    } catch (error) {
      console.error('[RateLimit] Check failed:', error)
      // Allow request on failure (avoid blocking legitimate users)
      return this.createResult(true, this.config.maxRequests)
    }
  }

  /**
   * Increment request count
   */
  async increment(uid: string, endpoint: string = '/api/generate'): Promise<void> {
    try {
      const record = await this.getUserRecord(uid)
      const now = Date.now()

      // If window expired, reset count
      const windowExpired = now - record.windowStart > this.config.windowMs
      if (windowExpired) {
        await this.resetUserRecord(uid, now)
        return
      }

      // Update record
      record.count++
      record.history.push({
        timestamp: now,
        endpoint
      })

      // Keep only last 50 records
      if (record.history.length > 50) {
        record.history = record.history.slice(-50)
      }

      await this.saveUserRecord(uid, record)
      console.log(`[RateLimit] Updated: ${uid} (${record.count}/${this.config.maxRequests})`)

    } catch (error) {
      console.error('[RateLimit] Increment failed:', error)
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(uid: string): Promise<{
    currentCount: number
    totalRequests: number
    recentRequests: number[]
    windowStart: number
    windowEnd: number
  }> {
    const record = await this.getUserRecord(uid)
    const now = Date.now()

    // Calculate requests in current window
    const windowExpired = now - record.windowStart > this.config.windowMs
    const recentRequests = record.history
      .filter(req => req.timestamp > now - this.config.windowMs)
      .map(req => req.timestamp)

    return {
      currentCount: windowExpired ? 0 : record.count,
      totalRequests: record.history.length,
      recentRequests,
      windowStart: record.windowStart,
      windowEnd: record.windowStart + this.config.windowMs
    }
  }

  // ============================
  // 私有方法
  // ============================

  // 檢查是否為瀏覽器環境（可使用 localStorage）
  private isBrowser(): boolean {
    // Safely determine if running in a browser environment without causing ReferenceError
    // `typeof` on an undeclared identifier throws ReferenceError, so we check via `globalThis`
    // which is defined in both Node and browsers.
    const hasWindow = typeof (globalThis as any).window !== 'undefined';
    const hasLocalStorage = typeof (globalThis as any).localStorage !== 'undefined';
    return hasWindow && hasLocalStorage;
  }

  private async getUserRecord(uid: string): Promise<RateLimitRecord> {
    try {
      const storageKey = `${this.storagePrefix}${uid}`

      if (this.isBrowser()) {
        // Browser environment: use localStorage
        const stored = localStorage.getItem(storageKey)

        if (stored) {
          const record = JSON.parse(stored) as RateLimitRecord

          // Validate record format
          if (this.isValidRecord(record)) {
            return record
          }
        }
      } else {
        // Server environment: use memory cache
        const record = this.memoryCache.get(storageKey)
        if (record && this.isValidRecord(record)) {
          return record
        }
      }

      // Create new record
      return this.createNewRecord(uid)

    } catch (error) {
      console.warn('[RateLimit] Failed to read record, creating new:', error)
      return this.createNewRecord(uid)
    }
  }

  private async saveUserRecord(uid: string, record: RateLimitRecord): Promise<void> {
    try {
      const storageKey = `${this.storagePrefix}${uid}`

      if (this.isBrowser()) {
        // Browser environment: use localStorage
        localStorage.setItem(storageKey, JSON.stringify(record))
      } else {
        // Server environment: use memory cache
        this.memoryCache.set(storageKey, record)
      }
    } catch (error) {
      console.error('[RateLimit] Failed to save record:', error)
    }
  }

  private async resetUserRecord(uid: string, windowStart: number): Promise<void> {
    const record: RateLimitRecord = {
      uid,
      count: 0,
      windowStart,
      history: []
    }
    await this.saveUserRecord(uid, record)
  }

  private isValidRecord(record: any): record is RateLimitRecord {
    return (
      record &&
      typeof record.uid === 'string' &&
      typeof record.count === 'number' &&
      typeof record.windowStart === 'number' &&
      Array.isArray(record.history)
    )
  }

  private createNewRecord(uid: string): RateLimitRecord {
    return {
      uid,
      count: 0,
      windowStart: Date.now(),
      history: []
    }
  }

  private createResult(allowed: boolean, remaining: number, windowStart?: number): RateLimitResult {
    const resetAt = this.getNextResetTime(windowStart)
    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt,
      ...(!allowed && { retryAfter: this.calculateRetryAfter(windowStart) })
    }
  }

  private createLimitExceededResult(windowStart: number): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.getNextResetTime(windowStart),
      retryAfter: this.calculateRetryAfter(windowStart)
    }
  }

  private getNextResetTime(windowStart?: number): Date {
    if (windowStart) {
      // Calculate reset time based on window start + window duration
      return new Date(windowStart + this.config.windowMs)
    }
    // Fallback: reset at next hour boundary
    const now = new Date()
    return new Date(now.getTime() + this.config.windowMs)
  }

  private calculateRetryAfter(windowStart?: number): number {
    if (windowStart) {
      // Calculate seconds until window expires
      const windowEnd = windowStart + this.config.windowMs
      const secondsRemaining = Math.ceil((windowEnd - Date.now()) / 1000)
      return Math.max(0, secondsRemaining)
    }
    // Fallback: return full window duration in seconds
    return Math.ceil(this.config.windowMs / 1000)
  }
}

/**
 * API 端點 Middleware 函數
 */
export function withRateLimit(
  handler: Function,
  options: Partial<RateLimitConfig> = {}
) {
  return async function wrappedHandler(...args: any[]) {
    const [req] = args
    const limiter = new RateLimiter(options)

    try {
      // 從請求中獲取 uid
      const body = await req.json()
      const { uid } = body

      if (!uid) {
        return new Response(
          JSON.stringify({ 
            error: '缺少 uid 參數',
            message: '無法執行 rate limit 檢查' 
          }),
          { status: 400 }
        )
      }

      // 檢查 rate limit
      const result = await limiter.check(uid)

      // 設定回應標頭
      const limiterConfig = limiter.getConfig()
      const headers = {
        'X-RateLimit-Limit': limiterConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
        ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() })
      }

      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: limiterConfig.message,
            retryAfter: result.retryAfter,
            resetAt: result.resetAt.toISOString()
          }),
          { 
            status: 429,
            headers
          }
        )
      }

      // 繼續執行原處理函數
      const response = await handler(...args)

      // 遞增計數
      await limiter.increment(uid, req.url)

      // 將 headers 加到回應
      if (response instanceof Response) {
        const newHeaders = new Headers(response.headers)
        Object.entries(headers).forEach(([key, value]) => {
          newHeaders.set(key, value)
        })

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        })
      }

      return response

    } catch (error) {
      console.error('[RateLimit] Middleware error:', error)
      // 失敗時允許繼續執行，避免阻擋合法請求
      return handler(...args)
    }
  }
}

// 預設實例
export const defaultRateLimiter = new RateLimiter()