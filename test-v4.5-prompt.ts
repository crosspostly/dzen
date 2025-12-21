/**
 * 🧪 Test v4.5 - Quality Metrics in Prompt
 * Проверяем, что промпт содержит качественные метрики
 */

import { EpisodeGeneratorService } from './services/episodeGeneratorService';
import type { EpisodeOutline } from './types/ContentArchitecture';

// Создаем mock outline
const mockOutline: EpisodeOutline = {
  id: 1,
  title: "Mock Episode",
  hookQuestion: "Почему он ушёл?",
  externalConflict: "Муж ушёл неожиданно",
  internalConflict: "Боль потери",
  keyTurning: "Она узнала правду",
  openLoop: "Что же произошло?",
};

// Создаем сервис (без реального API key)
const service = new EpisodeGeneratorService('fake-key-for-testing');

// Используем Reflection API чтобы вызвать приватный метод
const buildPrompt = (service as any).buildPrompt.bind(service);

// Вызываем buildPrompt
const prompt = buildPrompt(
  mockOutline,
  '', // no previous context
  3500, // charLimit
  1, // episodeNum
  10, // totalEpisodes
  1 // attempt
);

console.log('\n✅ ZenMaster v4.5 - Quality Metrics Prompt Test\n');
console.log('═'.repeat(70));

// Проверяем что промпт содержит метрики
const checks = [
  { name: 'Version v4.5', pattern: /v4\.5/i },
  { name: 'QUALITY METRICS section', pattern: /QUALITY METRICS/i },
  { name: 'METRIC 1: READABILITY', pattern: /METRIC 1.*READABILITY/i },
  { name: 'TARGET: 75+/100', pattern: /TARGET.*75\+\/100/i },
  { name: 'METRIC 2: DIALOGUE', pattern: /METRIC 2.*DIALOGUE/i },
  { name: 'TARGET: 35-40%', pattern: /TARGET.*35-40%/i },
  { name: 'METRIC 3: PLOT TWISTS', pattern: /METRIC 3.*PLOT TWISTS/i },
  { name: 'MINIMUM 2', pattern: /MINIMUM 2/i },
  { name: 'METRIC 4: SENSORY', pattern: /METRIC 4.*SENSORY/i },
  { name: 'TARGET: 4+/10', pattern: /TARGET.*4\+\/10/i },
  { name: 'QUALITY CHECKLIST', pattern: /QUALITY CHECKLIST/i },
  { name: 'WHY THIS MATTERS', pattern: /WHY THIS MATTERS/i },
  { name: '30X REVENUE', pattern: /30X REVENUE/i },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const found = check.pattern.test(prompt);
  const status = found ? '✅' : '❌';
  console.log(`${status} ${check.name.padEnd(35)} ${found ? 'FOUND' : 'MISSING'}`);
  if (found) passed++; else failed++;
});

console.log('═'.repeat(70));
console.log(`\n📊 RESULTS: ${passed}/${checks.length} checks passed`);

if (failed === 0) {
  console.log('✅ v4.5 Quality Metrics successfully integrated into prompt!\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} checks failed\n`);
  process.exit(1);
}
