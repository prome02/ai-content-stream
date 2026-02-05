'use client'

/**
 * useContentGeneration Hook
 *
 * Generates content directly from browser:
 * 1. Calls Ollama API directly
 * 2. Saves generated content to Firestore
 * 3. UI updates via Firestore onSnapshot (realtime)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { generateContent, checkOllamaHealth, type OllamaMessage } from '@/lib/ollama-browser'
import { saveContent, subscribeToUserFeed } from '@/lib/content-service'
import { PromptBuilder, type ModularPromptContext } from '@/lib/prompt-builder'
import { fetchNews } from '@/lib/news-fetcher'
import { getDefaultBehavior } from '@/lib/prompt-selector'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import type { ContentItem, ContentSettings, InterestCategory } from '@/types'

interface GenerationState {
  isGenerating: boolean
  currentIndex: number
  totalCount: number
  error: string | null
  source: 'ollama' | 'mock' | 'fallback' | null
}

interface UseContentGenerationOptions {
  onItemGenerated?: (item: ContentItem, index: number) => void
  onComplete?: (count: number) => void
  onError?: (error: string) => void
}

export function useContentGeneration(options: UseContentGenerationOptions = {}) {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentIndex: -1,
    totalCount: 0,
    error: null,
    source: null
  })

  const [feedItems, setFeedItems] = useState<ContentItem[]>([])
  const abortRef = useRef(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to Firestore feed updates
  const subscribeToFeed = useCallback((userId: string) => {
    // Unsubscribe previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    unsubscribeRef.current = subscribeToUserFeed(userId, (contents) => {
      setFeedItems(contents)
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  /**
   * Generate content using Ollama and save to Firestore
   */
  const generate = useCallback(async (
    userId: string,
    count: number = 3,
    interests: string[] = [],
    contentSettings?: ContentSettings,
    userFeedback?: string
  ) => {
    abortRef.current = false

    setState({
      isGenerating: true,
      currentIndex: 0,
      totalCount: count,
      error: null,
      source: null
    })

    // Start listening to Firestore updates
    subscribeToFeed(userId)

    try {
      // Check Ollama availability
      const isOllamaAvailable = await checkOllamaHealth()

      if (!isOllamaAvailable) {
        console.warn('[useContentGeneration] Ollama not available, using mock data')
        await generateMockContent(userId, count)
        return
      }

      // Fetch news for prompt context
      const interestCategories = interests as InterestCategory[]
      const news = await fetchNews({
        interests: interestCategories,
        maxItems: 5,
        locale: 'zh-TW'
      })

      console.log(`[useContentGeneration] Fetched ${news.length} news items`)

      const promptBuilder = new PromptBuilder()

      // Generate items one by one
      for (let i = 0; i < count; i++) {
        if (abortRef.current) {
          console.log('[useContentGeneration] Generation aborted')
          break
        }

        setState(prev => ({ ...prev, currentIndex: i }))

        try {
          // Build prompt
          const context: ModularPromptContext = {
            userPreferences: { interests, language: 'zh-TW' },
            news,
            behavior: getDefaultBehavior(),
            userFeedback: userFeedback,
            contentSettings,
          }

          const promptJson = promptBuilder.buildModularPrompt(context)
          const promptData = JSON.parse(promptJson)

          const messages: OllamaMessage[] = promptData.messages

          console.log(`[useContentGeneration] Generating item ${i + 1}/${count} with model: ${promptData.model || 'default'}`)

          // Call Ollama directly from browser
          const response = await generateContent(
            messages,
            promptData.options || {},
            promptData.model ? { model: promptData.model } : {}
          )

          // Parse response
          const parsed = promptBuilder.parseResponse(response.message.content)

          if (parsed.length > 0) {
            const item = parsed[0]

            // Save to Firestore (this triggers onSnapshot update)
            await saveContent(userId, {
              content: item.content || '',
              hashtags: item.hashtags || [],
              topics: item.topics || [],
              style: item.style || 'casual',
              qualityScore: 80 + Math.floor(Math.random() * 20),
              likes: 0,
              dislikes: 0,
              usedBy: [],
              reuseCount: 0
            })

            setState(prev => ({ ...prev, source: 'ollama' }))
            options.onItemGenerated?.(item as ContentItem, i)

            console.log(`[useContentGeneration] Item ${i + 1}/${count} saved to Firestore`)
          }
        } catch (itemError) {
          console.error(`[useContentGeneration] Failed to generate item ${i + 1}:`, itemError)
          // Continue with next item
        }
      }

      setState(prev => ({ ...prev, isGenerating: false }))
      options.onComplete?.(count)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      console.error('[useContentGeneration] Error:', errorMessage)

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }))

      // Fallback to mock data
      await generateMockContent(userId, count)
      options.onError?.(errorMessage)
    }
  }, [subscribeToFeed, options])

  /**
   * Generate mock content (fallback)
   */
  const generateMockContent = async (userId: string, count: number) => {
    console.log('[useContentGeneration] Using mock content')

    const mockItems = MOCK_CONTENT_ITEMS
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    for (let i = 0; i < mockItems.length; i++) {
      if (abortRef.current) break

      setState(prev => ({ ...prev, currentIndex: i, source: 'mock' }))

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 300))

      await saveContent(userId, {
        content: mockItems[i].content,
        hashtags: mockItems[i].hashtags,
        topics: mockItems[i].topics,
        style: 'casual',
        qualityScore: 75 + Math.floor(Math.random() * 25),
        likes: 0,
        dislikes: 0,
        usedBy: [],
        reuseCount: 0
      })

      options.onItemGenerated?.(mockItems[i] as ContentItem, i)
    }

    setState(prev => ({ ...prev, isGenerating: false }))
    options.onComplete?.(count)
  }

  /**
   * Stop generation
   */
  const stop = useCallback(() => {
    abortRef.current = true
    setState(prev => ({ ...prev, isGenerating: false }))
  }, [])

  /**
   * Clear feed and unsubscribe
   */
  const clearFeed = useCallback(() => {
    setFeedItems([])
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  return {
    // State
    feedItems,
    isGenerating: state.isGenerating,
    currentIndex: state.currentIndex,
    totalCount: state.totalCount,
    error: state.error,
    source: state.source,

    // Actions
    generate,
    stop,
    clearFeed,
    subscribeToFeed
  }
}
