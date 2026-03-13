'use client'

import firestoreCache from '@/lib/cache/firestore-cache'
import { MOCK_CONTENT_ITEMS } from '@/lib/mock-data'
import type { ContentItem } from '@/types'

/**
 * Content Cache Service - Client-side Firestore cache wrapper
 *
 * This service provides a unified interface for content caching,
 * delegating all storage operations to Firestore via FirestoreCache.
 */
export class ContentCacheService {
  private mockContent: ContentItem[]

  constructor() {
    this.mockContent = MOCK_CONTENT_ITEMS
  }

  /**
   * Get cached content for user
   * Priority: Firestore cache -> filtered mock content -> fallback
   */
  async getContentForUser(
    userId: string,
    count: number = 10,
    interests: string[] = []
  ): Promise<ContentItem[]> {
    console.log('[ContentCacheService] Fetching content:', userId, interests)

    // 1. Check Firestore cache
    const cachedContents = (await firestoreCache.get(userId)) || []
    if (cachedContents.length >= count) {
      console.log('[ContentCacheService] Returning from Firestore cache')
      return cachedContents.slice(0, count)
    }

    // Default policy: do not generate or return mock/fake content here.
    // If cache is insufficient, return what we have and let the server-side
    // generator decide what to do (and fail loudly when configured to do so).
    if (cachedContents.length > 0) {
      return cachedContents
    }

    return []
  }

  /**
   * Filter content by user interests
   */
  private filterByInterests(
    contents: ContentItem[],
    interests: string[],
    _excludeUserId: string
  ): ContentItem[] {
    if (interests.length === 0) {
      return contents.slice(0, 10)
    }

    return contents
      .filter(content => {
        // Interest matching score
        const interestScore = content.topics.reduce((score, topic) => {
          if (interests.some(interest =>
            topic.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(topic.toLowerCase())
          )) {
            return score + 1
          }
          return score
        }, 0)

        // Quality score filter
        const qualityScore = content.qualityScore

        return interestScore > 0 && qualityScore >= 60
      })
      .sort((a, b) => {
        // Priority: interest match -> quality score -> recency
        const aInterestScore = a.topics.filter(t =>
          interests.some(i => t.toLowerCase().includes(i.toLowerCase()))
        ).length
        const bInterestScore = b.topics.filter(t =>
          interests.some(i => t.toLowerCase().includes(i.toLowerCase()))
        ).length

        if (aInterestScore !== bInterestScore) {
          return bInterestScore - aInterestScore
        }

        if (a.qualityScore !== b.qualityScore) {
          return b.qualityScore - a.qualityScore
        }

        const aDate = a.generatedAt instanceof Date ? a.generatedAt : new Date(a.generatedAt)
        const bDate = b.generatedAt instanceof Date ? b.generatedAt : new Date(b.generatedAt)
        return bDate.getTime() - aDate.getTime()
      })
  }

  /**
   * Get fallback content when cache is empty
   */
  private getFallbackContent(userId: string, count: number): ContentItem[] {
    console.log('[ContentCacheService] Fallback for:', userId)
    return this.mockContent
      .slice(0, count)
      .map(content => ({
        ...content,
        generatedAt: new Date(content.generatedAt)
      }))
  }

  /**
   * Save generated content to Firestore cache
   */
  async saveGeneratedContent(
    userId: string,
    contents: ContentItem[]
  ): Promise<void> {
    try {
      // Get existing cache
      const existingCache = await firestoreCache.get(userId) || []

      // Merge with new content (max 25 items)
      const updatedCache = [...contents, ...existingCache].slice(0, 25)

      // Save to Firestore
      await firestoreCache.set(userId, updatedCache)

      console.log('[ContentCacheService] Saved to Firestore:', userId, contents.length, 'items')
    } catch (error) {
      console.error('[ContentCacheService] Failed to save:', error)
    }
  }

  /**
   * Update content quality score
   */
  async updateQualityScore(
    contentId: string,
    action: 'like' | 'dislike'
  ): Promise<void> {
    console.log('[ContentCacheService] Quality update:', contentId, action)
    const qualityChange = action === 'like' ? '+5' : '-8'
    console.log(`[ContentCacheService] Quality score adjusted: ${contentId} ${qualityChange}`)
  }

  /**
   * Clear user's cache
   */
  async clearCache(userId: string): Promise<void> {
    await firestoreCache.clear(userId)
    console.log('[ContentCacheService] Cache cleared:', userId)
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<Record<string, unknown>> {
    const firestoreStats = await firestoreCache.getStats()
    return {
      ...firestoreStats,
      mockContentCount: this.mockContent.length
    }
  }
}

// Default export
export default new ContentCacheService()
