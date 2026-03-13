import { extractKeywordsFromNews, fetchNews, formatNewsForPrompt } from '@/lib/news-fetcher'

function makeRssXml(items: Array<{ title: string; description?: string; link: string; pubDate: Date; source?: string }>) {
  const xmlItems = items.map((item) => {
    const source = item.source ?? 'Google News'
    return `
      <item>
        <title><![CDATA[${item.title}]]></title>
        <description><![CDATA[${item.description ?? ''}]]></description>
        <link>${item.link}</link>
        <pubDate>${item.pubDate.toUTCString()}</pubDate>
        <source>${source}</source>
      </item>
    `
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        ${xmlItems.join('\n')}
      </channel>
    </rss>`
}

describe('news-fetcher', () => {
  afterEach(() => {
    // Clean up mocked fetch between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = undefined
  })

  test('fetchNews returns empty array and does not call fetch when interests is empty', async () => {
    const fetchSpy = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const items = await fetchNews({ interests: [] as any })
    expect(items).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('fetchNews builds a locale-aware Google News RSS URL (zh-TW => gl=TW, ceid=TW:zh-Hant)', async () => {
    const xml = makeRssXml([
      { title: 'Tech news', link: 'https://example.com/1', pubDate: new Date(), source: 'Example' }
    ])

    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => xml,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    await fetchNews({ interests: ['tech', 'business'] as any, locale: 'zh-TW', maxItems: 1 })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const url = String(fetchSpy.mock.calls[0][0])
    expect(url).toContain('https://news.google.com/rss/search?')
    expect(url).toContain('hl=zh-TW')
    expect(url).toContain('gl=TW')
    expect(url).toContain('ceid=TW%3Azh-Hant')
  })

  test('fetchNews filters out items older than 48 hours and respects maxItems and excludeLinks', async () => {
    const now = Date.now()
    const recent = new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago
    const old = new Date(now - 72 * 60 * 60 * 1000) // 72 hours ago

    const xml = makeRssXml([
      { title: 'Recent A', link: 'https://example.com/a', pubDate: recent, source: 'Example' },
      { title: 'Old B', link: 'https://example.com/b', pubDate: old, source: 'Example' },
      { title: 'Recent C', link: 'https://example.com/c', pubDate: recent, source: 'Example' },
    ])

    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => xml,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const items = await fetchNews({
      interests: ['tech'] as any,
      locale: 'zh-TW',
      maxItems: 5,
      excludeLinks: ['https://example.com/c'],
    })

    // Only recent items survive the 48h filter, and excludeLinks removes one of them.
    expect(items.length).toBe(1)
    expect(items[0].title).toContain('Recent')
    expect(items[0].link).toBe('https://example.com/a')
  })

  test('fetchNews returns empty array on non-OK response', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).fetch = fetchSpy

    const items = await fetchNews({ interests: ['tech'] as any, locale: 'zh-TW', maxItems: 2 })
    expect(items).toEqual([])
    errSpy.mockRestore()
  })

  test('formatNewsForPrompt includes title (link may be omitted to keep prompts compact)', () => {
    const news = [{
      title: 'OpenAI releases something',
      description: 'A short description',
      link: 'https://example.com/openai',
      pubDate: new Date(),
      source: 'Example',
    }]

    const prompt = formatNewsForPrompt(news as any)
    expect(prompt).toContain(news[0].title)
    expect(prompt).not.toContain(news[0].link)
  })

  test('extractKeywordsFromNews returns up to 6 keywords', () => {
    const news = [
      { title: 'OpenAI releases new model', description: '', link: 'https://a', pubDate: new Date(), source: 'Example' },
      { title: 'Business growth and market trends', description: '', link: 'https://b', pubDate: new Date(), source: 'Example' },
    ]

    const keywords = extractKeywordsFromNews(news as any)
    expect(Array.isArray(keywords)).toBe(true)
    expect(keywords.length).toBeLessThanOrEqual(6)
    expect(keywords.join(' ')).toMatch(/OpenAI|releases|Business|growth|market|trends/)
  })
})
