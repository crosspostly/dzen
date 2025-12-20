/**
 * Очищает текст эпизода от markdown, JSON, метаданных и прочего мусора.
 * v4.4: Усиленная очистка markdown + качественные метрики
 */
export class ContentSanitizer {
  /**
   * Основной метод очистки контента.
   * Удаляет: markdown, JSON, комментарии, метаданные, code fences.
   * v4.4: АГРЕССИВНАЯ очистка markdown'а
   */
  static cleanEpisodeContent(content: string): string {
    let cleaned = content || "";

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, "\n");

    // Remove markdown code fences markers (keep inner text)
    cleaned = cleaned
      .replace(/^```[^\n]*\n?/gm, "")
      .replace(/\n?```$/gm, "");

    // Remove inline/backticks
    cleaned = cleaned.replace(/`+/g, "");

    // Remove C-style comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
    cleaned = cleaned.replace(/^\s*\/\/.*$/gm, "");

    // Remove common markdown headers
    cleaned = cleaned.replace(/^\s*#{1,6}\s+.*$/gm, "");

    // Remove horizontal rules
    cleaned = cleaned.replace(/^\s*([-*_])\1{2,}\s*$/gm, "");

    // 🔥 v4.4: AGGRESSIVE MARKDOWN REMOVAL
    // Remove markdown bold: **text** or __text__ → text
    cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__([^_]+?)__/g, "$1");

    // Remove markdown italic: *text* or _text_ → text
    // But be careful not to remove legitimate apostrophes
    cleaned = cleaned.replace(/\*([^*\n]+?)\*/g, "$1");
    cleaned = cleaned.replace(/_([^_\n]+?)_/g, "$1");

    // Remove bold+italic: ***text*** or ___text___ → text
    cleaned = cleaned.replace(/\*\*\*([^*]+?)\*\*\*/g, "$1");
    cleaned = cleaned.replace(/___([^_]+?)___/g, "$1");

    // Remove strikethrough: ~~text~~ → text
    cleaned = cleaned.replace(/~~([^~]+?)~~/g, "$1");

    // Remove markdown links [text](url) → text
    cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

    // Remove image markdown ![alt](url)
    cleaned = cleaned.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "");

    // Remove list markers at line start
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

    // Remove obvious JSON blocks / objects (best-effort)
    cleaned = cleaned.replace(/\{[\s\S]*?"[^"]+"\s*:\s*[\s\S]*?\}/g, "");
    cleaned = cleaned.replace(/^\s*\[[\s\S]*?\]\s*$/gm, "");

    // Remove metadata-like lines
    cleaned = cleaned.replace(
      /^\s*(Characters?|Character|Dialogue|Scene|Act|Metadata|Generated|Word count|Words|Time|Duration|Format|Model|Output)\s*[:=].*$/gim,
      ""
    );

    // Remove "Episode X" / "Эпизод X" headings if they appear
    cleaned = cleaned.replace(/^\s*(Episode|Эпизод)\s*#?\s*\d+\s*[:\-–—]?\s*.*$/gim, "");

    // Unescape typical escaped quotes
    cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");

    // Trim trailing spaces on each line
    cleaned = cleaned.replace(/[ \t]+$/gm, "");

    // Collapse excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    // Trim each line but keep paragraph breaks
    cleaned = cleaned
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Final pass: ensure no orphaned markdown characters
    // Remove any remaining standalone markdown markers
    cleaned = cleaned.replace(/([^\w\s]*)\*{1,3}([^\w]|$)/g, "$2");
    cleaned = cleaned.replace(/([^\w\s]?)_{1,3}([^\w]|$)/g, "$2");
    cleaned = cleaned.replace(/~{1,2}([^\w]|$)/g, "$1");

    return cleaned;
  }

  /**
   * 📊 v4.4: Вычисляет метрики качества текста
   */
  static calculateQualityMetrics(
    content: string
  ): {
    readabilityScore: number; // 0-100
    avgParagraphLength: number;
    avgSentenceLength: number;
    dialoguePercentage: number;
    paragraphCount: number;
    paragraphsWithDialogue: number;
    hasComplexSentences: boolean;
    sensoryDensity: number; // детали на 1000 символов
    travelSpeed: "slow" | "medium" | "fast";
    issues: string[];
  } {
    const cleaned = this.cleanEpisodeContent(content);
    const issues: string[] = [];

    // Split into paragraphs
    const paragraphs = cleaned
      .split("\n\n")
      .filter((p) => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // Calculate paragraph metrics
    const paragraphLengths = paragraphs.map((p) => p.length);
    const avgParagraphLength =
      paragraphLengths.reduce((a, b) => a + b, 0) / paragraphCount || 0;

    // Check for overly long paragraphs (bad readability)
    const longParagraphs = paragraphLengths.filter((len) => len > 400).length;
    if (longParagraphs > paragraphCount * 0.3) {
      issues.push(`⚠️  ${longParagraphs} paragraphs > 400 chars (should be < 300)`);
    }

    // Sentence analysis
    const sentences = cleaned.match(/[.!?]+/g) || [];
    const sentenceCount = sentences.length || 1;
    const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const avgSentenceLength = wordCount / sentenceCount;

    if (avgSentenceLength > 20) {
      issues.push(
        `⚠️  Average sentence too long (${avgSentenceLength.toFixed(1)} words, should be < 15)`
      );
    }

    // Dialogue analysis
    const dialogueMatches = cleaned.match(/—[^—\n]+/g) || [];
    const dialogueChars = dialogueMatches.reduce((sum, d) => sum + d.length, 0);
    const dialoguePercentage = (dialogueChars / cleaned.length) * 100;

    if (dialoguePercentage < 20) {
      issues.push(
        `⚠️  Too little dialogue (${dialoguePercentage.toFixed(1)}%, target 30-40%)`
      );
    }

    const paragraphsWithDialogue = paragraphs.filter((p) => /—/.test(p)).length;

    // Complex sentence detection (3+ subordinate clauses)
    const complexSentenceRegex =
      /[^.!?]*(?:что|который|когда|где|если|хотя|пока|пока|так как)[^.!?]*(?:что|который|когда|где|если|хотя)[^.!?]*/gi;
    const complexSentences = cleaned.match(complexSentenceRegex) || [];
    const hasComplexSentences = complexSentences.length > cleaned.match(/[.!?]/g)!.length * 0.2;

    if (hasComplexSentences) {
      issues.push(
        `⚠️  ${complexSentences.length} complex sentences detected (nested clauses)`
      );
    }

    // Sensory details density
    const sensoryWords =
      /\b(пахло|запах|цвет|красн|голос|слышал|прикоснулся|ощутил|шелест|шум|света|темн|теплый|холодный|мягкий|твердый|резкий|нежный)\w*/gi;
    const sensoryMatches = cleaned.match(sensoryWords) || [];
    const sensoryDensity = (sensoryMatches.length / (cleaned.length / 1000)) * 10;

    // Plot twist count (v4.5)
    const twistCount = this.calculateTwistCount(cleaned);

    // Calculate overall readability score
    let readabilityScore = 100;
    if (avgParagraphLength > 350) readabilityScore -= 15;
    if (avgSentenceLength > 20) readabilityScore -= 15;
    if (dialoguePercentage < 25) readabilityScore -= 15;
    if (hasComplexSentences) readabilityScore -= 10;
    if (sensoryDensity < 3) readabilityScore -= 10;
    if (longParagraphs > 0) readabilityScore -= 5;

    readabilityScore = Math.max(0, Math.min(100, readabilityScore));

    // Reading speed assessment
    let travelSpeed: "slow" | "medium" | "fast" = "medium";
    if (avgSentenceLength > 18) travelSpeed = "slow";
    if (avgSentenceLength < 10) travelSpeed = "fast";

    return {
      readabilityScore,
      avgParagraphLength: Math.round(avgParagraphLength),
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      dialoguePercentage: Math.round(dialoguePercentage * 10) / 10,
      paragraphCount,
      paragraphsWithDialogue,
      hasComplexSentences,
      sensoryDensity: Math.round(sensoryDensity * 10) / 10,
      travelSpeed,
      twistCount,
      issues,
    };
  }

  /**
   * 🔍 Calculate plot twist count (v4.5)
   */
  private static calculateTwistCount(content: string): number {
    const patterns = [
      /но вот тогда/gi,
      /оказывается/gi,
      /оказалось/gi,
      /я ошиблась/gi,
      /я ошибался/gi,
      /думала[,]? что.*?но/gi,
      /думал[,]? что.*?но/gi,
      /была уверена.*?но/gi,
      /был уверен.*?но/gi,
    ];
    
    let count = 0;
    patterns.forEach(p => {
      const matches = content.match(p);
      count += matches ? matches.length : 0;
    });
    
    return Math.min(count, 5); // Cap at 5
  }

  /**
   * ✅ v4.9: Enhanced validation with readSuccess/readFailure metrics
   * Uses QualityValidator for detection-proof authenticity scoring
   */
  static validateEpisodeContentWithAuthenticity(content: string): {
    valid: boolean;
    charCount: number;
    wordCount: number;
    errors: string[];
    warnings: string[];
    readSuccess: boolean;
    readFailure: string[];
    authenticityScore: number;
    retryPrompt: string;
  } {
    const cleaned = this.cleanEpisodeContent(content);
    const charCount = cleaned.length;
    const wordCount = cleaned.split(/\s+/).filter((w) => w.length > 0).length;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (charCount < 2800) {
      errors.push(`❌ Too short: ${charCount} chars (need 3000+)`);
    }

    if (charCount > 5000) {
      warnings.push(`⚠️  Too long: ${charCount} chars (recommended max 4000)`);
    }

    if (/^\s*#{1,6}\s/m.test(cleaned)) {
      errors.push("❌ Contains markdown headers (#, ##)");
    }

    if (/```/.test(cleaned)) {
      errors.push("❌ Contains code fences (```...```)");
    }

