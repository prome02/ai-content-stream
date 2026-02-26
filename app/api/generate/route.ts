import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/services/rate-limiter'
import ContentCache from '@/services/content-cache.service'
import { PromptBuilder } from '@/lib/prompt-builder'
import { getUserPreferences } from '@/lib/user-data'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import { OllamaClient } from '@/lib/ollama-client'
import { validateRequest } from '@/lib/api-utils'
import { fetchNews } from '@/lib/news-fetcher'
import { getDefaultBehavior } from '@/lib/prompt-selector'
import { getUserBehaviorStats } from '@/lib/user-data'
import { trackContentGenerated } from '@/lib/analytics'
import fs from 'fs'
import path from 'path'
import type {
  ContentItem,
  GenerateRequest,
  GenerateResponse,
  InterestCategory
} from '@/types'

// Per-user used news links tracker (in-memory, avoids repeated news in prompts)
const usedNewsLinksMap = new Map<string, string[]>()
const MAX_USED_NEWS_PER_USER = 20

function getUsedNewsLinks(uid: string): string[] {
  return usedNewsLinksMap.get(uid) || []
}

function trackUsedNewsLinks(uid: string, links: string[]): void {
  const existing = usedNewsLinksMap.get(uid) || []
  const updated = [...existing, ...links].slice(-MAX_USED_NEWS_PER_USER)
  usedNewsLinksMap.set(uid, updated)
}

// Initialize services
const rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60 * 60 * 1000 })

const ollamaApiKey = process.env.OLLAMA_API_KEY || ''
const isOllamaCloud = !!ollamaApiKey

// Cloud mode: use ollama.com endpoint; local mode: use OLLAMA_BASE_URL
const ollamaBaseUrl = isOllamaCloud
  ? 'https://ollama.com'
  : (process.env.OLLAMA_BASE_URL || 'http://localhost:11434')

const ollamaClient = new OllamaClient({
  baseUrl: ollamaBaseUrl,
  apiKey: ollamaApiKey,
  defaultModel: process.env.OLLAMA_MODEL || 'minimax-m2.5',
  models: (process.env.OLLAMA_MODELS || 'minimax-m2.5,qwen3.5:397b,gemma3:27b').split(','),
  timeout: 90000, // 90 seconds for cloud LLM generation
  maxRetries: 2
})

