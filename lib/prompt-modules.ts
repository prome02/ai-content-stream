// lib/prompt-modules.ts

/**
 * 角色模組：定義內容創作者的角色
 */
export const ROLE_MODULES = [
  {
    id: 'analyst',
    name: '產業分析師',
    prompt: '你是一位專業的產業分析師，擅長從數據和趨勢中提取洞察，用清晰的邏輯解讀複雜議題。'
  },
  {
    id: 'storyteller',
    name: '說故事的人',
    prompt: '你是一位說故事的人，擅長用生動的敘事和具體的例子，讓抽象的概念變得有畫面感。'
  },
  {
    id: 'pragmatist',
    name: '實用主義者',
    prompt: '你是一位實用主義者，專注於「這對讀者有什麼用」，提供可行動的建議和具體步驟。'
  },
  {
    id: 'observer',
    name: '生活觀察家',
    prompt: '你是一位生活觀察家，擅長從日常生活的角度切入，讓讀者感到親切有共鳴。'
  },
  {
    id: 'critic',
    name: '獨立評論員',
    prompt: '你是一位獨立評論員，不盲從主流觀點，善於提出不同角度的思考和質疑。'
  }
] as const

export type RoleModuleId = typeof ROLE_MODULES[number]['id']

/**
 * 觀點模組：定義內容的切入角度
 */
export const PERSPECTIVE_MODULES = [
  {
    id: 'optimistic',
    name: '正面角度',
    prompt: '從正面角度出發，強調機會、好處、和樂觀的可能性。'
  },
  {
    id: 'critical',
    name: '批判角度',
    prompt: '從批判角度出發，探討風險、挑戰、和需要注意的潛在問題。'
  },
  {
    id: 'practical',
    name: '實用角度',
    prompt: '從實用角度出發，說明如何應用、具體的行動建議。'
  },
  {
    id: 'contextual',
    name: '脈絡角度',
    prompt: '從脈絡角度出發，解釋為什麼重要、歷史背景、來龍去脈。'
  },
  {
    id: 'futuristic',
    name: '未來角度',
    prompt: '從未來角度出發，預測趨勢、可能的發展方向和影響。'
  }
] as const

export type PerspectiveModuleId = typeof PERSPECTIVE_MODULES[number]['id']

/**
 * 形式模組：定義內容的結構
 */
export const FORMAT_MODULES = [
  {
    id: 'opinion',
    name: '觀點陳述',
    prompt: '使用「論點 -> 論據 -> 結論」的結構，清楚表達你的觀點。'
  },
  {
    id: 'qa',
    name: '問答形式',
    prompt: '使用「提出問題 -> 逐一解答」的形式，幫助讀者理解。'
  },
  {
    id: 'list',
    name: '清單條列',
    prompt: '使用「重點列舉」的形式，讓內容易於掃讀和記憶。'
  },
  {
    id: 'narrative',
    name: '故事敘述',
    prompt: '使用「情境 -> 轉折 -> 啟發」的敘事結構。'
  }
] as const

export type FormatModuleId = typeof FORMAT_MODULES[number]['id']

/**
 * 深度模組：定義內容的長度和深度（由行為決定）
 */
export const DEPTH_MODULES = {
  brief: {
    id: 'brief',
    name: '簡短',
    wordCount: { min: 200, max: 300 },
    prompt: '請簡潔扼要，用 200-300 字快速傳達重點。'
  },
  standard: {
    id: 'standard',
    name: '標準',
    wordCount: { min: 400, max: 600 },
    prompt: '請用 400-600 字，提供適中的深度和細節。'
  },
  deep: {
    id: 'deep',
    name: '深度',
    wordCount: { min: 800, max: 1200 },
    prompt: '請深入分析，用 800-1200 字提供詳細的內容和見解。'
  }
} as const

export type DepthModuleId = keyof typeof DEPTH_MODULES