import { NextRequest, NextResponse } from 'next/server'
import EventTrackingManager from '@/lib/event-tracking'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      uid, 
      content_id, 
      action, 
      old_score, 
      new_score,
      variant,
      config
    } = body

    // 參數驗證
    if (!uid) {
      return NextResponse.json(
        { error: '缺少使用者 ID (uid)' },
        { status: 400 }
      )
    }

    console.log('📊 事件追蹤 API 呼叫:', { uid, content_id, action, variant })

    // 計算分數變化
    const delta = new_score - old_score
    const weight = action === 'like' 
      ? (delta / (config?.likeScore || 5))
      : (delta / (config?.dislikeScore || -8))

    // 追蹤事件到事件追蹤系統
    EventTrackingManager.trackEvent('content_interaction', uid, {
      content_id,
      action,
      old_score,
      new_score,
      delta,
      weight,
      variant,
      config_variant: variant,
      like_score: config?.likeScore || 5,
      dislike_score: config?.dislikeScore || -8,
      dwell_time_bonus: config?.dwellTimeBonus || 8
    })

    // 追蹤品質分數更新事件
    EventTrackingManager.trackEvent('quality_score_update', uid, {
      content_id,
      new_score,
      delta,
      config_variant: variant
    })

    return NextResponse.json({
      success: true,
      message: '事件追蹤成功',
      data: {
        uid,
        content_id,
        action,
        old_score,
        new_score,
        delta,
        variant,
        tracked_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('事件追蹤 API 錯誤:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'EVENT_TRACKING_FAILED',
        message: error instanceof Error ? error.message : '事件追蹤失敗'
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const uid = searchParams.get('uid')
  const variant = searchParams.get('variant')
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  try {
    // 獲取事件數據
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const events = EventTrackingManager.getEvents(
      undefined,
      variant ? (variant as any) : undefined,
      start,
      end
    )

    // 獲取 A/B 測試統計
    const stats = EventTrackingManager.getAbTestStats()

    return NextResponse.json({
      success: true,
      data: {
        total_events: events.length,
        events: events.slice(0, 100), // 限制返回數量
        ab_test_stats: stats,
        user_session: uid ? EventTrackingManager.getUserSessionStats(uid) : null
      }
    })

  } catch (error) {
    console.error('獲取事件數據失敗:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_EVENTS_FAILED',
        message: error instanceof Error ? error.message : '獲取事件數據失敗'
      },
      { status: 500 }
    )
  }
}