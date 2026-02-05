'use client'

import {
  getFirestoreDb,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from './real-firebase'

import type { ContentSettings } from '@/types'
import { DEFAULT_CONTENT_SETTINGS } from '@/types'

// Collection names
const USERS_COLLECTION = 'aipcs_users'
const FEEDBACK_COLLECTION = 'aipcs_feedback'
const KEYWORD_CLICKS_COLLECTION = 'aipcs_keyword_clicks'
const INTERACTIONS_COLLECTION = 'aipcs_interactions'
const SETTINGS_COLLECTION = 'aipcs_user_settings'

export interface UserPreferences {
  interests: string[]
  style?: 'casual' | 'formal'
  language?: string
  createdAt?: Date
}

export interface UserFeedback {
  uid: string
  contentId: string
  feedbackText: string
  timestamp: Date
}

export interface KeywordClick {
  uid: string
  contentId: string
  keyword: string
  timestamp: Date
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Save user preferences (interest tags)
 */
export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping save on server-side')
    return
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    throw new Error('Firestore not initialized')
  }

  try {
    console.log('[UserData] Saving preferences for user:', userId)

    const userDocRef = doc(db, USERS_COLLECTION, userId)
    await setDoc(userDocRef, {
      preferences: {
        interests: preferences.interests,
        style: preferences.style || 'casual',
        language: preferences.language || 'zh-TW'
      },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true })

    console.log('[UserData] Preferences saved successfully')
  } catch (error) {
    console.error('[UserData] Failed to save preferences:', error)
    throw error
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping get on server-side')
    return null
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    return null
  }

  try {
    console.log('[UserData] Getting preferences for user:', userId)

    const userDocRef = doc(db, USERS_COLLECTION, userId)
    const docSnap = await getDoc(userDocRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data?.preferences) {
        console.log('[UserData] Found preferences:', data.preferences)
        return {
          interests: data.preferences.interests || [],
          style: data.preferences.style,
          language: data.preferences.language,
          createdAt: data.createdAt?.toDate?.() || undefined
        }
      }
    }

    console.log('[UserData] No preferences found for user:', userId)
    return null
  } catch (error) {
    console.error('[UserData] Failed to get preferences:', error)
    return null
  }
}

/**
 * Check if user has selected interests
 */
export async function hasUserSelectedInterests(
  userId: string
): Promise<boolean> {
  const preferences = await getUserPreferences(userId)
  const interests = preferences?.interests
  return interests ? interests.length > 0 : false
}

/**
 * Save user text feedback
 */
export async function saveUserFeedback(feedback: UserFeedback): Promise<void> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping save on server-side')
    return
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    return
  }

  try {
    console.log('[UserData] Saving feedback:', feedback.contentId, feedback.feedbackText.substring(0, 50) + '...')

    const feedbackDocRef = doc(collection(db, FEEDBACK_COLLECTION))
    await setDoc(feedbackDocRef, {
      uid: feedback.uid,
      contentId: feedback.contentId,
      feedbackText: feedback.feedbackText,
      timestamp: serverTimestamp()
    })

    console.log('[UserData] Feedback saved for user:', feedback.uid)
  } catch (error) {
    console.error('[UserData] Failed to save feedback:', error)
  }
}

/**
 * Save keyword click
 */
export async function saveKeywordClick(click: KeywordClick): Promise<void> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping save on server-side')
    return
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    return
  }

  try {
    console.log('[UserData] Saving keyword click:', click.keyword)

    const clickDocRef = doc(collection(db, KEYWORD_CLICKS_COLLECTION))
    await setDoc(clickDocRef, {
      uid: click.uid,
      contentId: click.contentId,
      keyword: click.keyword,
      timestamp: serverTimestamp()
    })

    console.log('[UserData] Keyword click saved:', click.keyword)
  } catch (error) {
    console.error('[UserData] Failed to save keyword click:', error)
  }
}

/**
 * Get user's recent feedback
 */
export async function getRecentFeedback(uid: string, count: number = 3): Promise<UserFeedback[]> {
  if (!isBrowser()) {
    return []
  }

  const db = getFirestoreDb()
  if (!db) {
    return []
  }

  try {
    const feedbackQuery = query(
      collection(db, FEEDBACK_COLLECTION),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    )

    const querySnapshot = await getDocs(feedbackQuery)
    const feedbacks: UserFeedback[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      feedbacks.push({
        uid: data.uid,
        contentId: data.contentId,
        feedbackText: data.feedbackText,
        timestamp: data.timestamp?.toDate?.() || new Date()
      })
    })

    return feedbacks
  } catch (error) {
    console.error('[UserData] Failed to get recent feedback:', error)
    return []
  }
}

/**
 * Get user's recent keyword clicks
 */
