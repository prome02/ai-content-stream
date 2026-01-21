'use client'

import { useState, useEffect } from 'react'

interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

const MOCK_USER: User = {
  uid: 'mock-user-123456',
  email: 'test@example.com',
  displayName: '測試使用者',
  photoURL: null
}

// 純本地開發者的 Auth hook - 完全不依賴 Firebase
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: false,  // 初始化不要 loading
    error: null
  })

  // 開發環境快速登入
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      ;(window as any).quickLogin = () => {
        setAuthState({
          user: MOCK_USER,
          loading: false,
          error: null
        })
        console.log('✅ 已使用模擬使用者登入')
      }
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      // 開發環境直接使用模擬使用者
      console.log('🧪 開發環境：使用模擬使用者登入')
      await new Promise(resolve => setTimeout(resolve, 300)) // 模擬延遲
      
      setAuthState({
        user: MOCK_USER,
        loading: false,
        error: null
      })
    } catch (error: any) {
      setAuthState({
        user: null,
        loading: false,
        error: error.message || 'Google 登入失敗'
      })
    }
  }

  const logout = async () => {
    setAuthState({ user: null, loading: false, error: null })
  }

  const signInWithMock = () => {
    setAuthState({
      user: MOCK_USER,
      loading: false,
      error: null
    })
    console.log('🎮 開發者模式：已使用模擬使用者登入')
  }

  return {
    ...authState,
    signInWithGoogle,
    signInWithMock,
    logout
  }
}