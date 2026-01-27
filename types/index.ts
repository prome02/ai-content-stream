// 統一平台類型定義

export type ContentStyleType = 'casual' | 'formal'
export type InteractionActionType = 'like' | 'dislike' | 'view' | 'long_dwell' | 'skip' | 'feedback' | 'keyword_click'

// 新的興趣分類（Google 新聞友好）
export type InterestCategory =
  | 'tech'      // 科技新知（原 ai, tech, science）
  | 'business'  // 商業財經
  | 'health'    // 健康生活（原 health, food）
  | 'travel'    // 旅遊探索
  | 'sports'    // 運動體育
  | 'fashion'   // 時尚潮流

export const INTEREST_CATEGORIES: Record<InterestCategory, {
  label: string
  keywords: string[]  // 用於 Google 新聞搜尋
}> = {
  tech: {
    label: '科技新知',
    keywords: ['科技', 'AI', '人工智慧', '軟體', '網路']
  },
  business: {
    label: '商業財經',
    keywords: ['商業', '財經', '股市', '投資', '經濟']
  },
  health: {
    label: '健康生活',
    keywords: ['健康', '養生', '醫療', '飲食', '運動健身']
  },
  travel: {
    label: '旅遊探索',
    keywords: ['旅遊', '旅行', '景點', '自由行', '出國']
  },
  sports: {
    label: '運動體育',
    keywords: ['運動', '體育', 'NBA', '棒球', '足球']
  },
  fashion: {
    label: '時尚潮流',
    keywords: ['時尚', '穿搭', '美妝', '潮流', '品牌']
  }
}

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