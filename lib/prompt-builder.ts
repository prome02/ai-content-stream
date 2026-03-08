import { type InterestCategory } from '@/types'
import { formatNewsForPrompt, extractKeywordsFromNews, type NewsItem } from './news-fetcher'
import { selectModules, getDefaultBehavior, type UserBehavior, type SelectedModules } from './prompt-selector'
import { getLanguageInstruction } from './locale-utils'

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
**語言偏好**: ${preferences.language || 'zh-TW'} (${getLanguageInstruction(preferences.language || 'zh-TW')})

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
    "emojis": ["", ""],
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
      return '[Warn] 使用者互動歷史顯示內容多樣性不足，請嘗試引入新的主題和觀點，擴展興趣範圍。'
    }
    if (score > 0.8) {
      return '[Target] 使用者對多樣主題感興趣，請提供更深入、專業的內容，聚焦於核心興趣的深度探索。'
    }
    return '[Target] 平衡策略：混合熟悉的興趣主題與適度的新探索，保持新鮮感但不偏離核心興趣。'
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
   * 只支援新格式（物件）：{content, keywords, topics, style}
   * 增強容錯：處理各種 LLM 輸出格式問題
   */
  parseResponse(aiResponse: string): any[] {
    try {
      let cleanedResponse = aiResponse.trim()

      // 1. 清理 markdown code block 標記（支援多種變體）
      // 處理 ```json、```JSON、``` json 等格式
      cleanedResponse = cleanedResponse.replace(/^```\s*json\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/\s*```\s*$/i, '')
      cleanedResponse = cleanedResponse.trim()

      // 2. 移除 BOM 和不可見字元
      cleanedResponse = cleanedResponse.replace(/^\uFEFF/, '')
      cleanedResponse = cleanedResponse.replace(/[\x00-\x1F\x7F]/g, (char) => {
        // 保留換行和 tab
        if (char === '\n' || char === '\r' || char === '\t') return char
        return ''
      })

      // 3. 嘗試找到 JSON 物件的邊界（處理前後有額外文字的情況）
      const jsonStartIndex = cleanedResponse.indexOf('{')
      const jsonEndIndex = cleanedResponse.lastIndexOf('}')

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1)
      }

      // 4. 修復常見的 JSON 格式問題
      // 修復尾隨逗號 (trailing comma)
      cleanedResponse = cleanedResponse.replace(/,\s*([\]}])/g, '$1')
      // 修復單引號（某些 LLM 會用單引號）
      // 注意：只在 key 和簡單 value 中替換，避免破壞內容中的單引號
      cleanedResponse = cleanedResponse.replace(/'([^']+)':/g, '"$1":')

      // 5. 嘗試解析 JSON
      let parsed: any
      try {
        parsed = JSON.parse(cleanedResponse)
      } catch (parseError) {
        // 6. 如果解析失敗，嘗試更積極的修復
        console.warn('[parseResponse] Initial JSON parse failed, attempting recovery...')

        // 嘗試用正則提取各欄位
        const contentMatch = cleanedResponse.match(/"content"\s*:\s*"([\s\S]*?)(?:"|",\s*"(?:keywords|topics|style))/i)
        const keywordsMatch = cleanedResponse.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/i)
        const topicsMatch = cleanedResponse.match(/"topics"\s*:\s*\[([\s\S]*?)\]/i)
        const styleMatch = cleanedResponse.match(/"style"\s*:\s*"([^"]+)"/i)

        if (contentMatch) {
          // 手動建構物件
          parsed = {
            content: contentMatch[1] || '',
            keywords: keywordsMatch ? this.parseArrayString(keywordsMatch[1]) : [],
            topics: topicsMatch ? this.parseArrayString(topicsMatch[1]) : [],
            style: styleMatch ? styleMatch[1] : 'casual'
          }
          console.log('[parseResponse] Recovered JSON via regex extraction')
        } else {
          throw parseError
        }
      }

      // 7. 驗證並轉換格式
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const contentItem = parsed

        // 確保 content 存在且有意義
        const content = typeof contentItem.content === 'string'
          ? contentItem.content.trim()
          : ''

        if (content.length < 10) {
          console.warn('[parseResponse] Content too short, may be invalid:', content)
        }

        return [{
          content: content,
          hashtags: Array.isArray(contentItem.keywords)
            ? contentItem.keywords.map((k: string) => {
                const keyword = String(k).trim()
                return keyword.startsWith('#') ? keyword : `#${keyword}`
              })
            : [],
          topics: Array.isArray(contentItem.topics)
            ? contentItem.topics.map((t: string) => String(t).trim())
            : [],
          style: contentItem.style || 'casual'
        }]
      } else {
        throw new Error('Response is not a valid object format')
      }

    } catch (error) {
      console.error('[parseResponse] Failed to parse AI response:', error)
      console.error('[parseResponse] Raw response (first 500 chars):', aiResponse.substring(0, 500))

      // 最後嘗試：用正則匹配任何 JSON 物件
      const jsonMatch = aiResponse.match(/\{[\s\S]*?"content"[\s\S]*?\}/i)
      if (jsonMatch) {
        try {
          console.log('[parseResponse] Attempting secondary parse with regex match...')
          return this.parseResponse(jsonMatch[0])
        } catch (e) {
          console.error('[parseResponse] Secondary parse failed:', e)
        }
      }

      // 緊急備援：返回預設內容
      console.warn('[parseResponse] Using fallback content')
      return [{
        content: '今天也是學習創造美好內容的一天！持續探索，保持好奇。',
        hashtags: ['#學習', '#成長'],
        topics: ['學習'],
        style: 'casual' as const
      }]
    }
  }

  /**
   * 輔助方法：解析陣列字串
   * 例如：'"a", "b", "c"' => ['a', 'b', 'c']
   */
  private parseArrayString(arrayContent: string): string[] {
    const matches = arrayContent.match(/"([^"]+)"/g)
    if (matches) {
      return matches.map(m => m.replace(/"/g, '').trim()).filter(s => s.length > 0)
    }
    return []
  }

  // Build personalization instructions from content settings
  private buildSettingsInstruction(settings: import('@/types').ContentSettings | undefined): string {
    if (!settings) return ''

    const toneMap: Record<string, string> = {
      casual: '輕鬆自然，像朋友聊天',
      professional: '正式專業，嚴謹有條理',
      friendly: '親切溫暖，有溫度的語氣',
      academic: '學術研究風格，引用數據與研究',
    }
    const styleMap: Record<string, string> = {
      narrative: '用說故事的方式呈現',
      analytical: '分析討論，深入剖析',
      conversational: '對話式，輕鬆自然',
      technical: '技術詳解，聚焦細節',
    }
    const depthMap: Record<string, string> = {
      brief: '簡短摘要，快速瀏覽（200-300字）',
      moderate: '適中深度（400-600字）',
      deep: '深入探討（800-1200字）',
      comprehensive: '完整研究，最詳盡的內容（1200字以上）',
    }
    const lengthMap: Record<string, string> = {
      short: '2-3分鐘閱讀的短篇',
      medium: '5分鐘閱讀的中篇',
      long: '8分鐘閱讀的長篇',
      detailed: '10分鐘以上的詳盡內容',
    }
    const topicMap: Record<string, string> = {
      trending: '聚焦最新趨勢與熱門話題',
      educational: '以學習知識為主',
      news: '新聞時事報導',
      opinion: '觀點評論與深度分析',
      tutorial: '實用教學指南',
    }
    const freshnessMap: Record<string, string> = {
      latest: '今天最新的內容',
      recent: '近期熱門內容',
      timeless: '不受時間限制的經典內容',
      classic: '經過時間考驗的經典好文',
    }

    return `
【用戶個人化偏好設定】
- 語氣：${toneMap[settings.tone] || settings.tone}
- 寫作風格：${styleMap[settings.style] || settings.style}
- 內容深度：${depthMap[settings.depth] || settings.depth}
- 文章長度：${lengthMap[settings.length] || settings.length}
- 主題方向：${topicMap[settings.topic] || settings.topic}
- 新鮮度偏好：${freshnessMap[settings.freshness] || settings.freshness}

請嚴格依照以上偏好設定來生成內容。`
  }

  // 新增模組化提示詞建構方法到類別中
  buildModularPrompt(context: ModularPromptContext): string {
    const modules = selectModules(context.behavior)
    const newsMaterial = formatNewsForPrompt(context.news)
    const keywords = extractKeywordsFromNews(context.news)
    const settingsInstruction = this.buildSettingsInstruction(context.contentSettings)

    // 組合反套話指令
    const antiClicheSection = modules.antiCliches.length > 0
      ? `\n【避免以下套話和句式】\n${modules.antiCliches.map(c => `- ${c}`).join('\n')}`
      : ''

    // 組合寫作挑戰（偶爾出現）
    const challengeSection = modules.writingChallenge
      ? `\n【本次寫作挑戰】\n${modules.writingChallenge}`
      : ''

    const systemPrompt = `${modules.role.prompt}

${modules.tone.prompt}

${modules.perspective.prompt}

${modules.opening.prompt}

${modules.format.prompt}

${context.contentSettings ? '' : modules.depth.prompt}
${settingsInstruction}
${antiClicheSection}
${challengeSection}

${getLanguageInstruction(context.userPreferences.language)}

【關鍵輸出規則】
- 你的回覆必須且只能是一個 JSON 物件
- 不要在 JSON 前後加任何文字說明
- 不要使用 markdown code block（不要用 \`\`\`）
- 確保 JSON 格式正確（正確的引號、逗號）`

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

【輸出要求 - 非常重要】
1. 只輸出 JSON，不要有任何其他文字、說明或 markdown 標記
2. 不要使用 \`\`\`json 或 \`\`\` 包裹
3. JSON 必須是有效格式，注意引號和逗號

輸出格式：
{"content": "文章內容，使用 {{keyword:關鍵字}} 標記可點擊的關鍵字", "keywords": ["關鍵字1", "關鍵字2"], "topics": ["主題1", "主題2"], "style": "casual"}`

    // 動態 temperature: 基礎 0.7-1.0 隨機浮動
    const baseTemp = 0.7 + Math.random() * 0.3
    const temperature = Math.round(baseTemp * 100) / 100

    // 保持與現有格式相容
    return JSON.stringify({
      model: (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_OLLAMA_MODEL : process.env.OLLAMA_MODEL) || 'gemma3:12b-cloud',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      options: {
        temperature,
        top_p: 0.9
      },
      // 記錄使用的模組（供分析用）
      _modules: {
        role: modules.role.id,
        perspective: modules.perspective.id,
        format: modules.format.id,
        depth: modules.depth.id,
        tone: modules.tone.id,
        opening: modules.opening.id,
        hasChallenge: !!modules.writingChallenge,
        temperature
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
  contentSettings?: import('@/types').ContentSettings
}

export { PromptBuilder, type PromptContext, type InteractionData }