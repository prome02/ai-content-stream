export type InteractionAction = 'like' | 'dislike' | 'view' | 'long_dwell'

export interface ContentItem {
  id: string
  content: string
  hashtags: string[]
  emojis: string[]
  topics: string[]
  generatedAt: Date
  style: 'casual' | 'formal'
  likes: number
  dislikes: number
  qualityScore: number
  usedBy?: string[]
  reuseCount?: number
  metadata?: {
    source?: string
    cached?: boolean
  }
}

export interface ContentItemForCache extends ContentItem {
  usedBy: string[]
  reuseCount: number
}

export interface QualityScoreResult {
  newScore: number
  reason: string
}

export interface UserData {
  uid: string
  createdAt?: Date
  stats?: {
    totalLikes: number
    totalDislikes: number
    totalViews: number
    totalLongDwells: number
  }
}

/**
 * 計算品質分數
 */
export function calculateQualityScore(
  action: InteractionAction,
  currentScore: number,
  userAge: number,        // 帳號天數
  positiveRate: number,     // 正評比 = likes / (likes + dislikes)
  recentLikes: number,      // 最近 1 小時內點讚次數
  dwellTime?: number
): QualityScoreResult {
  
  const weight = getUserWeight(userAge, positiveRate, recentLikes)
  
  let delta = 0
  
  switch (action) {
    case 'like':
      delta = 5 * weight
      if (dwellTime && dwellTime > 3000) delta += 8
      if (recentLikes > 5) delta += 2  // 活躍用戶加分
      break
      
    case 'dislike':
      delta = -8 * weight
      break
      
    case 'view':
      delta = 1 * weight
      break
      
    case 'long_dwell':
      if (dwellTime && dwellTime > 3000) {
        // 基礎 8 分 + 額外每秒 0.003 分
        const extraScore = Math.min(10, (dwellTime - 3000) * 0.003)
        delta = 8 + extraScore
      }
      break
  }
  
  return {
    newScore: Math.max(0, Math.min(100, currentScore + delta)),
    reason: getReason(action, weight, dwellTime)
  }
}

/**
 * 計算使用者權重
 */
export function getUserWeight(userAge: number, positiveRate: number, recentLikes: number): number {
  let weight = 1.0
  
  // 新用戶降權 (7 天內權重較低)
  const ageFactor = Math.min(1, userAge / 7)
  weight *= ageFactor
  
  // 高評比用戶加權 (0.7-1.2)
  const repFactor = 0.7 + (Math.min(0.5, positiveRate))
  weight *= repFactor
  
  // 超活使用者加分 (最近 1 小時 5 次點讚)
  if (recentLikes >= 5) {
    weight *= 1.2
  }
  
  return weight
}

function getReason(action: string, weight: number, dwellTime?: number): string {
  if (action === 'like') {
    return "點讚: +5 × " + weight.toFixed(2)
  }
  if (action === 'dislike') {
    return `不讚: -8 × ${weight.toFixed(2)}`
  }
  if (action === 'long_dwell') {
    const extra = dwellTime && dwellTime > 3000 
      ? Math.floor((dwellTime - 3000) / 1000) * 0.003
      : 0
    return `停留: 8 + ${extra} = ${weight.toFixed(2)}`
  }
  return "參與: +1 × " + weight.toFixed(2)
}

/**
 * 獲取使用者帳號年齡（天數）
 */
export function getUserAge(createdAt?: Date): number {
  if (!createdAt) return 0
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * 計算正評率
 */
export function getPositiveRate(userData: UserData): number {
  const totalLikes = userData?.stats?.totalLikes || 0
  const totalDislikes = userData?.stats?.totalDislikes || 0
  const total = totalLikes + totalDislikes
  return total > 0 ? totalLikes / total : 0.5
}

/**
 * 模擬獲取最近點讚次數
 */
export function getRecentLikes(uid: string, hours: number = 1): number {
  // 模擬：返回隨機數（0-10）
  return Math.floor(Math.random() * 10)
}

/**
 * 模擬獲取使用者資料
 */
export function getUserData(uid: string): UserData {
  // 從 localStorage 讀取使用者資料
  try {
    const userData = JSON.parse(localStorage.getItem(`aipcs_users_${uid}`) || '{}')
    return { uid, ...userData }
  } catch (error) {
    return { uid, createdAt: new Date() }
  }
}

/**
 * 模擬更新使用者統計
 */
export function updateUserStats(uid: string, action: string): void {
  // 模擬更新使用者統計
  try {
    const userData = JSON.parse(localStorage.getItem(`aipcs_users_${uid}`) || '{}')
    
    if (!userData.stats) {
      userData.stats = {
        totalLikes: 0,
        totalDislikes: 0,
        totalViews: 0,
        totalLongDwells: 0
      }
    }
    
    switch (action) {
      case 'like':
        userData.stats.totalLikes++
        break
      case 'dislike':
        userData.stats.totalDislikes++
        break
      case 'view':
        userData.stats.totalViews++
        break
      case 'long_dwell':
        userData.stats.totalLongDwells++
        break
    }
    
    localStorage.setItem(`aipcs_users_${uid}`, JSON.stringify(userData))
  } catch (error) {
    console.warn('更新使用者統計失敗:', error)
  }
}

/**
 * 更新本地儲存的分數
 */
export function updateLocalStorageScore(contentId: string, newScore: number): void {
  try {
    // 更新 localStorage 中的快取內容
    const cacheKey = 'aipcs_feed_content_'
    const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}')
    
    // 更新對應內容的分數
    if (cached[contentId]) {
      cached[contentId].qualityScore = newScore
      
      localStorage.setItem(cacheKey, JSON.stringify(cached))
    }
  } catch (error) {
    console.warn('更新本地分數失敗:', error)
  }
}