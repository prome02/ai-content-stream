'use client'

/**
 * Content Service - Manages content generation and Firestore storage
 * All operations run client-side
 */

import {
  getFirestoreDb,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from '@/lib/real-firebase'
import type { Unsubscribe } from '@/lib/real-firebase'
import type { ContentItem } from '@/types'

// Collection names
const COLLECTIONS = {
  CONTENT: 'aipcs_content',
  GENERATION_QUEUE: 'aipcs_generation_queue',
  USER_FEED: 'aipcs_user_feeds'
} as const

export interface GeneratedContent {
  id: string
  userId: string
  content: string
  hashtags: string[]
  topics: string[]
  style: string
  source: 'ollama' | 'mock' | 'fallback'
  qualityScore: number
  createdAt: Date | Timestamp | null  // serverTimestamp() can be null on pending writes
  // Interaction tracking
  likes: number
  dislikes: number
  viewCount: number
}

/**
 * Save generated content to Firestore
 */
export async function saveContent(
  userId: string,
  content: Omit<ContentItem, 'id' | 'generatedAt'>
): Promise<string> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firestore not available')
  }

  const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const contentRef = doc(db, COLLECTIONS.CONTENT, contentId)

  const contentData: GeneratedContent = {
    id: contentId,
    userId,
    content: content.content,
    hashtags: content.hashtags || [],
    topics: content.topics || [],
    style: content.style || 'casual',
    source: 'ollama',
    qualityScore: content.qualityScore || 80,
    createdAt: new Date(),
    likes: 0,
    dislikes: 0,
    viewCount: 0
  }

  await setDoc(contentRef, {
    ...contentData,
    createdAt: serverTimestamp()
  })

  console.log(`[ContentService] Saved content: ${contentId}`)
  return contentId
}

/**
 * Save multiple contents at once
 */
export async function saveContents(
  userId: string,
  contents: Omit<ContentItem, 'id' | 'generatedAt'>[]
): Promise<string[]> {
  const ids: string[] = []

  for (const content of contents) {
    const id = await saveContent(userId, content)
    ids.push(id)
  }

  return ids
}

/**
 * Get user's feed content from Firestore
 */
export async function getUserFeed(
  userId: string,
  maxItems: number = 20
): Promise<ContentItem[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.warn('[ContentService] Firestore not available')
    return []
  }

  try {
  const q = query(
    collection(db, COLLECTIONS.CONTENT),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc'),
    limit(maxItems)
  )

    const snapshot = await getDocs(q)
    const contents: ContentItem[] = []

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as GeneratedContent

      // Handle createdAt - serverTimestamp() can be null on pending writes
      let generatedAt: Date
      if (data.createdAt instanceof Timestamp) {
        generatedAt = data.createdAt.toDate()
      } else if (data.createdAt) {
        generatedAt = new Date(data.createdAt)
      } else {
        generatedAt = new Date()
      }

      contents.push({
        id: data.id,
        content: data.content,
        hashtags: data.hashtags || [],
        topics: data.topics || [],
        style: (data.style as 'casual' | 'formal') || 'casual',
        qualityScore: data.qualityScore || 80,
        generatedAt,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        usedBy: [],
        reuseCount: 0
      })
    })

    console.log(`[ContentService] Fetched ${contents.length} items for user: ${userId}`)
    return contents
  } catch (error) {
    console.error('[ContentService] Failed to get user feed:', error)
    return []
  }
}

/**
 * Subscribe to user's feed updates (realtime)
 */
export function subscribeToUserFeed(
  userId: string,
  onUpdate: (contents: ContentItem[]) => void,
  maxItems: number = 20
): Unsubscribe {
  const db = getFirestoreDb()
  if (!db) {
    console.warn('[ContentService] Firestore not available for subscription')
    return () => {}
  }

    const q = query(
      collection(db, COLLECTIONS.CONTENT),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc'),
      limit(maxItems)
    )

  console.log(`[ContentService] Subscribing to feed for user: ${userId}`)

  return onSnapshot(q, (snapshot) => {
    const contents: ContentItem[] = []

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as GeneratedContent

      // Handle createdAt - serverTimestamp() can be null on pending writes
      let generatedAt: Date
      if (data.createdAt instanceof Timestamp) {
        generatedAt = data.createdAt.toDate()
      } else if (data.createdAt) {
        generatedAt = new Date(data.createdAt)
      } else {
        // Pending write - serverTimestamp not yet resolved
        generatedAt = new Date()
      }

      contents.push({
        id: data.id,
        content: data.content,
        hashtags: data.hashtags || [],
        topics: data.topics || [],
        style: (data.style as 'casual' | 'formal') || 'casual',
        qualityScore: data.qualityScore || 80,
        generatedAt,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        usedBy: [],
        reuseCount: 0
      })
    })

    console.log(`[ContentService] Feed updated: ${contents.length} items`)
    onUpdate(contents)
  }, (error) => {
    console.error('[ContentService] Feed subscription error:', error)
  })
}

/**
 * Delete content by ID
 */
export async function deleteContent(contentId: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firestore not available')
  }

  await deleteDoc(doc(db, COLLECTIONS.CONTENT, contentId))
  console.log(`[ContentService] Deleted content: ${contentId}`)
}

/**
 * Clear all user's content
 */
export async function clearUserContent(userId: string): Promise<number> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firestore not available')
  }

  const q = query(
    collection(db, COLLECTIONS.CONTENT),
    where('userId', '==', userId)
  )

  const snapshot = await getDocs(q)
  let deletedCount = 0

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref)
    deletedCount++
  }

  console.log(`[ContentService] Cleared ${deletedCount} items for user: ${userId}`)
  return deletedCount
}

/**
 * Update content interaction (like/dislike)
 */
export async function updateContentInteraction(
  contentId: string,
  interaction: 'like' | 'dislike'
): Promise<void> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firestore not available')
  }

  const contentRef = doc(db, COLLECTIONS.CONTENT, contentId)
  const contentDoc = await getDoc(contentRef)

  if (!contentDoc.exists()) {
    throw new Error(`Content not found: ${contentId}`)
  }

  const data = contentDoc.data() as GeneratedContent
  const updates = interaction === 'like'
    ? { likes: (data.likes || 0) + 1 }
    : { dislikes: (data.dislikes || 0) + 1 }

  await setDoc(contentRef, updates, { merge: true })
  console.log(`[ContentService] Updated interaction: ${contentId} - ${interaction}`)
}
