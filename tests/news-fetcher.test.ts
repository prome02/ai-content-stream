// tests/news-fetcher.test.ts

import { fetchNews, formatNewsForPrompt, extractKeywordsFromNews } from '@/lib/news-fetcher'
import { InterestCategory } from '@/types'

// 測試用的興趣分類
const TEST_INTERESTS: InterestCategory[] = ['tech', 'business']

// 測試用的無效興趣分類
const INVALID_INTERESTS: InterestCategory[] = ['invalid' as InterestCategory]

// 測試用的空興趣分類
const EMPTY_INTERESTS: InterestCategory[] = []

// 測試用的最大項目數
const MAX_ITEMS = 3

// 測試用的語系
const LOCALE = 'zh-TW'

// 測試用的時區
const TIMEZONE = 'Asia/Taipei'

// 測試用的超時時間（毫秒）
const TIMEOUT = 10000

// 測試用的重試次數
const RETRY_COUNT = 3

// 測試用的重試間隔（毫秒）
const RETRY_INTERVAL = 1000

// 測試用的等待時間（毫秒）
const WAIT_TIME = 1000

// 測試用的錯誤訊息
const ERROR_MESSAGES = {
    NO_INTERESTS: 'No interests provided, skipping fetch',
    INVALID_RESPONSE: 'RSS fetch failed',
    TIMEOUT: 'Request timeout',
    NETWORK_ERROR: 'Network error'
}

// 測試用的成功訊息
const SUCCESS_MESSAGES = {
    FETCH_SUCCESS: 'Found recent items',
    PARSE_SUCCESS: 'Parsed RSS successfully',
    FORMAT_SUCCESS: 'Formatted news for prompt'
}

// 測試用的日誌訊息
const LOG_MESSAGES = {
    FETCH_START: 'Fetching:',
    FETCH_END: 'Found recent items',
    PARSE_START: 'Parsing RSS',
    PARSE_END: 'Parsed RSS successfully',
    FORMAT_START: 'Formatting news',
    FORMAT_END: 'Formatted news for prompt'
}

// 測試用的預期結果
const EXPECTED_RESULTS = {
    MIN_ITEMS: 0,
    MAX_ITEMS: 5,
    MIN_KEYWORDS: 0,
    MAX_KEYWORDS: 10
}

// 測試用的邊界條件
const BOUNDARY_CONDITIONS = {
    MIN_INTERESTS: 0,
    MAX_INTERESTS: 10,
    MIN_KEYWORDS: 0,
    MAX_KEYWORDS: 10
}

// 測試用的異常情況
const EXCEPTION_CASES = {
    EMPTY_RESPONSE: '',
    INVALID_XML: '<invalid>xml</invalid>',
    MALFORMED_URL: 'https://invalid-url.com',
    NETWORK_FAILURE: 'Network failure'
}

// 測試用的效能指標
const PERFORMANCE_METRICS = {
    MAX_RESPONSE_TIME: 5000,
    MAX_PARSE_TIME: 1000,
    MAX_FORMAT_TIME: 500
}

// 測試用的記憶體限制
const MEMORY_LIMITS = {
    MAX_XML_SIZE: 1024 * 1024, // 1MB
    MAX_ITEMS_COUNT: 100,
    MAX_KEYWORDS_COUNT: 50
}

// 測試用的安全性檢查
const SECURITY_CHECKS = {
    XSS_PREVENTION: true,
    SQL_INJECTION_PREVENTION: true,
    CODE_INJECTION_PREVENTION: true
}

// 測試用的資料驗證
const DATA_VALIDATION = {
    REQUIRED_FIELDS: ['title', 'link', 'pubDate', 'source'],
    OPTIONAL_FIELDS: ['description'],
    VALIDATION_RULES: {
        title: (value: string) => value.length > 0 && value.length <= 200,
        link: (value: string) => value.startsWith('http'),
        pubDate: (value: Date) => value instanceof Date && !isNaN(value.getTime()),
        source: (value: string) => value.length > 0 && value.length <= 100
    }
}