console.log(`[Generate] Ollama mode: ${isOllamaCloud ? 'cloud' : 'local'}, baseUrl: ${ollamaBaseUrl}`)

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body: GenerateRequest = await req.json()
    const { uid, count = 3, mode = 'default', locale = 'zh-TW', contentSettings, userFeedback: clientUserFeedback } = body

    // Validate request
    const validationError = validateRequest(body)
    if (validationError) {
      return validationError
    }

    // Check if using mock data (from environment variable)
    const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

    console.log(`[Generate] Request: uid=${uid}, count=${count}, mode=${mode}, useMock=${USE_MOCK_DATA}`)

    // 1. Rate limiting check
    const rateLimitResult = await rateLimiter.check(uid)
    if (!rateLimitResult.allowed) {
      console.log(`[Generate] Rate limit exceeded: ${uid}`)

      // 使用降級內容
      const fallbackContent = getFallbackContent(uid, count)

      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: '每小時生成限制已達上限，請稍後再試',
          contents: fallbackContent,
          source: 'fallback',
          useMockData: USE_MOCK_DATA,
          rateLimit: {
            remaining: 0,
            resetAt: rateLimitResult.resetAt.toISOString()
          }
        },
        {
          status: 429
        }
      )
    }

    // 2. 檢查快取
    const userPreferences = await getUserPreferences(uid)
    const cachedContent = await ContentCache.getContentForUser(
      uid,
      count,
      userPreferences?.interests || []
    )

    if (cachedContent.length >= count) {
      console.log(`[Generate] Cache hit, returning ${cachedContent.length} items`)

      // 遞增 rate limit 計數
      await rateLimiter.increment(uid, '/api/generate')

      return NextResponse.json({
        success: true,
        contents: cachedContent.slice(0, count).map(item => ({
          ...item,
          generatedAt: item.generatedAt instanceof Date ? item.generatedAt : new Date(item.generatedAt),
          metadata: {
            source: 'cache',
            cached: true
          }
        })),
        source: 'cache',
        cachedCount: cachedContent.length,
        generationTime: Date.now() - startTime,
        rateLimit: {
          remaining: rateLimitResult.remaining - 1,
          resetAt: rateLimitResult.resetAt.toISOString()
        }
      })
    }

    // 3. Use PromptBuilder to prepare content generation
    console.log(`[Generate] Need to generate ${count - cachedContent.length} new items`)

    const promptBuilder = new PromptBuilder()
    const recentInteractionsCount = getRecentLikes(uid, 10)
    const diversityScore = calculateDiversityScore(uid)

    // 抓取相關新聞（排除已用過的連結）
    const interests = (userPreferences?.interests || []) as InterestCategory[]
    const news = await fetchNews({
      interests,
      maxItems: 5,
      locale,
      excludeLinks: getUsedNewsLinks(uid)
    })

    // 追蹤本次使用的新聞連結
    if (news.length > 0) {
      trackUsedNewsLinks(uid, news.map(n => n.link))
    }

    console.log(`[Generate] Fetched ${news.length} news items`)

    // 使用舊的或新的提示詞建構
    let prompt = ''

    // 檢查是否有模組化提示詞功能
    const hasModularFunction = typeof promptBuilder.buildModularPrompt === 'function'

    if (hasModularFunction) {
      // Phase 3: 使用真實用戶行為統計
      let behavior = getDefaultBehavior()
      let serverUserFeedback: string | undefined = undefined

      try {
        const behaviorStats = await getUserBehaviorStats(uid)
        console.log('[Generate] User behavior stats:', {
          hasFeedback: behaviorStats.hasFeedback,
          recentLikes: behaviorStats.recentLikes,
          recentDislikes: behaviorStats.recentDislikes,
          recentSkips: behaviorStats.recentSkips,
          recentKeywords: behaviorStats.recentKeywords.slice(0, 3)
        })

        behavior = {
          avgDwellTime: 0,
          recentLikes: behaviorStats.recentLikes,
          recentSkips: behaviorStats.recentSkips,
          hasFeedback: behaviorStats.hasFeedback,
          lastKeywordClick: behaviorStats.recentKeywords[0]
        }

        serverUserFeedback = behaviorStats.lastFeedback
      } catch (error) {
        console.warn('[Generate] Failed to get user behavior stats, using default:', error)
      }

      // Client-provided feedback (keyword click) takes priority over server-side
      const resolvedUserFeedback = clientUserFeedback || serverUserFeedback

      // 使用模組化提示詞建構
      const modularPromptContext = {
        userPreferences: {
          interests: userPreferences?.interests || [],
          language: locale
        },
        news,
        behavior,
        userFeedback: resolvedUserFeedback,
        contentSettings
      }

      prompt = (promptBuilder as any).buildModularPrompt(modularPromptContext)
      console.log('[Generate] Using modular prompt')

      // 記錄模組使用資訊（如果可用）
      try {
        const modularInfo = {
          news_count: news.length,
          has_behavior: !!behavior,
          has_feedback: !!userFeedback,
          interests_count: userPreferences?.interests?.length || 0
        }
        console.log('[Generate] Modular context:', modularInfo)

        // 注意：具體模組選擇在 prompt-builder 內部處理，這裡只記錄元數據
        // 真正的模組記錄將在生成完成後通過 analytics 處理
      } catch (error) {
        console.warn('[Generate] Failed to log modular info:', error)
      }
    } else {
      // 使用舊的提示詞建構
      const promptContext = {
        userPreferences: userPreferences || { interests: [], language: locale, style: 'casual' },
        recentInteractions: [], // 暫時使用空陣列
        timeOfDay: getTimeOfDay(),
        mode,
        diversityScore
      }

      prompt = promptBuilder.build(promptContext)
      console.log('[Generate] Using legacy prompt')
    }

    // 輸出完整提示詞到 console 和可選的檔案日誌
    console.log('=== [Generate] COMPLETE PROMPT START ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('User ID:', uid)
    console.log('Mode:', hasModularFunction ? 'modular' : 'legacy')

    try {
      const promptData = JSON.parse(prompt)
      console.log('Model:', promptData.model || 'default')
      console.log('Temperature:', promptData.options?.temperature || 'default')
      console.log('Top-p:', promptData.options?.top_p || 'default')

      if (promptData._modules) {
        console.log('Selected Modules:')
        console.log('  Role:', promptData._modules.role)
        console.log('  Perspective:', promptData._modules.perspective)
        console.log('  Format:', promptData._modules.format)
        console.log('  Depth:', promptData._modules.depth)
        console.log('  Tone:', promptData._modules.tone)
        console.log('  Opening:', promptData._modules.opening)
        console.log('  Has Challenge:', promptData._modules.hasChallenge)
        console.log('  Temperature:', promptData._modules.temperature)
      }

      console.log('\n--- SYSTEM PROMPT ---')
      const systemMessage = promptData.messages?.find((m: any) => m.role === 'system')?.content
      if (systemMessage) {
        console.log(systemMessage)
      }

      console.log('\n--- USER PROMPT ---')
      const userMessage = promptData.messages?.find((m: any) => m.role === 'user')?.content
      if (userMessage) {
        console.log(userMessage)
      }

      console.log('=== [Generate] COMPLETE PROMPT END ===')

      // 可選：將完整提示詞寫入檔案日誌
      try {
        const logsDir = path.join(process.cwd(), 'logs')
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const logFile = path.join(logsDir, `prompt-${uid}-${timestamp}.json`)

        const logData = {
          timestamp: new Date().toISOString(),
          userId: uid,
          mode: hasModularFunction ? 'modular' : 'legacy',
          promptData: promptData,
          newsCount: news.length,
          interests: userPreferences?.interests || []
        }

        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf8')
        console.log(`[Generate] Prompt logged to file: ${logFile}`)

      } catch (fileError) {
        console.warn('[Generate] Failed to write prompt log file:', fileError)
      }

    } catch (parseError) {
      console.log('Raw prompt string:', prompt)
      console.log('Parse error:', parseError)
    }

    let generatedContent: ContentItem[] = []
    let source: 'ollama' | 'fallback' | 'mock' = 'ollama'
    let generationTime = 0

    // 準備記錄分析的模組資訊
    let contentGenerationEventParams: any = null

    try {
      if (USE_MOCK_DATA) {
        // Use mock data for development
        console.log('[Generate] Using mock data')
        const generateDelay = Math.random() * 1500 + 800
        await new Promise(resolve => setTimeout(resolve, generateDelay))

        generatedContent = MOCK_CONTENT_ITEMS
          .sort(() => Math.random() - 0.5)
          .slice(0, count - cachedContent.length)
          .map((item, index) => ({
            id: `mock_${Date.now()}_${index}`,
            content: item.content,
            hashtags: item.hashtags,
            topics: item.topics,
            likes: 0,
            dislikes: 0,
            qualityScore: 75 + Math.floor(Math.random() * 25),
            generatedAt: new Date(),
            style: 'casual' as const,
            usedBy: [],
            reuseCount: 0
          }))

        generationTime = Date.now() - startTime
        source = 'mock'

        // 記錄分析事件
        contentGenerationEventParams = {
          role_module: 'mock_data',
          perspective_module: 'mock_perspective',
          format_module: 'simple',
          depth_module: 'standard',
          news_count: 0
        }

        console.log(`[Generate] Mock data generated (${generationTime}ms)`)
      } else {
        // Use real Ollama LLM generation
        console.log('[Generate] Using Ollama LLM')

        // Check Ollama availability first
        const isOllamaAvailable = await ollamaClient.healthCheck()

        if (!isOllamaAvailable) {
          console.warn('[Generate] Ollama not available, falling back to mock data')
          throw new Error('Ollama service unavailable')
        }

        // Build prompt using PromptBuilder
        const promptData = JSON.parse(prompt)

        // 檢查是否有模組使用資訊
        const usedModules = promptData._modules || {
          role: 'unknown',
          perspective: 'unknown',
          format: 'unknown',
          depth: 'standard',
          tone: 'unknown',
          opening: 'unknown'
        }

        console.log('[Generate] Sending request to Ollama...')
        console.log('[Generate] Used modules:', usedModules)

        // Call Ollama API using chat() to preserve system/user message structure
        // Use getModel() for random/preferred model selection
        const selectedModel = ollamaClient.getModel()
        
        const ollamaResponse = await ollamaClient.chat(
          {
            model: selectedModel,
            messages: promptData.messages,
            stream: false,
            options: promptData.options || {}
          }
        )

        console.log(`[Generate] Ollama response received, model used: ${selectedModel}`)

        // Parse the response
        const parsedContent = promptBuilder.parseResponse(ollamaResponse.message.content)

        // Convert to ContentItem format
        generatedContent = parsedContent.map((item: any, index: number) => ({
          id: `ollama_${Date.now()}_${index}`,
          content: item.content || '',
          hashtags: item.hashtags || [],
          topics: item.topics || [],
          likes: 0,
          dislikes: 0,
          qualityScore: 80 + Math.floor(Math.random() * 20),
          generatedAt: new Date(),
          style: item.style || 'casual',
          usedBy: [],
          reuseCount: 0
        }))

        // Ensure we have enough content
        if (generatedContent.length < count - cachedContent.length) {
          console.log('[Generate] Ollama returned fewer items than requested, padding with mock')
          const needed = count - cachedContent.length - generatedContent.length
          const mockPadding: ContentItem[] = MOCK_CONTENT_ITEMS
            .sort(() => Math.random() - 0.5)
            .slice(0, needed)
            .map((item, index) => ({
              id: `mock_pad_${Date.now()}_${index}`,
              content: item.content,
              hashtags: item.hashtags,
              topics: item.topics,
              likes: 0,
              dislikes: 0,
              qualityScore: 70 + Math.floor(Math.random() * 20),
              generatedAt: new Date(),
              style: 'casual' as const,
              usedBy: [],
              reuseCount: 0
            }))
          generatedContent = [...generatedContent, ...mockPadding]
        }

        generationTime = Date.now() - startTime
        source = 'ollama'

        // 建立分析事件參數
        contentGenerationEventParams = {
          role_module: usedModules.role || 'unknown',
          perspective_module: usedModules.perspective || 'unknown',
          format_module: usedModules.format || 'unknown',
          depth_module: usedModules.depth || 'standard',
          tone_module: usedModules.tone || 'unknown',
          opening_module: usedModules.opening || 'unknown',
          news_count: news.length
        }

        console.log(`[Generate] Ollama generation completed (${generationTime}ms, ${generatedContent.length} items)`)
      }

    } catch (error) {
      console.error('[Generate] Ollama generation failed:', error)

      // Fallback to mock content
      generatedContent = MOCK_CONTENT_ITEMS
        .sort(() => Math.random() - 0.5)
        .slice(0, count - cachedContent.length)
        .map((item, index) => ({
          id: `fallback_${Date.now()}_${index}`,
          content: item.content,
          hashtags: item.hashtags,
          topics: item.topics || [],
          likes: 0,
          dislikes: 0,
          qualityScore: 70 + Math.floor(Math.random() * 30),
          generatedAt: new Date(),
          style: 'casual' as const,
          usedBy: [],
          reuseCount: 0
        }))

      generationTime = Date.now() - startTime
      source = 'fallback'
      console.log(`[Generate] Using fallback content: ${error instanceof Error ? error.message : String(error)}`)
    }

    // 4. 儲存新內容到快取 + 記算使用者權重
    for (const content of generatedContent) {
      await ContentCache.saveGeneratedContent(uid, [content])
    }

    // 5. 記錄內容生成分析事件
    try {
      // 如果沒有在生成時設置事件參數（例如fallback情況），設置預設值
      if (!contentGenerationEventParams) {
        contentGenerationEventParams = {
          role_module: source === 'mock' ? 'mock_data' : 'fallback',
          perspective_module: 'basic',
          format_module: 'simple',
          depth_module: 'standard',
          news_count: news.length
        }
      }

      // 記錄內容生成事件（非阻塞）
      trackContentGenerated(contentGenerationEventParams).catch((error) => {
        console.warn('[Analytics] Failed to record content generation:', error)
      })

      console.log('[Analytics] Content generation event logged:', contentGenerationEventParams)
    } catch (analyticsError) {
      console.warn('[Analytics] Failed to prepare content generation event:', analyticsError)
    }

    // 遞增 rate limit 計數
    await rateLimiter.increment(uid, '/api/generate')

    const allContent = [...cachedContent, ...generatedContent].slice(0, count)

    return NextResponse.json({
      success: true,
      contents: allContent,
      source,
      cachedCount: cachedContent.length,
      generatedCount: generatedContent.length,
      generationTime: Date.now() - startTime,
      rateLimit: {
        remaining: rateLimitResult.remaining - 1,
        resetAt: rateLimitResult.resetAt.toISOString()
      }
    })

  } catch (error) {
    console.error('[Generate] API error:', error)
    const errorName = error instanceof Error ? error.name : 'UNKNOWN_ERROR'
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'

    // 錯誤降級：返回模擬內容
    const fallbackContent = getFallbackContent(
      (await req.json()).uid || 'unknown',
      (await req.json()).count || 3
    )

    return NextResponse.json({
      success: false,
      error: errorName,
      message: `生成失敗: ${errorMessage}`,
      contents: fallbackContent,
      source: 'fallback',
      warning: 'LLM 服務暫時無法使用，返回備援內容'
    })
  }
}

