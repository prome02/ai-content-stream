'use client'

/**
 * Browser-side Ollama Client
 * Directly calls Ollama API from the browser
 * Future: Will be replaced by Cloudflare AI Gateway
 */

export interface OllamaConfig {
  baseUrl: string
  model: string
  timeout?: number
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaRequestOptions {
  temperature?: number
  top_p?: number
  top_k?: number
  num_predict?: number
}

export interface OllamaResponse {
  model: string
  message: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  eval_count?: number
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'gemma3:12b-cloud',
  timeout: 90000
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(baseUrl: string = DEFAULT_CONFIG.baseUrl): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch (error) {
    console.warn('[OllamaBrowser] Health check failed:', error)
    return false
  }
}

/**
 * Generate content using Ollama
 */
export async function generateContent(
  messages: OllamaMessage[],
  options: OllamaRequestOptions = {},
  config: Partial<OllamaConfig> = {}
): Promise<OllamaResponse> {
  const { baseUrl, model, timeout } = { ...DEFAULT_CONFIG, ...config }

  const requestBody = {
    model,
    messages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.8,
      top_p: options.top_p ?? 0.9,
      ...options
    }
  }

  console.log(`[OllamaBrowser] Generating content with model: ${model}`)

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeout!)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log(`[OllamaBrowser] Generation complete, tokens: ${data.eval_count || 'unknown'}`)

  return data
}

/**
 * Generate content with streaming (for future use)
 */
export async function* generateContentStream(
  messages: OllamaMessage[],
  options: OllamaRequestOptions = {},
  config: Partial<OllamaConfig> = {}
): AsyncGenerator<string, void, unknown> {
  const { baseUrl, model, timeout } = { ...DEFAULT_CONFIG, ...config }

  const requestBody = {
    model,
    messages,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.8,
      top_p: options.top_p ?? 0.9,
      ...options
    }
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeout!)
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (data.message?.content) {
          yield data.message.content
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  }
}
