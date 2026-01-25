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
  hourlyCount: number
  lastResetHour: number          // 0-23 的小時數
  history: Array<{
    timestamp: number            // 請求時間戳
    endpoint: string             // API 端點
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
   * 檢查是否允許請求
   */
  async check(uid: string): Promise<RateLimitResult> {
    try {
      console.log(`🔐 檢查 rate limit: ${uid}`)

      // 取得使用者記錄
      const record = await this.getUserRecord(uid)
      const currentHour = new Date().getHours()

      // 檢查是否需要重置
      if (record.lastResetHour !== currentHour) {
        console.log(`🔄 重置 rate limit (新小時開始)`)
        await this.resetUserRecord(uid, currentHour)
        return this.createResult(true, this.config.maxRequests - 1)
      }

      // 檢查是否超過限制
      if (record.hourlyCount >= this.config.maxRequests) {
        console.log(`🚫 Rate limit 超出: ${uid} (${record.hourlyCount}/${this.config.maxRequests})`)
        return this.createLimitExceededResult()
      }

      // 允許請求
      const remaining = this.config.maxRequests - record.hourlyCount - 1
      console.log(`✅ 允許請求: ${uid} (${record.hourlyCount}/${this.config.maxRequests})`)
      return this.createResult(true, remaining)
    } catch (error) {
      console.error('Rate limit 檢查失敗:', error)
      // 失敗時允許請求 (避免阻擋合法使用者)
      return this.createResult(true, this.config.maxRequests)
    }
  }

  /**
   * 遞增請求計數
   */
  async increment(uid: string, endpoint: string = '/api/generate'): Promise<void> {
    try {
      const record = await this.getUserRecord(uid)
      const currentHour = new Date().getHours()

      // 如果進入新小時，重置計數
      if (record.lastResetHour !== currentHour) {
        await this.resetUserRecord(uid, currentHour)
        return
      }

      // 更新記錄
      record.hourlyCount++
      record.history.push({
        timestamp: Date.now(),
        endpoint
      })

      // 只保留最近 50 筆記錄
      if (record.history.length > 50) {
        record.history = record.history.slice(-50)
      }

      await this.saveUserRecord(uid, record)
      console.log(`📈 Rate limit 更新: ${uid} (${record.hourlyCount}/${this.config.maxRequests})`)

    } catch (error) {
      console.error('Rate limit 遞增失敗:', error)
    }
  }

  /**
   * 獲取使用者統計
   */
  async getUserStats(uid: string): Promise<{
    hourlyCount: number
    totalRequests: number
    recentRequests: number[]
  }> {
    const record = await this.getUserRecord(uid)
    const currentHour = new Date().getHours()

    // 計算最近一小時的請求
    const oneHourAgo = Date.now() - this.config.windowMs
    const recentRequests = record.history
      .filter(req => req.timestamp > oneHourAgo)
      .map(req => req.timestamp)

    return {
      hourlyCount: currentHour === record.lastResetHour ? record.hourlyCount : 0,
      totalRequests: record.history.length,
      recentRequests
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
        // 瀏覽器環境：使用 localStorage
        const stored = localStorage.getItem(storageKey)

        if (stored) {
          const record = JSON.parse(stored) as RateLimitRecord
          
          // 驗證記錄格式
          if (this.isValidRecord(record)) {
            return record
          }
        }
      } else {
        // 伺服器環境：使用記憶體快取
        const record = this.memoryCache.get(storageKey)
        if (record && this.isValidRecord(record)) {
          return record
        }
      }

      // 建立新記錄
      const currentHour = new Date().getHours()
      return {
        uid,
        hourlyCount: 0,
        lastResetHour: currentHour,
        history: []
      }

    } catch (error) {
      console.warn('讀取 rate limit 記錄失敗，建立新記錄:', error)
      return this.createNewRecord(uid)
    }
  }

  private async saveUserRecord(uid: string, record: RateLimitRecord): Promise<void> {
    try {
      const storageKey = `${this.storagePrefix}${uid}`
      
      if (this.isBrowser()) {
        // 瀏覽器環境：使用 localStorage
        localStorage.setItem(storageKey, JSON.stringify(record))
      } else {
        // 伺服器環境：使用記憶體快取
        this.memoryCache.set(storageKey, record)
      }
    } catch (error) {
      console.error('儲存 rate limit 記錄失敗:', error)
    }
  }

  private async resetUserRecord(uid: string, currentHour: number): Promise<void> {
    const record: RateLimitRecord = {
      uid,
      hourlyCount: 0,
      lastResetHour: currentHour,
      history: []
    }
    await this.saveUserRecord(uid, record)
  }

  private isValidRecord(record: any): record is RateLimitRecord {
    return (
      record &&
      typeof record.uid === 'string' &&
      typeof record.hourlyCount === 'number' &&
      typeof record.lastResetHour === 'number' &&
      Array.isArray(record.history) &&
      record.lastResetHour >= 0 && record.lastResetHour <= 23
    )
  }

  private createNewRecord(uid: string): RateLimitRecord {
    const currentHour = new Date().getHours()
    return {
      uid,
      hourlyCount: 0,
      lastResetHour: currentHour,
      history: []
    }
  }

  private createResult(allowed: boolean, remaining: number): RateLimitResult {
    const resetAt = this.getNextResetTime()
    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt,
      ...(!allowed && { retryAfter: this.calculateRetryAfter() })
    }
  }

  private createLimitExceededResult(): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetAt: this.getNextResetTime(),
      retryAfter: this.calculateRetryAfter()
    }
  }

  private getNextResetTime(): Date {
    const now = new Date()
    const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0))
    return nextHour
  }

  private calculateRetryAfter(): number {
    const now = new Date()
    const minutesUntilNextHour = 60 - now.getMinutes()
    const secondsUntilNextHour = minutesUntilNextHour * 60 - now.getSeconds()
    return secondsUntilNextHour
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
      console.error('Rate limit middleware 錯誤:', error)
      // 失敗時允許繼續執行，避免阻擋合法請求
      return handler(...args)
    }
  }
}

// 預設實例
export const defaultRateLimiter = new RateLimiter()