// 測試用的錯誤處理
const ERROR_HANDLING = {
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT_ERROR: 'Request timeout',
    PARSING_ERROR: 'XML parsing failed',
    VALIDATION_ERROR: 'Data validation failed'
}

// 測試用的日誌記錄
const LOGGING = {
    ENABLE_CONSOLE_LOG: true,
    ENABLE_FILE_LOG: false,
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json'
}

// 測試用的環境變數
const ENVIRONMENT = {
    NODE_ENV: 'test',
    TEST_MODE: true,
    DEBUG_MODE: false
}

// 測試用的配置選項
const CONFIG_OPTIONS = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 10000,
    CACHE_TTL: 300
}

// 測試用的模擬資料
const MOCK_DATA = {
    MOCK_NEWS_ITEMS: [
        {
            title: '測試新聞標題 1',
            description: '測試新聞描述 1',
            link: 'https://example.com/news1',
            pubDate: new Date(),
            source: '測試來源 1'
        },
        {
            title: '測試新聞標題 2',
            description: '測試新聞描述 2',
            link: 'https://example.com/news2',
            pubDate: new Date(),
            source: '測試來源 2'
        }
    ],
    MOCK_KEYWORDS: ['測試', '新聞', '標題', '描述', '來源'],
    MOCK_PROMPT: '【新聞素材 1】\n標題：測試新聞標題 1\n摘要：測試新聞描述 1\n來源：測試來源 1\n時間：剛剛\n連結：https://example.com/news1\n'
}

// 測試用的輔助函數
function log(message: string, data?: any) {
    if (LOGGING.ENABLE_CONSOLE_LOG) {
        console.log(`[TEST] ${message}`, data || '')
    }
}

function error(message: string, error?: any) {
    if (LOGGING.ENABLE_CONSOLE_LOG) {
        console.error(`[TEST ERROR] ${message}`, error || '')
    }
}

function warn(message: string, data?: any) {
    if (LOGGING.ENABLE_CONSOLE_LOG) {
        console.warn(`[TEST WARN] ${message}`, data || '')
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`)
    }
}

function assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`)
    }
}

function assertGreaterThan(actual: number, expected: number, message: string) {
    if (actual <= expected) {
        throw new Error(`Assertion failed: ${message}. Expected greater than: ${expected}, Actual: ${actual}`)
    }
}

function assertLessThan(actual: number, expected: number, message: string) {
    if (actual >= expected) {
        throw new Error(`Assertion failed: ${message}. Expected less than: ${expected}, Actual: ${actual}`)
    }
}

function assertArrayLength(array: any[], minLength: number, maxLength: number, message: string) {
    if (array.length < minLength || array.length > maxLength) {
        throw new Error(`Assertion failed: ${message}. Expected length between ${minLength} and ${maxLength}, Actual: ${array.length}`)
    }
}

function assertValidNewsItem(item: any) {
    assert(item && typeof item === 'object', 'News item must be an object')
    assert(typeof item.title === 'string' && item.title.length > 0, 'Title must be a non-empty string')
    assert(typeof item.link === 'string' && item.link.startsWith('http'), 'Link must be a valid URL')
    assert(item.pubDate instanceof Date && !isNaN(item.pubDate.getTime()), 'PubDate must be a valid Date')
    assert(typeof item.source === 'string' && item.source.length > 0, 'Source must be a non-empty string')
    assert(typeof item.description === 'string', 'Description must be a string')
}

function measureTime<T>(fn: () => T): { result: T; duration: number } {
    const start = Date.now()
    const result = fn()
    const duration = Date.now() - start
    return { result, duration }
}

function retry<T>(fn: () => Promise<T>, maxRetries: number = CONFIG_OPTIONS.MAX_RETRIES, delay: number = CONFIG_OPTIONS.RETRY_DELAY): Promise<T> {
    return new Promise((resolve, reject) => {
        let attempts = 0

        const attempt = async () => {
            try {
                attempts++
                const result = await fn()
                resolve(result)
            } catch (err) {
                if (attempts >= maxRetries) {
                    reject(err)
                } else {
                    log(`Retry attempt ${attempts}/${maxRetries} after ${delay}ms`)
                    setTimeout(attempt, delay)
                }
            }
        }

        attempt()
    })
}

