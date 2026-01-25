import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/services/rate-limiter'
import ContentCache from '@/services/content-cache.service'
import { PromptBuilder } from '@/lib/prompt-builder'
import { getUserPreferences } from '@/lib/user-data'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import { OllamaClient } from '@/lib/ollama-client'
import { validateRequest } from '@/lib/api-utils'
import type {
  ContentItem,
  GenerateRequest,
  GenerateResponse
} from '@/types'

// Initialize services
const rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60 * 60 * 1000 })
const ollamaClient = new OllamaClient({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_MODEL || 'gemma3:12b-cloud',
  timeout: 90000, // 90 seconds for cloud LLM generation
  maxRetries: 2
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body: GenerateRequest = await req.json()
    const { uid, count = 3, mode = 'default' } = body

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
    
    const promptContext = {
      userPreferences: userPreferences || { interests: [], language: 'zh-TW', style: 'casual' },
      recentInteractions: [], // 暫時使用空陣列
      timeOfDay: getTimeOfDay(),
      mode,
      diversityScore
    }
    
    const prompt = promptBuilder.build(promptContext)
    console.log('[Generate] Prompt context:', prompt.substring(0, 200) + '...')
    
    let generatedContent: ContentItem[] = []
    let source: 'ollama' | 'fallback' | 'mock' = 'ollama'
    let generationTime = 0
    
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
        const systemMessage = promptData.messages.find((m: any) => m.role === 'system')?.content || ''
        const userMessage = promptData.messages.find((m: any) => m.role === 'user')?.content || ''
        const fullPrompt = `${systemMessage}\n\n${userMessage}`

        console.log('[Generate] Sending request to Ollama...')

        // Call Ollama API
        const ollamaResponse = await ollamaClient.generate(
          fullPrompt,
          promptData.model || 'gemma3:4b',
          promptData.options || {}
        )

        console.log('[Generate] Ollama response received')

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
      ;(i.topics || []).forEach(topic => {
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