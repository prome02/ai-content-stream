import { NextRequest, NextResponse } from 'next/server'
import { calculateQualityScore, updateLocalStorageScore, getUserData, getUserAge, getPositiveRate, getRecentLikes, InteractionAction } from '@/lib/quality-scoring'
import AbTestingManager from '@/lib/ab-testing'
import EventTrackingManager from '@/lib/event-tracking'
import { db } from '@/lib/firebase' // 實際應該導入，但暫時模擬

// 模擬 Firestore 操作
const mockContentMap = new Map<string, any>()

// 模擬使用者資料
const mockUsers = new Map<string, any>()

// 模擬互動記錄
const mockInteractions = new Map<string, Array<{
  contentId: string
  uid: string
  action: string
  dwellTime?: number
  scrollDepth?: number
  timestamp: string
}>>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const uid: string = body.uid
    const contentId: string = body.contentId
    const action: string = body.action
    const dwellTime: number = body.dwellTime
    const scrollDepth: number = body.scrollDepth
    
    // 積證必要欄位
    if (!uid || !contentId || !action) {
      return NextResponse.json(
        { error: '缺少必要欄位: uid, contentId, action' },
        { status: 400 }
      )
    }

    // 2. 獲取當前內容品質分數
    let currentScore = 50
    const contentData = mockContentMap.get(contentId)
    
    if (contentData) {
      currentScore = contentData.qualityScore
    }

    // 3. 取得使用者參數
    const userData = mockUsers.get(uid) || {
      createdAt: new Date(),
      stats: {
        totalLikes: 0,
        totalDislikes: 0,
        totalViews: 0,
        totalLongDwells: 0
      }
    }

    const userAge = getUserAge(userData.createdAt)
    const positiveRate = getPositiveRate(userData)
    const recentLikes = getRecentLikes(uid)

    // 4. 使用 AB 測試的品質評分系統
    const abConfig = AbTestingManager.getUserConfig(uid)
    const { newScore, reason } = AbTestingManager.calculateQualityScoreWithVariant(
      action as 'like' | 'dislike',
      currentScore,
      userAge,
      positiveRate,
      recentLikes,
      abConfig,
      dwellTime
    )

    console.log('📈 品質分數計算 (變體', abConfig.variant, '):', `${currentScore} → ${newScore}`, { reason })
    
    // 記錄互動到 AB 測試系統
    AbTestingManager.recordInteraction(uid)
    
    // 追蹤互動事件到事件追蹤系統
    EventTrackingManager.trackContentInteraction(
      uid,
      contentId,
      action as 'like' | 'dislike',
      newScore,
      currentScore,
      abConfig
    )

    // 5. 更新內容品質分數（模擬）
    if (contentData) {
      const newContent = {
        ...contentData,
        qualityScore: newScore,
        ...(action === 'like' && { likes: (contentData.likes || 0) + 1 }),
        ...(action === 'dislike' && { dislikes: (contentData.dislikes || 0) + 1 })
      }
      mockContentMap.set(contentId, newContent)
    }

    // 6. 儲存互動記錄（模擬）
    const storageKey = `aipcs_interaction_${uid}`
    const existing = mockInteractions.get(storageKey) || []

    const newInteraction = {
      contentId,
      uid,
      action,
      dwellTime: dwellTime || 0,
      scrollDepth: scrollDepth || 0,
      timestamp: new Date().toISOString()
    }

    // 只保留最近 100 筆
    if (existing.length >= 100) {
      existing.shift()
    }

    existing.push(newInteraction)
    mockInteractions.set(storageKey, existing)

    // 7. 更新使用者統計（模擬）
    if (!mockUsers.has(uid)) {
      mockUsers.set(uid, {
        ...userData,
        createdAt: new Date()
      })
    }

    const user = mockUsers.get(uid)
    if (action === 'like') {
      user.stats.totalLikes++
    } else if (action === 'dislike') {
      user.stats.totalDislikes++
    } else if (action === 'view') {
      user.stats.totalViews++
    } else if (action === 'long_dwell') {
      user.stats.totalLongDwells++
    }

    // 8. 更新 localStorage 儲存的使用者偏好（透過 mockData）
    // 這個實際上已經在 other mock data 處理，不需要再重複

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
        totalLikes: user.stats.totalLikes,
        totalDislikes: user.stats.totalDislikes,
        totalViews: user.stats.totalViews,
        totalLongDwells: user.stats.totalLongDwells
      },
      metadata: {
        userAge: Math.round(userAge),
        positiveRate: positiveRate,
        recentLikes: recentLikes
      }
    })

  } catch (error) {
    console.error('儲存互動失敗:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'INTERACTION_ERROR',
        message: '儲存互動失敗，使用本地儲存',
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
      return NextResponse.json({
        error: '請提供 uid 參數'
      }, { status: 400 })
    }

    const storageKey = `aipcs_interaction_${uid}`
    const interactions = mockInteractions.get(storageKey) || []

    // 如果有 contentId，篩選特定內容的互動
    const filteredInteractions = contentId
      ? interactions.filter(i => i.contentId === contentId)
      : interactions

    // 計算統計數據
    const stats = {
      totalInteractions: filteredInteractions.length,
      likes: filteredInteractions.filter(i => i.action === 'like').length,
      dislikes: filteredInteractions.filter(i => i.action === 'dislike').length,
      views: filteredInteractions.filter(i => i.action === 'view').length,
      avgDwellTime: Math.round(
        interactions.filter(i => i.dwellTime)
          .reduce((sum, item) => sum + (item.dwellTime || 0), 0) /
        Math.max(filteredInteractions.filter(i => i.dwellTime).length, 1)
      ),
      avgScrollDepth: Math.round(
        interactions.filter(i => i.scrollDepth)
          .reduce((sum, item) => sum + (item.scrollDepth || 0), 0) /
        Math.max(filteredInteractions.filter(i => i.scrollDepth).length, 100)
      ) / 100
    }

    return NextResponse.json({
      success: true,
      interactions: filteredInteractions,
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