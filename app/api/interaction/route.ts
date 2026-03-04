import { NextRequest, NextResponse } from 'next/server'
import { calculateQualityScore } from '@/lib/quality-scoring'
import { validateRequest, createErrorResponse } from '@/lib/api-utils'
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
} from '@/lib/real-firebase'

const COLLECTIONS = {
  CONTENT: 'aipcs_content',
  INTERACTIONS: 'aipcs_interactions',
  FEEDBACK: 'aipcs_feedback',
  KEYWORD_CLICKS: 'aipcs_keyword_clicks'
} as const

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid: string = body.uid
    const contentId: string = body.contentId
    const action: string = body.action
    const dwellTime: number | undefined = body.dwellTime
    const scrollDepth: number | undefined = body.scrollDepth

    const validationError = validateRequest(body)
    if (validationError) {
      return validationError
    }

    if (!contentId || !action) {
      return createErrorResponse(
        'MISSING_FIELDS',
        'Missing required fields: contentId, action',
        400
      )
    }

    const db = getFirestoreDb()
    if (!db) {
      return createErrorResponse('FIRESTORE_UNAVAILABLE', 'Firestore not available', 503)
    }

    const feedbackText: string = body.feedbackText
    const keyword: string = body.keyword

    if (action === 'feedback' && feedbackText) {
      const feedbackDocRef = doc(collection(db, COLLECTIONS.FEEDBACK))
      await setDoc(feedbackDocRef, {
        uid,
        contentId,
        feedbackText,
        timestamp: serverTimestamp()
      })

      return NextResponse.json({
        success: true,
        data: {
          contentId,
          action: 'feedback',
          feedbackLength: feedbackText.length,
          processed: true
        }
      })
    }

    if (action === 'keyword_click' && keyword) {
      const keywordDocRef = doc(collection(db, COLLECTIONS.KEYWORD_CLICKS))
      await setDoc(keywordDocRef, {
        uid,
        contentId,
        keyword,
        timestamp: serverTimestamp()
      })

      return NextResponse.json({
        success: true,
        data: {
          contentId,
          action: 'keyword_click',
          keyword,
          processed: true
        }
      })
    }

    const contentRef = doc(db, COLLECTIONS.CONTENT, contentId)
    const contentSnap = await getDoc(contentRef)

    const contentData = contentSnap.exists() ? contentSnap.data() : null
    const currentScore = toNumber(contentData?.qualityScore, 50)

    const { newScore, reason } = calculateQualityScore(
      action as 'like' | 'dislike',
      currentScore,
      0,
      0.5,
      0,
      dwellTime
    )

    if (contentSnap.exists()) {
      const likes = toNumber(contentData?.likes, 0)
      const dislikes = toNumber(contentData?.dislikes, 0)

      await updateDoc(contentRef, {
        qualityScore: newScore,
        likes: action === 'like' ? likes + 1 : likes,
        dislikes: action === 'dislike' ? dislikes + 1 : dislikes,
        updatedAt: serverTimestamp()
      })
    }

    const interactionDocRef = doc(collection(db, COLLECTIONS.INTERACTIONS))
    await setDoc(interactionDocRef, {
      uid,
      contentId,
      type: action,
      dwellTime: dwellTime || 0,
      scrollDepth: scrollDepth || 0,
      timestamp: serverTimestamp()
    })

    const statsQuery = query(
      collection(db, COLLECTIONS.INTERACTIONS),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(200)
    )

    const statsSnap = await getDocs(statsQuery)
    let totalLikes = 0
    let totalDislikes = 0
    let totalViews = 0
    let totalLongDwells = 0

    statsSnap.forEach(docSnap => {
      const item = docSnap.data()
      if (item.type === 'like') totalLikes++
      if (item.type === 'dislike') totalDislikes++
      if (item.type === 'view') totalViews++
      if (item.type === 'long_dwell') totalLongDwells++
    })

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        newScore,
        oldScore: currentScore,
        reason,
        interaction: { action, dwellTime, scrollDepth }
      },
      userStats: {
        totalLikes,
        totalDislikes,
        totalViews,
        totalLongDwells
      }
    })

  } catch (error) {
    console.error('[Interaction] Failed to save interaction:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'INTERACTION_ERROR',
        message: '儲存互動失敗',
        data: {
          contentId: 'unknown',
          newScore: 50,
          oldScore: 50,
          reason: 'Error calculating score'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid')
    const contentId = req.nextUrl.searchParams.get('contentId')

    if (!uid) {
      return NextResponse.json({ error: '請提供 uid 參數' }, { status: 400 })
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ error: 'Firestore not available' }, { status: 503 })
    }

    const interactionsQuery = query(
      collection(db, COLLECTIONS.INTERACTIONS),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(200)
    )

    const querySnapshot = await getDocs(interactionsQuery)
    const interactions = querySnapshot.docs
      .map(docSnap => {
        const data = docSnap.data()
        const rawTimestamp = data.timestamp
        const timestamp = rawTimestamp instanceof Timestamp
          ? rawTimestamp.toDate().toISOString()
          : (typeof rawTimestamp?.toDate === 'function'
            ? rawTimestamp.toDate().toISOString()
            : new Date().toISOString())

        return {
          contentId: data.contentId,
          uid: data.uid,
          action: data.type,
          dwellTime: toNumber(data.dwellTime, 0),
          scrollDepth: toNumber(data.scrollDepth, 0),
          timestamp
        }
      })
      .filter(item => (contentId ? item.contentId === contentId : true))

    const stats = {
      totalInteractions: interactions.length,
      likes: interactions.filter(i => i.action === 'like').length,
      dislikes: interactions.filter(i => i.action === 'dislike').length,
      views: interactions.filter(i => i.action === 'view').length,
      avgDwellTime: Math.round(
        interactions.reduce((sum, item) => sum + (item.dwellTime || 0), 0) /
        Math.max(interactions.filter(i => i.dwellTime).length, 1)
      ),
      avgScrollDepth: Math.round(
        interactions.reduce((sum, item) => sum + (item.scrollDepth || 0), 0) /
        Math.max(interactions.filter(i => i.scrollDepth).length, 1)
      ) / 100
    }

    return NextResponse.json({
      success: true,
      interactions,
      stats
    })

  } catch (error) {
    return NextResponse.json({
      error: '獲取互動記錄失敗',
      stats: {
        totalInteractions: 0,
        likes: 0,
        dislikes: 0,
        views: 0,
        avgDwellTime: 0,
        avgScrollDepth: 0
      }
    }, { status: 500 })
  }
}
