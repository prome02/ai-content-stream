// 分析整合測試腳本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 AI 內容流平台 - 分析整合測試');
console.log('='.repeat(60));

// 1. 檢查目錄和設置
console.log('⚙️ 步驟 1: 檢查項目結構');
const requiredFiles = [
  'lib/analytics.ts',
  'lib/real-firebase.ts',
  'app/hooks/useInteractionTracking.ts',
  'app/api/generate/route.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('❌ 缺少必要的文件，測試中止');
  process.exit(1);
}

console.log('✅ 所有核心檔案都存在');

// 2. 檢查 TypeScript/JavaScript 語法
console.log('\n⚙️ 步驟 2: 檢查語法錯誤');
try {
  const tsCheck = execSync('npx tsc --noEmit --project tsconfig.json 2>&1', { cwd: path.join(__dirname, '..') });
  console.log('✅ TypeScript 編譯檢查通過');
} catch (error) {
  console.error('❌ TypeScript 編譯錯誤:');
  console.error(error.stdout.toString());
}

// 3. 檢查分析模組導入和導出
console.log('\n⚙️ 步驟 3: 檢查分析模組設定');

const analyticsContent = fs.readFileSync(path.join(__dirname, '..', 'lib/analytics.ts'), 'utf8');
const realFirebaseContent = fs.readFileSync(path.join(__dirname, '..', 'lib/real-firebase.ts'), 'utf8');
const useInteractionContent = fs.readFileSync(path.join(__dirname, '..', 'app/hooks/useInteractionTracking.ts'), 'utf8');
const generateRouteContent = fs.readFileSync(path.join(__dirname, '..', 'app/api/generate/route.ts'), 'utf8');

// 檢查分析函數
console.log('檢查分析函數定義:');
const requiredFunctions = [
  'trackEvent',
  'trackContentLike',
  'trackContentDislike',
  'trackContentSkip',
  'trackKeywordClick',
  'trackFeedbackSubmit',
  'trackContentImpression',
  'trackContentGenerated'
];

requiredFunctions.forEach(func => {
  const exists = analyticsContent.includes(`function ${func}`) || analyticsContent.includes(`export function ${func}`);
  console.log(`  ${exists ? '✅' : '❌'} ${func}`);
});

// 4. 檢查 Firebase 初始化
console.log('\n⚙️ 步驟 4: 檢查 Firebase 配置');
const hasFirebaseAnalyticsImport = realFirebaseContent.includes('import { getAnalytics');
const hasGetFirebaseAnalytics = realFirebaseContent.includes('getFirebaseAnalytics');
console.log(`  ${hasFirebaseAnalyticsImport ? '✅' : '❌'} Firebase Analytics 導入`);
console.log(`  ${hasGetFirebaseAnalytics ? '✅' : '❌'} getFirebaseAnalytics 函數`);

// 5. 檢查互動追蹤 hook 中的分析集成
console.log('\n⚙️ 步驟 5: 檢查互動追蹤中的分析集成');
const hasAnalyticsImport = useInteractionContent.includes('trackContentLike');
const hasAnalyticsCalls = useInteractionContent.includes('await trackContentLike') || 
                         useInteractionContent.includes('trackContentLike(');
console.log(`  ${hasAnalyticsImport ? '✅' : '❌'} 分析函數導入`);
console.log(`  ${hasAnalyticsCalls ? '✅' : '❌'} 分析函數呼叫`);

// 6. 檢查內容生成事件記錄
console.log('\n⚙️ 步驟 6: 檢查內容生成事件記錄');
const hasContentGeneratedImport = generateRouteContent.includes('trackContentGenerated');
const hasContentGeneratedCall = generateRouteContent.includes('trackContentGenerated(');
console.log(`  ${hasContentGeneratedImport ? '✅' : '❌'} 內容生成事件導入`);
console.log(`  ${hasContentGeneratedCall ? '✅' : '❌'} 內容生成事件呼叫`);

// 7. 檢查事件類型定義
console.log('\n⚙️ 步驟 7: 檢查事件類型定義');
const eventTypes = [
  'content_like',
  'content_dislike',
  'content_skip',
  'keyword_click',
  'feedback_submit',
  'content_impression',
  'content_generated'
];

eventTypes.forEach(eventType => {
  const exists = analyticsContent.includes(`'${eventType}'`);
  console.log(`  ${exists ? '✅' : '❌'} ${eventType} 事件類型`);
});

console.log('\n📊 測試結果總結');
console.log('='.repeat(60));

const allChecks = [
  allFilesExist,
  hasFirebaseAnalyticsImport && hasGetFirebaseAnalytics,
  hasAnalyticsImport && hasAnalyticsCalls,
  hasContentGeneratedImport && hasContentGeneratedCall,
  eventTypes.every(type => analyticsContent.includes(`'${type}'`))
];

const passedChecks = allChecks.filter(check => check).length;
const totalChecks = allChecks.length;

console.log(`✅ 通過: ${passedChecks}/${totalChecks} 個檢查點`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 恭喜！所有分析整合測試都已通過！');
  console.log('\n下一步:');
  console.log('1. 啟動開發伺服器: npm run dev');
  console.log('2. 訪問 http://localhost:3000');
  console.log('3. 在瀏覽器的開發者工具中監控 console 輸出');
  console.log('4. 驗證所有分析事件是否正確觸發和記錄');
} else {
  console.log('\n⚠️  部分檢查未通過，請根據上方報告進行修復');
}

console.log('\n🚀 手動測試建議:');
console.log('1. 點擊內容讚/不讚按鈕 - 應觸發 content_like/content_dislike');
console.log('2. 瀏覽內容超過3秒 - 應觸發 content_skip (若無互動)');
console.log('3. 點擊關鍵字連結 - 應觸發 keyword_click');
console.log('4. 提交意見 - 應觸發 feedback_submit');
console.log('5. 生成新內容 - 應觸發 content_generated');

process.exit(passedChecks === totalChecks ? 0 : 1);