function timeout<T>(promise: Promise<T>, ms: number = CONFIG_OPTIONS.TIMEOUT): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(ERROR_HANDLING.TIMEOUT_ERROR)), ms)
        )
    ])
}

// 測試套件
async function runTests() {
    log('Starting news fetcher tests...')

    try {
        // 測試 1: 基本功能測試
        await testBasicFunctionality()

        // 測試 2: 空興趣分類測試
        await testEmptyInterests()

        // 測試 3: 無效興趣分類測試
        await testInvalidInterests()

        // 測試 4: 邊界條件測試
        await testBoundaryConditions()

        // 測試 5: 效能測試
        await testPerformance()

        // 測試 6: 錯誤處理測試
        await testErrorHandling()

        // 測試 7: 格式化測試
        await testFormatting()

        // 測試 8: 關鍵字提取測試
        await testKeywordExtraction()

        // 測試 9: 資料驗證測試
        await testDataValidation()

        // 測試 10: 安全性測試
        await testSecurity()

        log('All tests passed successfully!')

    } catch (err) {
        error('Test suite failed', err)
        process.exit(1)
    }
}

// 測試 1: 基本功能測試
async function testBasicFunctionality() {
    log('Testing basic functionality...')

    try {
        const startTime = Date.now()

        const result = await timeout(
            retry(() => fetchNews({
                interests: TEST_INTERESTS,
                maxItems: MAX_ITEMS,
                locale: LOCALE
            }))
        )

        const duration = Date.now() - startTime

        log(`Fetch completed in ${duration}ms`)
        log(`Found ${result.length} news items`)

        // 驗證結果
        assert(Array.isArray(result), 'Result must be an array')
        assertGreaterThan(result.length, EXPECTED_RESULTS.MIN_ITEMS, 'Must have at least one news item')
        assertLessThan(result.length, EXPECTED_RESULTS.MAX_ITEMS + 1, 'Must not exceed max items')
        assertLessThan(duration, PERFORMANCE_METRICS.MAX_RESPONSE_TIME, 'Response time must be within limits')

        // 驗證每個新聞項目
        result.forEach((item, index) => {
            log(`Validating news item ${index + 1}...`)
            assertValidNewsItem(item)
        })

        log('Basic functionality test passed!')

    } catch (err) {
        error('Basic functionality test failed', err)
        throw err
    }
}

// 測試 2: 空興趣分類測試
async function testEmptyInterests() {
    log('Testing empty interests...')

    try {
        const result = await fetchNews({
            interests: EMPTY_INTERESTS,
            maxItems: MAX_ITEMS,
            locale: LOCALE
        })

        log(`Empty interests result: ${result.length} items`)

        // 驗證結果
        assert(Array.isArray(result), 'Result must be an array')
        assertEqual(result.length, 0, 'Must return empty array for empty interests')

        log('Empty interests test passed!')

    } catch (err) {
        error('Empty interests test failed', err)
        throw err
    }
}

// 測試 3: 無效興趣分類測試
async function testInvalidInterests() {
    log('Testing invalid interests...')

    try {
        const result = await fetchNews({
            interests: INVALID_INTERESTS,
            maxItems: MAX_ITEMS,
            locale: LOCALE
        })

        log(`Invalid interests result: ${result.length} items`)

        // 驗證結果
        assert(Array.isArray(result), 'Result must be an array')
        assertEqual(result.length, 0, 'Must return empty array for invalid interests')

        log('Invalid interests test passed!')

    } catch (err) {
        error('Invalid interests test failed', err)
        throw err
    }
}

