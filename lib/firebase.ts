// Firebase 模擬配置 - 完全模擬，不實際調用 API

let firebaseInited = false
let auth: any = {}
let db: any = {}
let googleProvider: any = {}

// 只在瀏覽器環境中初始化虛擬 Firebase
const isBrowser = typeof window !== 'undefined'

if (isBrowser) {
  // 創建模擬 auth 物件
  auth = {
    // 模擬 onAuthStateChanged
    onAuthStateChanged: (callback: (user: any | null) => void) => {
      const mockUser = null // 初始狀態為未登入
      callback(mockUser)
      return () => {} // 取消訂閱函數
    },
    
    // TODO: 實作真實 Firebase 身份驗證
    signInWithPopup: () => {
      throw new Error('真實 Firebase 身份驗證未實作，請先配置 Firebase SDK')
    },
    
    // 模擬 signOut
    signOut: () => Promise.resolve(),
    
    // 內部用於觸發狀態變化的函數
    _triggerAuthChange: null as ((user: any | null) => void) | null
  }

  // 設定 trigger 函數
  let currentCallback: ((user: any | null) => void) | null = null
  
  // 重新綁定 onAuthStateChanged
  const originalOnAuthStateChanged = auth.onAuthStateChanged.bind(auth)
  auth.onAuthStateChanged = (callback: (user: any | null) => void) => {
    auth._triggerAuthChange = callback
    currentCallback = callback
    const mockUser = null
    callback(mockUser)
    return () => { currentCallback = null }
  }

  // 模擬 Firestore
  db = {
    collection: (collectionName: string) => ({
      doc: (docId: string) => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve()
      })
    })
  }

  // 模擬 Google 提供者
  googleProvider = {}
  
  firebaseInited = true
}

export { auth, db, googleProvider }