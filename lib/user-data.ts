export interface UserPreferences {
  interests: string[]
  style?: 'casual' | 'formal'
  language?: string
  createdAt?: Date
}

export interface UserFeedback {
  uid: string
  contentId: string
  feedbackText: string
  timestamp: Date
}

export interface KeywordClick {
  uid: string
  contentId: string
  keyword: string
  timestamp: Date
}

// LocalStorage 金鑰前綴
const STORAGE_PREFIX = 'aipcs_users_'

// 伺服器端記憶體快取（用於 API 路由）
const serverMemoryCache = new Map<string, any>()

/**
 * 檢查是否為瀏覽器環境（可使用 localStorage）
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * 儲存使用者偏好（興趣標籤）
 */
export async function saveUserPreferences(
  userId: string, 
  preferences: UserPreferences
): Promise<void> {
  try {
    console.log('儲存使用者偏好:', userId, preferences)
    
    const data = {
      preferences,
      createdAt: new Date().toISOString()
    }
    
    const key = `${STORAGE_PREFIX}${userId}`
    
    if (isBrowser()) {
      // 瀏覽器環境：使用 localStorage
      localStorage.setItem(key, JSON.stringify(data))
    } else {
      // 伺服器環境：使用記憶體快取
      serverMemoryCache.set(key, data)
    }
    
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 50))
    
  } catch (error) {
    console.error('儲存使用者偏好失敗:', error)
    throw error
  }
}

/**
 * 獲取使用者偏好
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  try {
    console.log('獲取使用者偏好:', userId)
    
    const key = `${STORAGE_PREFIX}${userId}`
    
    if (isBrowser()) {
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        if (data?.preferences) {
          return data.preferences
        }
      }
    } else {
      // 伺服器環境：從記憶體快取讀取
      const data = serverMemoryCache.get(key)
      if (data?.preferences) {
        return data.preferences
      }
    }
    
    // 如果是開發環境且沒有儲存資料，返回 null
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    
    return null
  } catch (error) {
    console.error('獲取使用者偏好失敗:', error)
    return null
  }
}

/**
 * 檢查使用者是否已選擇興趣
 */
export async function hasUserSelectedInterests(
  userId: string
): Promise<boolean> {
  const preferences = await getUserPreferences(userId)
  const interests = preferences?.interests
  return interests ? interests.length > 0 : false
}

/**
 * 儲存用戶文字意見
 */
export async function saveUserFeedback(feedback: UserFeedback): Promise<void> {
  try {
    console.log('[UserData] Saving feedback:', feedback.contentId, feedback.feedbackText.substring(0, 50) + '...')
    
    if (isBrowser()) {
      // 瀏覽器環境：使用 localStorage
      const key = `${STORAGE_PREFIX}feedback_${feedback.uid}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        ...feedback,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem(key, JSON.stringify(existing))
    } else {
      // 伺服器環境：使用記憶體快取
      const key = `${STORAGE_PREFIX}feedback_${feedback.uid}`
      const existing = serverMemoryCache.get(key) || []
      existing.push({
        ...feedback,
        timestamp: new Date().toISOString()
      })
      serverMemoryCache.set(key, existing)
    }
    
    console.log('[UserData] Feedback saved for user:', feedback.uid)
  } catch (error) {
    console.error('[UserData] Failed to save feedback:', error)
  }
}

/**
 * 儲存關鍵字點擊
 */
export async function saveKeywordClick(click: KeywordClick): Promise<void> {
  try {
    console.log('[UserData] Saving keyword click:', click.keyword)
    
    if (isBrowser()) {
      // 瀏覽器環境：使用 localStorage
      const key = `${STORAGE_PREFIX}keyword_clicks_${click.uid}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        ...click,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem(key, JSON.stringify(existing))
    } else {
      // 伺服器環境：使用記憶體快取
      const key = `${STORAGE_PREFIX}keyword_clicks_${click.uid}`
      const existing = serverMemoryCache.get(key) || []
      existing.push({
        ...click,
        timestamp: new Date().toISOString()
      })
      serverMemoryCache.set(key, existing)
    }
    
    console.log('[UserData] Keyword click saved:', click.keyword)
  } catch (error) {
    console.error('[UserData] Failed to save keyword click:', error)
  }
}