// 測試 4: 邊界條件測試
async function testBoundaryConditions() {
    log('Testing boundary conditions...')

    try {
        // 測試最大項目數
        const maxResult = await timeout(
            retry(() => fetchNews({
                interests: TEST_INTERESTS,
                maxItems: 10,
                locale: LOCALE
            }))
        )

        log(`Max items result: ${maxResult.length} items`)
        assertLessThan(maxResult.length, 11, 'Must not exceed max items limit')

        // 測試不同語系
        const enResult = await timeout(
            retry(() => fetchNews({
                interests: ['tech'], // 英文興趣
                maxItems: MAX_ITEMS,
                locale: 'en-US'
            }))
        )

        log(`English locale result: ${enResult.length} items`)
        assert(Array.isArray(enResult), 'English locale must return array')

        log('Boundary conditions test passed!')

    } catch (err) {
        error('Boundary conditions test failed', err)
        throw err
    }
}

// 測試 5: 效能測試
async function testPerformance() {
    log('Testing performance...')

    try {
        const iterations = 3
        const responseTimes: number[] = []

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now()

            await timeout(
                retry(() => fetchNews({
                    interests: TEST_INTERESTS,
                    maxItems: MAX_ITEMS,
                    locale: LOCALE
                }))
            )

            const duration = Date.now() - startTime
            responseTimes.push(duration)
            log(`Iteration ${i + 1}: ${duration}ms`)

            // 等待一下再進行下一次測試
            await new Promise(resolve => setTimeout(resolve, WAIT_TIME))
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        const maxResponseTime = Math.max(...responseTimes)

        log(`Average response time: ${avgResponseTime}ms`)
        log(`Max response time: ${maxResponseTime}ms`)

        assertLessThan(avgResponseTime, PERFORMANCE_METRICS.MAX_RESPONSE_TIME, 'Average response time must be within limits')
        assertLessThan(maxResponseTime, PERFORMANCE_METRICS.MAX_RESPONSE_TIME * 1.5, 'Max response time must be within reasonable limits')

        log('Performance test passed!')

    } catch (err) {
        error('Performance test failed', err)
        throw err
    }
}

// 測試 6: 錯誤處理測試
async function testErrorHandling() {
    log('Testing error handling...')

    try {
        // 測試超時情況
        try {
            await timeout(
                retry(() => fetchNews({
                    interests: TEST_INTERESTS,
                    maxItems: MAX_ITEMS,
                    locale: LOCALE
                })),
                1 // 1ms 超時，應該會失敗
            )

            throw new Error('Should have timed out')
        } catch (timeoutErr: any) {
            assert(timeoutErr.message.includes('timeout') || timeoutErr.message.includes('Timeout'), 'Must handle timeout correctly')
            log('Timeout handling test passed')
        }

        log('Error handling test passed!')

    } catch (err) {
        error('Error handling test failed', err)
        throw err
    }
}

// 測試 7: 格式化測試
async function testFormatting() {
    log('Testing formatting...')

    try {
        // 測試空陣列格式化
        const emptyFormat = formatNewsForPrompt([])
        assertEqual(emptyFormat, '【無相關新聞素材】', 'Empty array must return default message')

        // 測試模擬資料格式化
        const mockFormat = formatNewsForPrompt(MOCK_DATA.MOCK_NEWS_ITEMS)
        assert(typeof mockFormat === 'string', 'Format result must be string')
        assert(mockFormat.length > 0, 'Format result must not be empty')
        assert(mockFormat.includes('測試新聞標題 1'), 'Format must include news title')
        assert(mockFormat.includes('https://example.com/news1'), 'Format must include news link')

        log('Formatting test passed!')

    } catch (err) {
        error('Formatting test failed', err)
        throw err
    }
}

