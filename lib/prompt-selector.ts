// lib/prompt-selector.ts

import {
  ROLE_MODULES,
  PERSPECTIVE_MODULES,
  FORMAT_MODULES,
  DEPTH_MODULES,
  RoleModuleId,
  PerspectiveModuleId,
  FormatModuleId,
  DepthModuleId
} from './prompt-modules'

import type { UserBehaviorStats } from './user-data'

export interface UserBehavior {
  avgDwellTime: number      // 平均停留時間（ms）
  recentLikes: number       // 近期按讚數
  recentSkips: number       // 近期無感覺數
  hasFeedback: boolean      // 是否有文字意見
  lastKeywordClick?: string // 最近點擊的關鍵字
}

export interface SelectedModules {
  role: typeof ROLE_MODULES[number]
  perspective: typeof PERSPECTIVE_MODULES[number]
  format: typeof FORMAT_MODULES[number]
  depth: typeof DEPTH_MODULES[DepthModuleId]
}

/**
 * 根據用戶行為選擇深度
 */
export function selectDepth(behavior: UserBehavior): DepthModuleId {
  // 有文字意見或長停留 + 多按讚 -> 深度內容
  if (behavior.hasFeedback || (behavior.avgDwellTime > 30000 && behavior.recentLikes > 3)) {
    return 'deep'
  }

  // 連續無感覺 -> 簡短內容
  if (behavior.recentSkips > 3) {
    return 'brief'
  }

  // 預設標準深度
  return 'standard'
}

/**
 * 隨機選擇模組
 */
function randomSelect<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * 根據情境選擇所有模組
 */
export function selectModules(behavior: UserBehavior): SelectedModules {
  return {
    role: randomSelect(ROLE_MODULES),
    perspective: randomSelect(PERSPECTIVE_MODULES),
    format: randomSelect(FORMAT_MODULES),
    depth: DEPTH_MODULES[selectDepth(behavior)]
  }
}

/**
 * 取得預設行為（新用戶或無資料時使用）
 */
export function getDefaultBehavior(): UserBehavior {
  return {
    avgDwellTime: 10000,
    recentLikes: 0,
    recentSkips: 0,
    hasFeedback: false
  }
}

/**
 * 根據完整行為統計選擇深度
 */
export function selectDepthFromStats(stats: UserBehaviorStats): DepthModuleId {
  // 有意見或長停留 + 高按讚率 -> 深度內容
  if (stats.hasFeedback) {
    return 'deep'
  }

  if (stats.avgDwellTime > 30000 && stats.recentLikes > stats.recentSkips) {
    return 'deep'
  }

  // 連續無感覺或多不讚 -> 簡短內容
  if (stats.recentSkips > 5 || stats.recentDislikes > 3) {
    return 'brief'
  }

  // 快速瀏覽模式
  if (stats.avgDwellTime < 5000) {
    return 'brief'
  }

  return 'standard'
}

/**
 * 組合用戶意見和關鍵字為提示詞脈絡
 */
export function buildUserContext(stats: UserBehaviorStats): string {
  const parts: string[] = []

  if (stats.lastFeedback) {
    parts.push(`用戶最近表示：「${stats.lastFeedback}」`)
  }

  if (stats.recentKeywords.length > 0) {
    parts.push(`用戶對以下主題有興趣：${stats.recentKeywords.join('、')}`)
  }

  if (stats.recentLikes > stats.recentDislikes * 2) {
    parts.push('用戶對近期內容反應正面')
  } else if (stats.recentDislikes > stats.recentLikes) {
    parts.push('用戶對近期內容反應較負面，請嘗試不同角度')
  }

  return parts.join('\n')
}