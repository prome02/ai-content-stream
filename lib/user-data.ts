export interface UserPreferences {
  interests: string[]
  style?: 'casual' | 'formal'
  language?: string
  createdAt?: Date
}

// LocalStorage 金鑰前綴
const STORAGE_PREFIX = 'aipcs_users_'

/**
 * 儲存使用者偏好（興趣標籤）
 */
export async function saveUserPreferences(
  userId: string, 
  preferences: UserPreferences
): Promise<void> {
  try {
    console.log('💾 儲存使用者偏好到 localStorage:', userId, preferences)
    
    const data = {
      preferences,
      createdAt: new Date().toISOString()
    }
    
    // 儲存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(data))
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
    console.log('📥 從 localStorage 獲取使用者偏好:', userId)
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
      if (stored) {
        const data = JSON.parse(stored)
        if (data?.preferences) {
          return data.preferences
        }
      }
    }
    
    // 如果是開發環境且沒有儲存資料，返回預設值
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 開發環境：返回預設模擬偏好')
      return {
        interests: [],
        language: 'zh-TW',
        style: 'casual',
        createdAt: new Date()
      }
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