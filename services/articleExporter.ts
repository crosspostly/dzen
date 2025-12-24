import fs from "fs";
import path from "path";
import { LongFormArticle } from "../types/ContentArchitecture";
import { MetadataCleanerService } from "./metadataCleanerService";

const LOG = {
  SAVE: "💾",
  SUCCESS: "✅",
  IMAGE: "🖼️",
};

type ExportOptions = {
  includeJson?: boolean;
  includeText?: boolean;
  includeHtml?: boolean;
  includeImages?: boolean;  // 🖼️ НОВОЕ: сохранение изображений
};

/**
 * Экспортирует статью в JSON, TXT и HTML форматы.
 * Сохраняет в структуру: ./articles/{projectId}/{YYYY-MM-DD}/
 */
export class ArticleExporter {
  static async exportArticle(
    article: LongFormArticle,
    projectId: string = "channel-1",
    options: ExportOptions = { includeJson: true, includeText: true, includeHtml: true, includeImages: true }
  ): Promise<{
    jsonPath?: string;
    textPath?: string;
    htmlPath?: string;
    imagePath?: string;        // ✅ NOW imagePath (single string)
    directoryPath: string;
  }> {
    const dateDir = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const themeSlugRaw = (article.outline?.theme || article.title || `article_${Date.now()}`)
      .substring(0, 40)
      .toLowerCase();

    const themeSlug = themeSlugRaw
      .replace(/[^а-яА-ЯёЁ0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || `article_${Date.now()}`;

    const articleDir = path.join(process.cwd(), "articles", projectId, dateDir);
    fs.mkdirSync(articleDir, { recursive: true });
    console.log(`${LOG.SAVE} Article directory: ${articleDir}`);

    const fileBase = path.join(articleDir, themeSlug);
    const result: {
      jsonPath?: string;
      textPath?: string;
      htmlPath?: string;
      imagePath?: string;        // ✅ NOW imagePath (single string)
      directoryPath: string;
    } = { directoryPath: articleDir };

    // 🖼️ Сохраняем обложку статьи (processedBuffer от Canvas post-processing)
    let imagePath: string | undefined;
    if (options.includeImages && article.coverImage?.processedBuffer) {
      console.log(`${LOG.IMAGE} Saving cover image...`);

      try {
        // article.coverImage.processedBuffer содержит JPG буфер после Canvas обработки
        const imageFileName = `${themeSlug}-cover.jpg`;
        imagePath = path.join(articleDir, imageFileName);

        // Сохранить обработанный буфер как JPG файл
        fs.writeFileSync(imagePath, article.coverImage.processedBuffer, 'binary');

        const sizeKb = Math.round(article.coverImage.processedBuffer.length / 1024);
        console.log(
          `${LOG.SUCCESS} Cover image saved: ${imageFileName} (${sizeKb} KB)`
        );
      } catch (error) {
        console.error(
          `❌ Failed to save cover image:`,
          (error as Error).message
        );
      }

      result.imagePath = imagePath;
    }

    if (options.includeJson) {
      const jsonPath = `${fileBase}.json`;
      const jsonContent = JSON.stringify(article, null, 2);
      fs.writeFileSync(jsonPath, jsonContent, "utf-8");
      result.jsonPath = jsonPath;
      console.log(`${LOG.SUCCESS} JSON: ${jsonPath} (${jsonContent.length} bytes)`);
    }

    if (options.includeText) {
      const textPath = `${fileBase}.txt`;
      const textContent = this.formatArticleAsText(article);
      fs.writeFileSync(textPath, textContent, "utf-8");
      result.textPath = textPath;
      console.log(`${LOG.SUCCESS} TXT: ${textPath} (${textContent.length} bytes)`);
    }

    if (options.includeHtml) {
      const htmlPath = `${fileBase}.html`;
      const htmlContent = this.formatArticleAsHtml(article);
      fs.writeFileSync(htmlPath, htmlContent, "utf-8");
      result.htmlPath = htmlPath;
      console.log(`${LOG.SUCCESS} HTML: ${htmlPath} (${htmlContent.length} bytes)`);
    }

    console.log(`${LOG.SUCCESS} Article exported to: ${articleDir}\n`);

    // 🧹 ПОСТ-ЭКСПОРТ: Автоматическая очистка метаданных изображений
    if (options.includeImages && imagePath) {
      console.log(`🧹 Post-processing images...`);
      try {
        const cleaner = new MetadataCleanerService();
        await cleaner.cleanDirectory(articleDir, false);
      } catch (error) {
        console.error(`❌ Metadata cleaning failed:`, (error as Error).message);
      }
    }

    return result;
  }

  /**
   * 🆕 v5.5: Extract description from image prompt details
   * Builds description from scene elements extracted during image generation
   * If no metadata available, generates from lede
   */
  private static extractDescriptionFromImagePrompt(article: LongFormArticle): string {
    // Check if image has prompt metadata with scene extraction data
    if (article.coverImage?.metadata?.sceneDescription) {
      // Extract the scene description from image prompt
      let description = article.coverImage.metadata.sceneDescription;
      
      // Clean up markdown/prompt artifacts
      description = description
        .replace(/^#+\s*/gm, '') // Remove markdown headers
        .replace(/\[.*?\]/g, '') // Remove bracketed text
        .replace(/\*\*|__/g, '') // Remove bold markers
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5) // Take first 5 lines max
        .join('. ')
        .substring(0, 500); // Cap at 500 chars
      
      return description.trim();
    }

    // Fallback: generate description from lede
    const lede = article.lede || '';
    const sentences = lede
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Take first 1-2 sentences as description
    const description = sentences.slice(0, 2).join('. ');
    return description.substring(0, 300);
  }

  private static formatArticleAsText(article: LongFormArticle): string {
    const lines: string[] = [];

    // Заголовок
    lines.push(article.title);
    lines.push("");

    // 🆕 Description field (from image prompt or lede)
    const description = this.extractDescriptionFromImagePrompt(article);
    lines.push(`Description: ${description}`);
    lines.push("");

    // Вступление
    lines.push(article.lede);
    lines.push("");

    // Разделитель между вступлением и основным текстом
    lines.push("***");
    lines.push("");

    // Основной текст - все эпизоды подряд
    article.episodes.forEach((episode, idx) => {
      lines.push(episode.content);
      
      // Добавляем разделитель между эпизодами, кроме последнего
      if (idx < article.episodes.length - 1) {
        lines.push("");
        lines.push("");
      }
    });

    // Разделитель перед финалом
    lines.push("");
    lines.push("***");
    lines.push("");

    // Финал
    lines.push(article.finale);

    return lines.join("\n");
  }

  private static formatArticleAsHtml(article: LongFormArticle): string {
    const generatedAt = article.generation?.generatedAt
      ? new Date(article.generation.generatedAt).toLocaleString("ru-RU")
      : new Date().toLocaleString("ru-RU");

    const modelOutline = article.generation?.modelOutline;
    const modelEpisodes = article.generation?.modelEpisodes;

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(article.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      background: #f9f7f4;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #8b4513;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .title {
      font-size: 2.2em;
      font-weight: bold;
      margin: 20px 0;
      color: #2c3e50;
    }
    .theme {
      font-size: 1.1em;
      color: #7f8c8d;
      font-style: italic;
      margin: 15px 0;
    }
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 20px;
      padding: 15px;
      background: #fff;
      border-radius: 8px;
    }
    .meta-item { text-align: center; padding: 10px; }
    .meta-label {
      font-size: 0.85em;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-value {
      font-size: 1.3em;
      font-weight: bold;
      color: #2c3e50;
    }
    .description {
      font-size: 1em;
      color: #555;
      background: #f5ede3;
      padding: 15px;
      border-left: 3px solid #d4a574;
      margin: 20px 0;
      border-radius: 4px;
      font-style: italic;
    }
    .lede {
      font-size: 1.1em;
      font-style: italic;
      background: #f0ebe5;
      padding: 25px;
      border-left: 4px solid #8b4513;
      margin: 40px 0;
      border-radius: 4px;
    }
    .episodes { margin: 50px 0; }
    .episodes-title {
      font-size: 1.8em;
      border-bottom: 2px solid #8b4513;
      padding-bottom: 15px;
      margin-bottom: 30px;
      color: #2c3e50;
    }
    .episode {
      margin: 40px 0;
      padding: 30px;
      border-left: 5px solid #d4a574;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .episode-number {
      font-size: 0.9em;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .episode-title {
      font-size: 1.5em;
      font-weight: bold;
      color: #2c3e50;
      margin: 10px 0 20px;
    }
    .episode-content {
      text-align: justify;
      margin: 20px 0;
      line-height: 1.9;
    }
    .open-loop {
      margin-top: 20px;
      padding: 15px;
      background: #faf5f0;
      border-radius: 4px;
      font-style: italic;
      color: #8b4513;
      border-left: 3px solid #8b4513;
    }
    .finale {
      margin-top: 50px;
      padding: 40px;
      background: #f0ebe5;
      border-radius: 4px;
      border: 2px solid #8b4513;
    }
    .finale-title {
      font-size: 1.8em;
      font-weight: bold;
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .finale-content {
      font-size: 1.05em;
      text-align: justify;
      line-height: 2;
    }
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
    .divider {
      text-align: center;
      margin: 40px 0;
      color: #8b4513;
      font-size: 1.5em;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="theme">${this.escapeHtml(article.outline.theme)}</div>
    <div class="title">${this.escapeHtml(article.title)}</div>
    <div class="metadata">
      <div class="meta-item">
        <div class="meta-label">Символов</div>
        <div class="meta-value">${article.metadata.totalChars.toLocaleString("ru-RU")}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Чтение</div>
        <div class="meta-value">${article.metadata.totalReadingTime} мин</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Эпизодов</div>
        <div class="meta-value">${article.metadata.episodeCount}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Сцен</div>
        <div class="meta-value">${article.metadata.sceneCount}</div>
      </div>
    </div>
  </div>

  <div class="description">
    ${this.escapeHtml(this.extractDescriptionFromImagePrompt(article))}
  </div>

  <div class="lede">
    ${this.paragraphs(article.lede)}
  </div>

  <div class="episodes">
    <div class="episodes-title">📖 Эпизоды</div>
    ${article.episodes
      .map(
        (episode, idx) => `
      <div class="episode">
        <div class="episode-number">Часть ${episode.id}</div>
        <div class="episode-title">${this.escapeHtml(episode.title)}</div>
        <div class="episode-content">${this.paragraphs(episode.content)}</div>
        <div class="open-loop">→ ${this.escapeHtml(episode.openLoop)}</div>
      </div>
      ${idx < article.episodes.length - 1 ? '<div class="divider">◆ ◆ ◆</div>' : ''}
    `
      )
      .join("")}
  </div>

  <div class="finale">
    <div class="finale-title">🎬 Развязка</div>
    <div class="finale-content">${this.paragraphs(article.finale)}</div>
  </div>

  <div class="footer">
    <p>Сгенерировано: ${generatedAt}</p>
    ${modelOutline || modelEpisodes ? `<p>Модель (план): ${this.escapeHtml(modelOutline || "")} | Модель (эпизоды): ${this.escapeHtml(modelEpisodes || "")}</p>` : ""}
  </div>
</body>
</html>`;
  }

  private static paragraphs(text: string): string {
    return this.escapeHtml(text)
      .split(/\n\s*\n/g)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return (text || "").replace(/[&<>"']/g, (m) => map[m]);
  }
}
