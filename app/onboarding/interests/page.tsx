'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { INTERESTS_LIST } from '@/lib/interests'
import { saveUserPreferences } from '@/lib/user-data'
import { Check, ArrowRight, Sparkles } from 'lucide-react'

export default function InterestsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId)
      } else {
        if (prev.length < 5) {
          return [...prev, interestId]
        }
        return prev
      }
    })
  }

  const handleSubmit = async () => {
    if (selectedInterests.length < 3) {
      alert('請至少選擇 3 個興趣標籤')
      return
    }

    if (!user) {
      router.push('/')
      return
    }

    setIsSubmitting(true)
    try {
      await saveUserPreferences(user.uid, {
        interests: selectedInterests,
        language: 'zh-TW',
        style: 'casual'
      })
      
      router.push('/feed')
    } catch (error) {
      console.error('儲存興趣失敗:', error)
      alert('儲存興趣失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center pt-8">
          <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            選擇你的興趣偏好
          </h1>
          <p className="text-gray-600">
            讓我們了解你的興趣，AI 將為你生成更精準的個人化內容
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
            <Check className="h-4 w-4" />
            <span>已選擇 {selectedInterests.length} / 5 (最少 3 個)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {INTERESTS_LIST.map((interest) => {
            const isSelected = selectedInterests.includes(interest.id)
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-xl
                  transition-all duration-200 transform hover:scale-105
                  ${isSelected 
                    ? `${interest.color} text-white shadow-lg` 
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                  }
                `}
              >
                <div className="text-2xl mb-2">{interest.emoji}</div>
                <span className="font-medium text-sm">{interest.name}</span>
                {interest.description && (
                  <span className="text-xs mt-1 opacity-75">
                    {interest.description}
                  </span>
                )}
                {isSelected && (
                  <div className="mt-2">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">你選擇的興趣：</h3>
            {selectedInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedInterests.map(interestId => {
                  const interest = INTERESTS_LIST.find(i => i.id === interestId)
                  if (!interest) return null
                  return (
                    <div
                      key={interestId}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700"
                    >
                      <span>{interest.emoji}</span>
                      <span>{interest.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">尚未選擇興趣</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setSelectedInterests([])}
              disabled={selectedInterests.length === 0}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清除選擇
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedInterests.length < 3 || isSubmitting}
              className={`
                flex-1 px-6 py-3 rounded-lg font-medium
                flex items-center justify-center gap-2
                transition-all duration-200
                ${selectedInterests.length >= 3 && !isSubmitting
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-200'
                  : 'bg-gray-200 text-gray-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  儲存中...
                </>
              ) : (
                <>
                  開始體驗 AI 內容
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              你的興趣選擇將幫助 AI 理解你的喜好，生成更貼近你需求的內容
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}