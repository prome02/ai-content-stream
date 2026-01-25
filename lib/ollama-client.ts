interface OllamaConfig {
  baseUrl?: string          // API 基礎 URL
  defaultModel?: string      // 預設模型
  timeout?: number           // 請求逾時（毫秒）
  maxRetries?: number        // 最大重試次數
  retryDelay?: number        // 重試延遲（毫秒）
}

interface OllamaRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    repeat_penalty?: number
    num_predict?: number
  }
}

interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

class OllamaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetriable: boolean = true
  ) {
    super(message)
    this.name = 'OllamaError'
  }
}

export class OllamaClient {
  private readonly config: Required<OllamaConfig>
  private readonly controller: AbortController

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      defaultModel: config.defaultModel || 'gemma3:4b',
      timeout: config.timeout || 30000, // 30秒
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    }
    
    this.controller = new AbortController()
  }

  /**
   * 發送聊天請求
   */
  async chat(
    request: OllamaRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<OllamaResponse> {
    let lastError: OllamaError | null = null
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const timeoutPromise = this.createTimeoutPromise()
        const fetchPromise = this.sendRequest(request, options)
        
        const response = await Promise.race([fetchPromise, timeoutPromise])
        
        if (response instanceof OllamaError) {
          throw response
        }
        
        return response
        
      } catch (error) {
        lastError = error as OllamaError
        
        // 檢查是否要重試
        if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
          console.warn(`Ollama 重試 (${attempt + 1}/${this.config.maxRetries}):`, error instanceof Error ? error.message : String(error))
          
          // 指數退避
          const delay = this.config.retryDelay * Math.pow(2, attempt)
          await this.delay(delay)
          continue
        }
        
        throw this.normalizeError(error)
      }
    }
    
    throw lastError || new OllamaError('Ollama 請求失敗')
  }

  /**
   * 發送生成請求
   */
  async generate(
    prompt: string,
    model: string = this.config.defaultModel,
    options: Partial<OllamaRequest['options']> = {}
  ): Promise<OllamaResponse> {
    const request: OllamaRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      options: {
        temperature: 0.7,
        ...options
      }
    }
    
    return this.chat(request)
  }

  /**
   * 取得可用模型列表
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: this.controller.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.models.map((m: any) => m.name)
      
    } catch (error) {
      console.error('獲取模型列表失敗:', error)
      
      // 返回預設模型列表
      return [
        'gemma3:4b',
        'gpt-oss:20b',
        'llama3.1',
        'qwen2.5',
        'deepseek-coder'
      ]
    }
  }

  /**
   * 檢查 Ollama 是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      })
      
      return response.ok
      
    } catch (error) {
      console.warn('Ollama 健康檢查失敗:', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * 取消所有進行中的請求
   */
  cancel(): void {
    this.controller.abort()
  }

  private async sendRequest(
    request: OllamaRequest,
    options: { signal?: AbortSignal }
  ): Promise<OllamaResponse> {
    const { baseUrl } = this.config
    const signal = options.signal || this.controller.signal
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal
    })
    
    if (!response.ok) {
      let errorMessage: string
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || response.statusText
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      
      throw new OllamaError(errorMessage, response.status)
    }
    
    return response.json()
  }

  private createTimeoutPromise(): Promise<OllamaError> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new OllamaError(`請求逾時 (${this.config.timeout}ms)`, undefined, true))
      }, this.config.timeout)
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shouldRetry(error: any): boolean {
    // 如果是 OllamaError，檢查是否可重試
    if (error instanceof OllamaError) {
      return error.isRetriable
    }
    
    // 網路錯誤或逾時可重試
    if (
      error instanceof TypeError || // 網路錯誤
      error.name === 'AbortError' || // 逾時
      error.name === 'TimeoutError' || // 逾時
      error.message.includes('timeout') ||
      error.message.includes('network')
    ) {
      return true
    }
    
    // HTTP 5xx 錯誤可重試
    if (error.statusCode && error.statusCode >= 500) {
      return true
    }
    
    return false
  }

  private normalizeError(error: any): OllamaError {
    if (error instanceof OllamaError) {
      return error
    }
    
    if (error instanceof Error) {
      const statusCode = (error as any).statusCode || (error as any).code
      const message = error.message || '未知的 Ollama 錯誤'
      
      // 判斷是否可重試
      const isRetriable = this.shouldRetry(error)
      
      return new OllamaError(message, statusCode, isRetriable)
    }
    
    return new OllamaError('未知的 Ollama 錯誤', undefined, false)
  }

  /**
   * 模擬生成（開發環境使用）
   */
  static async simulateGenerate(
    prompt: string,
    model: string = 'gemma3:4b'
  ): Promise<OllamaResponse> {
    console.log('🧪 模擬 Ollama 生成:', prompt.substring(0, 50) + '...')
    
    // 模擬延遲
    const delay = Math.random() * 2000 + 1000
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // 模擬回應
    return {
      model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: `這是一個模擬回應，實際將連結到 Ollama local。
原始 prompt: "${prompt.substring(0, 100)}..."
模型: ${model}
模擬延遲: ${Math.round(delay)}ms`
      },
      done: true,
      total_duration: delay,
      prompt_eval_count: prompt.length,
      eval_count: Math.floor(prompt.length / 4)
    }
  }
}

// Default instance
export const defaultOllamaClient = new OllamaClient({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'gemma3:12b-cloud',
  timeout: 90000,
  maxRetries: 3,
  retryDelay: 1000
})