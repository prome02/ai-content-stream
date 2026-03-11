// tests/auto-stream-content-generation.test.ts

function cleanAutoGenerateParam(url: string): string {
  const urlObj = new URL(url, 'http://localhost:3000')
  urlObj.searchParams.delete('autoGenerate')
  return urlObj.pathname + (urlObj.searchParams.toString() ? `?${urlObj.searchParams.toString()}` : '')
}

function shouldAutoGenerate(searchParams: URLSearchParams): boolean {
  return searchParams.get('autoGenerate') === 'true'
}

function canStartAutoGeneration(
  user: { uid: string } | null,
  shouldAuto: boolean,
  isGenerating: boolean,
  feedItems: unknown[],
  userInterests: string[]
): boolean {
  return Boolean(user && shouldAuto && !isGenerating && feedItems.length === 0 && userInterests.length > 0)
}

function getFeedUIState(
  feedItems: unknown[],
  isGenerating: boolean,
  shouldAuto: boolean
): 'empty' | 'auto-generating' | 'content' {
  if (feedItems.length === 0 && !isGenerating && !shouldAuto) return 'empty'
  if (feedItems.length === 0 && (isGenerating || shouldAuto)) return 'auto-generating'
  return 'content'
}

describe('Auto-Stream Content Generation', () => {
  test('shouldAutoGenerate reads autoGenerate=true', () => {
    expect(shouldAutoGenerate(new URL('http://localhost:3000/feed?autoGenerate=true').searchParams)).toBe(true)
    expect(shouldAutoGenerate(new URL('http://localhost:3000/feed?autoGenerate=false').searchParams)).toBe(false)
    expect(shouldAutoGenerate(new URL('http://localhost:3000/feed').searchParams)).toBe(false)
  })

  test('cleanAutoGenerateParam removes autoGenerate while preserving other params', () => {
    const originalUrl = 'http://localhost:3000/feed?autoGenerate=true&other=param'
    expect(cleanAutoGenerateParam(originalUrl)).toBe('/feed?other=param')
  })

  test('canStartAutoGeneration requires user, interests, and no existing content', () => {
    const user = { uid: 'test-user-123' }
    const interests = ['tech']
    expect(canStartAutoGeneration(user, true, false, [], interests)).toBe(true)
    expect(canStartAutoGeneration(null, true, false, [], interests)).toBe(false)
    expect(canStartAutoGeneration(user, false, false, [], interests)).toBe(false)
    expect(canStartAutoGeneration(user, true, true, [], interests)).toBe(false)
    expect(canStartAutoGeneration(user, true, false, [{ id: 1 }], interests)).toBe(false)
    expect(canStartAutoGeneration(user, true, false, [], [])).toBe(false)
  })

  test('getFeedUIState returns expected UI state', () => {
    expect(getFeedUIState([], false, false)).toBe('empty')
    expect(getFeedUIState([], true, false)).toBe('auto-generating')
    expect(getFeedUIState([], false, true)).toBe('auto-generating')
    expect(getFeedUIState([{ id: 1 }], false, false)).toBe('content')
    expect(getFeedUIState([{ id: 1 }], true, true)).toBe('content')
  })
})

