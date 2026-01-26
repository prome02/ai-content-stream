'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import ContentCard from '@/app/components/ContentCard'
import ABTestingStatus from '@/components/ABTestingStatus'
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import { getUserPreferences } from '@/lib/user-data'
import { Home, User, RefreshCw, Filter, Loader2, Sparkles, Zap, BarChart3 } from 'lucide-react'
import type { ContentItem } from '@/types'

// Feed API 函數 - 調用真實的生成 API
async function fetchFeedContent(userId: string, count: number = 10): Promise<ContentItem[]> {
  try {
    console.log(`📦 請求 Feed 內容: ${userId}, ${count} 則`)

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, count })
    })

    if (!response.ok) {
      console.warn('API 生成失敗，使用模擬資料')
      return MOCK_CONTENT_ITEMS.slice(0, count)
    }

    const data = await response.json()

    if (data.success) {
      console.log(`✅ 成功生成 ${data.contents?.length || 0} 則內容 (來源: ${data.source})`)
      return data.contents || []
    }

    return MOCK_CONTENT_ITEMS.slice(0, count)

  } catch (error) {
    console.error('Feed 內容載入失敗:', error)
    return MOCK_CONTENT_ITEMS.slice(0, count)
  }
}

// 模擬主題標籤（從興趣生成）
function getUserHashtags(interests: string[]): string[] {
  if (interests.length === 0) return ['#探索', '#新發現']

  return interests.map(interest => {
    switch (interest) {
      case 'ai': return '#人工智慧'
      case 'tech': return '#科技趨勢'
      case 'learning': return '#學習成長'
      case 'business': return '#創業投資'
      case 'health': return '#健康生活'
      case 'travel': return '#旅行探索'
      case 'food': return '#美食探索'
      case 'music': return '#音樂藝術'
      case 'movies': return '#影視娛樂'
      case 'anime': return '#動漫文化'
      case 'sports': return '#運動健身'
      case 'games': return '#遊戲電競'
      case 'design': return '#設計美學'
      case 'science': return '#科學探索'
      case 'fashion': return '#時尚潮流'
      default: return `#${interest}`
    }
  })
}

// 輔助函數
function getContentSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'ollama': 'text-green-500',
    'cache': 'text-blue-500',
    'fallback': 'text-orange-500',
    'mock': 'text-gray-400'
  }
  return colors[source] || 'text-gray-400'
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'ollama': 'Ollama Local',
    'cache': '內容快取',
    'fallback': '降級模式',
    'mock': '模擬資料'
  }
  return labels[source] || '未知來源'
}

