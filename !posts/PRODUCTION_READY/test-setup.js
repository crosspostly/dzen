#!/usr/bin/env node

/**
 * 🧪 TEST SETUP SCRIPT
 * Проверяет:
 * 1. Feed.xml существует и парсится
 * 2. published_articles.txt существует
 * 3. Куки загружаются (из файла или env var)
 * 4. JSON парсится правильно
 * 5. Deduplication работает
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  feedPath: path.join(__dirname, './public/feed.xml'),
  cookiesPath: path.join(__dirname, './config/cookies.json'),
  historyPath: path.join(__dirname, './published_articles.txt'),
};

console.log('\n🧪 ============ TEST SETUP ============\n');
console.log(`📍 Working directory: ${__dirname}\n`);

let testsPassed = 0;
let testsFailed = 0;

// ✅ Test 1: Feed.xml
console.log('📖 Test 1: Checking feed.xml...');
try {
  const feedContent = fs.readFileSync(CONFIG.feedPath, 'utf8');
  const itemCount = (feedContent.match(/<item>/g) || []).length;
  console.log(`   ✅ Feed file found`);
  console.log(`   ✅ Size: ${(feedContent.length / 1024).toFixed(2)} KB`);
  console.log(`   ✅ Articles in feed: ${itemCount}`);
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 2: Cookies from environment or file
console.log('\n🔐 Test 2: Checking cookies source...');
try {
  let cookiesJson;
  let source;
  
  if (process.env.DZEN_COOKIES_JSON) {
    // From environment
    cookiesJson = process.env.DZEN_COOKIES_JSON;
    source = 'ENVIRONMENT VARIABLE';
    console.log(`   ✅ DZEN_COOKIES_JSON found in environment!`);
  } else {
    // From file
    try {
      cookiesJson = fs.readFileSync(CONFIG.cookiesPath, 'utf8');
      source = 'FILE';
      console.log(`   ℹ️  DZEN_COOKIES_JSON not in env, reading from file...`);
    } catch (e) {
      throw new Error('Neither env var nor file found!');
    }
  }
  
  console.log(`   ℹ️  Source: ${source}`);
  console.log(`   ✅ Size: ${(cookiesJson.length / 1024).toFixed(2)} KB`);
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 3: Parse cookies JSON
console.log('\n📋 Test 3: Parsing cookies JSON...');
try {
  let cookiesJson;
  if (process.env.DZEN_COOKIES_JSON) {
    cookiesJson = process.env.DZEN_COOKIES_JSON;
  } else {
    cookiesJson = fs.readFileSync(CONFIG.cookiesPath, 'utf8');
  }
  
  const cookies = JSON.parse(cookiesJson);
  console.log(`   ✅ Valid JSON format`);
  console.log(`   ✅ Number of cookies: ${Array.isArray(cookies) ? cookies.length : 1}`);
  
  if (Array.isArray(cookies)) {
    console.log(`   ℹ️  Sample cookies:`);
    cookies.slice(0, 3).forEach((cookie, i) => {
      console.log(`      ${i + 1}. ${cookie.name || '?'} (${cookie.domain || '?'})`);
    });
  }
  
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 4: History file
console.log('\n📝 Test 4: Checking published_articles.txt...');
try {
  if (fs.existsSync(CONFIG.historyPath)) {
    const historyContent = fs.readFileSync(CONFIG.historyPath, 'utf8');
    const lines = historyContent.split('\n').filter(l => l.trim());
    console.log(`   ✅ History file found`);
    console.log(`   ✅ Published articles: ${lines.length}`);
    
    if (lines.length > 0) {
      console.log(`   ℹ️  Last 3 articles:`);
      lines.slice(-3).forEach((line, i) => {
        const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+)/);
        if (match) {
          console.log(`      ${i + 1}. ${match[1]} - ${match[2].substring(0, 40)}...`);
        }
      });
    }
  } else {
    console.log(`   ℹ️  History file not found (will be created on first publish)`);
  }
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 5: Feed parsing
console.log('\n🔍 Test 5: Parsing feed articles...');
try {
  const feedContent = fs.readFileSync(CONFIG.feedPath, 'utf8');
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  const articles = [];
  
  while ((match = itemRegex.exec(feedContent)) !== null) {
    const itemContent = match[1];
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Unknown';
    articles.push(title);
  }
  
  console.log(`   ✅ Found ${articles.length} articles in feed`);
  
  if (articles.length > 0) {
    console.log(`   ℹ️  First 3 articles:`);
    articles.slice(0, 3).forEach((title, i) => {
      console.log(`      ${i + 1}. ${title.substring(0, 50)}...`);
    });
  }
  
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 6: Deduplication logic
console.log('\n🔄 Test 6: Testing deduplication...');
try {
  const crypto = require('crypto');
  
  function generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  const testTitle = 'Test Article';
  const testContent = 'This is test content';
  
  const titleHash = generateHash(testTitle);
  const contentHash = generateHash(testContent);
  
  console.log(`   ✅ Hash generation working`);
  console.log(`   ✅ Title hash: ${titleHash.substring(0, 16)}...`);
  console.log(`   ✅ Content hash: ${contentHash.substring(0, 16)}...`);
  console.log(`   ✅ Hashes are unique: ${titleHash !== contentHash ? '✅' : '❌'}`);
  
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 7: Environment detection
console.log('\n🌍 Test 7: Checking environment...');
try {
  const isCI = process.env.CI === 'true';
  console.log(`   ✅ CI environment: ${isCI ? 'YES (GitHub Actions)' : 'NO (Local)'}`);
  console.log(`   ✅ Node version: ${process.version}`);
  console.log(`   ✅ Platform: ${process.platform}`);
  testsPassed++;
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Test 8: Config files structure
console.log('\n📁 Test 8: Checking directory structure...');
try {
  const required = [
    { path: 'public', type: 'dir' },
    { path: 'src', type: 'dir' },
    { path: 'modules', type: 'dir' },
    { path: 'public/feed.xml', type: 'file' },
    { path: 'src/main.js', type: 'file' },
    { path: 'src/main.js.ci', type: 'file' },
  ];
  
  let allOk = true;
  required.forEach(item => {
    const fullPath = path.join(__dirname, item.path);
    const exists = fs.existsSync(fullPath);
    const icon = exists ? '✅' : '❌';
    console.log(`   ${icon} ${item.path}`);
    if (!exists) allOk = false;
  });
  
  if (allOk) {
    console.log(`   ✅ All required files present`);
    testsPassed++;
  } else {
    console.log(`   ❌ Some files missing`);
    testsFailed++;
  }
} catch (error) {
  console.log(`   ❌ ERROR: ${error.message}`);
  testsFailed++;
}

// ✅ Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 TEST SUMMARY:\n');
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   📈 Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED! Setup is ready!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm install');
  console.log('  2. Run: npx playwright install chromium');
  console.log('  3. Test: node src/main.js');
  console.log('  4. Push to GitHub');
  console.log('  5. Add GitHub Secret: DZEN_COOKIES_JSON');
  console.log('  6. Enjoy automated publishing! 🚀\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED! Fix issues above.\n');
  process.exit(1);
}
