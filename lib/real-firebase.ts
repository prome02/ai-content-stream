// 真實 Firebase SDK 實作 - 支援 Emulator
// 需要設置 Firebase 配置於 .env.local
// 參考 .env.local.example 設定

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Firebase 配置 - 從環境變數讀取
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key-for-emulator',
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
let app
let auth
let db
let googleProvider

try {
  if (typeof window !== 'undefined') {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    googleProvider = new GoogleAuthProvider()
    
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

export { auth, db, googleProvider }