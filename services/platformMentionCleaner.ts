/**
 * 🧹 Platform Mention Cleaner v1.0
 * 
 * Автоматически удаляет/переформулирует упоминания платформ и мета-комментарии,
 * сохраняя текст естественным и читаемым.
 * 
 * Стратегия:
 * 1. Удаляет прямые упоминания (Дзен, Zen, Яндекс и т.д.)
 * 2. Переформулирует meta-commentary естественно
 * 3. Удаляет обращения к аудитории
 * 4. Сохраняет смысл и эмоцию текста
 * 5. НЕ ломает экспорт (warning + proceed)
 */

export interface CleaningStats {
  originalLength: number;
  cleanedLength: number;
  issuesFound: number;
  issuesFixed: number;
  issuesSkipped: number;
}

export interface CleaningResult {
  cleanedContent: string;
  stats: CleaningStats;
  warnings: string[];
  report: string;
}

type ReplacementRule = {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  severity: 'critical' | 'high' | 'medium';
  reason: string;
};

export class PlatformMentionCleaner {
  private readonly replacementRules: ReplacementRule[] = [
    // ============================================================================
    // 1️⃣ PLATFORM MENTIONS - DIRECT REMOVAL
    // ============================================================================

    // Яндекс.Дзен и варианты
    {
      pattern: /Яндекс\.?\s*[Дд]зен/gi,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: Яндекс.Дзен',
    },
    {
      pattern: /[Дд]зен\.?\s*Яндекс/gi,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: Дзен.Яндекс',
    },
    {
      pattern: /\bДзен\b/g,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: Дзен',
    },
    {
      pattern: /\bДЗЕН\b/g,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: ДЗЕН',
    },
    {
      pattern: /\bZen\b/g,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: Zen',
    },
    {
      pattern: /\bZEN\b/g,
      replacement: '',
      severity: 'critical',
      reason: 'Platform mention: ZEN',
    },

    // Яндекс (когда явно о платформе)
    {
      pattern: /\bЯндекс[\s\.,:]*(?=\(|платформа|сайт|приложение|медиа)/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Яндекс (in context)',
    },

    // Другие платформы
    {
      pattern: /\bВКонтакте\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: ВКонтакте',
    },
    {
      pattern: /\bVK\.com\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: VK.com',
    },
    {
      pattern: /\bПикабу\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Пикабу',
    },
    {
      pattern: /\bReddit\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Reddit',
    },
    {
      pattern: /\bTwitter\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Twitter',
    },
    {
      pattern: /\bFacebook\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Facebook',
    },
    {
      pattern: /\bInstagram\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Instagram',
    },
    {
      pattern: /\bTikTok\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: TikTok',
    },
    {
      pattern: /\bТелеграм(?:м)?\b/gi,
      replacement: '',
      severity: 'high',
      reason: 'Platform mention: Телеграм',
    },
    {
      pattern: /\bТГ\b/gi,
      replacement: '',
      severity: 'medium',
      reason: 'Platform mention: ТГ',
    },

    // ============================================================================
    // 2️⃣ META-COMMENTARY - REFORMAT OR REMOVE
    // ============================================================================

    // "Я решил поделиться" -> remove
    {
      pattern: /Я решил\s+(?:поделиться|рассказать|написать|опубликовать|выложить|постить)\s+(?:этой истории|этой историей|свою историю|эту историю|этот пост|в интернет|в сеть|онлайн)[.,]?\s*/gi,
      replacement: '',
      severity: 'high',
      reason: 'Meta-commentary: decided to share',
    },
    {
      pattern: /Я решил\s+(?:рассказать|написать)\s+об этом[.,]?\s*/gi,
      replacement: '',
      severity: 'high',
      reason: 'Meta-commentary: decided to tell',
    },

    // "Я оставил комментарий" -> remove
    {
      pattern: /Я оставил\s+(?:комментарий|отзыв|ответ)[.,]?\s*/gi,
      replacement: '',
      severity: 'high',
      reason: 'Meta-commentary: left a comment',
    },

    // "Я написал пост" -> remove
    {
      pattern: /Я написал\s+(?:пост|статью|историю|эту статью)\s+(?:в|на)[.,]?\s*/gi,
      replacement: '',
      severity: 'high',
      reason: 'Meta-commentary: wrote a post',
    },

    // "Я опубликовал" -> remove
    {
      pattern: /Я (?:опубликовал|выложил|поделился)\s+(?:этим|этой|эту)[.,]?\s*/gi,
      replacement: '',
      severity: 'high',
      reason: 'Meta-commentary: published',
    },

    // "люди судят" -> "они думают"
    {
      pattern: /люди (?:судят|будут судить|начали судить|говорят|скажут|скажут)/gi,
      replacement: (match) => {
        if (/скаж/i.test(match)) return 'они говорят';
        if (/суди/i.test(match)) return 'они думают';
        return 'они думают';
      },
      severity: 'high',
      reason: 'Meta-commentary: people judge -> they think',
    },

    // "люди сказали" -> remove or replace
    {
      pattern: /люди\s+(?:сказали|ответили|написали)[.,]?\s*/gi,
      replacement: (match) => {
        if (/ответ/i.test(match)) return 'люди ответили';
        return '';
      },
      severity: 'medium',
      reason: 'Meta-commentary: people said',
    },

    // ============================================================================
    // 3️⃣ AUDIENCE AWARENESS - REMOVE DIRECT ADDRESSING
    // ============================================================================

    // "вы подумаете" / "вы скажите" / "вы знаете"
    {
      pattern: /\bвы\s+(?:подумаете|подумаете|скажите|скажу|знаете|видели|читали|видите|помните)\b[.,]?\s*/gi,
      replacement: '',
      severity: 'medium',
      reason: 'Audience awareness: direct addressing',
    },

    // "что вы думаете" -> remove
    {
      pattern: /что\s+вы\s+(?:думаете|скажете|ответите)[.,]?\s*/gi,
      replacement: '',
      severity: 'medium',
      reason: 'Audience awareness: what do you think',
    },

    // "A вы?" / "А может быть вы?" -> remove
    {
      pattern: /[Аа]\s+вы[?.,]\s*/g,
      replacement: '',
      severity: 'medium',
      reason: 'Audience awareness: And you?',
    },

    // ============================================================================
    // 4️⃣ CLEANUP - REMOVE EXTRA SPACES AND ARTIFACTS
    // ============================================================================

    // Multiple spaces -> single space
    {
      pattern: /  +/g,
      replacement: ' ',
      severity: 'medium',
      reason: 'Cleanup: multiple spaces',
    },

    // Space before punctuation
    {
      pattern: /\s+([.,!?;:])/g,
      replacement: '$1',
      severity: 'medium',
      reason: 'Cleanup: space before punctuation',
    },

    // Multiple line breaks
    {
      pattern: /\n\n\n+/g,
      replacement: '\n\n',
      severity: 'medium',
      reason: 'Cleanup: multiple line breaks',
    },

    // Remove standalone periods/commas at line start
    {
      pattern: /\n[.,]\s*/g,
      replacement: '\n',
      severity: 'medium',
      reason: 'Cleanup: standalone punctuation',
    },
  ];

  /**
   * Главный метод: очищает контент от упоминаний платформы
   */
  public cleanContent(content: string): CleaningResult {
    const originalLength = content.length;
    let cleanedContent = content;
    let issuesFixed = 0;
    let issuesSkipped = 0;
    const warnings: string[] = [];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧹 PLATFORM MENTION CLEANER`);
    console.log(`${'='.repeat(60)}\n`);

    for (const rule of this.replacementRules) {
      const matches = cleanedContent.match(rule.pattern);
      if (matches) {
        console.log(
          `${this.getSeverityIcon(
            rule.severity
          )} [${rule.severity.toUpperCase()}] ${rule.reason}: ${matches.length}x`
        );
        console.log(`   Pattern: ${rule.pattern.source.substring(0, 60)}...`);

        try {
          // Type guard to handle string or function replacement
          if (typeof rule.replacement === 'string') {
            cleanedContent = cleanedContent.replace(rule.pattern, rule.replacement as string);
          } else {
            cleanedContent = cleanedContent.replace(rule.pattern, rule.replacement as (match: string) => string);
          }
          issuesFixed += matches.length;
        } catch (error) {
          console.warn(
            `   ⚠️  Failed to apply replacement: ${(error as Error).message}`
          );
          issuesSkipped += matches.length;
          warnings.push(`Failed to clean: ${rule.reason}`);
        }
      }
    }

    // Final cleanup: trim and normalize
    cleanedContent = cleanedContent
      .trim()
      .replace(/\n\s*\n\s*\n/g, '\n\n') // max 2 consecutive newlines
      .replace(/^\s+/gm, '') // remove leading spaces from lines
      .replace(/\s+$/gm, ''); // remove trailing spaces from lines

    const cleanedLength = cleanedContent.length;
    const charsRemoved = originalLength - cleanedLength;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ CLEANING COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Original: ${originalLength} chars`);
    console.log(`Cleaned: ${cleanedLength} chars`);
    console.log(`Removed: ${charsRemoved} chars (${((charsRemoved / originalLength) * 100).toFixed(1)}%)`);
    console.log(`Issues fixed: ${issuesFixed}`);
    console.log(`Issues skipped: ${issuesSkipped}`);

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      warnings.forEach((w) => console.log(`   • ${w}`));
    }

