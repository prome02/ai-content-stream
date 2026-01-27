import { type InterestCategory } from '@/types'
import { formatNewsForPrompt, extractKeywordsFromNews, type NewsItem } from './news-fetcher'
import { selectModules, getDefaultBehavior, type UserBehavior, type SelectedModules } from './prompt-selector'

// 互動資料結構
interface InteractionData {
  action: 'like' | 'dislikes'
  topics: string[]
  duration?: number // 停留時間（毫秒）
  createdAt: Date
}

// Prompt 上下文
interface PromptContext {
  userPreferences: {
    interests: string[]
    language?: string
    style?: 'casual' | 'formal'
  }
  recentInteractions: InteractionData[]
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  mode?: 'default' | 'creative' | 'focused'
  diversityScore?: number
  depthLevel?: DepthLevel
}

// 內容深度等級
export const DEPTH_LEVELS = {
  brief: {
    id: 'brief',
    wordCount: { min: 200, max: 300 },
    description: '簡短摘要，快速瀏覽'
  },
  standard: {
    id: 'standard',
    wordCount: { min: 400, max: 600 },
    description: '標準長度，適中深度'
  },
  deep: {
    id: 'deep',
    wordCount: { min: 800, max: 1200 },
    description: '深度分析，詳細內容'
  }
} as const

export type DepthLevel = keyof typeof DEPTH_LEVELS

// 興趣轉換成主題標籤（更新為 6 個 Google 新聞友好分類）
const INTEREST_TO_HASHTAG: Record<string, string[]> = {
  'tech': ['#科技新知', '#AI趨勢', '#軟體開發', '#網路科技'],
  'business': ['#商業財經', '#投資理財', '#股市分析', '#經濟趨勢'],
  'health': ['#健康生活', '#養生保健', '#運動健身', '#飲食營養'],
  'travel': ['#旅遊探索', '#自由行', '#景點推薦', '#文化體驗'],
  'sports': ['#運動體育', '#賽事新聞', '#球隊分析', '#球員動態'],
  'fashion': ['#時尚潮流', '#穿搭技巧', '#美妝造型', '#品牌故事']
}

// 時間情境對應
const TIME_CONTEXT: Record<string, string> = {
  'morning': '早晨時光，適合激勵、學習、啟發思考的內容。',
  'afternoon': '午後時光，適合放鬆、分享、深度思考的內容。', 
  'evening': '傍晚時光，適合回憶、連結、社群互動的內容。',
  'night': '夜間時光，適合反思、探索、內省思考的內容。'
}

class PromptBuilder {
  private VERSION = 'v1.0'
  
  private getDepthInstruction(depth: DepthLevel = 'standard'): string {
    const config = DEPTH_LEVELS[depth]
    return `請撰寫 ${config.wordCount.min}-${config.wordCount.max} 字的內容。${config.description}。`
  }

  /**
   * 建構完整的 prompt
   */
  build(context: PromptContext): string {
    // 內部轉換為 ModularPromptContext，保持向下相容
    const {
      userPreferences,
      recentInteractions = [],
      timeOfDay = this.getCurrentTimeOfDay(),
      mode = 'default',
      diversityScore = 0.5,
      depthLevel = 'standard'
    } = context

    // 模擬預設新聞和行為（供模組化提示詞使用）
    const modularContext: ModularPromptContext = {
      userPreferences: {
        interests: userPreferences.interests,
        language: userPreferences.language || 'zh-TW'
      },
      news: [], // 暫時使用空新聞（應由 caller 提供，但維持相容性）
      behavior: getDefaultBehavior(),
      userFeedback: undefined
    }

    // 內部呼叫新的模組化提示詞建構函數
    return this.buildModularPrompt(modularContext)
  }

