// 統一平台類型定義

export type ContentStyleType = 'casual' | 'formal'
export type InteractionActionType = 'like' | 'dislike' | 'view' | 'long_dwell'

export interface ContentItem {
  id: string
  content: string
  hashtags: string[]
  topics: string[]
  generatedAt: Date | string   // API 回傳可能是字串
  style: ContentStyleType
  likes: number
  dislikes: number
  qualityScore: number
  usedBy: string[]            // 使用過此內容的使用者 ID
  reuseCount: number          // 重複使用次數
  metadata?: {
    source?: string          // 'ollama' | 'cache' | 'fallback' | 'mock'
    cached?: boolean
  }
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
  preferences?: {
    interests: string[]
    language?: string
    style?: ContentStyleType
  }
}

export interface GenerateRequest {
  uid: string
  count?: number              // 生成數量 (default: 3, max: 10)
  mode?: 'default' | 'creative' | 'focused'
}

export interface GenerateResponse {
  success: boolean
  contents: ContentItem[]
  source: 'ollama' | 'cache' | 'fallback' | 'mock'
  cachedCount?: number
  generationTime?: number
  rateLimit?: {
    remaining: number
    resetAt: string
  }
  warning?: string
}

export interface InteractionData {
  contentId: string
  uid: string
  action: InteractionActionType
  dwellTime?: number
  scrollDepth?: number
  timestamp: Date
}