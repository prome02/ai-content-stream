'use client'

/**
 * useContentGeneration Hook
 *
 * Generates content via /api/generate (server-side):
 * 1. Calls /api/generate which holds the Ollama API key securely
 * 2. Saves generated content to Firestore
 * 3. UI updates via Firestore onSnapshot (realtime)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { saveContent, subscribeToUserFeed } from '@/lib/content-service'
import { getBrowserLocale } from '@/lib/locale-utils'
import type { ContentItem, ContentSettings } from '@/types'

interface GenerationState {
  isGenerating: boolean
  currentIndex: number
  totalCount: number
  error: string | null
  source: 'ollama' | 'fallback' | null
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
   * Generate content via /api/generate and save results to Firestore
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

    subscribeToFeed(userId)

    try {
      const locale = getBrowserLocale()

      console.log(`[useContentGeneration] Generating progressively: count=${count}, locale=${locale}`)

      // Progressive generation: request 1 item at a time so the UI updates immediately.
      // (Server-side /api/generate may still generate multiple items, but we don't wait
      // for a full batch here.)
      const targetCount = Math.max(1, Math.min(Number(count) || 1, 10))
      let completed = 0

      for (let i = 0; i < targetCount; i++) {
        if (abortRef.current) {
          console.log('[useContentGeneration] Generation aborted')
          break
        }

        setState(prev => ({ ...prev, currentIndex: i, source: prev.source }))

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: userId,
            count: 1,
            mode: 'default',
            locale,
            interests,
            contentSettings,
            userFeedback
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API error: ${response.status}`)
        }

        const data = await response.json()
        if (!data.success || !data.contents?.length) {
          throw new Error('No content returned from API')
        }

        const source: 'ollama' | 'fallback' = data.source === 'ollama' ? 'ollama' : 'fallback'
        setState(prev => ({ ...prev, source }))

        const item = data.contents[0]
        await saveContent(userId, {
          content: item.content || '',
          hashtags: item.hashtags || [],
          topics: item.topics || [],
          style: item.style || 'casual',
          qualityScore: item.qualityScore || 80,
          likes: 0,
          dislikes: 0,
          usedBy: [],
          reuseCount: 0
        })

        completed++
        options.onItemGenerated?.(item as ContentItem, i)
        console.log(`[useContentGeneration] Item ${i + 1}/${targetCount} saved to Firestore`)
      }

      setState(prev => ({ ...prev, isGenerating: false }))
      options.onComplete?.(completed)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      console.error('[useContentGeneration] Error:', errorMessage)

      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))
      options.onError?.(errorMessage)
    }
  }, [subscribeToFeed, options])

  /**
   * Persist a list of ContentItems to Firestore
   */
  const persistContents = async (
    userId: string,
    contents: ContentItem[],
    source: 'ollama' | 'fallback'
  ) => {
    for (const item of contents) {
      if (abortRef.current) break
      await saveContent(userId, {
        content: item.content || '',
        hashtags: item.hashtags || [],
        topics: item.topics || [],
        style: item.style || 'casual',
        qualityScore: item.qualityScore || 80,
        likes: 0,
        dislikes: 0,
        usedBy: [],
        reuseCount: 0
      })
    }
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
    feedItems,
    isGenerating: state.isGenerating,
    currentIndex: state.currentIndex,
    totalCount: state.totalCount,
    error: state.error,
    source: state.source,

    generate,
    stop,
    clearFeed,
    subscribeToFeed
  }
}
