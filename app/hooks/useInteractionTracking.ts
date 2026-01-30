'use client'

import { useEffect, useRef } from 'react'
import {
  trackContentLike,
  trackContentDislike,
  trackContentSkip,
  trackKeywordClick,
  trackFeedbackSubmit,
  trackContentImpression
} from '@/lib/analytics'

/**
 * 互動追蹤 hook - 追蹤使用者與內容的互動行為
 * 包括：可見時間、滾動深度、停留時間、互動類型
 */
interface InteractionEvent {
  contentId: string
  type: 'view' | 'dwell' | 'like' | 'dislike' | 'scroll' | 'exit' | 'skip' | 'keyword_click' | 'feedback_submit'
  duration?: number        // 延遲時間 (毫秒)
  scrollDepth?: number     // 滾動深度 (0-1)
  viewPercentage?: number  // 可見區域百分比 (0-1)
  timestamp: Date
}

// localStorage 金鑰
const INTERACTIONS_STORAGE_KEY = 'aipcs_interaction_logs'

// MVP: COMMENTED OUT - Complex tracking
// const SKIP_THRESHOLD_MS = 3000  // 可見超過 3 秒
// const SKIP_SCROLL_THRESHOLD = 0.5  // 滾動超過 50%

// 追蹤內容可見狀態
interface ContentVisibility {
  contentId: string
  visibleSince: number | null
  hasInteracted: boolean
}
const visibilityMap = new Map<string, ContentVisibility>()

/**
 * 儲存互動事件到 localStorage
 */
async function saveInteraction(event: InteractionEvent): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // 讀取現有事件
    const existing = localStorage.getItem(INTERACTIONS_STORAGE_KEY)
    const events: InteractionEvent[] = existing ? JSON.parse(existing) : []
    
    // 添加新事件
    events.push({
      ...event,
      timestamp: new Date() // 確保使用當前時間
    })
    // 只保留最近 100 個事件避免儲存過多
    if (events.length > 100) {
      events.splice(0, 20)
    }

    localStorage.setItem(INTERACTIONS_STORAGE_KEY, JSON.stringify(events))
    
    // 開發環境記錄
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 互動事件已儲存:', event.contentId, event.type)
    }

    // 記錄到 Firebase Analytics（客戶端時）
    if (typeof window !== 'undefined') {
      try {
        const uid = localStorage.getItem('aipcs_current_user')
        
         if (event.type === 'view' || event.type === 'dwell' || event.type === 'scroll') {
           await trackContentImpression({
             content_id: event.contentId,
             topics: [],
             position: 0
           })
           console.log(`[Analytics] ${event.type} tracked for: ${event.contentId}`)
         } else if (event.type === 'like') {
           await trackContentLike({
             content_id: event.contentId,
             topics: [],
             style: 'casual'
           })
         } else if (event.type === 'dislike') {
           await trackContentDislike({
             content_id: event.contentId,
             topics: [],
             style: 'casual'
           })
         } else if (event.type === 'skip') {
           await trackContentSkip({
             content_id: event.contentId,
             topics: [],
             style: 'casual',
             dwell_time: event.duration || 0
           })
          } else if (event.type === 'keyword_click') {
            // 關鍵字點擊事件在 ContentCard.tsx 中直接處理
            // 這裡只做 console 記錄
            console.log(`[Analytics] Keyword click for ${event.contentId}`)
          } else if (event.type === 'feedback_submit') {
            // 意見提交事件在 ContentCard.tsx 中直接處理
            console.log(`[Analytics] Feedback submit for ${event.contentId}`)
          } else if (event.type === 'exit') {
            // 退出事件，不發送分析，僅記錄
            console.log(`[Analytics] Exit event for ${event.contentId}`)
          } else {
            // 對於其他事件類型
            console.log(`[Analytics] Other event type: ${event.type}`)
          }
      } catch (analyticsError) {
        console.warn('Analytics recording failed:', analyticsError)
        // Analytics失敗不影響主要功能
      }
    }
  } catch (error) {
    console.warn('無法儲存互動事件:', error)
  }
}

