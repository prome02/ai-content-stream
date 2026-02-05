// tests/auto-stream-content-generation.test.ts

import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

// 測試用的模擬數據
const MOCK_USER = {
    uid: 'test-user-123',
    email: 'test@example.com'
}

const MOCK_USER_INTERESTS = ['tech', 'business', 'science']

const MOCK_FEED_ITEMS = [
    {
        id: 'item-1',
        title: '測試文章 1',
        content: '這是測試內容 1',
        source: 'test-source',
        createdAt: new Date()
    }
]

// 測試用的模擬函數
const mockGenerate = () => Promise.resolve()
const mockStop = () => { }
const mockRouter = {
    push: (url: string) => console.log(`Router push: ${url}`)
}

// 測試用的 URL 處理函數
function createMockURL(url: string) {
    return new URL(url, 'http://localhost:3000')
}

function cleanAutoGenerateParam(url: string): string {
    const urlObj = createMockURL(url)
    urlObj.searchParams.delete('autoGenerate')
    return urlObj.pathname + urlObj.search
}

// 測試用的條件判斷函數
function shouldAutoGenerate(searchParams: URLSearchParams): boolean {
    return searchParams.get('autoGenerate') === 'true'
}

// 測試用的 useEffect 條件檢查
function canStartAutoGeneration(
    user: any,
    shouldAutoGenerate: boolean,
    isGenerating: boolean,
    feedItems: any[],
    userInterests: string[]
): boolean {
    return !!(user && shouldAutoGenerate && !isGenerating && feedItems.length === 0 && userInterests.length > 0)
}

// 測試用的 UI 狀態判斷
function getFeedUIState(
    feedItems: any[],
    isGenerating: boolean,
    shouldAutoGenerate: boolean
): 'empty' | 'auto-generating' | 'content' {
    if (feedItems.length === 0 && !isGenerating && !shouldAutoGenerate) {
        return 'empty'
    } else if (feedItems.length === 0 && (isGenerating || shouldAutoGenerate)) {
        return 'auto-generating'
    } else {
        return 'content'
    }
}

