import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/services/rate-limiter'
import ContentCache from '@/services/content-cache.service'
import { PromptBuilder } from '@/lib/prompt-builder'
import { getUserPreferences } from '@/lib/user-data'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import type { 
  ContentItem, 
  GenerateRequest, 
  GenerateResponse 
} from '@/types'

// 初始化服務
const rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body: GenerateRequest = await req.json()
    const { uid, count = 3, mode = 'default' } = body

    if (!uid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_REQUEST',
          message: '缺少使用者識別碼 (uid)'
        },
        { status: 400 }
      )
    }

    console.log(`🚀 生成請求: ${uid}, ${count} 則內容, 模式: ${mode}`)

    // 1. Rate limiting 檢查
    const rateLimitResult = await rateLimiter.check(uid)
    if (!rateLimitResult.allowed) {
      console.log(`⏰ Rate limit 超出: ${uid}`)
      
      // 使用降級內容
      const fallbackContent = getFallbackContent(uid, count)
      
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: '每小時生成限制已達上限，請稍後再試',
          contents: fallbackContent,
          source: 'fallback',
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
      console.log(`🎯 快取命中，返回 ${cachedContent.length} 則內容`)
      
      // 遞增 rate limit 計數
      await rateLimiter.increment(uid, '/api/generate')
      
      return NextResponse.json({
        success: true,
        contents: cachedContent.slice(0, count).map(item => ({
          ...item,
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

    // 3. 使用 PromptBuilder 準備生成內容
    console.log(`👩‍💻 需要生成 ${count - cachedContent.length} 則新內容`)
    
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
    console.log('📝 Prompt 上下文:', prompt.substring(0, 200) + '...')
    
    let generatedContent: ContentItem[] = []
    let source: 'ollama' | 'fallback' | 'mock' = 'ollama'
    let generationTime = 0
    
     try {
      // 模擬 Ollama 生成 (實際應該使用 OllamaClient)
      const generateDelay = Math.random() * 1500 + 800
      await new Promise(resolve => setTimeout(resolve, generateDelay))
      
      generatedContent = MOCK_CONTENT_ITEMS
        .sort(() => Math.random() - 0.5)
        .slice(0, count - cachedContent.length)
        .map((item, index) => ({
          id: `gen_${Date.now()}_${index}`,
          content: item.content,
          hashtags: item.hashtags,
          emojis: item.emojis,
          topics: item.topics,
          likes: 0,
          dislikes: 0,
          qualityScore: 75 + Math.floor(Math.random() * 25),
          generatedAt: new Date(),
          style: 'casual',
          usedBy: [],
          reuseCount: 0
        }))
        
      generationTime = Date.now() - startTime
      source = 'ollama'
      
      console.log(`✅ 模擬 Ollama 生成完成 (${generationTime}ms)`)
      
    } catch (error) {
      console.error('Ollama 生成失敗:', error)
      
      // 降級到模擬內容
      generatedContent = MOCK_CONTENT_ITEMS
        .sort(() => Math.random() - 0.5)
        .slice(0, count - cachedContent.length)
        .map((item, index) => ({
          id: `gen_${Date.now()}_${index}`,
          content: item.content,
          hashtags: item.hashtags,
          emojis: item.emojis || ['🤖', '📱'],
          topics: item.topics || [],
          likes: 0,
          dislikes: 0,
          qualityScore: 70 + Math.floor(Math.random() * 30),
          generatedAt: new Date(),
          style: 'casual',
          usedBy: [],
          reuseCount: 0
        }))
      
      generationTime = Date.now() - startTime
      source = 'fallback'
      console.log(`⚠️ 使用降級內容: ${error instanceof Error ? error.message : String(error)}`)
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
      },
      message: 'Day 3 整合品質評分系統'
    })

  } catch (error) {
    console.error('生成 API 錯誤:', error)
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
  console.log(`⚠️ 使用降級內容: ${uid}`)
  
  return MOCK_CONTENT_ITEMS
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((item, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      content: item.content,
      hashtags: item.hashtags,
      emojis: item.emojis,
      topics: item.topics,
      likes: item.likes,
      dislikes: item.dislikes,
      qualityScore: item.qualityScore,
      generatedAt: new Date(),
      style: 'casual',
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
    console.error('計算多樣性分數失敗:', error)
    return 0.5
  }
}

function getRecentLikes(uid: string, hours: number = 1): number {
  // 模擬：隨機返回 0-10 次點讚
  return Math.floor(Math.random() * 10)
}