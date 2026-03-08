// MVP: COMMENTED OUT - A/B testing system completely disabled
// A/B 測試框架 - 品質評分系統權重變體測試

// MVP: COMMENTED OUT - All exports below
// export type QualityScoreVariant = 'A' | 'B' | 'C' | 'D'

// export interface AbTestingConfig {
//   // 權重參數定義
//   likeScore: number              // 點讚分數
//   dislikeScore: number          // 不讚分數
//   dwellTimeBonus: number        // 停留時間獎勵分數
//   scrollDepthBonus: number      // 滾動深度獎勵分數
//
//   // 使用者權重配置
//   newUserProtectionDays: number // 新用戶保護期（天數）
//   newUserWeight: number         // 新用戶權重
//   highPositiveRateBonus: number // 高正評率加權
//   antiCheatThreshold: number    // 防刷門檻（每分鐘點讚數）
//   antiCheatPenalty: number      // 防刷處罰權重
//
//   // 變體名稱和描述
//   variant: QualityScoreVariant
//   description: string
// }

// export interface UserAssignment {
//   uid: string
//   variant: QualityScoreVariant
//   assignedAt: Date
//   lastInteraction?: Date
//   interactionCount: number
// }

// // 變體配置 - 測試不同的品質評分參數
// export const VARIANT_CONFIGS: Record<QualityScoreVariant, AbTestingConfig> = {
//   // 變體 A：原始算法（對照組）
//   'A': {
//     likeScore: 5,
//     dislikeScore: -8,
//     dwellTimeBonus: 8,
//     scrollDepthBonus: 3,
//     newUserProtectionDays: 7,
//     newUserWeight: 0.5,
//     highPositiveRateBonus: 1.2,
//     antiCheatThreshold: 5,
//     antiCheatPenalty: 0.3,
//     variant: 'A',
//     description: '原始算法：中等權重，新用戶保護'
//   },
//
//   // 變體 B：加強新用戶影響（測試過度保護）
//   'B': {
//     likeScore: 6,
//     dislikeScore: -10,
//     dwellTimeBonus: 10,
//     scrollDepthBonus: 4,
//     newUserProtectionDays: 14,
//     newUserWeight: 0.3,
//     highPositiveRateBonus: 1.3,
//     antiCheatThreshold: 3,
//     antiCheatPenalty: 0.2,
//     variant: 'B',
//     description: '加強新用戶影響：保護期延長，權重更低'
//   },
//
//   // 變體 C：簡化算法（移除複雜權重）
//   'C': {
//     likeScore: 4,
//     dislikeScore: -6,
//     dwellTimeBonus: 6,
//     scrollDepthBonus: 2,
//     newUserProtectionDays: 0,    // 無新用戶保護
//     newUserWeight: 1.0,
//     highPositiveRateBonus: 1.0,  // 無特殊權重
//     antiCheatThreshold: 10,     // 較寬鬆的防刷
//     antiCheatPenalty: 0.8,
//     variant: 'C',
//     description: '簡化算法：移除新用戶保護和複雜權重'
//   },
//
//   // 變體 D：加強停留時間影響（測試停留時間重要性）
//   'D': {
//     likeScore: 5,
//     dislikeScore: -8,
//     dwellTimeBonus: 15,          // 大幅增加停留時間獎勵
//     scrollDepthBonus: 5,
//     newUserProtectionDays: 5,
//     newUserWeight: 0.7,
//     highPositiveRateBonus: 1.1,
//     antiCheatThreshold: 5,
//     antiCheatPenalty: 0.3,
//     variant: 'D',
//     description: '加強停留時間影響：停留時間權重加倍'
//   }
// }

// // AB 測試管理器
// class AbTestingManager {
//   private assignments = new Map<string, UserAssignment>()
//   private variantPercentages = {
//     'A': 25,  // 對照組
//     'B': 25,
//     'C': 25,
//     'D': 25
//   }

//   /**
//    * 分配使用者到測試變體
//    */
//   assignVariant(uid: string): QualityScoreVariant {
//     // 檢查是否已分配
//     if (this.assignments.has(uid)) {
//       return this.assignments.get(uid)!.variant
//     }

//     // 隨機分配變體（基於使用者 ID 哈希）
//     const hash = this.hashUserId(uid)
//     const variant = this.selectVariantFromHash(hash)
//
//     const assignment: UserAssignment = {
//       uid,
//       variant,
//       assignedAt: new Date(),
//       interactionCount: 0
//     }
//
//     this.assignments.set(uid, assignment)
//     this.saveToLocalStorage(uid, assignment)
//
//     console.log(`[ABTest] Assign user ${uid} to variant ${variant}`)
//     return variant
//   }