export default function FeedPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [feedItems, setFeedItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [userHashtags, setUserHashtags] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<'personalized' | 'trending'>('personalized')
  const [contentSource, setContentSource] = useState<'cache' | 'ollama' | 'fallback' | 'mock'>('cache')
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetAt: string } | null>(null)
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // 使用 ref 追蹤載入狀態，避免閉包問題
  const isLoadingRef = useRef(false)
  const pageRef = useRef(1)

  const loadFeed = useCallback(async (isInitial = false) => {
    if (!user) return

    // 防止重複調用
    if (isLoadingRef.current) {
      console.log('Already loading, skipping...')
      return
    }

    isLoadingRef.current = true
    setLoading(true)

    try {
      const newItems = await fetchFeedContent(user.uid, 10)

      if (isInitial || pageRef.current === 1) {
        setFeedItems(newItems)
        pageRef.current = 1
      } else {
        setFeedItems(prev => [...prev, ...newItems])
      }

      // 如果還有更多內容，增加頁碼
      if (newItems.length === 10) {
        pageRef.current += 1
        setHasMore(true)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load feed:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [user])  // 移除 page 依賴，使用 ref

  // 追蹤是否已初始化，避免重複載入
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!user) {
      // 使用 replace 防止登入頁面保留在歷史堆疊，避免 Feed 畫面閃爍
      router.replace('/')
      return
    }

    // 避免重複初始化
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    // 載入使用者偏好
    const loadUserPreferences = async () => {
      if (user) {
        const preferences = await getUserPreferences(user.uid)
        const interests = preferences?.interests || []
        setUserHashtags(getUserHashtags(interests))
      }
    }

    loadUserPreferences()
    loadFeed(true) // 初始載入
  }, [user, router, loadFeed])

  // 當 refreshCount 或 activeFilter 變化時重新載入 feed（跳過初始值）
  const prevRefreshCountRef = useRef(refreshCount)
  const prevActiveFilterRef = useRef(activeFilter)

  useEffect(() => {
    // 跳過初次 mount
    if (
      prevRefreshCountRef.current === refreshCount &&
      prevActiveFilterRef.current === activeFilter
    ) {
      return
    }

    prevRefreshCountRef.current = refreshCount
    prevActiveFilterRef.current = activeFilter

    if (user) {
      pageRef.current = 1
      loadFeed(true)
    }
  }, [refreshCount, activeFilter, user, loadFeed])

  // 無限滾動載入更多的回調 - 使用穩定的 ref 避免重複建立
  const loadMoreRef = useRef(() => {})
  loadMoreRef.current = () => {
    if (!loading && !generating && hasMore) {
      loadFeed(false)
    }
  }

  // 無限滾動 hook
  const { sentinelRef } = useInfiniteScroll(
    useCallback(() => loadMoreRef.current(), []),
    { enabled: !loading && !generating && hasMore }
  )

  const handleLike = async (contentId: string) => {
    console.log('👍 點讚:', contentId)
    // 更新 localStorage 記錄
    try {
      const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
      interactions[contentId] = 'like'
      localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))
    } catch (error) {
      console.error('點讚記錄失敗:', error)
    }
  }

  const handleDislike = async (contentId: string) => {
    console.log('👎 不讚:', contentId)
    // 更新 localStorage 記錄
    try {
      const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
      interactions[contentId] = 'dislike'
      localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))
    } catch (error) {
      console.error('不讚記錄失敗:', error)
    }
  }

  const handleRefresh = async () => {
    if (!user) return

    setGenerating(true)
    pageRef.current = 1
    setFeedItems([])
    setRefreshCount(prev => prev + 1)

    try {
      console.log(`🔄 重新生成內容: ${user.uid}, 嘗試 ${activeFilter} 模式`)

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          count: 15,
          mode: 'default'
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`🆕 成功重新生成 ${data.contents?.length || 0} 則內容`)
        setFeedItems(data.contents || [])
        setContentSource(data.source)

        if (data.rateLimit) {
          setRateLimitInfo(data.rateLimit)
          setShowRateLimitWarning(data.rateLimit.remaining < 5)
        }
        if (data.message) {
          console.log('系統訊息:', data.message)
        }
      }
    } catch (error) {
      console.error('重新生成失敗:', error)

      // 降級到模擬資料
      const fallbackContent = MOCK_CONTENT_ITEMS
        .sort(() => Math.random() - 0.5)
        .slice(0, 15)

      setFeedItems(fallbackContent)
      setContentSource('fallback')
    } finally {
      setGenerating(false)
      setLastRefreshTime(new Date())
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      {/* 頂部導航列 */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">AI 內容流</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={generating}
                className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
                title={generating ? '生成中... (1-2秒)' : '重新整理內容'}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${generating ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => router.push('/onboarding/interests')}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                title="編輯興趣偏好"
              >
                <User className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 來源指示器 & Rate Limit */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-2">
              {contentSource === 'ollama' && (
                <div className="flex items-center gap-1 text-green-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">AI 生成</span>
                </div>
              )}
              {contentSource === 'cache' && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">快取命中</span>
                </div>
              )}
              {contentSource === 'fallback' && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">降級模式</span>
                </div>
              )}
            </div>

            {rateLimitInfo && (
              <div className={`text-xs ${rateLimitInfo.remaining < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {rateLimitInfo.remaining} / 20 次 (可用)
              </div>
            )}
          </div>

          {/* Rate limit 警告 */}
          {showRateLimitWarning && (
            <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm text-orange-700">
              <p>您已接近每小時生成限制（剩餘 {rateLimitInfo?.remaining} / 20 次），請節省使用。</p>
            </div>
          )}

          {/* 興趣標籤條 */}
          {userHashtags.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="text-gray-600 font-medium">為你推薦:</span>
              <div className="flex flex-wrap gap-2">
                {userHashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 篩選器 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('personalized')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeFilter === 'personalized'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              個人化推薦
            </button>
            <button
              onClick={() => setActiveFilter('trending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeFilter === 'trending'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              創意創意模式
            </button>
          </div>

          {/* 最後更新時間 */}
          {lastRefreshTime && (
            <div className="mt-2 text-xs text-gray-400">
              {lastRefreshTime.toLocaleTimeString('zh-TW')} 更新
            </div>
          )}
        </div>
      </header>

      {/* 主內容區域 */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* 左側：主要內容 (2/3) */}
        <div className="w-2/3">
          {loading && feedItems.length === 0 ? (
            <div className="text-center py-12">
              <div
                className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto ${generating ? 'text-purple-500 border-purple-500' : ''}`}
              />
              <p className="mt-4 text-gray-600">
                {generating ? 'AI 正在為你生成個人化內容...' : '載入你的個人化內容...'}
              </p>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-gray-100">
                <RefreshCw className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有內容</h3>
              <p className="text-gray-600 mb-6">點擊重新整理按鈕或編輯你的興趣偏好</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
              >
                重新整理內容
              </button>
            </div>
          ) : (
            <>
              {/* 內容卡片列表 */}
              <div className="space-y-6">
                {feedItems.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onLike={() => handleLike(item.id)}
                    onDislike={() => handleDislike(item.id)}
                    currentUserId={user?.uid}
                  />
                ))}
              </div>

              {/* 載入更多指示器 */}
              {loading && feedItems.length > 0 && (
                <div className="text-center py-8">
                  <div
                    className={`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto ${generating ? 'text-purple-500 border-purple-500' : ''}`}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    {generating ? 'AI 生成中...' : '載入更多內容...'}
                  </p>
                </div>
              )}

              {/* 無限滾動觸發器（不可見） */}
              <div ref={sentinelRef} className="h-1"></div>

              {/* 底部統計 */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500 text-center">
                  <p>目前已為你推薦 {feedItems.length} 則個人化內容</p>
                  <p className="mt-1">
                    來源: <span className={getContentSourceColor(contentSource)}>{getSourceLabel(contentSource)}</span>
                    • {activeFilter === 'personalized' ? '個人化模式' : '熱門模式'}
                  </p>
                  {contentSource !== 'ollama' && (
                    <p className="mt-1 text-xs">
                      💡 Day 3 狀態：整合 Ollama local 後將啟用真正的 AI 生成
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 右側：A/B 測試狀態 (1/3) */}
        <div className="w-1/3">
          {user && (
            <div className="sticky top-6 space-y-6">
              {/* A/B 測試狀態 */}
              <ABTestingStatus uid={user.uid} />

              {/* 數據源說明 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium text-gray-900">品質評分參數</h3>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>點讚分數:</span>
                    <span className="font-medium">+5 ~ +6</span>
                  </div>
                  <div className="flex justify-between">
                    <span>不讚分數:</span>
                    <span className="font-medium text-red-600">-6 ~ -10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>停留獎勵:</span>
                    <span className="font-medium">+6 ~ +15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>新用戶保護:</span>
                    <span className="font-medium">0 ~ 14天</span>
                  </div>
                </div>
              </div>

              {/* 測試目標 */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">A/B 測試目標</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    測試不同權重參數對使用者滿意度的影響
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    找出最有效的品質評分組合
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    驗證停留時間是否比點讚更重要
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    簡化算法 vs 複雜權重機制
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}