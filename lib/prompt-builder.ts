import { INTERESTS_LIST } from '@/lib/interests'

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
}

// 興趣轉換成主題標籤
const INTEREST_TO_HASHTAG: Record<string, string[]> = {
  'ai': ['#人工智慧', '#AI技術'],
  'tech': ['#科技趨勢', '#程式設計'],
  'learning': ['#學習成長', '#知識傳承'],
  'business': ['#創業投資', '#商業思維'],
  'health': ['#健康生活', '#身心平衡'],
  'travel': ['#旅行探索', '#文化體驗'],
  'food': ['#美食探索', '#飲食文化'],
  'music': ['#音樂藝術', '#旋律人生'],
  'movies': ['#影視娛樂', '#故事敘事'],
  'anime': ['#動漫文化', '#二次元'],
  'sports': ['#運動健身', '#競技精神'],
  'games': ['#遊戲電競', '#娛樂科技'],
  'design': ['#設計美學', '#創意視覺'],
  'science': ['#科學探索', '#研究發現'],
  'fashion': ['#時尚潮流', '#風格穿搭']
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
  
  /**
   * 建構完整的 prompt
   */
  build(context: PromptContext): string {
    const {
      userPreferences,
      recentInteractions = [],
      timeOfDay = this.getCurrentTimeOfDay(),
      mode = 'default',
      diversityScore = 0.5
    } = context

    // 提取用戶的興趣與習慣
    const emphasizedTopics = this.extractLikedTopics(recentInteractions)
    const avoidedTopics = this.extractDislikedTopics(recentInteractions)
    
    const hashtags = this.buildHashtags(userPreferences.interests)
    
    return JSON.stringify({
      model: 'gemma3:4b',
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(
            userPreferences,
            emphasizedTopics,
            avoidedTopics,
            timeOfDay,
            mode,
            diversityScore,
            hashtags
          )
        },
        {
          role: 'user',
          content: '請生成 3 個符合以上要求的高品質短內容（每篇限 280 字元以下）。'
        }
      ],
      stream: false,
      options: {
        temperature: this.calculateTemperature(mode, diversityScore),
        top_p: 0.9,
        num_predict: 800,  // ~3 篇 × 200 字元 × 額外標籤
        repeat_penalty: 1.1
      }
    })
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
    hashtags: string[]
  ): string {
    const timeContext = TIME_CONTEXT[timeOfDay] || '一般日常情境'

    // 模式指令
    const modeInstruction = this.getModeInstruction(mode)
    
    // 多樣性指令
    const diversityInstruction = this.getDiversityInstruction(diversityScore)

    return `
你是一位 AI 內容創作者，專門根據使用者興趣生成個人化的短內容。

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

1. **格式**: Twitter/Threads 風格的短貼文
2. **長度**: 每篇內容 280 字元以下
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
    "content": "內容文字（不超過 280 字元）",
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
      
      if (!Array.isArray(parsed)) {
        throw new Error('回應不是有效的陣列格式')
      }
      
      // 驗證每一筆資料的格式
      return parsed.map(item => ({
        content: item.content?.slice(0, 280) || '',
        hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
        emojis: Array.isArray(item.emojis) ? item.emojis : [],
        topics: Array.isArray(item.topics) ? item.topics : [],
        style: item.style || 'casual'
      }))
      
    } catch (error) {
      console.error('解析 AI 回應失敗:', error)
      
      // 嘗試從文字中提取 JSON 部分
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
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
}

export { PromptBuilder, type PromptContext, type InteractionData }