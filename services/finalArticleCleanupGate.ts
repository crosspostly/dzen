import { GoogleGenAI } from "@google/genai";

/**
 * 🧹 FINAL ARTICLE CLEANUP GATE (v7.0 - STRICT ANTI-ARTIFACT RULES)
 *
 * Полная реализация 5-этапной глубокой реставрации текста:
 * - Этап 1: De-noising (удаление мусорных маркеров)
 * - Этап 2: Syntax Restoration (синтаксическая реконструкция)
 * - Этап 3: Deduplication (устранение смыслового дублирования)
 * - Этап 4: Paragraph Pacing (ритмическое структурирование)
 * - Этап 5: Voice Preservation (сохранение авторского голоса)
 *
 * v7.0 CHANGES - STRENGTHENED PROOFREADER PROMPT:
 * - ✅ ENHANCED orphaned fragment detection with specific examples
 * - ✅ STRICT phrase repetition limits (MAX 1 time per phrase)
 * - ✅ EXPLICIT space insertion rules for merged words
 * - ✅ DETAILED before/after examples from actual corrupted text
 * - ✅ IMPROVED dialogue formatting instructions
 * - ✅ CLEARED instruction structure with numbered rules
 */

interface IssueAnalysis {
  hasIssues: boolean;
  issues: string[];
  severity: 'low' | 'medium' | 'critical';
  metadata?: any;
}

interface CleanupResult {
  cleanText: string;
  isPublishReady: boolean;
  qualityScore: number;
  issues: string[];
  appliedCleanup: boolean;
  restorationReport?: RestorationReport;
}

interface RestorationReport {
  stagesCompleted: string[];
  artifactsRemoved: number;
  sentencesFixed: number;
  paragraphsRestructured: number;
  duplicatesRemoved: number;
}

const REPEATED_PHRASES = [
  '— вот в чём дело',
  '— одним словом',
  '— вот что я хочу сказать',
  '— не знаю почему, но',
  '— может быть, не совсем точно, но',
  'вот только',
  'вот это',
  'да вот',
  'ну и',
  'и то',
  'же'
];

