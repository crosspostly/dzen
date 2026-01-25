/**
 * 🚫 Platform Mention Validator v1.0
 * 
 * Проверяет, что в готовой статье НЕ содержится упоминаний платформы.
 * Гарантирует, что контент остается чистым и не выдает себя за AI-generated.
 * 
 * Запрещено:
 * ✗ Zen, Дзен, ДЗЕН
 * ✗ Яндекс.Дзен, Яндекс-Дзен, Яндекс Дзен
 * ✗ Social media platform mentions
 * ✗ Meta-commentary ("I shared this", "people will judge")
 * ✗ Awareness of being published
 */

export interface PlatformMentionIssue {
  type: 'platform_mention' | 'meta_commentary' | 'audience_awareness';
  severity: 'critical' | 'high' | 'medium';
  line: number;
  charIndex: number;
  text: string;
  snippet: string;
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  totalIssues: number;
  criticalIssues: number;
  issues: PlatformMentionIssue[];
  score: number; // 0-100, 100 = clean
  summary: string;
}

export class PlatformMentionValidator {
  // Запрещенные упоминания платформ (case-insensitive)
  private readonly platformMentions = [
    // Яндекс.Дзен
    /яндекс\.?\s*дзен/gi,
    /дзен\.\s*яндекс/gi,
    /яндекс\s+дзен/gi,
    /дзен\s+яндекс/gi,
    /\bДзен\b/g,
    /\bДЗЕН\b/g,
    /\bDzen\b/g,
    /\bZen\b/g,
    
    // Другие платформы
    /\bвконтакте\b/gi,
    /\bvk\.com\b/gi,
    /\bпикабу\b/gi,
    /\bredditor\b/gi,
    /\btwitter/gi,
    /\bfacebook/gi,
    /\binstagram/gi,
    /\btiktok/gi,
    /\bтелеграм/gi,
    /\bтг\b/gi,
    
    // Meta-commentary
    /я решил\s+(?:поделиться|рассказать|написать)/gi,
    /я решил\s+(?:опубликовать|выложить)/gi,
    /я решил\s+(?:постить|постить)/gi,
    /я оставил\s+(?:комментарий|отзыв)/gi,
    /я написал\s+(?:пост|статью|историю)\s+(?:в|на)/gi,
    /люди судят/gi,
    /люди будут судить/gi,
    /люди сказали/gi,
    /я опубликовал/gi,
    /я выложил/gi,
    /я постил/gi,
    /поделиться\s+(?:в|на)\s+(?:сеть|платформ)/gi,
    /это будет\s+(?:интересн|смешн)/gi,
    
    // Audience awareness
    /читател/gi,
    /слушатель/gi,
    /подписчик/gi,
    /фолловер/gi,
    /вы подумаете/gi,
    /вы скажите/gi,
    /что вы подумаете/gi,
  ];

  // Разрешенные контексты (исключения)
  private readonly allowedContexts = [
    // "Он был молчаливым, как дзен-буддист" - философский контекст OK
    /(?:дзен|zen)\s*(?:буддизм|буддист|философи|медитаци|монах|учени)/gi,
    // "название песни" - if properly attributed
    /(?:название|заголовок|фильм|книга|альбом).*(?:дзен|zen)/gi,
  ];

  /**
   * Главная валидация: проверяет статью на упоминания платформ
   */
  public validateArticle(
    title: string,
    content: string
  ): ValidationResult {
    const fullText = `${title}\n${content}`;
    const issues: PlatformMentionIssue[] = [];
    const lines = fullText.split('\n');

    let charIndex = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const lineIssues = this.checkLine(line, lineNum, charIndex);
      issues.push(...lineIssues);
      charIndex += line.length + 1; // +1 for newline
    }

    // Filter out false positives (allowed contexts)
    const filteredIssues = issues.filter(
      issue => !this.isAllowedContext(fullText, issue.charIndex)
    );

    const criticalCount = filteredIssues.filter(
      i => i.severity === 'critical'
    ).length;

    const score = Math.max(0, 100 - filteredIssues.length * 10);
    const valid = filteredIssues.length === 0;

