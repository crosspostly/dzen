/**
 * Очищает текст эпизода от markdown, JSON, метаданных и прочего мусора.
 */
export class ContentSanitizer {
  /**
   * Основной метод очистки контента.
   * Удаляет: markdown, JSON, комментарии, метаданные, code fences.
   */
  static cleanEpisodeContent(content: string): string {
    let cleaned = content || "";

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

    // Remove markdown links [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

    // Remove list markers at line start
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

    // Remove markdown emphasis markers
    cleaned = cleaned.replace(/\*\*|__/g, "");
    cleaned = cleaned.replace(/(^|\s)[*_](?=\S)/g, "$1");
    cleaned = cleaned.replace(/(?<=\S)[*_](\s|$)/g, "$1");

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

    return cleaned;
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
    const lines: string[] = [];

    lines.push("📊 CONTENT VALIDATION REPORT:");
    lines.push(`   Characters: ${validation.charCount} (target: 3000-4000)`);
    lines.push(`   Words: ${validation.wordCount}`);
    lines.push(`   Status: ${validation.valid ? "✅ VALID" : "❌ INVALID"}`);
    lines.push("");

    if (validation.errors.length > 0) {
      lines.push("Errors:");
      validation.errors.forEach((e) => lines.push(`   ${e}`));
    }

    if (validation.warnings.length > 0) {
      lines.push("Warnings:");
      validation.warnings.forEach((w) => lines.push(`   ${w}`));
    }

    return lines.join("\n");
  }
}
