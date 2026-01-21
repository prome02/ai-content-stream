// A/B 測試事件追蹤和數據收集系統

import AbTestingManager, { QualityScoreVariant } from './ab-testing'

export type EventType = 
  | 'content_view'          // 內容瀏覽
  | 'content_interaction'   // 內容互動（點讚/不讚）
  | 'quality_score_update'  // 品質分數更新
  | 'ab_test_exposure'      // A/B 測試曝光
  | 'user_behavior'         // 使用者行為（停留時間、滾動深度）

export interface EventData {
  event_type: EventType
  uid: string
  timestamp: Date
  variant: QualityScoreVariant | null
  metadata: Record<string, any>
  session_id: string
  sequence_id: number
}

export interface UserSession {
  session_id: string
  uid: string
  started_at: Date
  last_activity: Date
  page_views: number
  interactions: number
  variant: QualityScoreVariant | null
}

// 事件追蹤管理器
class EventTrackingManager {
  private events: EventData[] = []
  private sessions = new Map<string, UserSession>()
  
  // 序列號追蹤
  private sequenceCounters = new Map<string, number>()
  
  constructor() {
    // 定期清理舊事件（模擬）
    setInterval(() => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      this.events = this.events.filter(event => event.timestamp > hourAgo)
    }, 60 * 60 * 1000) // 每小時清理
  }

  /**
   * 開始使用者會話
   */
  startSession(uid: string): string {
    const session_id = this.generateSessionId()
    const variant = AbTestingManager.assignVariant(uid)
    
    const session: UserSession = {
      session_id,
      uid,
      started_at: new Date(),
      last_activity: new Date(),
      page_views: 0,
      interactions: 0,
      variant
    }
    
    this.sessions.set(session_id, session)
    
    // 記錄曝光事件
    this.trackEvent('ab_test_exposure', uid, {
      variant,
      session_id
    })
    
    return session_id
  }

  /**
   * 追蹤事件
   */
  trackEvent(
    event_type: EventType,
    uid: string,
    metadata: Record<string, any> = {}
  ): void {
    const session = this.getOrCreateSession(uid)
    
    // 更新會話活動時間
    session.last_activity = new Date()
    
    // 事件基礎元數據
    const baseMetadata = {
      ...metadata,
      session_id: session.session_id,
      page_views: session.page_views,
      interactions: session.interactions
    }
    
    // 獲取序列號
    const sequenceKey = `${uid}_${event_type}`
    const sequence_id = this.getNextSequence(sequenceKey)
    
    // 紀錄事件
    const event: EventData = {
      event_type,
      uid,
      timestamp: new Date(),
      variant: session.variant,
      metadata: baseMetadata,
      session_id: session.session_id,
      sequence_id
    }
    
    this.events.push(event)
    console.log(`📊 事件追蹤: ${event_type}`, { uid, variant: session.variant, sequence_id })
    
    // 更新會話統計
    if (event_type === 'content_view') {
      session.page_views++
    }
    if (event_type === 'content_interaction') {
      session.interactions++
    }
    
    this.truncateEvents() // 防止記憶體過度使用
  }

  /**
   * 追蹤內容互動（點讚/不讚）
   */
  trackContentInteraction(
    uid: string,
    contentId: string,
    action: 'like' | 'dislike',
    quality_score: number,
    old_score: number,
    config: any
  ): void {
    const delta = quality_score - old_score
    const weight = delta > 0 ? (delta / config.likeScore) : (delta / config.dislikeScore)
    
    this.trackEvent('content_interaction', uid, {
      content_id: contentId,
      action,
      quality_score,
      old_score,
      delta,
      weight,
      config_variant: config.variant,
      like_score: config.likeScore,
      dislike_score: config.dislikeScore,
      dwell_time_bonus: config.dwellTimeBonus
    })
    
    // 同時追蹤品質分數更新事件
    this.trackEvent('quality_score_update', uid, {
      content_id: contentId,
      new_score: quality_score,
      delta,
      config_variant: config.variant
    })
    
    // 記錄到 AB 測試系統
    AbTestingManager.recordInteraction(uid)
  }

  /**
   * 取得 A/B 測試統計數據
   */
  getAbTestStats(): Record<string, any> {
    const variantGroups: Record<QualityScoreVariant, EventData[]> = {
      'A': [], 'B': [], 'C': [], 'D': []
    }
    
    // 按變體分組事件
    this.events.forEach(event => {
      if (event.variant) {
        variantGroups[event.variant].push(event)
      }
    })
    
    // 計算變體統計
    const stats: Record<string, any> = {}
    
    Object.entries(variantGroups).forEach(([variant, events]) => {
      const typedVariant = variant as QualityScoreVariant
      const contentInteractions = events.filter(e => e.event_type === 'content_interaction')
      const viewEvents = events.filter(e => e.event_type === 'content_view')
      
      const likeCount = contentInteractions.filter(e => 
        e.metadata.action === 'like'
      ).length
      
      const dislikeCount = contentInteractions.filter(e => 
        e.metadata.action === 'dislike'
      ).length
      
      const totalInteractions = likeCount + dislikeCount
      const viewCount = viewEvents.length
      
      // 轉化率（互動/瀏覽）
      const conversionRate = viewCount > 0 ? (totalInteractions / viewCount) * 100 : 0
      
      // 滿意度比（點讚/總互動）
      const satisfactionRate = totalInteractions > 0 ? (likeCount / totalInteractions) * 100 : 0
      
      stats[typedVariant] = {
        total_events: events.length,
        content_views: viewCount,
        content_interactions: totalInteractions,
        likes: likeCount,
        dislikes: dislikeCount,
        conversion_rate: conversionRate.toFixed(2),
        satisfaction_rate: satisfactionRate.toFixed(2),
        unique_users: new Set(events.map(e => e.uid)).size
      }
    })
    
    // 計算整體統計
    const allEvents = Object.values(variantGroups).flat()
    const overallStats = {
      total_events: allEvents.length,
      unique_users: new Set(allEvents.map(e => e.uid)).size,
      active_sessions: this.sessions.size,
      event_distribution: Object.fromEntries(
        Object.entries(variantGroups).map(([v, events]) => 
          [v, events.length]
        )
      )
    }
    
    return {
      variants: stats,
      overall: overallStats,
      time_range: {
        oldest: this.events.length > 0 ? this.events[0].timestamp : null,
        newest: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
        hours_retained: Math.ceil(allEvents.length / 1000) // 估算
      }
    }
  }

  /**
   * 取得使用者會話統計
   */
  getUserSessionStats(uid: string): UserSession | null {
    for (const session of this.sessions.values()) {
      if (session.uid === uid) {
        return session
      }
    }
    return null
  }

  /**
   * 取得事件序列
   */
  getEvents(
    event_type?: EventType,
    variant?: QualityScoreVariant,
    startDate?: Date,
    endDate?: Date
  ): EventData[] {
    let filtered = this.events
    
    if (event_type) {
      filtered = filtered.filter(event => event.event_type === event_type)
    }
    
    if (variant) {
      filtered = filtered.filter(event => event.variant === variant)
    }
    
    if (startDate) {
      filtered = filtered.filter(event => event.timestamp >= startDate)
    }
    
    if (endDate) {
      filtered = filtered.filter(event => event.timestamp <= endDate)
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 匯出事件數據（用於分析）
   */
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    const events = this.events.map(event => ({
      ...event,
      timestamp: event.timestamp.toISOString()
    }))
    
    if (format === 'csv') {
      // 簡單的 CSV 轉換
      const headers = ['event_type', 'uid', 'timestamp', 'variant', 'sequence_id', 'session_id']
      const rows = events.map(event => [
        event.event_type,
        event.uid,
        event.timestamp,
        event.variant,
        event.sequence_id,
        event.session_id
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')
      
      return csvContent
    }
    
    return JSON.stringify(events, null, 2)
  }

  /**
   * 清理事件數據（防止記憶體暴增）
   */
  truncateEvents(maxEvents: number = 10000): void {
    if (this.events.length > maxEvents) {
      this.events = this.events.slice(this.events.length - maxEvents)
    }
  }

  /**
   * 獲取或建立使用者的會話
   */
  private getOrCreateSession(uid: string): UserSession {
    // 尋找現存會話
    for (const session of this.sessions.values()) {
      if (session.uid === uid) {
        // 檢查會話是否過期（30分鐘無活動）
        const timeout = 30 * 60 * 1000
        if (new Date().getTime() - session.last_activity.getTime() > timeout) {
          // 過期，建立新會話
          return this.createNewSession(uid)
        }
        return session
      }
    }
    
    // 建立新會話
    return this.createNewSession(uid)
  }

  private createNewSession(uid: string): UserSession {
    const session_id = this.generateSessionId()
    const variant = AbTestingManager.assignVariant(uid)
    
    const session: UserSession = {
      session_id,
      uid,
      started_at: new Date(),
      last_activity: new Date(),
      page_views: 0,
      interactions: 0,
      variant
    }
    
    this.sessions.set(session_id, session)
    return session
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getNextSequence(key: string): number {
    const current = this.sequenceCounters.get(key) || 0
    const next = current + 1
    this.sequenceCounters.set(key, next)
    return next
  }
}

// 預設匯出單例
export default new EventTrackingManager()