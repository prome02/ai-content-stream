'use client'

import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number  // 觸發載入的偏移量 (0-1)
  rootMargin?: string // 觀察區域的邊界
  enabled?: boolean   // 是否啟用無限滾動
  externalLoading?: boolean // 外部載入狀態，用於同步
}

/**
 * 無限滾動 hook - 偵測特定元素進入視區時觸發載入更多內容
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', enabled = true } = options
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isLoadingRef = useRef(false)
  
  // 重置載入狀態（供外部調用）
  const resetLoading = () => {
    isLoadingRef.current = false
  }

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return

    // 創建 IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        
        // 如果 sentinel 元素可見、未在載入狀態，且不是首次可見
        if (
          entry.isIntersecting && 
          !isLoadingRef.current &&
          entry.intersectionRatio > threshold
        ) {
          isLoadingRef.current = true
          console.log('📜 無限滾動觸發：載入更多內容')
          
          // 確保非同步操作完成後重置狀態
          onLoadMore()
          
          // 設定一個安全的重置時機（避免過快連續觸發）
          setTimeout(() => {
            isLoadingRef.current = false
          }, 1000)
        }
      },
      {
        threshold,
        rootMargin,
        root: null // 使用視窗作為參考
      }
    )

    observerRef.current = observer
    observer.observe(sentinelRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enabled, threshold, rootMargin, onLoadMore])

  // 同時在滾動到底部時也觸發（備援機制）
  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      // 距離底部 500px 時觸發
      const nearBottom = scrollHeight - scrollTop - clientHeight < 500
      
      if (nearBottom && !isLoadingRef.current) {
        isLoadingRef.current = true
        console.log('📜 滾動到底部觸發：載入更多內容')
        
        onLoadMore()
        
        setTimeout(() => {
          isLoadingRef.current = false
        }, 1000)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [enabled, onLoadMore])

  return {
    sentinelRef,
    resetLoading,
    isLoading: isLoadingRef.current
  }
}