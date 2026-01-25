'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { getUserPreferences } from '@/lib/user-data'
import { LogIn, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, loading, signInWithGoogle, signInWithMock, fastLogin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 如果使用者已登入，檢查是否已有偏好設定
    const checkPreferencesAndNavigate = async () => {
      if (user && !loading) {
        try {
          const preferences = await getUserPreferences(user.uid)
          if (preferences?.interests && preferences.interests.length > 0) {
            // 已經有興趣偏好，直接跳轉到 feed
            router.push('/feed')
          } else {
            // 還沒有興趣偏好，跳轉到 onboarding
            router.push('/onboarding/interests')
          }
        } catch (error) {
          console.error('檢查使用者偏好失敗:', error)
          // 失敗時跳到 onboarding
          router.push('/onboarding/interests')
        }
      }
    }

    if (user && !loading) {
      checkPreferencesAndNavigate()
    }
  }, [user, loading, router])

  const handleGoogleSignIn = async () => {
    await signInWithGoogle()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-sm font-medium text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Sparkles className="h-12 w-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI 個人化內容資訊流
          </h1>
          <p className="text-gray-600 mb-8">
            讓 AI 為你生成永不停歇的個性化內容
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>使用 Google 帳戶登入</span>
          </button>

          {/* 開發者模式快速登入按鈕 - 使用 Firebase Emulator */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
              <div className="text-xs text-gray-500 mb-2">開發者測試模式 (Emulator)</div>
              <button
                onClick={async () => {
                  console.log('🟡 開始 Firebase Emulator 快速測試登入...')
                  
                  try {
                    // 直接使用 Firebase 的 Google 登入功能
                    // 在 Emulator 模式下，signInWithPopup 會模擬成功登入
                    console.log('🔄 使用 Firebase Google 登入...')
                    await signInWithGoogle()
                    console.log('✅ 已觸發 Firebase Google 登入')
                    
                  } catch (error: any) {
                    console.error('❌ Firebase Emulator 登入失敗:', error)
                    
                    // 檢查 Emulator 是否在運行
                    try {
                      const emulatorCheck = await fetch('http://localhost:9099', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                      })
                      
                      if (emulatorCheck.ok) {
                        console.log('✅ Firebase Auth Emulator 正在運行')
                        alert(`Firebase Auth Emulator 登入失敗:\n${error.message}\n\n請確保:\n1. Firebase Emulator 正在運行 (firebase emulators:start)\n2. 瀏覽器已允許彈出視窗`)
                      } else {
                        alert(`Firebase Auth Emulator 未運行\n請執行: firebase emulators:start`)
                      }
                    } catch (emulatorError) {
                      alert(`無法連接 Firebase Auth Emulator (localhost:9099)\n請執行: firebase emulators:start`)
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium transition hover:bg-purple-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                開發者快速登入 (Firebase Emulator)
              </button>
              <p className="text-xs text-gray-500 mt-2">
                此功能僅在開發模式顯示，使用 Firebase Auth Emulator 測試帳戶
              </p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              我們的承諾
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                僅使用 Google 帳戶登入，保護您的安全
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                根據您的興趣，AI 生成無限個人化內容
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                點讚/不讚機制，讓 AI 更懂您的喜好
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              登入即表示您同意我們的服務條款與隱私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
