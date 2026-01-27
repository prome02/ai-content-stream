// lib/news-fetcher.ts

import { INTEREST_CATEGORIES, InterestCategory } from '@/types'

export interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: Date
  source: string
}

export interface FetchNewsOptions {
  interests: InterestCategory[]
  maxItems?: number
  locale?: string
}

const RSS_BASE_URL = 'https://news.google.com/rss/search'

/**
 * 根據興趣取得 Google 新聞 RSS
 */
export async function fetchNews(options: FetchNewsOptions): Promise<NewsItem[]> {
  const { interests, maxItems = 5, locale = 'zh-TW' } = options

  if (interests.length === 0) {
    console.log('[NewsFetcher] No interests provided, skipping fetch')
    return []
  }

  // 組合搜尋關鍵字
  const keywords = interests
    .flatMap(interest => INTEREST_CATEGORIES[interest]?.keywords || [])
    .slice(0, 3)  // 取前 3 個關鍵字避免過於複雜
    .join(' OR ')

  const url = buildRssUrl(keywords, locale)
  console.log(`[NewsFetcher] Fetching: ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      },
      next: { revalidate: 300 }  // 5 分鐘快取
    })

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`)
    }

    const xml = await response.text()
    const items = parseRssXml(xml)

    // 篩選 48 小時內的新聞
    const recentItems = filterRecentNews(items, 48)

    console.log(`[NewsFetcher] Found ${recentItems.length} recent items`)
    return recentItems.slice(0, maxItems)

  } catch (error) {
    console.error('[NewsFetcher] Error:', error)
    return []
  }
}

function buildRssUrl(query: string, locale: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: locale,
    gl: locale === 'zh-TW' ? 'TW' : 'US',
    ceid: locale === 'zh-TW' ? 'TW:zh-Hant' : 'US:en'
  })
  return `${RSS_BASE_URL}?${params.toString()}`
}

function parseRssXml(xml: string): NewsItem[] {
  // 簡易 XML 解析（Server-side）
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]

    const title = extractTag(itemXml, 'title')
    const description = extractTag(itemXml, 'description')
    const link = extractTag(itemXml, 'link')
    const pubDate = extractTag(itemXml, 'pubDate')
    const source = extractTag(itemXml, 'source')

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        description: cleanHtml(description || ''),
        link,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        source: source || 'Google News'
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = regex.exec(xml)
  return match ? (match[1] || match[2] || '').trim() : null
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function filterRecentNews(items: NewsItem[], hours: number): NewsItem[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  return items.filter(item => item.pubDate.getTime() > cutoff)
}

/**
 * 將新聞列表格式化為 LLM 素材
 */
export function formatNewsForPrompt(news: NewsItem[]): string {
  if (news.length === 0) {
    return '【無相關新聞素材】'
  }

  return news.map((item, index) => {
    const dateStr = formatRelativeTime(item.pubDate)
    return `【新聞素材 ${index + 1}】
標題：${item.title}
摘要：${item.description || '無摘要'}
來源：${item.source}
時間：${dateStr}
連結：${item.link}
`
  }).join('\n')
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '剛剛'
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

/**
 * 從新聞中提取關鍵字（供 LLM 標記用）
 */
export function extractKeywordsFromNews(news: NewsItem[]): string[] {
  const keywords = new Set<string>()

  news.forEach(item => {
    // 簡易關鍵字提取：取標題中的重要詞彙
    const words = item.title
      .split(/[\s,，、。！？]+/)
      .filter(word => word.length >= 2 && word.length <= 10)

    words.forEach(word => keywords.add(word))
  })

  return Array.from(keywords).slice(0, 10)
}