// 輕助函數

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

function getFallbackContent(uid: string, count: number): ContentItem[] {
  console.log(`[Generate] Using fallback content for: ${uid}`)

  return MOCK_CONTENT_ITEMS
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((item, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      content: item.content,
      hashtags: item.hashtags,

      topics: item.topics,
      likes: item.likes,
      dislikes: item.dislikes,
      qualityScore: item.qualityScore,
      generatedAt: new Date(),
      style: 'casual' as const,
      usedBy: [],
      reuseCount: 0
    }))
}

function calculateDiversityScore(uid: string): number {
  try {
    // 模擬獲取最近的互動主題
    const mockTopics = [
      'ai', 'tech', 'learning', 'business', 'health',
      'travel', 'food', 'music', 'movies', 'anime'
    ]

    // 隨機模擬一些互動主題
    const interactions = Array.from({ length: 10 }, () => ({
      topics: [mockTopics[Math.floor(Math.random() * mockTopics.length)]]
    }))

    // 計算多樣性
    if (interactions.length === 0) return 0.5

    const uniqueTopics = [...new Set(interactions.map(i => i.topics || []).flat())]
    const totalTopics = interactions.length

    // 香農熵
    const topicFrequency = new Map<string, number>()

    interactions.forEach(i => {
      ; (i.topics || []).forEach(topic => {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1)
      })
    })

    let entropy = 0
    topicFrequency.forEach((count, topic) => {
      const prob = count / totalTopics
      if (prob > 0) entropy -= prob * Math.log2(prob)
    })

    // 正規化到 0-1
    const maxEntropy = Math.log2(Math.max(uniqueTopics.length, 1))
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0

    return normalizedEntropy

  } catch (error) {
    console.error('[Generate] Failed to calculate diversity score:', error)
    return 0.5
  }
}

function getRecentLikes(uid: string, hours: number = 1): number {
  // 模擬：隨機返回 0-10 次點讚
  return Math.floor(Math.random() * 10)
}