export interface UserPreferences {
  interests: string[]
  style?: 'casual' | 'formal'
  language?: string
  createdAt?: Date
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