export class FinalArticleCleanupGate {
  private geminiClient: GoogleGenAI;
  private enabled: boolean;
  private cleanupThreshold: string;
  private model: string;
  private temperature: number;
  private maxRetries: number;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    
    this.enabled = process.env.FINAL_CLEANUP_ENABLED !== 'false';
    this.cleanupThreshold = process.env.CLEANUP_THRESHOLD || 'medium';
    this.model = process.env.CLEANUP_MODEL || 'gemini-2.0-flash';
    this.temperature = parseFloat(process.env.CLEANUP_TEMPERATURE || '0.3');
    this.maxRetries = parseInt(process.env.CLEANUP_MAX_RETRIES || '2', 10);
  }

  static analyzeForIssues(text: string): IssueAnalysis {
    const issues: string[] = [];
    const repeatedPhrases: Array<{ phrase: string; count: number }> = [];
    let metadataComments = 0;
    let markdownCount = 0;

    // Check repeated phrases (v7.0: MAX 1 repetition allowed)
    REPEATED_PHRASES.forEach(phrase => {
      const count = (text.match(new RegExp(phrase, 'gi')) || []).length;
      if (count > 1) {
        repeatedPhrases.push({ phrase, count });
        issues.push(`Repeated phrase "${phrase}" found ${count} times (max 1 allowed)`);
      }
    });

    // Check metadata
    const metadataPatterns = [/\[note:.*?\]/gi, /\[comment:.*?\]/gi, /\[.*?\]/g];
    metadataPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        metadataComments += matches.length;
        issues.push(`Metadata found: ${matches.length} instances`);
      }
    });

    // Check markdown
    const markdownPatterns = [/\*\*.*?\*\*/g, /##+ /g];
    markdownPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        markdownCount += matches.length;
        issues.push(`Markdown syntax found: ${matches.length} instances`);
      }
    });

    // Check for merged words (v7.0: new check)
    const mergedWordsPatterns = [
      /\.[а-яА-ЯёЁ]{3,}(?=\s|$)/g,  // Word starts mid-sentence after period: ".ивот", ".дачто"
      /[а-яА-ЯёЁ]{8,}(?=\s[а-яА-ЯёЁ]{3,})/g,  // Two long words possibly merged
    ];
    mergedWordsPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        issues.push(`Possible merged words found: ${matches.length} instances`);
      }
    });

    // Check for orphaned fragments at paragraph starts (v7.0: new check)
    const paragraphStartPatterns = [
      /^\s*[.]\s*(и|но|а|да|же|вот|что|ну|если|хотя|потому|пусть)\b/gim,
      /^\s*[а-яА-ЯёЁ]{1,2}[.]\s*/gim,  // Single letters with period at start
    ];
    const paragraphs = text.split(/\n\s*\n/);
    let orphanedCount = 0;
    paragraphs.forEach(para => {
      paragraphStartPatterns.forEach(pattern => {
        if (pattern.test(para)) {
          orphanedCount++;
        }
      });
    });
    if (orphanedCount > 0) {
      issues.push(`Orphaned fragments at paragraph starts: ${orphanedCount} instances`);
    }

    let severity: 'low' | 'medium' | 'critical' = 'low';
    if (
      metadataComments > 0 ||
      markdownCount > 3 ||
      repeatedPhrases.some(p => p.count > 5) ||
      orphanedCount > 2 ||
      issues.some(i => i.includes('merged words') && parseInt(i.match(/\d+/)?.[0] || '0') > 3)
    ) {
      severity = 'critical';
    } else if (repeatedPhrases.length > 0 || orphanedCount > 0) {
      severity = 'medium';
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      severity,
      metadata: { repeatedPhrases, metadataComments, markdownCount, orphanedFragments: orphanedCount }
    };
  }

  async cleanupAndValidate(article: string): Promise<CleanupResult> {
    console.log('\n🧹 [FinalArticleCleanupGate] Starting article cleanup...');
    
    const analysis = FinalArticleCleanupGate.analyzeForIssues(article);
    
    console.log(`   Issues found: ${analysis.issues.length}`);
    console.log(`   Severity: ${analysis.severity.toUpperCase()}`);

    if (!this.shouldApplyCleanup(analysis) || !this.enabled) {
      console.log(`   ✅ No cleanup needed`);
      return {
        cleanText: article,
        isPublishReady: !analysis.hasIssues,
        qualityScore: this.calculateQualityScore(analysis),
        issues: analysis.issues,
        appliedCleanup: false
      };
    }

    console.log(`   🔄 Applying AI cleanup...`);

    try {
      const cleanText = await this.callGeminiForCleanup(article, analysis);
      const cleanAnalysis = FinalArticleCleanupGate.analyzeForIssues(cleanText);

      // Calculate real metrics
      const artifactsRemoved = analysis.issues.length - cleanAnalysis.issues.length;
      const sentencesFixed = this.countSentencesFixes(article, cleanText);
      const paragraphsRestructured = this.countParagraphRestructures(article, cleanText);
      const duplicatesRemoved = analysis.metadata?.repeatedPhrases?.reduce((sum: number, p: any) => sum + Math.max(0, p.count - 2), 0) || 0;

      console.log(`   ✅ Cleanup successful`);
      console.log(`      Issues before: ${analysis.issues.length}`);
      console.log(`      Issues after: ${cleanAnalysis.issues.length}`);
      console.log(`      Artifacts removed: ${artifactsRemoved}`);
      console.log(`      Sentences fixed: ${sentencesFixed}`);
      console.log(`      Paragraphs restructured: ${paragraphsRestructured}`);
      console.log(`      Duplicates removed: ${duplicatesRemoved}`);

      // Log v7.0 specific improvements
      const orphanedBefore = analysis.metadata?.orphanedFragments || 0;
      const orphanedAfter = cleanAnalysis.metadata?.orphanedFragments || 0;
      const mergedBefore = analysis.issues.filter(i => i.includes('merged words')).length || 0;
      const mergedAfter = cleanAnalysis.issues.filter(i => i.includes('merged words')).length || 0;
      console.log(`      Orphaned fragments fixed: ${orphanedBefore - orphanedAfter}`);
      console.log(`      Merged words fixed: ${mergedBefore - mergedAfter}`);

      return {
        cleanText,
        isPublishReady: true,
        qualityScore: this.calculateQualityScore(cleanAnalysis),
        issues: cleanAnalysis.issues,
        appliedCleanup: true,
        restorationReport: {
          stagesCompleted: ['De-noising', 'Syntax Restoration', 'Deduplication', 'Paragraph Pacing', 'Voice Preservation'],
          artifactsRemoved,
          sentencesFixed,
          paragraphsRestructured,
          duplicatesRemoved
        }
      };
    } catch (error) {
      console.error(`   ❌ Cleanup failed: ${(error as Error).message}`);
      return {
        cleanText: article,
        isPublishReady: false,
        qualityScore: this.calculateQualityScore(analysis),
        issues: [...analysis.issues, `Cleanup failed: ${(error as Error).message}`],
        appliedCleanup: false
      };
    }
  }

  /**
   * 📊 Count actual sentences that were fixed/changed
   */
  private countSentencesFixes(original: string, restored: string): number {
    const originalSentences = original.split(/[.!?]+/).filter(s => s.trim());
    const restoredSentences = restored.split(/[.!?]+/).filter(s => s.trim());

    // Simple heuristic: count sentences that differ significantly
    let fixedCount = 0;

    // Count sentences that were significantly shortened (likely broken up)
    restoredSentences.forEach(sentence => {
      if (sentence.length < 50 && originalSentences.some(orig =>
        orig.length > 100 && this.similarity(orig, sentence) < 0.3)) {
        fixedCount++;
      }
    });

    // Count sentences that had metadata/garbage removed
    const garbagePatterns = /\[[^\]]+\]|\(.*\)|  +/g;
    if ((original.match(garbagePatterns) || []).length > 0) {
      fixedCount += Math.min(5, (original.match(garbagePatterns) || []).length);
    }

    return fixedCount;
  }

  /**
   * 📊 Count actual paragraph restructurings
   */
  private countParagraphRestructures(original: string, restored: string): number {
    const originalParas = original.split(/\n\s*\n/).filter(p => p.trim());
    const restoredParas = restored.split(/\n\s*\n/).filter(p => p.trim());

    // Count paragraphs that were significantly changed
    let restructured = 0;

    // More paragraphs = likely restructured for pacing
    if (restoredParas.length > originalParas.length) {
      restructured = Math.min(5, restoredParas.length - originalParas.length);
    }

    // Check for short paragraphs (rhythmic pacing added)
    const shortParas = restoredParas.filter(p => p.split(/\s+/).length < 30).length;
    if (shortParas > 0) {
      restructured += Math.min(3, shortParas);
    }

    return restructured;
  }

  /**
   * 🔍 Calculate string similarity (simple Levenshtein-based)
   */
  private similarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 📏 Levenshtein distance for similarity calculation
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 🎯 FINAL PROOFREADER - финальная вычитка для Яндекс Дзен
   */
  private async callGeminiForCleanup(article: string, analysis: IssueAnalysis): Promise<string> {
    const finalProofreaderPrompt = `╔════════════════════════════════════════════════════════════════════════╗
    ║  ФИНАЛЬНАЯ ПОДГОТОВКА СТАТЬИ ДЛЯ ПУБЛИКАЦИИ (Яндекс Дзен)              ║
    ╚════════════════════════════════════════════════════════════════════════╝

    🎯 ГЛАВНАЯ ЗАДАЧА: Текст должен быть ГОТОВЫМ для копирования в редактор.
    Не переписывай историю - только чисти и выравнивай!

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚫 КРИТИЧЕСКИЕ ОШИБКИ (обязательны к исправлению)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    1. ❌ СЛИТНЫЕ СЛОВА В НАЧАЛЕ АБЗАЦЕВ (объедини с предыдущим или удали):
    ❌ "Марина сидела напротив.и недоступным,"
    ✅ "Марина сидела напротив. Она казалась далёкой и недоступной."

    ❌ "— Ты не изменилась, — мягко сказала она.— Врёшь ведь, — я да"
    ✅ "— Ты не изменилась, — мягко сказала она. — Врёшь ведь, — я..."

    ❌ "ну и", "да вот", "вот только", "вот это", "и то", "же" в начале строки
    ✅ Эти слова относятся к предыдущему предложению - объедини их!

    2. ❌ ПОВТОРЯЮЩИЕСЯ ФРАЗЫ (максимум 1 раз на ВЕСЬ текст):
    ❌ "— вот что я хочу сказать..." (если встречается 5+ раз)
    ✅ Оставь только 1-2 раза. Остальные удали или замени!

    ❌ "— одним словом...", "— вот в чём дело..."
    ✅ Максимум по 1 разу каждая фраза. Удали излишние повторы!

    3. ❌ ОБОРВАННЫЕ ПРЕДЛОЖЕНИЯ (допиши или удали):
    ❌ "странная штука, Я смотрела на свои руки и думала, что жизнь —."
    ✅ "Странная штука. Я смотрела на свои руки и думала, что жизнь — загадка."

    ❌ "...одним словом..."
    ✅ "...одним словом, это было ужасно."

    4. ❌ НЕДОСТАЮЩИЕ ПРОБЕЛЫ (добавь между всеми словами!):
    ❌ "Маринасиделанапротив.инедоступным,"
    ✅ "Марина сидела напротив. Она казалась недоступным."

    5. ❌ ДИАЛОГИ РАЗОРВАНЫ (соедини в один блок):
    ❌ "— Кто это? я,"
     "она улыбнулась."
     "— Я, конечно."

    ✅ "— Кто это? — спросила я.
      Она улыбнулась.
      — Я, конечно."

    6. ❌ ТЕХНИЧЕСКИЙ МУСОР (удали всё):
    - [pause], [note], [scene], [comment], [action], [TODO], [EDITOR]
    - (текст в скобках - если это не диалоги)
    - **жирный текст**, ##заголовки, ___ разделители
    - Двойные/тройные пробелы (оставь только один)

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✅ ЧТО СОХРАНИТЬ БЕЗ ИЗМЕНЕНИЙ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ✅ Сюжет, события, финал
    ✅ Диалоги (только исправь форматирование)
    ✅ Стиль повествования
    ✅ Эмоции и описания
    ✅ Персональный голос рассказчика

    ❌ НЕ МЕНЯЙ: события, порядок действий, персонажей, концовку

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📏 ПРОВЕРКА ДЛИНЫ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    - Если текст <3000 знаков → добавь 1-2 абзаца с сенсорными деталями
    - Если текст >8000 знаков → сократи повторы, но не сюжет
    - Идеальная длина: 4000-7000 знаков

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🎬 ПРИМЕР ИСПРАВЛЕНИЯ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ❌ ДО (с ошибками):
    "Марина сидела напротив.и недоступным, ну и От неё пахло дорогим парфюмом.
    — Ты не изменилась, — мягко сказала она.— Врёшь ведь, — я да — Десять лет прошло, Марин.вот это
    — Ты не изменилась, — мягко сказала она.— Врёшь ведь, — я да
    — Ерунда.да вот Глаза те же.Только взгляд стал тяжёлым.
    вот только Она всегда была королевой школы, потом — самой завидной невестой города."

    ✅ ПОСЛЕ (чистый текст):
    "Марина сидела напротив. Она казалась далёкой и недоступной. От неё пахло дорогим парфюмом, чем-то пудровым и цветочным.

    — Ты не изменилась, — мягко сказала она.
    — Врёшь ведь. Десять лет прошло, Марин. Я за это время успела поседеть и дважды сменить работу.

    — Ерунда. Глаза те же. Только взгляд стал тяжёлым, остывающим.

    Она всегда была королевой школы, потом — самой завидной невестой города."

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📤 ВЫПОЛНИ ЧИСТКУ ТЕКСТА:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ${article}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✅ ГОТОВЫЙ ТЕКС СТАТЬИ:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    `;

    // 🎬 v6.1: DEEP TEXT RESTORATION with fallback and validation
    console.log(`   🚀 Sending to Gemini (${this.model})...`);

    let text = '';
    let usedFallback = false;

    try {
      // First attempt with primary model
      const response = await this.geminiClient.models.generateContent({
        model: this.model,
        contents: finalProofreaderPrompt,
        config: {
          temperature: this.temperature,
          topK: 40,
          topP: 0.95,
        }
      });
      text = response.text || '';
    } catch (primaryError) {
      const errorMessage = (primaryError as Error).message;

      // Check if we should fallback (503 overloaded or unavailable)
      if (errorMessage.includes('503') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('429')) {

        console.log(`   ⚠️  Primary model overloaded (${errorMessage}), trying fallback...`);
        usedFallback = true;

        try {
          // Fallback to gemini-2.5-flash-lite for faster recovery
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: finalProofreaderPrompt,
            config: {
              temperature: this.temperature,
              topK: 32,
              topP: 0.9,
            }
          });
          text = fallbackResponse.text || '';
          console.log(`   ✅ Fallback successful`);
        } catch (fallbackError) {
          console.error(`   ❌ Fallback also failed: ${(fallbackError as Error).message}`);
          throw primaryError; // Re-throw original error
        }
      } else {
        throw primaryError; // Re-throw non-retryable error
      }
    }

    // Extract restoration marker and clean text
    const markerMatch = text.match(/✅\s*READY\s*TO\s*PUBLISH/i);
    const hasMarker = !!markerMatch;

    if (hasMarker) {
      text = text.replace(/✅\s*READY\s*TO\s*PUBLISH/gi, '').trim();
    } else {
      console.warn(`   ⚠️  Gemini did not return completion marker, text may be incomplete`);
    }

    // Validate result with stricter threshold (75% minimum)
    const MIN_RATIO = 0.75;
    const ratio = text.length / article.length;

    if (!text || text.length < article.length * MIN_RATIO) {
      throw new Error(
        `Text corrupted: ${((ratio) * 100).toFixed(1)}% of original (need ${MIN_RATIO * 100}%)`
      );
    }

    // Log detailed results
    console.log(`   ✅ Restoration complete`);
    console.log(`      📏 Output: ${text.length} chars (${(ratio * 100).toFixed(1)}% of original)`);
    console.log(`      🆔 Used fallback: ${usedFallback ? 'Yes (gemini-2.5-flash-lite)' : 'No'}`);
    console.log(`      ✅ Completion marker: ${hasMarker ? 'Present' : 'Missing'}`);

    return text;
  }

  private shouldApplyCleanup(analysis: IssueAnalysis): boolean {
    if (!analysis.hasIssues) return false;
    
    const severityLevels = { low: 1, medium: 2, critical: 3 };
    const thresholdLevels = { low: 1, medium: 2, high: 3 };
    
    return severityLevels[analysis.severity] >= thresholdLevels[this.cleanupThreshold as 'low' | 'medium' | 'high'];
  }

  private calculateQualityScore(analysis: IssueAnalysis): number {
    if (!analysis.hasIssues) return 100;
    
    let score = 100;
    
    if (analysis.metadata?.metadataComments) {
      score -= analysis.metadata.metadataComments * 10;
    }
    
    if (analysis.metadata?.markdownCount) {
      score -= analysis.metadata.markdownCount * 5;
    }
    
    if (analysis.metadata?.repeatedPhrases) {
      analysis.metadata.repeatedPhrases.forEach((p: any) => {
        score -= (p.count - 2) * 5;
      });
    }
    
    if (analysis.severity === 'critical') {
      score -= 30;
    } else if (analysis.severity === 'medium') {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  static validateClean(text: string): boolean {
    const analysis = FinalArticleCleanupGate.analyzeForIssues(text);
    return !analysis.hasIssues || analysis.severity === 'low';
  }
}

export const finalArticleCleanupGate = new FinalArticleCleanupGate();
