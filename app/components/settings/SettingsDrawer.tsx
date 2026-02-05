'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, RotateCcw, Check } from 'lucide-react'
import OptionSelector from '@/app/components/ui/OptionSelector'
import type {
  ContentSettings,
  ToneType,
  StyleType,
  DepthType,
  LengthType,
  TopicType,
  FreshnessType,
} from '@/types'
import {
  DEFAULT_CONTENT_SETTINGS,
  TONE_OPTIONS,
  STYLE_OPTIONS,
  DEPTH_OPTIONS,
  LENGTH_OPTIONS,
  TOPIC_OPTIONS,
  FRESHNESS_OPTIONS,
} from '@/types'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  settings: ContentSettings
  onSettingsChange: (settings: ContentSettings) => void
  onReset: () => void
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onReset,
}: SettingsDrawerProps) {
  const [saveIndicator, setSaveIndicator] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Show save indicator briefly
  const showSaveIndicator = useCallback(() => {
    setSaveIndicator(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSaveIndicator(false), 1500)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback(
    <K extends keyof ContentSettings>(key: K, value: ContentSettings[K]) => {
      const updated = { ...settings, [key]: value }
      onSettingsChange(updated)
      showSaveIndicator()
    },
    [settings, onSettingsChange, showSaveIndicator]
  )

  // Helper to convert option records to array format
  function toOptions<T extends string>(
    record: Record<T, { label: string; description: string }>
  ): { value: string; label: string; description: string }[] {
    return Object.entries(record).map(([value, meta]) => ({
      value,
      label: (meta as { label: string; description: string }).label,
      description: (meta as { label: string; description: string }).description,
    }))
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">內容偏好設定</h2>
          <div className="flex items-center gap-2">
            {saveIndicator && (
              <span className="flex items-center gap-1 text-xs text-green-600 animate-fade-in">
                <Check className="h-3 w-3" />
                已儲存
              </span>
            )}
            <button
              onClick={onReset}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
              title="重置為預設值"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-60px)] p-4">
          <p className="text-sm text-gray-500 mb-4">
            調整以下設定，讓 AI 生成更符合你喜好的內容。變更會自動儲存並套用到後續生成的文章。
          </p>

          <OptionSelector
            title="語氣風格"
            options={toOptions(TONE_OPTIONS)}
            value={settings.tone}
            onChange={(v) => handleChange('tone', v as ToneType)}
          />

          <OptionSelector
            title="寫作風格"
            options={toOptions(STYLE_OPTIONS)}
            value={settings.style}
            onChange={(v) => handleChange('style', v as StyleType)}
          />

          <OptionSelector
            title="內容深度"
            options={toOptions(DEPTH_OPTIONS)}
            value={settings.depth}
            onChange={(v) => handleChange('depth', v as DepthType)}
          />

          <OptionSelector
            title="文章長度"
            options={toOptions(LENGTH_OPTIONS)}
            value={settings.length}
            onChange={(v) => handleChange('length', v as LengthType)}
          />

          <OptionSelector
            title="內容主題"
            options={toOptions(TOPIC_OPTIONS)}
            value={settings.topic}
            onChange={(v) => handleChange('topic', v as TopicType)}
          />

          <OptionSelector
            title="內容新鮮度"
            options={toOptions(FRESHNESS_OPTIONS)}
            value={settings.freshness}
            onChange={(v) => handleChange('freshness', v as FreshnessType)}
          />

          {/* Auto infinite scroll toggle */}
          <div className="mb-5">
            <h4 className="text-sm font-medium text-gray-700 mb-2">自動載入</h4>
            <label className="flex items-center justify-between px-3 py-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
              <div>
                <div className="text-sm font-medium text-gray-700">自動載入更多內容</div>
                <div className="text-xs text-gray-500 mt-0.5">滾動到底部時自動生成新文章</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoInfiniteScroll}
                onChange={(e) => handleChange('autoInfiniteScroll', e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
    </>
  )
}