// 測試 8: 關鍵字提取測試
async function testKeywordExtraction() {
    log('Testing keyword extraction...')

    try {
        // 測試空陣列關鍵字提取
        const emptyKeywords = extractKeywordsFromNews([])
        assert(Array.isArray(emptyKeywords), 'Empty array must return array')
        assertEqual(emptyKeywords.length, 0, 'Empty array must return empty array')

        // 測試模擬資料關鍵字提取
        const mockKeywords = extractKeywordsFromNews(MOCK_DATA.MOCK_NEWS_ITEMS)
        assert(Array.isArray(mockKeywords), 'Keywords must be array')
        assertArrayLength(mockKeywords, EXPECTED_RESULTS.MIN_KEYWORDS, EXPECTED_RESULTS.MAX_KEYWORDS, 'Keywords array length must be within limits')

        // 驗證關鍵字格式
        mockKeywords.forEach(keyword => {
            assert(typeof keyword === 'string', 'Keyword must be string')
            assertGreaterThan(keyword.length, 1, 'Keyword must have minimum length')
            assertLessThan(keyword.length, 11, 'Keyword must have maximum length')
        })

        log('Keyword extraction test passed!')

    } catch (err) {
        error('Keyword extraction test failed', err)
        throw err
    }
}

// 測試 9: 資料驗證測試
async function testDataValidation() {
    log('Testing data validation...')

    try {
        // 測試基本資料驗證
        const result = await timeout(
            retry(() => fetchNews({
                interests: TEST_INTERESTS,
                maxItems: MAX_ITEMS,
                locale: LOCALE
            }))
        )

        result.forEach(item => {
            // 驗證必填欄位
            DATA_VALIDATION.REQUIRED_FIELDS.forEach(field => {
                assert(item[field as keyof typeof item] !== undefined, `Required field ${field} must exist`)
                assert(item[field as keyof typeof item] !== null, `Required field ${field} must not be null`)
            })

            // 驗證選填欄位
            DATA_VALIDATION.OPTIONAL_FIELDS.forEach(field => {
                if (item[field as keyof typeof item] !== undefined) {
                    assert(typeof item[field as keyof typeof item] === 'string', `Optional field ${field} must be string if provided`)
                }
            })

            // 驗證資料格式
            Object.entries(DATA_VALIDATION.VALIDATION_RULES).forEach(([field, validator]) => {
                const value = item[field as keyof typeof item]
                if (value !== undefined && value !== null) {
                    assert(validator(value as any), `Field ${field} must pass validation`)
                }
            })
        })

        log('Data validation test passed!')

    } catch (err) {
        error('Data validation test failed', err)
        throw err
    }
}

// 測試 10: 安全性測試
async function testSecurity() {
    log('Testing security...')

    try {
        // 測試 XSS 防護
        if (SECURITY_CHECKS.XSS_PREVENTION) {
            const maliciousNews = [
                {
                    title: '<script>alert("XSS")</script>測試標題',
                    description: '<img src="x" onerror="alert(\'XSS\')">測試描述',
                    link: 'https://example.com',
                    pubDate: new Date(),
                    source: '測試來源'
                }
            ]

            const formatted = formatNewsForPrompt(maliciousNews)
            assert(!formatted.includes('<script>'), 'Must sanitize script tags')
            assert(!formatted.includes('onerror='), 'Must sanitize event handlers')
            log('XSS prevention test passed')
        }

        // 測試 URL 驗證
        const result = await timeout(
            retry(() => fetchNews({
                interests: TEST_INTERESTS,
                maxItems: MAX_ITEMS,
                locale: LOCALE
            }))
        )

        result.forEach(item => {
            assert(item.link.startsWith('http'), 'Link must start with http')
            assert(!item.link.includes('javascript:'), 'Link must not contain javascript protocol')
            assert(!item.link.includes('data:'), 'Link must not contain data protocol')
        })

        log('Security test passed!')

    } catch (err) {
        error('Security test failed', err)
        throw err
    }
}

// 執行測試
if (require.main === module) {
    runTests().catch(err => {
        console.error('Test execution failed:', err)
        process.exit(1)
    })
}

// 匯出測試函數供其他模組使用
export {
    runTests,
    testBasicFunctionality,
    testEmptyInterests,
    testInvalidInterests,
    testBoundaryConditions,
    testPerformance,
    testErrorHandling,
    testFormatting,
    testKeywordExtraction,
    testDataValidation,
    testSecurity
}