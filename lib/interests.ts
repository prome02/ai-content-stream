interface Interest {
  id: string
  name: string
  emoji: string
  color: string
  description?: string
}

export const INTERESTS_LIST: Interest[] = [
  { id: 'ai', name: '人工智慧', emoji: '🤖', color: 'bg-purple-500', description: 'AI、機器學習、深度學習' },
  { id: 'tech', name: '科技', emoji: '💻', color: 'bg-blue-500', description: '程式、軟體開發、新科技' },
  { id: 'learning', name: '學習', emoji: '📚', color: 'bg-green-500', description: '知識、教育、自我提升' },
  { id: 'business', name: '創業', emoji: '💼', color: 'bg-yellow-500', description: '創業、商業、投資' },
  { id: 'health', name: '健康', emoji: '💪', color: 'bg-red-500', description: '健身、營養、心理健康' },
  { id: 'travel', name: '旅遊', emoji: '✈️', color: 'bg-indigo-500', description: '旅行、冒險、文化體驗' },
  { id: 'food', name: '美食', emoji: '🍕', color: 'bg-pink-500', description: '料理、餐廳、食譜' },
  { id: 'music', name: '音樂', emoji: '🎵', color: 'bg-orange-500', description: '音樂欣賞、樂器、演唱會' },
  { id: 'movies', name: '電影', emoji: '🎬', color: 'bg-teal-500', description: '電影、戲劇、娛樂' },
  { id: 'anime', name: '動漫', emoji: '📺', color: 'bg-fuchsia-500', description: '動畫、漫畫、二次元' },
  { id: 'sports', name: '運動', emoji: '⚽', color: 'bg-emerald-500', description: '體育、健身、比賽' },
  { id: 'games', name: '遊戲', emoji: '🎮', color: 'bg-cyan-500', description: '電競、桌遊、手機遊戲' },
  { id: 'design', name: '設計', emoji: '🎨', color: 'bg-rose-500', description: 'UI/UX、藝術、創意' },
  { id: 'science', name: '科學', emoji: '🔬', color: 'bg-amber-500', description: '物理、化學、生物' },
  { id: 'fashion', name: '時尚', emoji: '👗', color: 'bg-violet-500', description: '穿搭、美妝、潮流' },
]