import { db } from '@/lib/real-firebase'
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import type { ContentItem } from '@/types'

export interface CacheEntry {
  contents: ContentItem[]
  expiresAt: Date
  createdAt: Date
  userId: string
}

export class FirestoreCache {
  private readonly COLLECTION_NAME = 'aipcs_cache'
  private readonly DEFAULT_TTL_SECONDS = 3600 // 1 小時

  /**
   * 獲取使用者的快取內容
   */
  async get(userId: string): Promise<ContentItem[] | null> {
    try {
      const cacheRef = doc(db, this.COLLECTION_NAME, userId)
      const cacheDoc = await getDoc(cacheRef)

      if (!cacheDoc.exists()) {
        return null
      }

      const data = cacheDoc.data() as CacheEntry

      // 檢查是否過期
      if (new Date() > data.expiresAt) {
        await this.clear(userId)
        return null
      }

      return data.contents
    } catch (error) {
      console.error('[FirestoreCache] 讀取快取失敗:', error)
      return null
    }
  }

  /**
   * 儲存內容到快取
   */
  async set(
    userId: string, 
    contents: ContentItem[], 
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS
  ): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds)

      const cacheEntry: CacheEntry = {
        contents,
        expiresAt,
        createdAt: new Date(),
        userId
      }

      const cacheRef = doc(db, this.COLLECTION_NAME, userId)
      await setDoc(cacheRef, {
        ...cacheEntry,
        expiresAt: serverTimestamp(), // 使用 Firestore server timestamp
        createdAt: serverTimestamp()
      })

      console.log('[FirestoreCache] 儲存快取成功:', userId, contents.length, '則內容')
    } catch (error) {
      console.error('[FirestoreCache] 儲存快取失敗:', error)
      throw error
    }
  }

  /**
   * 清理特定使用者的快取
   */
  async clear(userId: string): Promise<void> {
    try {
      const cacheRef = doc(db, this.COLLECTION_NAME, userId)
      await deleteDoc(cacheRef)
      console.log('[FirestoreCache] 清理快取:', userId)
    } catch (error) {
      console.error('[FirestoreCache] 清理快取失敗:', error)
    }
  }

  /**
   * 清理所有過期快取（用於定期清理）
   */
  async clearExpired(): Promise<number> {
    try {
      const now = new Date()
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', now)
      )

      const snapshot = await getDocs(q)
      let deletedCount = 0

      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref)
        deletedCount++
      }

      console.log(`[FirestoreCache] 清理過期快取: ${deletedCount} 筆`)
      return deletedCount
    } catch (error) {
      console.error('[FirestoreCache] 清理過期快取失敗:', error)
      return 0
    }
  }

  /**
   * 檢查快取是否存在且未過期
   */
  async hasValidCache(userId: string): Promise<boolean> {
    try {
      const cacheRef = doc(db, this.COLLECTION_NAME, userId)
      const cacheDoc = await getDoc(cacheRef)

      if (!cacheDoc.exists()) {
        return false
      }

      const data = cacheDoc.data() as CacheEntry
      return new Date() <= data.expiresAt
    } catch (error) {
      console.error('[FirestoreCache] 檢查快取有效性失敗:', error)
      return false
    }
  }

  /**
   * 獲取快取統計資訊
   */
  async getStats(): Promise<{
    totalEntries: number
    expiredEntries: number
    activeEntries: number
  }> {
    try {
      const now = new Date()
      
      // 總快取數量
      const allSnapshot = await getDocs(collection(db, this.COLLECTION_NAME))
      const totalEntries = allSnapshot.size

      // 過期快取數量
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', now)
      )
      const expiredSnapshot = await getDocs(expiredQuery)
      const expiredEntries = expiredSnapshot.size

      return {
        totalEntries,
        expiredEntries,
        activeEntries: totalEntries - expiredEntries
      }
    } catch (error) {
      console.error('[FirestoreCache] 獲取統計失敗:', error)
      return {
        totalEntries: 0,
        expiredEntries: 0,
        activeEntries: 0
      }
    }
  }
}

// 預設匯出實例
export default new FirestoreCache()