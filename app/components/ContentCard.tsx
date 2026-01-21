'use client'

import { useState, useEffect } from 'react'
import { Heart, ThumbsDown, Clock, Repeat, MoreHorizontal, MessageSquare, Share2, BarChart3 } from 'lucide-react'
import { useInteractionTracking } from '@/app/hooks/useInteractionTracking'
import AbTestingManager from '@/lib/ab-testing'

interface ContentItem {
  id: string
  content: string
  hashtags: string[]
  emojis: string[]
  topics: string[]
  likes: number
  dislikes: number
  qualityScore: number
  generatedAt: Date
}

  interface ContentCardProps {
  content: ContentItem
  onLike: (contentId: string) => void
  onDislike: (contentId: string) => void
  currentUserId?: string
}

export default function ContentCard({ content, onLike, onDislike, currentUserId }: ContentCardProps) {
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [localLikes, setLocalLikes] = useState(content.likes)
  const [localDislikes, setLocalDislikes] = useState(content.dislikes)
  const [showDetails, setShowDetails] = useState(false)
  const [currentScore, setCurrentScore] = useState(content.qualityScore)
  
  // 使用行為追蹤 hook
  useInteractionTracking(content.id)

  // 從 localStorage 讀取使用者的互動狀態
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
      const userInteraction = interactions[content.id]
      
      if (userInteraction === 'like') {
        setLiked(true)
      } else if (userInteraction === 'dislike') {
        setDisliked(true)
      }
    }
  }, [content.id])

  // 格式化時間
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins} 分鐘前`
    if (diffHours < 24) return `${diffHours} 小時前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-TW')
  }

  const handleLike = async () => {
    if (!liked) {
      setLiked(true)
      setDisliked(false)
      setLocalLikes(prev => prev + 1)
      
      // 如果是從不讚轉成點讚，減少不讚數
      if (disliked) {
        setLocalDislikes(prev => prev - 1)
      }
      
      // 儲存到 localStorage + 更新本地分數
      if (typeof window !== 'undefined') {
        const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
        interactions[content.id] = 'like'
        localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))
      }
      
      // 呼叫互動 API 發送品質分數更新
      try {
        const response = await fetch('/api/interaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: currentUserId || 'temp_uid',
            contentId: content.id,
            action: 'like'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ 點讚成功:', data)
          
          // 追蹤事件
          try {
            // 獲取 A/B 測試變體配置
            const variant = currentUserId ? AbTestingManager.assignVariant(currentUserId) : 'A'
            const config = currentUserId ? AbTestingManager.getUserConfig(currentUserId) : {
              likeScore: 5,
              dislikeScore: -8,
              dwellTimeBonus: 8,
              variant: 'A' as const
            }
            
            // 追蹤內容互動事件
            await fetch('/api/event-track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: currentUserId || 'temp_uid',
                content_id: content.id,
                action: 'like',
                old_score: content.qualityScore,
                new_score: data?.data?.newScore || content.qualityScore + 5,
                variant,
                config
              })
            })
          } catch (trackingError) {
            console.warn('事件追蹤失敗:', trackingError)
            // 事件追蹤失敗不影響主要功能
          }
          
          if (data?.data?.newScore !== undefined) {
            setCurrentScore(data.data.newScore)
          }
        }
      } catch (error) {
        console.warn('互動 API 錯誤:', error)
      }
    }
  }

  const handleDislike = async () => {
    if (!disliked) {
      setDisliked(true)
      setLiked(false)
      setLocalDislikes(prev => prev + 1)
      
      // 如果是從點讚轉成不讚，減少點讚數
      if (liked) {
        setLocalLikes(prev => prev - 1)
      }
      
      // 儲存到 localStorage + 更新本地分數
      if (typeof window !== 'undefined') {
        const interactions = JSON.parse(localStorage.getItem('aipcs_interactions') || '{}')
        interactions[content.id] = 'dislike'
        localStorage.setItem('aipcs_interactions', JSON.stringify(interactions))
      }
      
       // 呼叫互動 API 發送品質分數更新
      try {
        const response = await fetch('/api/interaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: currentUserId || 'temp_uid',
            contentId: content.id,
            action: 'dislike'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('👎 不讚成功:', data)
          
          // 追蹤事件
          try {
            // 獲取 A/B 測試變體配置
            const variant = currentUserId ? AbTestingManager.assignVariant(currentUserId) : 'A'
            const config = currentUserId ? AbTestingManager.getUserConfig(currentUserId) : {
              likeScore: 5,
              dislikeScore: -8,
              dwellTimeBonus: 8,
              variant: 'A' as const
            }
            
            // 追蹤內容互動事件
            await fetch('/api/event-track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: currentUserId || 'temp_uid',
                content_id: content.id,
                action: 'dislike',
                old_score: content.qualityScore,
                new_score: data?.data?.newScore || content.qualityScore - 8,
                variant,
                config
              })
            })
          } catch (trackingError) {
            console.warn('事件追蹤失敗:', trackingError)
            // 事件追蹤失敗不影響主要功能
          }
          
          if (data?.data?.newScore !== undefined) {
            setCurrentScore(data.data.newScore)
          }
        }
      } catch (error) {
        console.warn('互動 API 錯誤:', error)
      }
    }
  }

  // 計算質量分數的顏色
  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-green-500 bg-green-50'
    if (score >= 70) return 'text-blue-500 bg-blue-50'
    if (score >= 60) return 'text-yellow-500 bg-yellow-50'
    return 'text-gray-500 bg-gray-50'
  }

  return (
    <div 
      id={`content-${content.id}`}
      className="relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-xl"
    >
      {/* 品質評分標籤 */}
      <div className="absolute top-4 right-4 z-10">
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getQualityColor(content.qualityScore)}`}>
          <BarChart3 className="h-3 w-3" />
          <span>{content.qualityScore}</span>
          <span className="text-xs opacity-75">品質</span>
        </div>
      </div>

      {/* 主內容區域 */}
      <div className="p-6">
        {/* 內容文字 */}
        <div className="text-gray-800 text-lg leading-relaxed font-medium mb-4">
          {content.content}
        </div>

        {/* Emoji 裝飾 */}
        {content.emojis.length > 0 && (
          <div className="flex gap-2 mb-4">
            {content.emojis.map((emoji, index) => (
              <span key={index} className="text-2xl">
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* 話題標籤 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {content.hashtags.map((hashtag, index) => (
            <span 
              key={index}
              className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100 hover:border-blue-300 transition cursor-pointer"
            >
              {hashtag}
            </span>
          ))}
        </div>

        {/* 分類標籤 */}
        {content.topics.length > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">分類:</span>
            <div className="flex flex-wrap gap-1">
              {content.topics.map((topic, index) => (
                <span 
                  key={index}
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 互動統計 */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(content.generatedAt)}</span>
            </div>
            
            <div className="flex items-center gap1">
              <Repeat className="h-3 w-3" />
              <span>AI 生成</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="詳細資訊"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 詳細資訊（可展開） */}
      {showDetails && (
        <div className="px-6 pb-4 border-t border-gray-100 pt-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2">這則內容根據你的興趣標籤生成，結合 AI 的創意與個人化學習。</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="font-medium">生成時間</div>
                <div>{content.generatedAt.toLocaleString('zh-TW')}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="font-medium">互動統計</div>
                <div>{localLikes} 贊 • {localDislikes} 踩</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 互動按鈕列 */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="flex divide-x divide-gray-200">
          {/* 點讚按鈕 */}
          <button
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition ${
              liked 
                ? 'text-red-500 bg-red-50' 
                : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
            <span className="font-medium">{localLikes > 0 ? localLikes : '贊'}</span>
          </button>

          {/* 不讚按鈕 */}
          <button
            onClick={handleDislike}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition ${
              disliked 
                ? 'text-blue-500 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-500 hover:bg-blue-50'
            }`}
          >
            <ThumbsDown className={`h-5 w-5 ${disliked ? 'fill-current' : ''}`} />
            <span className="font-medium">{localDislikes > 0 ? localDislikes : '踩'}</span>
          </button>

          {/* 評論按鈕（未來功能） */}
          <button
            className="flex-1 flex items-center justify-center gap-2 py-4 text-gray-600 hover:text-purple-500 hover:bg-purple-50 transition"
            title="評論功能（開發中）"
            disabled
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">評論</span>
          </button>

          {/* 分享按鈕（未來功能） */}
          <button
            className="flex-1 flex items-center justify-center gap-2 py-4 text-gray-600 hover:text-green-500 hover:bg-green-50 transition"
            title="分享功能（開發中）"
            disabled
          >
            <Share2 className="h-5 w-5" />
            <span className="font-medium">分享</span>
          </button>
        </div>
      </div>

      {/* AI 生成標示 */}
      <div className="absolute bottom-2 right-2">
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <div className="h-2 w-S2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
          <span>AI 生成內容</span>
        </div>
      </div>
    </div>
  )
}