    console.log(`${'='.repeat(60)}\n`);

    return {
      cleanedContent,
      stats: {
        originalLength,
        cleanedLength,
        issuesFound: issuesFixed + issuesSkipped,
        issuesFixed,
        issuesSkipped,
      },
      warnings,
      report: this.generateReport(
        originalLength,
        cleanedLength,
        issuesFixed,
        issuesSkipped,
        warnings
      ),
    };
  }

  /**
   * Очищает только title
   */
  public cleanTitle(title: string): string {
    let cleaned = title;

    // Remove platform mentions from title
    cleaned = cleaned.replace(
      /(?:Яндекс\.?\s*)?[Дд]зен[:.]*\s*/gi,
      ''
    );
    cleaned = cleaned.replace(/\bZen\b:?\s*/gi, '');
    cleaned = cleaned.trim();

    return cleaned || title; // fallback to original if completely emptied
  }

  /**
   * Очищает title + content вместе
   */
  public cleanArticle(title: string, content: string): { title: string; content: string } {
    return {
      title: this.cleanTitle(title),
      content: this.cleanContent(content).cleanedContent,
    };
  }

  /**
   * Получить severity иконку
   */
  private getSeverityIcon(
    severity: 'critical' | 'high' | 'medium'
  ): string {
    const icons = {
      critical: '🚨',
      high: '⚠️ ',
      medium: 'ℹ️ ',
    };
    return icons[severity];
  }

  /**
   * Генерирует текстовый отчет
   */
  private generateReport(
    originalLength: number,
    cleanedLength: number,
    issuesFixed: number,
    issuesSkipped: number,
    warnings: string[]
  ): string {
    const lines: string[] = [];
    lines.push('🧹 PLATFORM MENTION CLEANER REPORT');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push(`✅ Original length: ${originalLength} chars`);
    lines.push(`✅ Cleaned length: ${cleanedLength} chars`);
    lines.push(
      `✅ Removed: ${originalLength - cleanedLength} chars (${(
        ((originalLength - cleanedLength) / originalLength) *
        100
      ).toFixed(1)}%)`
    );
    lines.push('');
    lines.push(`Issues fixed: ${issuesFixed}`);
    lines.push(`Issues skipped: ${issuesSkipped}`);

    if (warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      warnings.forEach((w) => lines.push(`  • ${w}`));
    }

    lines.push('');
    lines.push('═'.repeat(50));
    return lines.join('\n');
  }
}

export const platformCleaner = new PlatformMentionCleaner();
