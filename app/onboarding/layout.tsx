'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { useEffect } from 'react'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 如果使用者未登入，跳轉回首頁
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // 會被 useEffect 導向
  }

  return children
}