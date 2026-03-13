'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import ContentCard from '@/app/components/ContentCard'
import SettingsDrawer from '@/app/components/settings/SettingsDrawer'
import { useContentGeneration } from '@/app/hooks/useContentGeneration'
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll'
import { getUserPreferences, getContentSettings, saveContentSettings, resetContentSettings } from '@/lib/user-data'
import { updateContentInteraction } from '@/lib/content-service'
import { Home, RefreshCw, Loader2, Sparkles, Settings, Zap } from 'lucide-react'
import type { ContentSettings } from '@/types'
import { DEFAULT_CONTENT_SETTINGS } from '@/types'

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

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false)

  // Read URL params on client
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setShouldAutoGenerate(params.get('autoGenerate') === 'true')
  }, [])

  // Local state
  const [userHashtags, setUserHashtags] = useState<string[]>([])
  const [userInterests, setUserInterests] = useState<string[]>([])
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

  // Settings drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [contentSettings, setContentSettings] = useState<ContentSettings>({ ...DEFAULT_CONTENT_SETTINGS })

  // Content generation hook
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

  // Auto infinite scroll
  const handleAutoLoad = useCallback(async () => {
    // If generation is failing, pause auto-load to avoid repeated retries/timeouts.
    if (!user || isGenerating || !contentSettings.autoInfiniteScroll || !!error) return
    console.log('[Feed] Auto-loading more content via infinite scroll')
    generate(user.uid, 5, userInterests, contentSettings)
  }, [user, isGenerating, userInterests, contentSettings, error, generate])

  const { sentinelRef } = useInfiniteScroll(handleAutoLoad, {
    enabled: contentSettings.autoInfiniteScroll && feedItems.length > 0 && !isGenerating,
    rootMargin: '200px',
    debounceMs: 3000,
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

    const loadUserData = async () => {
      // Load interests
      const preferences = await getUserPreferences(user.uid)
      const interests = preferences?.interests || []

      if (interests.length === 0) {
        console.log('[Feed] No interests found, redirecting to onboarding')
        router.replace('/onboarding/interests')
        return
      }

      setUserInterests(interests)
      setUserHashtags(getUserHashtags(interests))

      // Load content settings
      const settings = await getContentSettings(user.uid)
      setContentSettings(settings)

      // Subscribe to Firestore feed updates
      subscribeToFeed(user.uid)
    }

    loadUserData()
  }, [user, authLoading, router, subscribeToFeed])

  // Auto-generate content when coming from onboarding
  useEffect(() => {
    if (!user || !shouldAutoGenerate || isGenerating || feedItems.length > 0) return
    if (userInterests.length === 0) return

    // Clean URL
    const url = new URL(window.location.href)
    url.searchParams.delete('autoGenerate')
    window.history.replaceState({}, '', url.pathname)

    // Prevent infinite retries: if generation fails (no items saved), we still only
    // want to auto-trigger once. User can retry manually from the UI.
    setShouldAutoGenerate(false)

    console.log('[Feed] Auto-generating content for new user')
    generate(user.uid, 5, userInterests, contentSettings)
  }, [user, shouldAutoGenerate, isGenerating, feedItems.length, userInterests, contentSettings, generate])

  // Handle like
  const handleLike = async (contentId: string) => {
    console.log('[Feed] Like:', contentId)
    try {
      await updateContentInteraction(contentId, 'like')
    } catch (err) {
      console.error('[Feed] Like failed:', err)
    }
  }

  // Handle dislike
  const handleDislike = async (contentId: string) => {
    console.log('[Feed] Dislike:', contentId)
    try {
      await updateContentInteraction(contentId, 'dislike')
    } catch (err) {
      console.error('[Feed] Dislike failed:', err)
    }
  }

  // Handle keyword click to generate related content
  const handleKeywordGenerate = async (keyword: string) => {
    console.log('[Feed] Keyword generate:', keyword)
    
    // Scroll to bottom
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    })
    
    // Generate content with keyword as user feedback
    if (user) {
      generate(user.uid, 1, userInterests, contentSettings, keyword)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    if (!user || isGenerating) return
    console.log(`[Feed] Starting generation: ${user.uid}, interests: ${userInterests.join(', ')}`)
    generate(user.uid, 5, userInterests, contentSettings)
  }

  // Handle settings change (auto-save)
  const handleSettingsChange = useCallback(async (newSettings: ContentSettings) => {
    setContentSettings(newSettings)
    if (user) {
      try {
        await saveContentSettings(user.uid, newSettings)
      } catch (err) {
        console.error('[Feed] Failed to save settings:', err)
      }
    }
  }, [user])

  // Handle settings reset
  const handleSettingsReset = useCallback(async () => {
    if (user) {
      try {
        const defaults = await resetContentSettings(user.uid)
        setContentSettings(defaults)
      } catch (err) {
        console.error('[Feed] Failed to reset settings:', err)
      }
    }
  }, [user])

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
      {/* Header - simplified */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">AI 內容流</h1>
              {source === 'ollama' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI
                </span>
              )}
              {feedItems.length > 0 && !source && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="h-3 w-3" /> 同步
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isGenerating}
                className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
                title={isGenerating ? '生成中...' : '生成新內容'}
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                title="內容偏好設定"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Interest tags */}
          {userHashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {userHashtags.map((hashtag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
                >
                  {hashtag}
                </span>
              ))}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-2 text-xs text-red-500 whitespace-pre-line">{error}</div>
          )}

          {lastRefreshTime && (
            <div className="mt-1 text-xs text-gray-400">
              {lastRefreshTime.toLocaleTimeString('zh-TW')} 更新
            </div>
          )}
        </div>
      </header>

      {/* Main content - full width, centered */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {feedItems.length === 0 && !isGenerating && !shouldAutoGenerate ? (
          <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-gray-100">
              <Sparkles className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">開始探索個人化內容</h3>
            <p className="text-gray-500 mb-6">點擊下方按鈕，AI 將為你生成專屬內容</p>
            <button
              onClick={handleRefresh}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              生成內容
            </button>
          </div>
        ) : feedItems.length === 0 && shouldAutoGenerate ? (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">正在為你生成個人化內容...</h3>
            <p className="text-gray-500">
              {currentIndex >= 0 ? `正在建立第 ${currentIndex + 1} / ${totalCount} 篇` : '初始化 AI 中...'}
            </p>
            {isGenerating && (
              <button onClick={stop} className="mt-4 text-sm text-red-500 hover:underline">
                停止生成
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
                  onKeywordClick={handleKeywordGenerate}
                  currentUserId={user?.uid}
                />
              ))}
            </div>

            {/* Generation progress */}
            {isGenerating && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">
                  AI 生成中... ({currentIndex + 1}/{totalCount})
                </p>
                <button onClick={stop} className="mt-2 text-xs text-red-500 hover:underline">
                  停止生成
                </button>
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Footer stats - simplified */}
            {!isGenerating && feedItems.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-400">
                  已載入 {feedItems.length} 則內容
                  {contentSettings.autoInfiniteScroll && ' -- 向下滾動自動載入更多'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={contentSettings}
        onSettingsChange={handleSettingsChange}
        onReset={handleSettingsReset}
      />
    </div>
  )
}