  /**
   * 建構 System Prompt
   */
  private buildSystemPrompt(
    preferences: any,
    emphasizedTopics: string[],
    avoidedTopics: string[],
    timeOfDay: string,
    mode: string,
    diversityScore: number,
    hashtags: string[],
    depthInstruction: string
  ): string {
    const timeContext = TIME_CONTEXT[timeOfDay] || '一般日常情境'

    // 模式指令
    const modeInstruction = this.getModeInstruction(mode)
    
    // 多樣性指令
    const diversityInstruction = this.getDiversityInstruction(diversityScore)

    return `
你是一位 AI 內容創作者，專門根據使用者興趣生成個人化的內容。

## 使用者個人檔案

**主要興趣**: ${preferences.interests.join('、')}
**風格偏好**: ${preferences.style || 'casual'}（輕鬆自然）
**語言偏好**: ${preferences.language || 'zh-TW'}（台灣繁體中文）

## 興趣歷史與偏好

**強調的主題**: ${emphasizedTopics.join('、') || '使用者尚未有明確偏好，探索性生成'}
**避免的主題**: ${avoidedTopics.join('、') || '無特別限制'}

## 時間與情境

${timeContext}

## 生成準則

${diversityInstruction}

${modeInstruction}

## 內容要求

1. **格式**: 豐富的文章內容，非短貼文
2. **長度**: ${depthInstruction}
3. **標籤**: 每篇 2-3 個相關 hashtag (${hashtags.join('、')})
4. **表情符號**: 每篇 1-3 個相關 emoji
5. **語氣**: ${preferences.style === 'formal' ? '正式、專業的語氣' : '輕鬆、自然的語氣'}

## 品質要求

- **真實性**: 內容應真實有意義，避免空洞的陳述
- **價值**: 提供知識、靈感或娛樂價值
- **相關性**: 緊扣使用者興趣的主題
- **多樣性**: 避免重複的概念與表達方式
- **互動性**: 適當帶入問題或思考點

## 輸出格式（嚴格要求的 JSON 陣列格式）

你需要回傳 **完全符合以下格式** 的 JSON 陣列：

\`\`\`json
[
  {
    "content": "內容文字",
    "hashtags": ["#標籤1", "#標籤2"],
    "emojis": ["😊", "🔥"],
    "topics": ["主題1", "主題2"],
    "style": "casual 或 formal"
  }
]
\`\`\`

**重要**：請生成 **恰好 3 篇** 高品質內容，每篇都應符合上述所有要求。
`.trim()
  }

  /**
   * 從互動歷史提取喜歡的主題
   */
  private extractLikedTopics(interactions: InteractionData[]): string[] {
    return interactions
      .filter(i => i.action === 'like')
      .flatMap(i => i.topics)
      .slice(0, 5) // 最多取前 5 個
      .filter(topic => topic && topic.trim().length > 0)
  }

  /**
   * 從互動歷史提取不喜歡的主題
   */
  private extractDislikedTopics(interactions: InteractionData[]): string[] {
    return interactions
      .filter(i => i.action === 'dislikes')
      .flatMap(i => i.topics)
      .slice(0, 5) // 最多取前 5 個
  }

  /**
   * 建構 hashtags
   */
  private buildHashtags(interests: string[]): string[] {
    return interests
      .map(interest => INTEREST_TO_HASHTAG[interest] || [`#${interest}`])
      .flat()
      .slice(0, 10) // 最多 10 個
  }

