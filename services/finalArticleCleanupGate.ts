import { GoogleGenAI } from "@google/genai";

/**
 * 🧹 FINAL ARTICLE CLEANUP GATE (v6.0 - Уровень 2) - SIMPLIFIED VERSION
 * 
 * Simplified version focusing on core functionality:
 * - analyzeForIssues() - detect artifacts
 * - cleanupAndValidate() - AI cleanup if needed
 * - validateClean() - validate result
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
}

const REPEATED_PHRASES = [
  '— вот в чём дело',
  '— одним словом',
  '— вот что я хочу сказать',
  '— не знаю почему, но',
  '— может быть, не совсем точно, но'
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

    // Check repeated phrases
    REPEATED_PHRASES.forEach(phrase => {
      const count = (text.match(new RegExp(phrase, 'gi')) || []).length;
      if (count > 2) {
        repeatedPhrases.push({ phrase, count });
        issues.push(`Repeated phrase "${phrase}" found ${count} times`);
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

    let severity: 'low' | 'medium' | 'critical' = 'low';
    if (metadataComments > 0 || markdownCount > 3 || repeatedPhrases.some(p => p.count > 10)) {
      severity = 'critical';
    } else if (repeatedPhrases.length > 0) {
      severity = 'medium';
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      severity,
      metadata: { repeatedPhrases, metadataComments, markdownCount }
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
      
      console.log(`   ✅ Cleanup successful`);
      console.log(`      Issues before: ${analysis.issues.length}`);
      console.log(`      Issues after: ${cleanAnalysis.issues.length}`);
      
      return {
        cleanText,
        isPublishReady: true,
        qualityScore: this.calculateQualityScore(cleanAnalysis),
        issues: cleanAnalysis.issues,
        appliedCleanup: true
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

  private async callGeminiForCleanup(article: string, analysis: IssueAnalysis): Promise<string> {
    const systemPrompt = `Ты редактор текста. Твоя задача переписать статью чтобы удалить весь мусор.

ПРОБЛЕМЫ:
${analysis.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

ПРАВИЛА:
✅ Удалить метаданные [...], markdown (**, ##)
✅ Удалить повторяющиеся фразы (макс 1-2 раза на статью)
✅ Сохранить суть, качество, длину (~${article.length} символов)
✅ Сохранить стиль: исповедальный, честный, первое лицо

РЕЗУЛЬТАТ: Только чистый текст без объяснений.`;

    const response = await this.geminiClient.models.generateContent({
      model: this.model,
      contents: `${systemPrompt}\n\nВот статья:\n${article}\n\nВерни ТОЛЬКО ЧИСТЫЙ ТЕКСТ.`,
      config: {
        temperature: this.temperature,
        topK: 40,
        topP: 0.95,
      }
    });

    const text = response.text || '';
    
    if (!text || text.length < article.length * 0.7) {
      throw new Error(`Generated text too short`);
    }

    return text.trim();
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
