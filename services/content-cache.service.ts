import type { ContentItem } from '@/types'

// 簡易的記憶體快取 (Layer 1)
class MemoryCache {
  private cache = new Map<string, ContentItem[]>()

  // 儲存 60 分鐘
  set(userId: string, contents: ContentItem[]): void {
    this.cache.set(userId, contents)
    
    // 自動清理
    setTimeout(() => {
      this.cache.delete(userId)
    }, 60 * 60 * 1000)
  }

  get(userId: string): ContentItem[] | null {
    return this.cache.get(userId) || null
  }

  // 檢查使用者是否看過特定內容
  hasSeen(userId: string, contentId: string): boolean {
    const cached = this.cache.get(userId)
    if (!cached) return false
    
    return cached.some(item => item.id === contentId)
  }

  clear(): void {
    this.cache.clear()
  }
}

// localStorage 快取 (Layer 2)
class LocalStorageCache {
  private CACHE_PREFIX = 'aipcs_cache_'
  private TTL = 30 * 60 * 1000  // 30分鐘

  set(userId: string, contents: ContentItem[]): void {
    try {
      const key = `${this.CACHE_PREFIX}${userId}`
      const cacheEntry = {
        contents,
        timestamp: Date.now(),
        userId
      }
      localStorage.setItem(key, JSON.stringify(cacheEntry))
    } catch (error) {
      console.warn('LocalStorage cache 寫入失敗:', error)
    }
  }

  get(userId: string): ContentItem[] | null {
    try {
      const key = `${this.CACHE_PREFIX}${userId}`
      const cached = localStorage.getItem(key)
      
      if (!cached) return null
      
      const entry = JSON.parse(cached)
      
      // 檢查是否過期
      if (Date.now() - entry.timestamp > this.TTL) {
        this.clear(userId)
        return null
      }
      
      // 檢查使用者匹配
      if (entry.userId !== userId) {
        this.clear(userId)
        return null
      }
      
      return entry.contents
    } catch (error) {
      console.warn('LocalStorage cache 讀取失敗:', error)
      return null
    }
  }

  clear(userId: string): void {
    localStorage.removeItem(`${this.CACHE_PREFIX}${userId}`)
  }