  /**
   * 取得當前時間段
   */
  private getCurrentTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 22) return 'evening'
    return 'night'
  }

  /**
   * 計算溫度參數
   */
  private calculateTemperature(mode: string, diversityScore: number): number {
    // 基礎溫度
    let temperature = 0.7
    
    // 模式調整
    if (mode === 'creative') temperature = 0.9
    if (mode === 'focused') temperature = 0.6
    
    // 多樣性調整：多樣性低 → 提高溫度（增加創造性）
    if (diversityScore < 0.4) {
      temperature = Math.min(1.0, temperature + 0.1)
    }
    
    // 多樣性高 → 降低溫度（減少隨機性）
    if (diversityScore > 0.7) {
      temperature = Math.max(0.5, temperature - 0.1)
    }
    
    return Math.round(temperature * 10) / 10
  }

  /**
   * 獲取多樣性指令
   */
  private getDiversityInstruction(score: number): string {
    if (score < 0.3) {
      return '⚠️ 使用者互動歷史顯示內容多樣性不足，請嘗試引入新的主題和觀點，擴展興趣範圍。'
    }
    if (score > 0.8) {
      return '🎯 使用者對多樣主題感興趣，請提供更深入、專業的內容，聚焦於核心興趣的深度探索。'
    }
    return '🎯 平衡策略：混合熟悉的興趣主題與適度的新探索，保持新鮮感但不偏離核心興趣。'
  }

  /**
   * 獲取模式指令
   */
  private getModeInstruction(mode: string): string {
    const instructions: Record<string, string> = {
      'default': '平衡內容：兼顧資訊價值與娛樂性，保持自然流暢。',
      'creative': '創意模式：鼓勵創新觀點、幽默元素、獨特表達方式。嘗試非傳統的連結與思考角度。',
      'focused': '專注模式：集中於核心興趣主題，提供深度、專業、有系統性的內容。'
    }
    return instructions[mode] || instructions.default
  }

  /**
   * 解析 AI 回應
   */
  parseResponse(aiResponse: string): any[] {
    try {
      // 嘗試解析 JSON
      const parsed = JSON.parse(aiResponse)
      
      // 支援兩種格式：新格式（物件）和舊格式（陣列）
      if (Array.isArray(parsed)) {
        // 舊格式（陣列）：[{content, hashtags, emojis, topics, style}]
        return parsed.map(item => ({
          content: item.content || '', // 移除字數限制
          hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
          emojis: Array.isArray(item.emojis) ? item.emojis : [],
          topics: Array.isArray(item.topics) ? item.topics : [],
          style: item.style || 'casual'
        }))
      } else if (parsed && typeof parsed === 'object') {
        // 新格式（物件）：{content, keywords, topics, style}
        const contentItem = parsed
        
        return [{
          content: contentItem.content || '',
          hashtags: [], // 新格式沒有 hashtags，使用空陣列相容
          emojis: [],   // 新格式沒有 emojis，使用空陣列相容
          topics: Array.isArray(contentItem.topics) ? contentItem.topics : [],
          style: contentItem.style || 'casual'
        }]
      } else {
        throw new Error('回應不是有效的 JSON 格式')
      }
      
    } catch (error) {
      console.error('解析 AI 回應失敗:', error)
      
      // 嘗試從文字中提取 JSON 部分
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/) || aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          // 遞迴呼叫解析提取的 JSON
          return this.parseResponse(jsonMatch[0])
        } catch (e) {
          console.error('二次解析失敗:', e)
        }
      }
      
      // 緊急備援：生成簡單內容
      return [
        {
          content: '今天也是學習創造美好內容的一天！持續探索，保持好奇。✨',
          hashtags: ['#學習', '#成長'],
          emojis: ['✨', '📚'],
          topics: ['學習'],
          style: 'casual'
        },
        {
          content: '每一個興趣都是一扇門，開啟它，探索未知的世界。🚪',
          hashtags: ['#探索', '#興趣'],
          emojis: ['🚪', '🌍'],
          topics: ['探索'],
          style: 'casual'
        }
      ]
    }
  }

  // 新增模組化提示詞建構方法到類別中
  buildModularPrompt(context: ModularPromptContext): string {
    const modules = selectModules(context.behavior)
    const newsMaterial = formatNewsForPrompt(context.news)
    const keywords = extractKeywordsFromNews(context.news)

    const systemPrompt = `${modules.role.prompt}

${modules.perspective.prompt}

${modules.format.prompt}

${modules.depth.prompt}

請使用繁體中文撰寫。`

    const userPrompt = `【用戶興趣】
${context.userPreferences.interests.join('、')}

【新聞素材】
${newsMaterial}

【可標記的關鍵字】
以下關鍵字可以在文章中使用 {{keyword:關鍵字}} 格式標記，讓用戶可以點擊：
${keywords.join('、')}

${context.userFeedback ? `【用戶意見】
用戶表示：「${context.userFeedback}」
請特別針對這個方向撰寫。

` : ''}
請根據以上素材，撰寫一篇文章。

輸出格式（JSON）：
{
  "content": "文章內容，使用 {{keyword:關鍵字}} 標記可點擊的關鍵字",
  "keywords": ["關鍵字1", "關鍵字2"],
  "topics": ["主題1", "主題2"],
  "style": "casual"
}`

    // 保持與現有格式相容
    return JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'gemma3:12b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      options: {
        temperature: 0.8,
        top_p: 0.9
      },
      // 記錄使用的模組（供分析用）
      _modules: {
        role: modules.role.id,
        perspective: modules.perspective.id,
        format: modules.format.id,
        depth: modules.depth.id
      }
    })
  }
}

export interface ModularPromptContext {
  userPreferences: {
    interests: string[]
    language: string
  }
  news: NewsItem[]
  behavior: UserBehavior
  userFeedback?: string  // 用戶的文字意見
}

export { PromptBuilder, type PromptContext, type InteractionData }