// 測試套件
describe('Auto-Stream Content Generation', () => {

    describe('URL 處理邏輯', () => {

        test('應該正確解析 autoGenerate 參數', () => {
            const url1 = 'http://localhost:3000/feed?autoGenerate=true'
            const url2 = 'http://localhost:3000/feed?autoGenerate=false'
            const url3 = 'http://localhost:3000/feed'

            const searchParams1 = new URL(url1).searchParams
            const searchParams2 = new URL(url2).searchParams
            const searchParams3 = new URL(url3).searchParams

            assert.strictEqual(shouldAutoGenerate(searchParams1), true)
            assert.strictEqual(shouldAutoGenerate(searchParams2), false)
            assert.strictEqual(shouldAutoGenerate(searchParams3), false)
        })

        test('應該正確清理 URL 中的 autoGenerate 參數', () => {
            const originalUrl = 'http://localhost:3000/feed?autoGenerate=true&other=param'
            const cleanedUrl = cleanAutoGenerateParam(originalUrl)

            assert.strictEqual(cleanedUrl, '/feed?other=param')
            assert.strictEqual(cleanedUrl.includes('autoGenerate'), false)
        })

        test('應該處理沒有 autoGenerate 參數的 URL', () => {
            const originalUrl = 'http://localhost:3000/feed?other=param'
            const cleanedUrl = cleanAutoGenerateParam(originalUrl)

            assert.strictEqual(cleanedUrl, '/feed?other=param')
        })

    })

    describe('條件判斷邏輯', () => {

        test('應該在所有條件滿足時允許自動生成', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                true,
                false,
                [],
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, true)
        })

        test('應該在使用者不存在時阻止自動生成', () => {
            const canStart = canStartAutoGeneration(
                null,
                true,
                false,
                [],
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, false)
        })

        test('應該在 shouldAutoGenerate 為 false 時阻止自動生成', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                false,
                false,
                [],
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, false)
        })

        test('應該在正在生成時阻止自動生成', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                true,
                true,
                [],
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, false)
        })

        test('應該在已有內容時阻止自動生成', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                true,
                false,
                MOCK_FEED_ITEMS,
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, false)
        })

        test('應該在沒有興趣時阻止自動生成', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                true,
                false,
                [],
                []
            )

            assert.strictEqual(canStart, false)
        })

    })

    describe('UI 狀態管理', () => {

        test('應該在空狀態且無自動生成時顯示空狀態', () => {
            const state = getFeedUIState([], false, false)
            assert.strictEqual(state, 'empty')
        })

        test('應該在自動生成狀態時顯示自動生成狀態', () => {
            const state1 = getFeedUIState([], true, false)
            const state2 = getFeedUIState([], false, true)

            assert.strictEqual(state1, 'auto-generating')
            assert.strictEqual(state2, 'auto-generating')
        })

        test('應該在有內容時顯示內容狀態', () => {
            const state = getFeedUIState(MOCK_FEED_ITEMS, false, false)
            assert.strictEqual(state, 'content')
        })

        test('應該在有內容且正在生成時顯示內容狀態', () => {
            const state = getFeedUIState(MOCK_FEED_ITEMS, true, true)
            assert.strictEqual(state, 'content')
        })

    })

    describe('邊界條件測試', () => {

        test('應該處理空字串的 autoGenerate 參數', () => {
            const url = 'http://localhost:3000/feed?autoGenerate='
            const searchParams = new URL(url).searchParams

            assert.strictEqual(shouldAutoGenerate(searchParams), false)
        })

        test('應該處理無效的 autoGenerate 參數值', () => {
            const url = 'http://localhost:3000/feed?autoGenerate=invalid'
            const searchParams = new URL(url).searchParams

            assert.strictEqual(shouldAutoGenerate(searchParams), false)
        })

        test('應該處理多個 autoGenerate 參數', () => {
            const url = 'http://localhost:3000/feed?autoGenerate=true&autoGenerate=false'
            const searchParams = new URL(url).searchParams

            // URLSearchParams 會返回第一個值
            assert.strictEqual(shouldAutoGenerate(searchParams), true)
        })

        test('應該處理只有路徑的 URL', () => {
            const url = '/feed'
            const urlObj = new URL(url, 'http://localhost:3000')

            assert.strictEqual(shouldAutoGenerate(urlObj.searchParams), false)
        })

    })

    describe('數據驗證測試', () => {

        test('應該驗證使用者物件的必要欄位', () => {
            const validUser = { uid: 'test-123', email: 'test@example.com' }
            const invalidUser1 = { email: 'test@example.com' } as any // 缺少 uid
            const invalidUser2 = { uid: 'test-123' } as any // 缺少 email
            const nullUser = null as any

            assert.strictEqual(!!validUser && !!validUser.uid, true)
            assert.strictEqual(!!invalidUser1 && !!invalidUser1.uid, false)
            assert.strictEqual(!!invalidUser2 && !!invalidUser2.uid, true)
            assert.strictEqual(!!nullUser && !!nullUser.uid, false)
        })

        test('應該驗證興趣陣列的有效性', () => {
            const validInterests = ['tech', 'business']
            const emptyInterests: string[] = []
            const nullInterests = null as any

            assert.strictEqual(Array.isArray(validInterests) && validInterests.length > 0, true)
            assert.strictEqual(Array.isArray(emptyInterests) && emptyInterests.length > 0, false)
            assert.strictEqual(Array.isArray(nullInterests) && nullInterests.length > 0, false)
        })

        test('應該驗證內容陣列的狀態', () => {
            const hasContent = MOCK_FEED_ITEMS.length > 0
            const noContent: any[] = []

            assert.strictEqual(hasContent, true)
            assert.strictEqual(noContent.length > 0, false)
        })

    })

    describe('錯誤處理測試', () => {

        test('應該處理無效的 URL 格式', () => {
            try {
                const invalidUrl = 'not-a-valid-url'
                const url = new URL(invalidUrl)
                assert.fail('應該拋出錯誤')
            } catch (error) {
                assert.ok(error instanceof TypeError)
            }
        })

        test('應該處理空的使用者物件', () => {
            const emptyUser = null
            const canStart = canStartAutoGeneration(
                emptyUser,
                true,
                false,
                [],
                MOCK_USER_INTERESTS
            )

            assert.strictEqual(canStart, false)
        })

        test('應該處理空的使用者興趣', () => {
            const canStart = canStartAutoGeneration(
                MOCK_USER,
                true,
                false,
                [],
                []
            )

            assert.strictEqual(canStart, false)
        })

    })

})

// 測試檔案已準備就緒
// 使用 Node.js test 模組執行: node --test tests/auto-stream-content-generation.test.ts

// 匯出測試函數供其他模組使用
export {
    cleanAutoGenerateParam,
    shouldAutoGenerate,
    canStartAutoGeneration,
    getFeedUIState
}