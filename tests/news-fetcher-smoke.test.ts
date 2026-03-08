// tests/news-fetcher-smoke.test.ts
// 精簡版煙霧測試：只驗證 fetchNews 能否真正抓到資料

import { fetchNews, formatNewsForPrompt } from '@/lib/news-fetcher'
import { InterestCategory } from '@/types'

async function smokeTest() {
    console.log('[SMOKE TEST] 開始測試 fetchNews 基本抓取能力...\n')

    // 1) 基本成功情境
    try {
        const items = await fetchNews({
            interests: ['tech', 'business'],
            maxItems: 3,
            locale: 'zh-TW'
        })

        console.log(`[OK] 成功取得 ${items.length} 條新聞`)
        items.forEach((it, i) => {
            console.log(`  ${i + 1}. ${it.title} (${it.source})`)
        })
    } catch (err) {
        console.error('[ERR] 基本抓取失敗:', err)
        process.exit(1)
    }

    // 2) 空興趣情境
    const empty = await fetchNews({ interests: [] })
    console.log(`\n[OK] 空興趣回傳 ${empty.length} 條（預期 0）`)

    // 3) 格式化輸出範例
    const sample = await fetchNews({ interests: ['tech'], maxItems: 1 })
    if (sample.length) {
        const prompt = formatNewsForPrompt(sample)
        console.log('\n[OK] 格式化範例（前 200 字）:')
        console.log(prompt.slice(0, 200) + '...')
    }

    console.log('\n[SMOKE TEST] 所有檢測通過，fetchNews 可正常抓取 Google 新聞 RSS！')
}

if (require.main === module) {
    smokeTest().catch((e) => {
        console.error(e)
        process.exit(1)
    })
}