//   /**
//    * 獲取使用者的變體配置
//    */
//   getUserConfig(uid: string): AbTestingConfig {
//     const variant = this.assignVariant(uid)
//     return VARIANT_CONFIGS[variant]
//   }

//   /**
//    * 記錄使用者互動
//    */
//   recordInteraction(uid: string): void {
//     const assignment = this.assignments.get(uid)
//     if (!assignment) {
//       // 確保使用者被分配
//       this.assignVariant(uid)
//       return
//     }

//     assignment.interactionCount++
//     assignment.lastInteraction = new Date()
//     this.assignments.set(uid, assignment)
//     this.saveToLocalStorage(uid, assignment)
//   }

//   /**
//    * 根據變體配置計算品質分數
//    */
//   calculateQualityScoreWithVariant(
//     action: 'like' | 'dislike',
//     currentScore: number,
//     userAge: number,
//     positiveRate: number,
//     recentLikes: number,
//     config: AbTestingConfig,
//     dwellTime?: number
//   ): { newScore: number, reason: string } {
//
//     const weight = this.calculateUserWeight(userAge, positiveRate, recentLikes, config)
//
//     let delta = 0
//
//     switch (action) {
//       case 'like':
//         delta = config.likeScore * weight
//         if (dwellTime && dwellTime > 3000) {
//           delta += config.dwellTimeBonus
//         }
//         if (recentLikes > 5) delta += 2  // 活躍用戶基礎加分
//         break
//
//       case 'dislike':
//         delta = config.dislikeScore * weight
//         break
//     }
//
//     return {
//       newScore: Math.max(0, Math.min(100, currentScore + delta)),
//       reason: this.getScoreReason(action, weight, config, dwellTime)
//     }
//   }

//   /**
//    * 根據變體配置計算使用者權重
//    */
//   private calculateUserWeight(
//     userAge: number,
//     positiveRate: number,
//     recentLikes: number,
//     config: AbTestingConfig
//   ): number {
//     let weight = 1.0
//
//     // 新用戶保護
//     if (config.newUserProtectionDays > 0) {
//       const ageFactor = Math.min(1, userAge / config.newUserProtectionDays)
//       if (ageFactor < 1) {
//         // 平滑過渡：實際權重 = newUserWeight + (1 - newUserWeight) * ageFactor
//         const protectionWeight = config.newUserWeight + (1 - config.newUserWeight) * ageFactor
//         weight *= protectionWeight
//       }
//     }
//
//     // 高正評率加權
//     const repFactor = 0.7 + (positiveRate * config.highPositiveRateBonus)
//     weight *= Math.min(1.5, repFactor)  // 限制最大加權
//
//     // 防刷檢測
//     if (recentLikes > config.antiCheatThreshold) {
//       weight *= config.antiCheatPenalty
//     }
//
//     return Math.max(0.1, Math.min(2.0, weight))
//   }

//   /**
//    * 獲取分數變動原因說明
//    */
//   private getScoreReason(
//     action: string,
//     weight: number,
//     config: AbTestingConfig,
//     dwellTime?: number
//   ): string {
//     if (action === 'like') {
//       const part1 = `點讚: ${config.likeScore} × ${weight.toFixed(2)}`
//       if (dwellTime && dwellTime > 3000) {
//         return `${part1} + 停留: ${config.dwellTimeBonus}`
//       }
//       return part1
//     }
//     if (action === 'dislike') {
//       return `不讚: ${config.dislikeScore} × ${weight.toFixed(2)}`
//     }
//     return `互動: 權重 ${weight.toFixed(2)}`
//   }

//   /**
//    * 哈希使用者ID用於變體分配
//    */
//   private hashUserId(uid: string): number {
//     let hash = 0
//     for (let i = 0; i < uid.length; i++) {
//       hash = ((hash << 5) - hash) + uid.charCodeAt(i)
//       hash |= 0 // 轉換為32位整數
//     }
//     return Math.abs(hash)
//   }

//   /**
//    * 根據哈希選擇變體
//    */
//   private selectVariantFromHash(hash: number): QualityScoreVariant {
//     const variantOrder: QualityScoreVariant[] = ['A', 'B', 'C', 'D']
//     const hashMod = hash % variantOrder.length
//     return variantOrder[hashMod]
//   }

