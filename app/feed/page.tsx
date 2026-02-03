'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import ContentCard from '@/app/components/ContentCard'
import ABTestingStatus from '@/components/ABTestingStatus'
import { useContentGeneration } from '@/app/hooks/useContentGeneration'
import { getUserPreferences } from '@/lib/user-data'
import { updateContentInteraction } from '@/lib/content-service'
import { Home, User, RefreshCw, Filter, Loader2, Sparkles, Zap, BarChart3, Database } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import type { ContentItem } from '@/types'

// Helper: Convert interests to hashtags
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

// Helper: Source color
function getContentSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'ollama': 'text-green-500',
    'firestore': 'text-blue-500',
    'fallback': 'text-orange-500',
    'mock': 'text-gray-400'
  }
  return colors[source] || 'text-gray-400'
}

// Helper: Source label
function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'ollama': 'AI 即時生成',
    'firestore': 'Firestore',
    'fallback': '降級模式',
    'mock': '模擬資料'
  }
  return labels[source] || '未知來源'
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldAutoGenerate = searchParams.get('autoGenerate') === 'true'

  // Local state
  const [userHashtags, setUserHashtags] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<'personalized' | 'trending'>('personalized')
  const [userInterests, setUserInterests] = useState<string[]>([])
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  // Content generation hook (direct Ollama + Firestore)
  const {
    feedItems,
    isGenerating,
    currentIndex,
    totalCount,
    source,
    error,
    generate,
    stop,
    subscribeToFeed
  } = useContentGeneration({
    onItemGenerated: (item, index) => {
      console.log(`[Feed] Item ${index + 1} generated and saved to Firestore`)
    },
    onComplete: (count) => {
      console.log(`[Feed] Generation complete: ${count} items`)
      setLastRefreshTime(new Date())
    },
    onError: (err) => {
      console.error('[Feed] Generation error:', err)
    }
  })

  // Track initialization
  const hasInitializedRef = useRef(false)

  // Auth check and user preferences loading
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/')
      return
    }

    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const loadUserPreferences = async () => {
      const preferences = await getUserPreferences(user.uid)
      const interests = preferences?.interests || []

      if (interests.length === 0) {
        console.log('[Feed] No interests found, redirecting to onboarding')
        router.replace('/onboarding/interests')
        return
      }

      setUserInterests(interests)
      setUserHashtags(getUserHashtags(interests))

      // Subscribe to Firestore feed updates
      subscribeToFeed(user.uid)
    }

    loadUserPreferences()
  }, [user, authLoading, router, subscribeToFeed])

  // Auto‑generate content when coming from onboarding
  useEffect(() => {
    if (!user || !shouldAutoGenerate || isGenerating || feedItems.length > 0) return
    if (userInterests.length === 0) return

    // Clean URL (remove autoGenerate param)
    const url = new URL(window.location.href)
    url.searchParams.delete('autoGenerate')
    window.history.replaceState({}, '', url.pathname)

    console.log('[Feed] Auto‑generating content for new user')
    generate(user.uid, 5, userInterests)
  }, [user, shouldAutoGenerate, isGenerating, feedItems.length, userInterests, generate])

  // Handle like
  const handleLike = async (contentId: string) => {
    console.log('[Feed] Like:', contentId)
    try {
      await updateContentInteraction(contentId, 'like')
    } catch (error) {
      console.error('[Feed] Like failed:', error)
    }
  }

  // Handle dislike
  const handleDislike = async (contentId: string) => {
    console.log('[Feed] Dislike:', contentId)
    try {
      await updateContentInteraction(contentId, 'dislike')
    } catch (error) {
      console.error('[Feed] Dislike failed:', error)
    }
  }

  // Handle refresh - generate new content
  const handleRefresh = async () => {
    if (!user || isGenerating) return

    console.log(`[Feed] Starting generation: ${user.uid}, interests: ${userInterests.join(', ')}`)

    // Generate content (calls Ollama directly, saves to Firestore)
    // UI updates automatically via onSnapshot
    generate(user.uid, 5, userInterests)
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">AI 內容流</h1>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Client-side
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isGenerating}
                className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
                title={isGenerating ? '生成中...' : '生成新內容'}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${isGenerating ? 'animate-spin' : ''}`} />
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

          {/* Source indicator */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-2">
              {source === 'ollama' && (
                <div className="flex items-center gap-1 text-green-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">AI 即時生成</span>
                </div>
              )}
              {source === 'mock' && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">模擬資料</span>
                </div>
              )}
              {feedItems.length > 0 && !source && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Firestore 即時同步</span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-xs text-red-500">
                {error}
              </div>
            )}
          </div>

          {/* Interest tags */}
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

          {/* Filter buttons */}
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
              創意模式
            </button>
          </div>

          {/* Last update time */}
          {lastRefreshTime && (
            <div className="mt-2 text-xs text-gray-400">
              {lastRefreshTime.toLocaleTimeString('zh-TW')} 更新
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Left: Feed content (2/3) */}
        <div className="w-2/3">
          {feedItems.length === 0 && !isGenerating && !shouldAutoGenerate ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-gray-100">
                <Sparkles className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">開始生成內容</h3>
              <p className="text-gray-600 mb-6">點擊下方按鈕，AI 將為你生成個人化內容</p>
              <button
                onClick={handleRefresh}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
              >
                生成內容
              </button>
            </div>
          ) : feedItems.length === 0 && shouldAutoGenerate ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating your personalized content...</h3>
              <p className="text-gray-600 mb-6">
                {currentIndex >= 0 ? `Creating article ${currentIndex + 1} of ${totalCount}` : 'Initializing AI...'}
              </p>
              {isGenerating && (
                <button
                  onClick={stop}
                  className="mt-4 text-sm text-red-500 hover:underline"
                >
                  Stop generation
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Content cards */}
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

              {/* Generation progress */}
              {isGenerating && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">
                    AI 生成中... ({currentIndex + 1}/{totalCount})
                  </p>
                  <button
                    onClick={stop}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    停止生成
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500 text-center">
                  <p>目前已為你推薦 {feedItems.length} 則個人化內容</p>
                  <p className="mt-1">
                    來源: <span className={getContentSourceColor(source || 'firestore')}>{getSourceLabel(source || 'firestore')}</span>
                    {' '}| Firestore 即時同步
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Sidebar (1/3) */}
        <div className="w-1/3">
          {user && (
            <div className="sticky top-6 space-y-6">
              {/* A/B Testing Status */}
              <ABTestingStatus uid={user.uid} />

              {/* Architecture Info */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">新架構</h3>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Browser 直接呼叫 Ollama</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>生成後存入 Firestore</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>onSnapshot 即時更新 UI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>無需 Server-side API</span>
                  </div>
                </div>
              </div>

              {/* Quality scoring params */}
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
