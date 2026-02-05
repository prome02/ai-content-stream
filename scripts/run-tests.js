#!/usr/bin/env node

// scripts/run-tests.js

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 開始執行 Auto-Stream Content Generation 測試...\n')

// 測試文件路徑
const testFile = path.join(__dirname, '../tests/auto-stream-content-generation.test.ts')

// 執行測試
const testProcess = spawn('node', ['--test', testFile], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
})

testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ 所有測試通過！')
        console.log('\n📋 測試覆蓋範圍：')
        console.log('  ✓ URL 處理邏輯')
        console.log('  ✓ 條件判斷邏輯')
        console.log('  ✓ UI 狀態管理')
        console.log('  ✓ 邊界條件')
        console.log('  ✓ 數據驗證')
        console.log('  ✓ 錯誤處理')
        console.log('\n🎯 建議後續手動測試：')
        console.log('  • 新用戶完整流程測試')
        console.log('  • 視覺效果驗證')
        console.log('  • 即時更新體驗')
        console.log('  • 停止功能測試')
    } else {
        console.log('\n❌ 測試失敗，退出碼：', code)
        process.exit(code)
    }
})

testProcess.on('error', (err) => {
    console.error('❌ 測試執行錯誤：', err)
    process.exit(1)
})