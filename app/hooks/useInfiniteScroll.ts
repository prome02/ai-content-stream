'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number  // 觸發載入的偏移量 (0-1)
  rootMargin?: string // 觀察區域的邊界
  enabled?: boolean   // 是否啟用無限滾動
  debounceMs?: number // 防抖時間（毫秒）
}

/**
 * 無限滾動 hook - 偵測特定元素進入視區時觸發載入更多內容
 * 使用單一 IntersectionObserver 機制，避免重複觸發
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '200px', // 提前 200px 觸發
    enabled = true,
    debounceMs = 2000  // 2 秒防抖
  } = options

  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isLoadingRef = useRef(false)
  const lastTriggerTimeRef = useRef(0)

  // 重置載入狀態（供外部調用）
  const resetLoading = useCallback(() => {
    isLoadingRef.current = false
  }, [])

  // 使用 ref 保存 onLoadMore，避免 observer 重新創建
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return

    // 創建 IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        const now = Date.now()

        // 防抖檢查：距離上次觸發必須超過 debounceMs
        const timeSinceLastTrigger = now - lastTriggerTimeRef.current

        if (
          entry.isIntersecting &&
          !isLoadingRef.current &&
          timeSinceLastTrigger > debounceMs
        ) {
          isLoadingRef.current = true
          lastTriggerTimeRef.current = now
          console.log('Infinite scroll triggered: loading more content')

          // 調用載入函數
          onLoadMoreRef.current()

          // 設定安全的重置時機
          setTimeout(() => {
            isLoadingRef.current = false
          }, debounceMs)
        }
      },
      {
        threshold,
        rootMargin,
        root: null
      }
    )

    observerRef.current = observer
    observer.observe(sentinelRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [enabled, threshold, rootMargin, debounceMs])
  // 注意：移除 onLoadMore 依賴，改用 ref

  return {
    sentinelRef,
    resetLoading,
    isLoading: isLoadingRef.current
  }
}