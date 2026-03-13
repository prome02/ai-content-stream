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
  keywords?: string[]         // 可點擊的關鍵字列表
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

export interface KeywordClickEvent {
  contentId: string
  keyword: string
  timestamp: Date
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
  interests?: string[]        // Client 直接傳遞興趣標籤（不再從 server 讀取）
  locale?: string             // BCP 47 locale (e.g. 'zh-TW', 'en-US'), detected from browser
  contentSettings?: ContentSettings  // 內容偏好設定
  userFeedback?: string       // 關鍵字點擊或用戶意見
}

export interface GenerateResponse {
  success: boolean
  contents?: ContentItem[]
  source?: 'ollama' | 'cache' | 'fallback' | 'mock'
  error?: string
  message?: string
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

// Content generation settings types
export type ToneType = 'casual' | 'professional' | 'friendly' | 'academic'
export type StyleType = 'narrative' | 'analytical' | 'conversational' | 'technical'
export type DepthType = 'brief' | 'moderate' | 'deep' | 'comprehensive'
export type LengthType = 'short' | 'medium' | 'long' | 'detailed'
export type TopicType = 'trending' | 'educational' | 'news' | 'opinion' | 'tutorial'
export type FreshnessType = 'latest' | 'recent' | 'timeless' | 'classic'

export interface ContentSettings {
  tone: ToneType
  style: StyleType
  depth: DepthType
  length: LengthType
  topic: TopicType
  freshness: FreshnessType
  autoInfiniteScroll: boolean
}

export const DEFAULT_CONTENT_SETTINGS: ContentSettings = {
  tone: 'casual',
  style: 'conversational',
  depth: 'moderate',
  length: 'medium',
  topic: 'trending',
  freshness: 'recent',
  autoInfiniteScroll: true,
}

// Labels for content settings (user-friendly, non-technical)
export const TONE_OPTIONS: Record<ToneType, { label: string; description: string }> = {
  casual: { label: '輕鬆聊天', description: '像朋友之間的對話' },
  professional: { label: '正式專業', description: '嚴謹的專業語氣' },
  friendly: { label: '親切溫暖', description: '有溫度的分享' },
  academic: { label: '學術研究', description: '引用數據與研究' },
}

export const STYLE_OPTIONS: Record<StyleType, { label: string; description: string }> = {
  narrative: { label: '說故事的方式', description: '用故事帶你認識主題' },
  analytical: { label: '分析討論', description: '深入剖析事件與觀點' },
  conversational: { label: '輕鬆對話', description: '像在聊天一樣自然' },
  technical: { label: '技術詳解', description: '聚焦技術細節與操作' },
}

export const DEPTH_OPTIONS: Record<DepthType, { label: string; description: string }> = {
  brief: { label: '快速瀏覽', description: '重點摘要，一目了然' },
  moderate: { label: '適中深度', description: '兼顧速度與深度' },
  deep: { label: '深入探討', description: '詳細分析，全面了解' },
  comprehensive: { label: '完整研究', description: '最深入的內容' },
}

export const LENGTH_OPTIONS: Record<LengthType, { label: string; description: string }> = {
  short: { label: '短篇', description: '2-3 分鐘閱讀' },
  medium: { label: '中篇', description: '5 分鐘閱讀' },
  long: { label: '長篇', description: '8 分鐘閱讀' },
  detailed: { label: '詳盡', description: '10 分鐘以上' },
}

export const TOPIC_OPTIONS: Record<TopicType, { label: string; description: string }> = {
  trending: { label: '最新趨勢', description: '當前最熱門的話題' },
  educational: { label: '學習知識', description: '增長見聞的內容' },
  news: { label: '新聞時事', description: '即時新聞報導' },
  opinion: { label: '觀點評論', description: '深度觀點與評論' },
  tutorial: { label: '教學指南', description: '實用的操作教學' },
}

export const FRESHNESS_OPTIONS: Record<FreshnessType, { label: string; description: string }> = {
  latest: { label: '今天的新鮮事', description: '最即時的內容' },
  recent: { label: '近期熱門', description: '最近幾天的內容' },
  timeless: { label: '永恆經典', description: '不受時間限制' },
  classic: { label: '經典回顧', description: '經過時間考驗的好文' },
}