    return {
      valid,
      totalIssues: filteredIssues.length,
      criticalIssues: criticalCount,
      issues: filteredIssues,
      score,
      summary: this.generateSummary(filteredIssues, valid),
    };
  }

  /**
   * Проверяет одну строку на упоминания
   */
  private checkLine(
    line: string,
    lineNum: number,
    baseCharIndex: number
  ): PlatformMentionIssue[] {
    const issues: PlatformMentionIssue[] = [];

    // Проверяем платформы
    for (const pattern of this.platformMentions) {
      const regex = new RegExp(pattern);
      let match;

      while ((match = regex.exec(line)) !== null) {
        const severity = this.getSeverity(match[0]);
        const snippet = this.getSnippet(line, match.index);
        const suggestion = this.getSuggestion(match[0]);

        issues.push({
          type: this.getIssueType(match[0]),
          severity,
          line: lineNum + 1,
          charIndex: baseCharIndex + match.index,
          text: match[0],
          snippet,
          suggestion,
        });
      }
    }

    return issues;
  }

  /**
   * Определяет тип проблемы
   */
  private getIssueType(
    text: string
  ): 'platform_mention' | 'meta_commentary' | 'audience_awareness' {
    if (/zen|дзен|яндекс|вконтакте|picabu|telegram/i.test(text)) {
      return 'platform_mention';
    }
    if (/я решил|я опубликовал|я выложил|люди судят/i.test(text)) {
      return 'meta_commentary';
    }
    return 'audience_awareness';
  }

  /**
   * Определяет severity проблемы
   */
  private getSeverity(text: string): 'critical' | 'high' | 'medium' {
    // CRITICAL: прямые упоминания платформ
    if (/дзен|zen|яндекс/i.test(text)) {
      return 'critical';
    }
    // HIGH: meta-commentary
    if (/я решил|я опубликовал|я выложил/i.test(text)) {
      return 'high';
    }
    // MEDIUM: audience awareness
    return 'medium';
  }

  /**
   * Получает snippet текста вокруг проблемы
   */
  private getSnippet(line: string, index: number, contextChars: number = 40): string {
    const start = Math.max(0, index - contextChars);
    const end = Math.min(line.length, index + contextChars);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < line.length ? '...' : '';
    return prefix + line.substring(start, end) + suffix;
  }

  /**
   * Генерирует suggestion для исправления
   */
  private getSuggestion(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('дзен') || lower.includes('zen')) {
      return '🚫 Удалить или переформулировать - нельзя упоминать платформу';
    }
    if (lower.includes('яндекс')) {
      return '🚫 Удалить упоминание Яндекса - контент должен быть независимым';
    }
    if (/я решил|я опубликовал|я выложил/.test(lower)) {
      return '🚫 Удалить мета-комментарий - персонаж не знает о публикации';
    }
    if (/люди судят|вы подумаете/.test(lower)) {
      return '🚫 Удалить упоминание аудитории - сосредоточиться на истории';
    }

    return '🚫 Проверить и удалить';
  }

  /**
   * Проверяет, является ли это разрешенным контекстом
   */
  private isAllowedContext(fullText: string, charIndex: number): boolean {
    const contextWindow = fullText.substring(
      Math.max(0, charIndex - 100),
      Math.min(fullText.length, charIndex + 100)
    );

    for (const allowedPattern of this.allowedContexts) {
      if (allowedPattern.test(contextWindow)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Генерирует summary отчета
   */
  private generateSummary(
    issues: PlatformMentionIssue[],
    valid: boolean
  ): string {
    if (valid) {
      return '✅ Статья ЧИСТАЯ - нет упоминаний платформ или мета-комментариев';
    }

    const criticalCount = issues.filter(
      i => i.severity === 'critical'
    ).length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;

    const parts: string[] = [];
    if (criticalCount > 0) parts.push(`${criticalCount} CRITICAL`);
    if (highCount > 0) parts.push(`${highCount} HIGH`);
    if (mediumCount > 0) parts.push(`${mediumCount} MEDIUM`);

    return `❌ Найдено ${issues.length} проблем: ${parts.join(', ')}`;
  }

  /**
   * Печатает красивый отчет
   */
  public printReport(result: ValidationResult): void {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 PLATFORM MENTION VALIDATION REPORT`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`Status: ${result.valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Score: ${result.score}/100`);
    console.log(`Total Issues: ${result.totalIssues}`);
    console.log(`Critical Issues: ${result.criticalIssues}`);
    console.log(`\nSummary: ${result.summary}\n`);

    if (result.issues.length > 0) {
      console.log(`${'─'.repeat(60)}`);
      console.log(`Issues:`);
      console.log(`${'─'.repeat(60)}\n`);

      result.issues.forEach((issue, idx) => {
        const severityIcon = {
          critical: '🚨',
          high: '⚠️',
          medium: '⚠️',
        }[issue.severity];

        console.log(
          `${idx + 1}. ${severityIcon} [${issue.severity.toUpperCase()}] Line ${issue.line}`
        );
        console.log(`   Type: ${issue.type}`);
        console.log(`   Text: "${issue.text}"`);
        console.log(`   Snippet: ${issue.snippet}`);
        console.log(`   ${issue.suggestion}\n`);
      });
    }

    console.log(`${'═'.repeat(60)}\n`);
  }

  /**
   * Возвращает отчет в JSON для интеграции
   */
  public getJSON(result: ValidationResult): Record<string, any> {
    return {
      valid: result.valid,
      score: result.score,
      totalIssues: result.totalIssues,
      criticalIssues: result.criticalIssues,
      summary: result.summary,
      issues: result.issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        line: issue.line,
        text: issue.text,
        snippet: issue.snippet,
        suggestion: issue.suggestion,
      })),
    };
  }
}

export const platformValidator = new PlatformMentionValidator();
