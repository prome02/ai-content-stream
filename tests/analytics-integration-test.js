// 分析整合測試腳本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Analytics] AI Content Stream Platform - Analytics Integration Test');
console.log('='.repeat(60));

// 1. 檢查目錄和設置
console.log('\n[Step 1] Check project structure');
const requiredFiles = [
  'lib/analytics.ts',
  'lib/real-firebase.ts',
  'app/hooks/useInteractionTracking.ts',
  'app/api/generate/route.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`  ${exists ? '[OK]' : '[ERR]'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('[ERR] Missing required files, test aborted');
  process.exit(1);
}

console.log('[OK] All core files exist');

// 2. 檢查 TypeScript/JavaScript 語法
console.log('\n[Step 2] Check syntax errors');
try {
  const tsCheck = execSync('npx tsc --noEmit --project tsconfig.json 2>&1', { cwd: path.join(__dirname, '..') });
  console.log('[OK] TypeScript compilation check passed');
} catch (error) {
  console.error('[ERR] TypeScript compilation error:');
  console.error(error.stdout.toString());
}

// 3. 檢查分析模組導入和導出
console.log('\n[Step 3] Check analytics module configuration');

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
  console.log(`  ${exists ? '[OK]' : '[ERR]'} ${func}`);
});

// 4. 檢查 Firebase 初始化
console.log('\n[Step 4] Check Firebase configuration');
const hasFirebaseAnalyticsImport = realFirebaseContent.includes('import { getAnalytics');
const hasGetFirebaseAnalytics = realFirebaseContent.includes('getFirebaseAnalytics');
console.log(`  ${hasFirebaseAnalyticsImport ? '[OK]' : '[ERR]'} Firebase Analytics import`);
console.log(`  ${hasGetFirebaseAnalytics ? '[OK]' : '[ERR]'} getFirebaseAnalytics function`);

// 5. 檢查互動追蹤 hook 中的分析集成
console.log('\n[Step 5] Check analytics integration in interaction tracking');
const hasAnalyticsImport = useInteractionContent.includes('trackContentLike');
const hasAnalyticsCalls = useInteractionContent.includes('await trackContentLike') || 
                         useInteractionContent.includes('trackContentLike(');
console.log(`  ${hasAnalyticsImport ? '[OK]' : '[ERR]'} Analytical function import`);
console.log(`  ${hasAnalyticsCalls ? '[OK]' : '[ERR]'} Analytical function call`);

// 6. 檢查內容生成事件記錄
console.log('\n[Step 6] Check content generation event tracking');
const hasContentGeneratedImport = generateRouteContent.includes('trackContentGenerated');
const hasContentGeneratedCall = generateRouteContent.includes('trackContentGenerated(');
console.log(`  ${hasContentGeneratedImport ? '[OK]' : '[ERR]'} Content generation event import`);
console.log(`  ${hasContentGeneratedCall ? '[OK]' : '[ERR]'} Content generation event call`);

// 7. 檢查事件類型定義
console.log('\n[Step 7] Check event type definitions');
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
  console.log(`  ${exists ? '[OK]' : '[ERR]'} ${eventType} event type`);
});

console.log('\n[Results] Test summary');
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

console.log(`[OK] Passed: ${passedChecks}/${totalChecks} checkpoints`);

if (passedChecks === totalChecks) {
  console.log('\n[Success] All analytics integration tests passed!');
  console.log('\n下一步:');
  console.log('1. 啟動開發伺服器: npm run dev');
  console.log('2. 訪問 http://localhost:3000');
  console.log('3. 在瀏覽器的開發者工具中監控 console 輸出');
  console.log('4. 驗證所有分析事件是否正確觸發和記錄');
} else {
  console.log('\n[WARN] Some checks failed, please fix based on the report above');
}

console.log('\n[Manual] Manual test suggestions:');
console.log('1. 點擊內容讚/不讚按鈕 - 應觸發 content_like/content_dislike');
console.log('2. 瀏覽內容超過3秒 - 應觸發 content_skip (若無互動)');
console.log('3. 點擊關鍵字連結 - 應觸發 keyword_click');
console.log('4. 提交意見 - 應觸發 feedback_submit');
console.log('5. 生成新內容 - 應觸發 content_generated');

process.exit(passedChecks === totalChecks ? 0 : 1);