/**
 * 取得用戶最近的意見
 */
export async function getRecentFeedback(uid: string, count: number = 3): Promise<UserFeedback[]> {
  try {
    const key = `${STORAGE_PREFIX}feedback_${uid}`
    
    if (isBrowser()) {
      const stored = localStorage.getItem(key)
      if (stored) {
        const feedbacks = JSON.parse(stored)
        // 按時間戳排序，取最新的
        return feedbacks
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, count)
      }
    } else {
      const feedbacks = serverMemoryCache.get(key) || []
      return feedbacks
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, count)
    }
    
    return []
  } catch (error) {
    console.error('[UserData] Failed to get recent feedback:', error)
    return []
  }
}

/**
 * 取得用戶最近點擊的關鍵字
 */
export async function getRecentKeywordClicks(uid: string, count: number = 5): Promise<string[]> {
  try {
    const key = `${STORAGE_PREFIX}keyword_clicks_${uid}`
    
    if (isBrowser()) {
      const stored = localStorage.getItem(key)
      if (stored) {
        const clicks = JSON.parse(stored)
        // 按時間戳排序，取最新的關鍵字
        return clicks
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, count)
          .map((click: any) => click.keyword)
      }
    } else {
      const clicks = serverMemoryCache.get(key) || []
      return clicks
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, count)
        .map((click: any) => click.keyword)
    }
    
    return []
  } catch (error) {
    console.error('[UserData] Failed to get recent keyword clicks:', error)
    return []
  }
}

/**
 * 用戶行為統計（用於深度選擇）
 */
export interface UserBehaviorStats {
  avgDwellTime: number
  recentLikes: number
  recentDislikes: number
  recentSkips: number
  hasFeedback: boolean
  recentKeywords: string[]
  lastFeedback?: string
}

/**
 * 計算用戶最近的行為統計（基於 localStorage）
 */
export async function getUserBehaviorStats(uid: string): Promise<UserBehaviorStats> {
  try {
    // 從 localStorage 讀取互動記錄
    const interactions: any[] = []
    if (isBrowser()) {
      const stored = localStorage.getItem('aipcs_interaction_logs')
      if (stored) {
        const allInteractions = JSON.parse(stored)
        // 篩選最近 20 條該用戶的互動
        const userInteractions = allInteractions
          .filter((i: any) => i.contentId && i.uid === uid)
          .slice(0, 20)
        interactions.push(...userInteractions)
      }
    }
    
    // 統計各類型互動
    let totalDwellTime = 0
    let dwellTimeCount = 0
    let likes = 0
    let dislikes = 0
    let skips = 0
    
    interactions.forEach(interaction => {
      if (interaction.duration) {
        totalDwellTime += interaction.duration
        dwellTimeCount++
      }
      if (interaction.type === 'like') likes++
      if (interaction.type === 'dislike') dislikes++
      if (interaction.type === 'skip') skips++
    })
    
    // 取得最近的意見和關鍵字
    const recentFeedback = await getRecentFeedback(uid, 1)
    const recentKeywords = await getRecentKeywordClicks(uid, 5)
    
    return {
      avgDwellTime: dwellTimeCount > 0 ? totalDwellTime / dwellTimeCount : 10000,
      recentLikes: likes,
      recentDislikes: dislikes,
      recentSkips: skips,
      hasFeedback: recentFeedback.length > 0,
      recentKeywords,
      lastFeedback: recentFeedback[0]?.feedbackText
    }
    
  } catch (error) {
    console.error('[UserData] Failed to get behavior stats:', error)
    return {
      avgDwellTime: 10000,
      recentLikes: 0,
      recentDislikes: 0,
      recentSkips: 0,
      hasFeedback: false,
      recentKeywords: []
    }
  }
}