// lib/analytics.ts

import { logEvent } from 'firebase/analytics'
import { getFirebaseAnalytics } from './real-firebase'

/**
 * 事件類型定義
 */
export type AnalyticsEventName =
  | 'content_like'
  | 'content_dislike'
  | 'content_skip'
  | 'keyword_click'
  | 'feedback_submit'
  | 'content_impression'
  | 'content_generated'

/**
 * 事件參數類型
 */
export interface ContentEventParams {
  content_id: string
  topics?: string[]
  style?: string
}

export interface KeywordClickParams {
  keyword: string
  content_id: string
}

export interface FeedbackParams {
  content_id: string
  feedback_length: number
}

export interface ContentGeneratedParams {
  role_module: string
  perspective_module: string
  format_module: string
  depth_module: string
  news_count: number
}

export interface ContentImpressionParams {
  content_id: string
  topics?: string[]
  position: number  // 在 feed 中的位置
}

/**
 * 記錄分析事件
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  params: Record<string, any>
): Promise<void> {
  try {
    const analytics = await getFirebaseAnalytics()

    if (!analytics) {
      // 開發環境或不支援時，只記錄到 console
      console.log(`[Analytics] Event: ${eventName}`, params)
      return
    }

    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString()
    })

    console.log(`[Analytics] Logged: ${eventName}`)
  } catch (error) {
    console.error(`[Analytics] Failed to log ${eventName}:`, error)
  }
}

/**
 * 便捷方法：記錄內容讚
 */
export function trackContentLike(params: ContentEventParams): Promise<void> {
  return trackEvent('content_like', params)
}

/**
 * 便捷方法：記錄內容不讚
 */
export function trackContentDislike(params: ContentEventParams): Promise<void> {
  return trackEvent('content_dislike', params)
}

/**
 * 便捷方法：記錄內容跳過（無感覺）
 */
export function trackContentSkip(params: ContentEventParams & { dwell_time: number }): Promise<void> {
  return trackEvent('content_skip', params)
}

/**
 * 便捷方法：記錄關鍵字點擊
 */
export function trackKeywordClick(params: KeywordClickParams): Promise<void> {
  return trackEvent('keyword_click', params)
}

/**
 * 便捷方法：記錄意見提交
 */
export function trackFeedbackSubmit(params: FeedbackParams): Promise<void> {
  return trackEvent('feedback_submit', params)
}

/**
 * 便捷方法：記錄內容曝光
 */
export function trackContentImpression(params: ContentImpressionParams): Promise<void> {
  return trackEvent('content_impression', params)
}

/**
 * 便捷方法：記錄內容生成事件
 */
export function trackContentGenerated(params: ContentGeneratedParams): Promise<void> {
  return trackEvent('content_generated', params)
}