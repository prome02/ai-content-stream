import type { ContentItem } from '@/types'

// 模擬資料，供開發測試
export const MOCK_CONTENT_ITEMS: ContentItem[] = [
  {
    id: '1',
    content: '學會 React 與 Next.js 後，你可以用免費工具建立 Side Project，有機會創造被動收入。今天就開始吧！🚀',
    hashtags: ['#程式設計', '#React', '#被動收入'],
    topics: ['程式設計', '創業'],
    likes: 42,
    dislikes: 3,
    qualityScore: 85,
    generatedAt: new Date('2026-01-20T14:30:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '2',
    content: '邊緣 AI 技術讓手機也能跑 LLM，不再依賴網路服務。未來隱私和效能都會大幅提升！🤖📱',
    hashtags: ['#AI', '#科技', '#隱私'],
    topics: ['AI', '科技'],
    likes: 28,
    dislikes: 1,
    qualityScore: 78,
    generatedAt: new Date('2026-01-20T13:45:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '3',
    content: '每天花 30 分鐘學習新技能，一年後你會驚訝自己的進步。簡單的堅持比天才更重要。📚✨',
    hashtags: ['#學習', '#成長', '#自律'],
    topics: ['學習', '自律'],
    likes: 56,
    dislikes: 0,
    qualityScore: 92,
    generatedAt: new Date('2026-01-20T12:15:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '4',
    content: '投資最忌諱追高殺低。建立自己的投資組合，耐心持有優質資產才是長期獲利的關鍵。📈💰',
    hashtags: ['#投資', '#理財', '#長期投資'],
    topics: ['投資', '理財'],
    likes: 33,
    dislikes: 7,
    qualityScore: 76,
    generatedAt: new Date('2026-01-20T10:20:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '5',
    content: '健康不僅是運動，還包括飲食習慣和睡眠品質。嘗試「時間限制進食法」，改善新陳代謝。💪🥗',
    hashtags: ['#健康', '#飲食', '#健身'],
    topics: ['健康', '飲食'],
    likes: 47,
    dislikes: 2,
    qualityScore: 81,
    generatedAt: new Date('2026-01-20T09:05:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '6',
    content: '旅遊不只是打卡，真正的體驗來自當地文化深度交流。學習在地語言，結交當地朋友。✈️🌍',
    hashtags: ['#旅遊', '#文化', '#體驗'],
    topics: ['旅遊', '文化'],
    likes: 39,
    dislikes: 4,
    qualityScore: 79,
    generatedAt: new Date('2026-01-20T08:30:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
  {
    id: '7',
    content: '音樂治療能改善情緒、減輕壓力。每天聽15分鐘古典音樂，大腦會更放鬆和專注。🎵🧠',
    hashtags: ['#音樂', '#健康', '#放鬆'],
    topics: ['音樂', '健康'],
    likes: 31,
    dislikes: 5,
    qualityScore: 75,
    generatedAt: new Date('2026-01-20T07:45:00'),
    style: 'casual',
    usedBy: [],
    reuseCount: 0
  },
]