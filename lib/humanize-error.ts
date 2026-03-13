export function humanizeGenerationError(raw: string): string {
  const msg = String(raw || '').trim()
  const lower = msg.toLowerCase()

  // Timeouts
  if (
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('operation was aborted')
  ) {
    return [
      '產生內容逾時，可能是模型回應較慢或目前流量較高。',
      '建議：稍後重試，或先關閉自動載入，再手動產生 1 篇測試。'
    ].join('\n')
  }

  // Context length / prompt too long
  if (lower.includes('context length') || lower.includes('prompt too long')) {
    return [
      '這次提供的素材太多，超過模型可處理的長度上限。',
      '建議：減少同時產生的篇數，或降低新聞/素材量後再試。'
    ].join('\n')
  }

  // Rate limits
  if (lower.includes('rate_limit') || lower.includes('rate limit') || lower.includes('429')) {
    return [
      '你操作得有點頻繁，系統暫時限制產生請求。',
      '建議：稍等一會再試。'
    ].join('\n')
  }

  // Output validation
  if (lower.includes('too short')) {
    return [
      '模型回傳的內容太短，無法符合你選擇的內容深度。',
      '建議：重試一次；若仍反覆發生，可改用較短的內容深度或換模型。'
    ].join('\n')
  }

  if (lower.includes('fewer items')) {
    return [
      '模型回傳的內容數量不足。',
      '建議：重試一次；或先改成一次產生 1 篇再逐篇載入。'
    ].join('\n')
  }

  // Default (avoid leaking internal details)
  return [
    '產生內容失敗。',
    '建議：稍後重試；如果持續發生，請提供錯誤發生的時間點讓我們查看後端紀錄。'
  ].join('\n')
}