//   /**
//    * 儲存分配結果到本地儲存
//    */
//   private saveToLocalStorage(uid: string, assignment: UserAssignment): void {
//     try {
//       if (typeof window !== 'undefined') {
//         const key = `aipcs_ab_test_${uid}`
//         localStorage.setItem(key, JSON.stringify({
//           ...assignment,
//           assignedAt: assignment.assignedAt.toISOString(),
//           lastInteraction: assignment.lastInteraction?.toISOString()
//         }))
//       }
//     } catch (error) {
//       console.warn('儲存 AB 測試分配失敗:', error)
//     }
//   }

//   /**
//    * 從本地儲存載入分配結果
//    */
//   loadFromLocalStorage(uid: string): UserAssignment | null {
//     try {
//       if (typeof window !== 'undefined') {
//         const key = `aipcs_ab_test_${uid}`
//         const stored = localStorage.getItem(key)
//         if (stored) {
//           const data = JSON.parse(stored)
//           return {
//             ...data,
//             assignedAt: new Date(data.assignedAt),
//             lastInteraction: data.lastInteraction ? new Date(data.lastInteraction) : undefined
//           }
//         }
//       }
//     } catch (error) {
//       console.warn('載入 AB 測試分配失敗:', error)
//     }
//     return null
//   }

//   /**
//    * 獲取統計資料
//    */
//   getStats(): Record<string, any> {
//     const variantCounts: Record<QualityScoreVariant, number> = {
//       'A': 0, 'B': 0, 'C': 0, 'D': 0
//     }
//
//     let totalUsers = 0
//     let totalInteractions = 0
//
//     this.assignments.forEach(assignment => {
//       variantCounts[assignment.variant]++
//       totalUsers++
//       totalInteractions += assignment.interactionCount
//     })
//
//     return {
//       totalUsers,
//       totalInteractions,
//       variantDistribution: variantCounts,
//       avgInteractionsPerUser: totalUsers > 0 ? (totalInteractions / totalUsers).toFixed(2) : 0
//     }
//   }
// }

// // 預設匯出單例
// export default new AbTestingManager()

// MVP: Add no-op exports to maintain API compatibility
export type QualityScoreVariant = 'A'
export interface AbTestingConfig {
  likeScore: number
  dislikeScore: number
  dwellTimeBonus: number
  scrollDepthBonus: number
  newUserProtectionDays: number
  newUserWeight: number
  highPositiveRateBonus: number
  antiCheatThreshold: number
  antiCheatPenalty: number
  variant: QualityScoreVariant
  description: string
}

export interface UserAssignment {
  uid: string
  variant: QualityScoreVariant
  assignedAt: Date
  lastInteraction?: Date
  interactionCount: number
}

export const VARIANT_CONFIGS: Record<QualityScoreVariant, AbTestingConfig> = {
  'A': {
    likeScore: 5,
    dislikeScore: -8,
    dwellTimeBonus: 8,
    scrollDepthBonus: 3,
    newUserProtectionDays: 7,
    newUserWeight: 0.5,
    highPositiveRateBonus: 1.2,
    antiCheatThreshold: 5,
    antiCheatPenalty: 0.3,
    variant: 'A',
    description: 'Base config for MVP'
  }
}

class AbTestingManager {
  assignVariant(uid: string): QualityScoreVariant {
    return 'A'
  }

  getUserConfig(_uid: string): AbTestingConfig {
    return VARIANT_CONFIGS['A']
  }

  recordInteraction(_uid: string): void {
    // No-op for MVP
  }

  calculateQualityScoreWithVariant(
    action: 'like' | 'dislike',
    currentScore: number,
    _userAge: number,
    _positiveRate: number,
    _recentLikes: number,
    _config: AbTestingConfig,
    dwellTime?: number
  ): { newScore: number, reason: string } {
    let delta = 0

    switch (action) {
      case 'like':
        delta = 5
        if (dwellTime && dwellTime > 3000) {
          delta += 8
        }
        break
      case 'dislike':
        delta = -8
        break
    }

    return {
      newScore: Math.max(0, Math.min(100, currentScore + delta)),
      reason: action === 'like' ? '點讚: +5' : '不讚: -8'
    }
  }

  loadFromLocalStorage(_uid: string): UserAssignment | null {
    return null
  }

  getStats(): Record<string, any> {
    return {
      totalUsers: 0,
      totalInteractions: 0,
      variantDistribution: { 'A': 0 },
      avgInteractionsPerUser: 0
    }
  }
}

export default new AbTestingManager()