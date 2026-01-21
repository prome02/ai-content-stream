// ============================================
// 本檔案已禁用 - 模擬 Firebase 實作
// 改為使用真實 Firebase 身份驗證
// ============================================

// /*
// // 純本地模擬的外表 Firebase 介面
// // 完全繞過 Firebase SDK，避免 API key 錯誤
// 
// interface MockUser {
//   uid: string
//   email: string
//   displayName: string
//   photoURL: string | null
// }
// 
// // 模擬 auth
// class MockAuth {
//   private currentUser: MockUser | null = null
//   private listeners: ((user: MockUser | null) => void)[] = []
// 
//   get _currentUser() {
//     return this.currentUser
//   }
// 
//   async signInWithPopup() {
//     return new Promise(resolve => {
//       setTimeout(() => {
//         this.currentUser = {
//           uid: 'mock-user-123456',
//           email: 'test@example.com',
//           displayName: '測試使用者',
//           photoURL: null
//         }
//         
//         // 通知所有監聽者
//         this.listeners.forEach(cb => cb(this.currentUser))
//         
//         resolve({ user: this.currentUser })
//       }, 300)
//     })
//   }
// 
//   async signOut() {
//     this.currentUser = null
//     this.listeners.forEach(cb => cb(null))
//     return Promise.resolve()
//   }
// 
//   onAuthStateChanged(callback: (user: MockUser | null) => void) {
//     this.listeners.push(callback)
//     // 初始呼叫
//     setTimeout(() => callback(this.currentUser), 0)
//     
//     return () => {
//       const index = this.listeners.indexOf(callback)
//       if (index > -1) {
//         this.listeners.splice(index, 1)
//       }
//     }
//   }
// }
// 
// // 模擬 FIRESTORE
// class MockFirestore {
//   async doc(collectionPath: string, docPath: string) {
//     const storageKey = `${collectionPath}/${docPath}`
//     const data = typeof window !== 'undefined' 
//       ? JSON.parse(localStorage.getItem(storageKey) || 'null')
//       : null
// 
//     return {
//       get: async () => ({ exists: !!data, data: () => data }),
//       set: async (newData: any) => {
//         if (typeof window !== 'undefined') {
//           localStorage.setItem(storageKey, JSON.stringify(newData))
//         }
//         return Promise.resolve()
//       },
//       update: async (updates: any) => {
//         if (typeof window !== 'undefined') {
//           const current = JSON.parse(localStorage.getItem(storageKey) || 'null') || {}
//           localStorage.setItem(storageKey, JSON.stringify({ ...current, ...updates }))
//         }
//         return Promise.resolve()
//       }
//     }
//   }
// 
//   async collection(collectionPath: string) {
//     return {
//       doc: (docPath: string) => this.doc(collectionPath, docPath)
//     }
//   }
// }
// 
// // 匯出模擬實例
// const auth = new MockAuth()
// const db = new MockFirestore()
// const googleProvider = {} // 只用於型別相容，實際上不需功能
// 
// export { auth, db, googleProvider }
// */