export async function getRecentKeywordClicks(uid: string, count: number = 5): Promise<string[]> {
  if (!isBrowser()) {
    return []
  }

  const db = getFirestoreDb()
  if (!db) {
    return []
  }

  try {
    const clicksQuery = query(
      collection(db, KEYWORD_CLICKS_COLLECTION),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(count)
    )

    const querySnapshot = await getDocs(clicksQuery)
    const keywords: string[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.keyword) {
        keywords.push(data.keyword)
      }
    })

    return keywords
  } catch (error) {
    console.error('[UserData] Failed to get recent keyword clicks:', error)
    return []
  }
}

// MVP: Simplified interface
export interface UserBehaviorStats {
  recentLikes: number
  recentDislikes: number
  recentSkips: number
  hasFeedback: boolean
  recentKeywords: string[]
  lastFeedback?: string
}

/**
 * Calculate user's recent behavior statistics
 */
export async function getUserBehaviorStats(uid: string): Promise<UserBehaviorStats> {
  if (!isBrowser()) {
    return {
      recentLikes: 0,
      recentDislikes: 0,
      recentSkips: 0,
      hasFeedback: false,
      recentKeywords: []
    }
  }

  const db = getFirestoreDb()
  if (!db) {
    return {
      recentLikes: 0,
      recentDislikes: 0,
      recentSkips: 0,
      hasFeedback: false,
      recentKeywords: []
    }
  }

  try {
    // Query recent interactions
    const interactionsQuery = query(
      collection(db, INTERACTIONS_COLLECTION),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    )

    const querySnapshot = await getDocs(interactionsQuery)

    let likes = 0
    let dislikes = 0
    let skips = 0

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.type === 'like') likes++
      if (data.type === 'dislike') dislikes++
      if (data.type === 'skip') skips++
    })

    // Get recent feedback and keywords
    const recentFeedback = await getRecentFeedback(uid, 1)
    const recentKeywords = await getRecentKeywordClicks(uid, 5)

    return {
      recentLikes: likes,
      recentDislikes: dislikes,
      recentSkips: skips,
      hasFeedback: recentFeedback.length > 0,
      recentKeywords,
      lastFeedback: recentFeedback[0]?.feedbackText
    }

  } catch (error) {
    console.error('[UserData] Failed to get behavior stats:', error)
    return {
      recentLikes: 0,
      recentDislikes: 0,
      recentSkips: 0,
      hasFeedback: false,
      recentKeywords: []
    }
  }
}

// ============================================================
// Content Settings Management
// ============================================================

/**
 * Save user content settings to Firestore
 */
export async function saveContentSettings(
  userId: string,
  settings: ContentSettings
): Promise<void> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping save on server-side')
    return
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    throw new Error('Firestore not initialized')
  }

  try {
    console.log('[UserData] Saving content settings for user:', userId)

    const settingsDocRef = doc(db, SETTINGS_COLLECTION, userId)
    await setDoc(settingsDocRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true })

    console.log('[UserData] Content settings saved successfully')
  } catch (error) {
    console.error('[UserData] Failed to save content settings:', error)
    throw error
  }
}

/**
 * Get user content settings from Firestore
 */
export async function getContentSettings(
  userId: string
): Promise<ContentSettings> {
  if (!isBrowser()) {
    console.log('[UserData] Skipping get on server-side')
    return { ...DEFAULT_CONTENT_SETTINGS }
  }

  const db = getFirestoreDb()
  if (!db) {
    console.error('[UserData] Firestore not available')
    return { ...DEFAULT_CONTENT_SETTINGS }
  }

  try {
    console.log('[UserData] Getting content settings for user:', userId)

    const settingsDocRef = doc(db, SETTINGS_COLLECTION, userId)
    const docSnap = await getDoc(settingsDocRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      console.log('[UserData] Found content settings')
      return {
        tone: data.tone || DEFAULT_CONTENT_SETTINGS.tone,
        style: data.style || DEFAULT_CONTENT_SETTINGS.style,
        depth: data.depth || DEFAULT_CONTENT_SETTINGS.depth,
        length: data.length || DEFAULT_CONTENT_SETTINGS.length,
        topic: data.topic || DEFAULT_CONTENT_SETTINGS.topic,
        freshness: data.freshness || DEFAULT_CONTENT_SETTINGS.freshness,
        autoInfiniteScroll: data.autoInfiniteScroll ?? DEFAULT_CONTENT_SETTINGS.autoInfiniteScroll,
      }
    }

    console.log('[UserData] No content settings found, using defaults')
    return { ...DEFAULT_CONTENT_SETTINGS }
  } catch (error) {
    console.error('[UserData] Failed to get content settings:', error)
    return { ...DEFAULT_CONTENT_SETTINGS }
  }
}

/**
 * Reset user content settings to defaults
 */
export async function resetContentSettings(
  userId: string
): Promise<ContentSettings> {
  const defaults = { ...DEFAULT_CONTENT_SETTINGS }
  await saveContentSettings(userId, defaults)
  return defaults
}
