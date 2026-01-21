'use client'

import { useState, useEffect } from 'react'
import AbTestingManager from '@/lib/ab-testing'
import { BarChart3, Users, Activity, Filter } from 'lucide-react'
import type { QualityScoreVariant } from '@/lib/ab-testing'

interface ABTestingStatusProps {
  uid: string
}

export default function ABTestingStatus({ uid }: ABTestingStatusProps) {
  const [variant, setVariant] = useState<QualityScoreVariant | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (uid) {
      try {
        // 獲取使用者分配的變體
        const assignedVariant = AbTestingManager.assignVariant(uid)
        setVariant(assignedVariant)
        
        // 獲取變體配置
        const userConfig = AbTestingManager.getUserConfig(uid)
        setConfig(userConfig)
        
        // 獲取全局統計
        const globalStats = AbTestingManager.getStats()
        setStats(globalStats)
      } catch (error) {
        console.error('載入 A/B 測試狀態失敗:', error)
      }
    }
  }, [uid])

  if (!variant || !config) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500">載入 A/B 測試狀態...</div>
      </div>
    )
  }

  const variantConfigs = {
    'A': { color: 'bg-blue-100 text-blue-800', label: '對照組' },
    'B': { color: 'bg-green-100 text-green-800', label: '加強新用戶影響' },
    'C': { color: 'bg-yellow-100 text-yellow-800', label: '簡化算法' },
    'D': { color: 'bg-purple-100 text-purple-800', label: '加強停留時間' }
  }

  const variantInfo = variantConfigs[variant]

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">A/B 測試 - 品質評分系統</h3>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${variantInfo.color}`}>
          變體 {variant} - {variantInfo.label}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray1-600 whitespace-pre-line">
          {config.description}
        </div>
      </div>

      {/* 變體配置參數 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 p-2 rounded-lg">
          <div className="text-xs text-gray-500">點讚分數</div>
          <div className="font-medium">{config.likeScore}</div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded-lg">
          <div className="text-xs text-gray-500">不讚分數</div>
          <div className="font-medium">{config.dislikeScore}</div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded-lg">
          <div className="text-xs text-gray-500">停留獎勵</div>
          <div className="font-medium">{config.dwellTimeBonus}</div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded-lg">
          <div className="text-xs text-gray-500">新用戶保護</div>
          <div className="font-medium">{config.newUserProtectionDays}天</div>
        </div>
      </div>

      {/* 全局統計（如果可用） */}
      {stats && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">全局統計</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-600" />
                <div className="text-xs text-blue-600">參與者</div>
              </div>
              <div className="font-medium text-lg">{stats.totalUsers || 0}</div>
            </div>
            
            <div className="bg-green-50 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-green-600" />
                <div className="text-xs text-green-600">互動總數</div>
              </div>
              <div className="font-medium text-lg">{stats.totalInteractions || 0}</div>
            </div>
            
            <div className="bg-purple-50 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-purple-600" />
                <div className="text-xs text-purple-600">平均互動</div>
              </div>
              <div className="font-medium text-lg">{stats.avgInteractionsPerUser || 0}</div>
            </div>
          </div>

          {/* 變體分佈圖 */}
          {stats.variantDistribution && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">變體分佈</div>
              <div className="flex items-end gap-1">
                {Object.entries(stats.variantDistribution).map(([variant, count]) => {
                  const totalParticipants = stats.totalUsers || 1
                  const percentage = Math.round((Number(count) / totalParticipants) * 100)
                  const height = Math.max(20, percentage * 2)
                  
                  const variantColor = variantConfigs[variant as QualityScoreVariant]?.color || 'bg-gray-200'
                  
                  return (
                    <div key={variant} className="flex flex-col items-center">
                      <div 
                        className={`w-full flex items-end justify-center rounded-t-lg ${variantColor.replace('text-', '')}`}
                        style={{ height: `${height}px` }}
                      >
                        <div className="text-xs font-medium mb-1">{percentage}%</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">變體 {variant}</div>
                      <div className="text-xs text-gray-400">{String(count)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}