    if (/\{[\s\S]*?"[^"]+"\s*:\s*[\s\S]*?\}/.test(cleaned)) {
      errors.push("❌ Contains JSON-like structures");
    }

    if (/\/\*|\/\//.test(cleaned)) {
      errors.push("❌ Contains comments (// or /* */)");
    }

    // 🔥 v4.4: Strict markdown detection
    if (/\*[^*\s][^*]*[^*\s]\*/.test(cleaned)) {
      errors.push("❌ Contains markdown italic (*text*)");
    }
    if (/\*\*[^*][^*]*[^*]\*\*/.test(cleaned)) {
      errors.push("❌ Contains markdown bold (**text**)");
    }
    if (/_[^_\s][^_]*[^_\s]_/.test(cleaned)) {
      errors.push("❌ Contains markdown emphasis (_text_)");
    }

    if (!(/—/.test(cleaned) || /"/.test(cleaned))) {
      warnings.push("⚠️  No dialogue found (should have at least some dialogue)");
    }

    const russianLetters = cleaned.match(/[а-яёА-ЯЁ]/g) || [];
    const latinLetters = cleaned.match(/[a-zA-Z]/g) || [];
    const denom = russianLetters.length + latinLetters.length || 1;
    const russianRatio = russianLetters.length / denom;

    if (russianRatio < 0.8) {
      errors.push(
        `❌ Not enough Russian text (${(russianRatio * 100).toFixed(0)}% Russian, need 80%+)`
      );
    }

    // v4.9: Add QualityValidator integration
    const { QualityValidator } = require('./qualityValidator');
    const qualityMetrics = this.calculateQualityMetrics(content);
    const validation = QualityValidator.validateContent(content, qualityMetrics);

    return {
      valid: errors.length === 0,
      charCount,
      wordCount,
      errors,
      warnings,
      readSuccess: validation.readSuccess,
      readFailure: validation.readFailure,
      authenticityScore: validation.authenticityScore,
      retryPrompt: validation.retryPrompt,
    };
  }