// MVP: COMMENTED OUT - Complex tracking
// /**
//  * 計算元素可見區域百分比
//  */
// function calculateViewPercentage(element: HTMLElement): number {
//   const rect = element.getBoundingClientRect()
//   const windowHeight = window.innerHeight
//   
//   // 計算元素在視窗中的可見部分
//   const visibleTop = Math.max(rect.top, 0)
//   const visibleBottom = Math.min(rect.bottom, windowHeight)
//   
//   if (visibleTop >= visibleBottom) return 0
//   
//   const visibleHeight = visibleBottom - visibleTop
//   const elementHeight = rect.height
//   
//   return Math.min(visibleHeight / elementHeight, 1)
// }

export function useInteractionTracking(
  contentId: string,
  options: {
    trackScroll?: boolean   // 是否追蹤滾動
    trackDwell?: boolean    // 是否追蹤停留時間
    threshold?: number      // 停留時間閾值 (毫秒)
  } = {}
) {
  const { trackScroll = true, trackDwell = true, threshold = 3000 } = options
  
  const startTimeRef = useRef<number | null>(null)
  const visibilityRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const maxScrollRef = useRef<number>(0)
  const hasTrackedRef = useRef({
    view: false,
    dwell: false,
  })
  const skipTrackingRef = useRef({
    visibleSince: Date.now(),
    hasInteracted: false,
  })

  // MVP: COMMENTED OUT - Complex tracking
  // const checkForSkip = (): boolean => {
  //   if (skipTrackingRef.current.hasInteracted) return false
  //
  //   const visibleDuration = Date.now() - skipTrackingRef.current.visibleSince
  //   return visibleDuration >= SKIP_THRESHOLD_MS
  // }

  useEffect(() => {
    // 查找元素
    const element = document.getElementById(`content-${contentId}`)
    if (!element) return
    
    elementRef.current = element

    // 初始化跳過追蹤狀態
    skipTrackingRef.current = {
      visibleSince: Date.now(),
      hasInteracted: false
    }

    // 初始可見度追蹤
    saveInteraction({
      contentId,
      type: 'view',
      viewPercentage: 1,
      timestamp: new Date()
    })
    
    hasTrackedRef.current.view = true
    
    // 設定開始時間
    startTimeRef.current = Date.now()

    // 監聽可見度變化（IntersectionObserver）
    if (trackScroll || trackDwell) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
             // MVP: COMMENTED OUT - Complex tracking
             // const viewPercentage = calculateViewPercentage(element)
             const viewPercentage = element.offsetHeight > 0 ? 1 : 0 // Simple check: element visible or not
            
            // 當元素進入視窗時，重置可見時間
            if (entry.isIntersecting) {
              skipTrackingRef.current.visibleSince = Date.now()
            }
            
            // MVP: COMMENTED OUT - Complex tracking
            // // 當元素離開視窗時，檢查是否需要記錄跳過事件
            // if (!entry.isIntersecting && entry.intersectionRatio === 0 && checkForSkip()) {
            //   const visibleDuration = Date.now() - skipTrackingRef.current.visibleSince
            //   
            //   saveInteraction({
            //     contentId,
            //     type: 'skip',
            //     duration: visibleDuration,
            //     scrollDepth: maxScrollRef.current,
            //     viewPercentage: viewPercentage,
            //     timestamp: new Date()
            //   })
            //   
            //   // 重置追蹤狀態
            //   skipTrackingRef.current.hasInteracted = false
            //   skipTrackingRef.current.visibleSince = Date.now()
            // }
            
            // 當元素成為可見時開始追蹤停留時間
            if (entry.isIntersecting && trackDwell && !hasTrackedRef.current.dwell) {
              const dwellStartTime = Date.now()
              
              // 延遲檢查停留時間
              setTimeout(() => {
                const dwellTime = Date.now() - dwellStartTime
                
                if (
                  entry.isIntersecting && 
                  dwellTime >= threshold &&
                  !hasTrackedRef.current.dwell
                ) {
                  saveInteraction({
                    contentId,
                    type: 'dwell',
                    duration: dwellTime,
                    viewPercentage,
                    timestamp: new Date()
                  })
                  
                  hasTrackedRef.current.dwell = true
                }
              }, threshold)
            }
             
            // MVP: COMMENTED OUT - Complex tracking
            // // 追蹤滾動深度
            // if (trackScroll && entry.isIntersecting) {
            //   const scrollDepth = 1 - (entry.boundingClientRect.top / window.innerHeight)
            //   
            //   if (scrollDepth > maxScrollRef.current) {
            //     maxScrollRef.current = scrollDepth
            //     
            //     saveInteraction({
            //       contentId,
            //       type: 'scroll',
            //       scrollDepth,
            //       viewPercentage,
            //       timestamp: new Date()
            //     })
            //   }
            // }
          })
        },
        {
          // MVP: COMMENTED OUT - Complex tracking
          // threshold: Array.from({ length: 20 }, (_, i) => i * 0.05), // 0%, 5%, 10%, ... 95%
          // root: null,
          // rootMargin: '0px'
          // SIMPLE VERSION: Only track when element is 50%+ visible
          threshold: 0.5,
          root: null,
          rootMargin: '0px'
        }
      )
      
      visibilityRef.current = observer
      observer.observe(element)
    }

    // 監聽頁面離開事件（beforeunload）
    const handleBeforeUnload = () => {
      if (startTimeRef.current) {
        const totalTime = Date.now() - startTimeRef.current
        
        saveInteraction({
          contentId,
          type: 'exit',
          duration: totalTime,
          scrollDepth: maxScrollRef.current,
          timestamp: new Date()
        })
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 監聽頁面切換事件（visibilitychange）
    let lastVisibleTime = Date.now()
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const hiddenTime = Date.now() - lastVisibleTime
        
        if (hiddenTime >= 1000) { // 只記錄超過 1 秒的切換
          saveInteraction({
            contentId,
            type: 'exit',
            duration: hiddenTime,
            timestamp: new Date()
          })
        }
      } else {
        lastVisibleTime = Date.now()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // 清理資源
      if (visibilityRef.current) {
        visibilityRef.current.disconnect()
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // 記錄離開時的數據
      if (startTimeRef.current) {
        const totalTime = Date.now() - startTimeRef.current
        
        saveInteraction({
          contentId,
          type: 'exit',
          duration: totalTime,
          scrollDepth: maxScrollRef.current,
          timestamp: new Date()
        })
      }
    }
  }, [contentId, trackScroll, trackDwell, threshold])

  return {
    // 立即記錄互動事件（供外部調用）
    recordInteraction: (type: 'like' | 'dislike' | 'keyword_click' | 'feedback_submit') => {
      // 更新跳過追蹤狀態（僅限 like/dislike 被視為互動）
      if (type === 'like' || type === 'dislike') {
        skipTrackingRef.current.hasInteracted = true
      }
      
      saveInteraction({
        contentId,
        type: type as InteractionEvent['type'], // 類型轉換
        timestamp: new Date()
      })
    },
    
    // 獲取互動統計
    getInteractionStats: () => {
      if (typeof window === 'undefined') return null
      
      try {
        const events = JSON.parse(localStorage.getItem(INTERACTIONS_STORAGE_KEY) || '[]')
        const contentEvents = events.filter((e: InteractionEvent) => e.contentId === contentId)
        
        const likes = contentEvents.filter((e: InteractionEvent) => e.type === 'like').length
        const dislikes = contentEvents.filter((e: InteractionEvent) => e.type === 'dislike').length
        const totalViews = contentEvents.filter((e: InteractionEvent) => e.type === 'view').length
        
        return { likes, dislikes, totalViews }
      } catch (error) {
        console.warn('無法取得互動統計:', error)
        return null
      }
    }
  }
}