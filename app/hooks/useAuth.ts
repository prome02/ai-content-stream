'use client'

import { useState, useEffect } from 'react'
import { getFirebaseAuth, getGoogleProvider, signInWithPopup, signOut } from '@/lib/real-firebase'

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
       const auth = getFirebaseAuth()
       if (!auth) {
         console.warn('[Auth] Firebase Auth not available')
         setAuthState({ user: null, loading: false, error: null })
         return
       }

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
      console.log('[Auth] Starting Firebase Google login')

      const auth = getFirebaseAuth()
      const googleProvider = getGoogleProvider()

      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth not initialized')
      }

      await signInWithPopup(auth, googleProvider)
      console.log('[Auth] Firebase Google login successful')

      // auth.onAuthStateChanged will automatically update state
    } catch (error: any) {
      console.error('[Auth] Firebase Google login failed:', error)

      // Provide clear error message for Firebase configuration issues
      let errorMessage = error.message || 'Google login failed'

      if (errorMessage.includes('not initialized') || errorMessage.includes('initialization failed')) {
        errorMessage = `Firebase configuration error: ${errorMessage}\nPlease check .env.local settings`
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
      console.log('[Auth] Starting Firebase logout...')
      const auth = getFirebaseAuth()
      if (!auth) {
        throw new Error('Firebase Auth not initialized')
      }
      await signOut(auth)
      console.log('[Auth] Firebase logout successful')
      // auth.onAuthStateChanged will automatically update state
    } catch (error: any) {
      console.error('[Auth] Firebase logout failed:', error)
      setAuthState(prev => ({
        ...prev,
        error: error.message || 'Logout failed'
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