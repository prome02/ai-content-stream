// 真實 Firebase SDK 實作 - 支援 Emulator
// 需要设置 Firebase 配置於 .env.local
// 參考 .env.local.example 設定
//
// 注意：即使使用 Emulator，Firebase Analytics/Installations 仍需要格式正確的 API key
// Firebase SDK 會驗證 API key 格式（必須類似 AIzaSy... 開頭）
// Emulator 模式下，API key 不需要是真實值，但格式必須正確

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'
import { deleteApp } from 'firebase/app'

// Firebase 配置 - 從環境變數讀取
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyApiKeyForEmulatorUseOnly',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-bucket',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcd1234',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-ABCD1234'
}

// 檢查是否使用 Emulator
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || 
                     process.env.NODE_ENV === 'development'

console.log('🔧 Firebase 配置:', {
  useEmulator: USE_EMULATOR,
  nodeEnv: process.env.NODE_ENV
})

// 初始化 Firebase
let app = getApps().length > 0 ? getApp() : undefined
let auth: any = undefined
let db: any = undefined
let googleProvider: any = undefined
let analytics: Analytics | null = null

try {
  if (typeof window !== 'undefined') {
    if (!app) {
      app = initializeApp(firebaseConfig)
      console.log('[Firebase] App initialized')
    } else {
      console.log('[Firebase] App already initialized')
    }
    
    if (!auth) auth = getAuth(app)
    if (!db) db = getFirestore(app)
    if (!googleProvider) googleProvider = new GoogleAuthProvider()
    
    // 在開發環境連接 Emulator
    if (USE_EMULATOR) {
      console.log('🔧 連接 Firebase Emulator...')
      try {
        // 連接 Auth Emulator (端口 9099)
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: false })
        console.log('✅ 已連接 Auth Emulator (localhost:9099)')
        
        // 連接 Firestore Emulator (端口 8080)
        connectFirestoreEmulator(db, 'localhost', 8080)
        console.log('✅ 已連接 Firestore Emulator (localhost:8080)')
      } catch (emulatorError) {
        console.warn('⚠️ Emulator 連接失敗，使用真實服務:', emulatorError)
      }
    } else {
      console.log('🌐 使用 Firebase 真實服務')
    }
    
    console.log('✅ Firebase 初始化成功')

    // 初始化 Analytics（僅客戶端，且不使用 Emulator）
    if (typeof window !== 'undefined' && !USE_EMULATOR) {
      analytics = null
      try {
        const supported = await isSupported()
        if (supported) {
          analytics = getAnalytics(app)
          console.log('[Firebase] Analytics initialized')
        } else {
          console.log('[Firebase] Analytics not supported in this environment')
        }
      } catch (analyticsError) {
        console.warn('[Firebase] Analytics initialization failed:', analyticsError)
      }
    } else {
      console.log('[Firebase] Analytics skipped (using emulator or server-side)')
    }
    
  } else {
    console.log('📝 伺服器端渲染，不初始化 Firebase')
    // 建立空的物件以保持介面相容性
    auth = {
      onAuthStateChanged: () => () => {},
      signInWithPopup: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
      signOut: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
      currentUser: null
    }
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
          set: () => Promise.reject(new Error('Firebase 未初始化 - SSR')),
          update: () => Promise.reject(new Error('Firebase 未初始化 - SSR'))
        })
      })
    }
    googleProvider = {}
  }
} catch (error) {
  console.error('❌ Firebase 初始化失敗:', error)
  // 建立空的物件以保持介面相容性
  auth = {
    onAuthStateChanged: () => () => {},
    signInWithPopup: () => Promise.reject(new Error('Firebase 初始化失敗')),
    signOut: () => Promise.reject(new Error('Firebase 初始化失敗')),
    currentUser: null
  }
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase 初始化失敗')),
        set: () => Promise.reject(new Error('Firebase 初始化失敗')),
        update: () => Promise.reject(new Error('Firebase 初始化失敗'))
      })
    })
  }
  googleProvider = {}
}

export { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup,
  signOut
}

/**
 * 取得 Firebase Analytics 實例（僅客戶端支援）
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return null  // Server-side, no analytics
  }

  if (analytics) {
    return analytics
  }

  try {
    const supported = await isSupported()
    if (supported && app) {
      analytics = getAnalytics(app)
      console.log('[Firebase] Analytics initialized')
      return analytics
    } else if (!app) {
      console.log('[Firebase] App not initialized for analytics')
      return null
    } else {
      console.log('[Firebase] Analytics not supported in this environment')
      return null
    }
  } catch (error) {
    console.error('[Firebase] Failed to get analytics:', error)
    return null
  }
}