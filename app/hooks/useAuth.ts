'use client'

import { useState, useEffect } from 'react'
import { auth, googleProvider, signInWithPopup, signOut } from '@/lib/real-firebase'

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

// 真實 Firebase Auth hook
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,  // 初始載入以檢查 auth 狀態
    error: null
  })

   // 監聽 Firebase 身份驗證狀態變化
   useEffect(() => {
     if (typeof window === 'undefined') {
       setAuthState(prev => ({ ...prev, loading: false }))
       return
     }

     // 避免 Fast Refresh 時的過多重複日誌
     const LOG_INTERVAL = 1000 // 限制日誌頻率為1秒
     let lastLogTime = 0
     const shouldLog = () => {
       const now = Date.now()
       if (now - lastLogTime > LOG_INTERVAL) {
         lastLogTime = now
         return true
       }
       return false
     }

     if (shouldLog()) {
        console.log('開始監聽 Firebase 身份驗證狀態')
     }
    
    try {
       const unsubscribe = auth.onAuthStateChanged(
         (firebaseUser: any) => {
           if (shouldLog()) {
              console.log('Firebase 身份驗證狀態變更:', firebaseUser ? '已登入' : '未登入')
           }
           
           let user: User | null = null
           
           if (firebaseUser) {
             user = {
               uid: firebaseUser.uid,
               email: firebaseUser.email,
               displayName: firebaseUser.displayName,
               photoURL: firebaseUser.photoURL
             }
             if (shouldLog()) {
                console.log('使用者已登入:', user.email)
             }
            } else {
              if (shouldLog()) {
                console.log('使用者未登入')
              }
            }
          
          setAuthState({
            user,
            loading: false,
            error: null
          })
        },
        (error: any) => {
           console.error('[Auth] Firebase 身份驗證監聽錯誤:', error)
          setAuthState({
            user: null,
            loading: false,
            error: error.message || 'Firebase 身份驗證錯誤'
          })
        }
      )
      
      // 清理函數
      return () => {
        if (shouldLog()) {
          console.log('清理 Firebase 身份驗證監聽')
        }
        unsubscribe()
      }
    } catch (error: any) {
       console.error('[Auth] Firebase 身份驗證監聽初始化失敗:', error)
      setAuthState({
        user: null,
        loading: false,
        error: '無法連接到 Firebase 身份驗證服務'
      })
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
       console.log('開始 Firebase Google 登入')
      
      const result = await signInWithPopup(auth, googleProvider)
       console.log('Firebase Google 登入成功')
      
      // auth.onAuthStateChanged 會自動更新狀態
    } catch (error: any) {
       console.error('[Auth] Firebase Google 登入失敗:', error)
      
      // 如果 Firebase 配置有問題，提供明確的錯誤訊息
      let errorMessage = error.message || 'Google 登入失敗'
      
      if (errorMessage.includes('配置不完整') || errorMessage.includes('初始化失敗')) {
        errorMessage = `Firebase 配置錯誤: ${errorMessage}\n請檢查 .env.local 設定檔`
      }
      
      setAuthState({
        user: null,
        loading: false,
        error: errorMessage
      })
    }
  }

  const logout = async () => {
    try {
      console.log('開始 Firebase 登出...')
      await signOut(auth)
      console.log('Firebase 登出成功')
      // auth.onAuthStateChanged 會自動更新狀態
    } catch (error: any) {
      console.error(' Firebase 登出失敗:', error)
      setAuthState(prev => ({ 
        ...prev, 
        error: error.message || '登出失敗' 
      }))
    }
  }

  const signInWithMock = () => {
    console.log('🚫 signInWithMock 已被禁用')
    setAuthState(prev => ({ 
      ...prev, 
      error: '模擬使用者登入已被禁用，請使用 Firebase 真實身份驗證' 
    }))
  }
  
  const fastLogin = () => {
    console.log('🚫 fastLogin 已被禁用')
    setAuthState(prev => ({ 
      ...prev, 
      error: '快速登入已被禁用，請使用 Firebase 真實身份驗證' 
    }))
  }

  return {
    ...authState,
    signInWithGoogle,
    signInWithMock,
    logout,
    fastLogin
  }
}