  static validateEpisodeContent(content: string): {
    valid: boolean;
    charCount: number;
    wordCount: number;
    errors: string[];
    warnings: string[];
  } {
    const cleaned = this.cleanEpisodeContent(content);
    const charCount = cleaned.length;
    const wordCount = cleaned.split(/\s+/).filter((w) => w.length > 0).length;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (charCount < 2800) {
      errors.push(`❌ Too short: ${charCount} chars (need 3000+)`);
    }

    if (charCount > 5000) {
      warnings.push(`⚠️  Too long: ${charCount} chars (recommended max 4000)`);
    }

    if (/^\s*#{1,6}\s/m.test(cleaned)) {
      errors.push("❌ Contains markdown headers (#, ##)");
    }

    if (/```/.test(cleaned)) {
      errors.push("❌ Contains code fences (```...```)");
    }

    if (/\{[\s\S]*?"[^"]+"\s*:\s*[\s\S]*?\}/.test(cleaned)) {
      errors.push("❌ Contains JSON-like structures");
    }

    if (/\/\*|\/\//.test(cleaned)) {
      errors.push("❌ Contains comments (// or /* */)");
    }

    // 🔥 v4.4: Strict markdown detection
    if (/\*[^*\s][^*]*[^*\s]\*/.test(cleaned)) {
      errors.push("❌ Contains markdown italic (*text*)");
    }
    if (/\*\*[^*][^*]*[^*]\*\*/.test(cleaned)) {
      errors.push("❌ Contains markdown bold (**text**)");
    }
    if (/_[^_\s][^_]*[^_\s]_/.test(cleaned)) {
      errors.push("❌ Contains markdown emphasis (_text_)");
    }

    if (!(/—/.test(cleaned) || /"/.test(cleaned))) {
      warnings.push("⚠️  No dialogue found (should have at least some dialogue)");
    }

    const russianLetters = cleaned.match(/[а-яёА-ЯЁ]/g) || [];
    const latinLetters = cleaned.match(/[a-zA-Z]/g) || [];
    const denom = russianLetters.length + latinLetters.length || 1;
    const russianRatio = russianLetters.length / denom;

    if (russianRatio < 0.8) {
      errors.push(
        `❌ Not enough Russian text (${(russianRatio * 100).toFixed(0)}% Russian, need 80%+)`
      );
    }

    return {
      valid: errors.length === 0,
      charCount,
      wordCount,
      errors,
      warnings,
    };
  }

  static generateReport(content: string): string {
    const validation = this.validateEpisodeContent(content);
    const metrics = this.calculateQualityMetrics(content);
    const lines: string[] = [];

    lines.push("📊 CONTENT VALIDATION REPORT:");
    lines.push(`   Characters: ${validation.charCount} (target: 3000-4000)`);
    lines.push(`   Words: ${validation.wordCount}`);
    lines.push(`   Status: ${validation.valid ? "✅ VALID" : "❌ INVALID"}`);

    lines.push("");
    lines.push("📈 QUALITY METRICS:");
    lines.push(`   Readability: ${metrics.readabilityScore}/100`);
    lines.push(`   Avg paragraph: ${metrics.avgParagraphLength} chars (target < 300)`);
    lines.push(`   Avg sentence: ${metrics.avgSentenceLength} words (target < 15)`);
    lines.push(`   Dialogue: ${metrics.dialoguePercentage}% (target 30-40%)`);
    lines.push(`   Sensory density: ${metrics.sensoryDensity}/10`);
    lines.push(`   Plot twists: ${metrics.twistCount} (target 2+)`);
    lines.push(`   Reading speed: ${metrics.travelSpeed}`);

    lines.push("");

    if (validation.errors.length > 0) {
      lines.push("Errors:");
      validation.errors.forEach((e) => lines.push(`   ${e}`));
    }

    if (validation.warnings.length > 0) {
      lines.push("Warnings:");
      validation.warnings.forEach((w) => lines.push(`   ${w}`));
    }

    if (metrics.issues.length > 0) {
      lines.push("Quality Issues:");
      metrics.issues.forEach((i) => lines.push(`   ${i}`));
    }

    return lines.join("\n");
  }
}