  // 清理所有過期快取
  cleanup(): void {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const entry = JSON.parse(cached)
            if (now - entry.timestamp > this.TTL) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          // 無效的 JSON, 直接刪除
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

// 端對端快取服務
export class ContentCacheService {
  private memoryCache: MemoryCache
  private localStorageCache: LocalStorageCache
  private mockContent: ContentItem[]  // 用於降級的模擬內容

  constructor() {
    this.memoryCache = new MemoryCache()
    this.localStorageCache = new LocalStorageCache()
    this.mockContent = require('@/lib/mock-data').MOCK_CONTENT_ITEMS
  }

  /**
   * 為使用者獲取緩存內容，優先順序：記憶體 → localStorage → 降級內容
   */
  async getContentForUser(
    userId: string,
    count: number = 10,
    interests: string[] = []
  ): Promise<ContentItem[]> {
    console.log('🔍 查詢快取內容:', userId, interests)

    // 1. 檢查記憶體快取
    const memoryContents = this.memoryCache.get(userId)
    if (memoryContents && memoryContents.length >= count) {
      console.log('⚡ 從記憶體快取返回')
      return memoryContents.slice(0, count)
    }

    // 2. 檢查 localStorage 快取
    const localStorageContents = this.localStorageCache.get(userId)
    if (localStorageContents && localStorageContents.length >= count) {
      console.log('📦 從 localStorage 快取返回')
      // 同時更新記憶體快取
      this.memoryCache.set(userId, localStorageContents)
      return localStorageContents.slice(0, count)
    }

    // 3. 從現有內容篩選符合興趣的內容
    const filteredByInterest = this.filterByInterests(
      this.mockContent,
      interests,
      userId
    )

    if (filteredByInterest.length >= count) {
      console.log('🎯 從模擬數據篩選興趣內容')
      const result = filteredByInterest.slice(0, count)
      this.updateCache(userId, result)
      return result
    }

    // 4. 降級：返回隨機模擬內容
    console.log('⚠️ 使用降級內容')
    const fallbackContent = this.getFallbackContent(userId, count)
    return fallbackContent
  }

  /**
   * 根據興趣篩選內容
   */
  private filterByInterests(
    contents: ContentItem[],
    interests: string[],
    excludeUserId: string
  ): ContentItem[] {
    if (interests.length === 0) {
      return contents.slice(0, 10)
    }

    return contents
      .filter(content => {
        // 檢查使用者是否看過
        if (content.usedBy?.includes(excludeUserId)) {
          return false
        }

        // 興趣匹配度
        const interestScore = content.topics.reduce((score, topic) => {
          if (interests.some(interest => 
            topic.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(topic.toLowerCase())
          )) {
            return score + 1
          }
          return score
        }, 0)

        // 品質分數
        const qualityScore = content.qualityScore

        // 綜合評分
        return interestScore > 0 && qualityScore >= 60
      })
      .sort((a, b) => {
        // 優先：興趣匹配度 → 品質分數 → 新舊程度
        const aInterestScore = a.topics.filter(t => 
          interests.some(i => t.toLowerCase().includes(i.toLowerCase()))
        ).length
        const bInterestScore = b.topics.filter(t => 
          interests.some(i => t.toLowerCase().includes(i.toLowerCase()))
        ).length

        if (aInterestScore !== bInterestScore) {
          return bInterestScore - aInterestScore
        }

        if (a.qualityScore !== b.qualityScore) {
          return b.qualityScore - a.qualityScore
        }

        return b.generatedAt.getTime() - a.generatedAt.getTime()
      })
  }

  /**
   * 獲取降級內容
   */
  private getFallbackContent(userId: string, count: number): ContentItem[] {
    return this.mockContent
      .filter(content => !this.memoryCache.hasSeen(userId, content.id))
      .slice(0, count)
      .map(content => ({
        ...content,
        generatedAt: new Date(content.generatedAt)
      }))
  }

  /**
   * 更新快取
   */
  private updateCache(userId: string, contents: ContentItem[]): void {
    // 記憶體快取
    this.memoryCache.set(userId, contents)
    
    // localStorage 快取 (非同步)
    setTimeout(() => {
      this.localStorageCache.set(userId, contents)
    }, 0)
  }

  /**
   * 儲存新生成的內容
   */
  async saveGeneratedContent(
    userId: string,
    contents: ContentItem[]
  ): Promise<void> {
    // 標記為已使用
    const markedContents = contents.map(content => ({
      ...content,
      usedBy: [...(content.usedBy || []), userId],
      reuseCount: (content.reuseCount || 0) + 1
    }))

    // 更新快取
    const cached = this.memoryCache.get(userId) || []
    const updatedCache = [...markedContents, ...cached]
    
    // 快取最多保留 25 個內容
    if (updatedCache.length > 25) {
      updatedCache.length = 25
    }

    this.memoryCache.set(userId, updatedCache)
    setTimeout(() => this.localStorageCache.set(userId, updatedCache), 0)

    console.log('💾 儲存內容到快取:', userId, markedContents.length)
  }

  /**
   * 更新內容品質分數
   */
  async updateQualityScore(
    contentId: string,
    action: 'like' | 'dislike'
  ): Promise<void> {
    console.log('📈 更新品質分數:', contentId, action)
    
    // 這裡實際上應該更新 Firestore，目前只記錄
    const qualityChange = action === 'like' ? '+5' : '-8'
    console.log(`品質分數調整: ${contentId} ${qualityChange}`)
  }

  /**
   * 清理過期快取
   */
  cleanup(): void {
    console.log('🧹 清理快取系統')
    this.localStorageCache.cleanup()
    
    // 定期清理記憶體快取
    setInterval(() => {
      this.memoryCache.clear()
      console.log('已清理記憶體快取')
    }, 2 * 60 * 60 * 1000)  // 每 2 小時
  }

  /**
   * 獲取更新統計
   */
  getStats(): Record<string, any> {
    // 統計快取效能
    return {
      memoryCacheSize: 0,  // 需要實作
      localStorageCacheSize: this.getLocalStorageCacheSize(),
      mockContentCount: this.mockContent.length
    }
  }

  private getLocalStorageCacheSize(): number {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('aipcs_cache_')) {
        count++
      }
    }
    return count
  }
}

// 預設匯出
export default new ContentCacheService()