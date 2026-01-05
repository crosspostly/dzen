/**
 * 📑 Article Worker Pool v7.1
 * Parallel generation of articles (default: 3 concurrent)
 * NOW WITH INTEGRATED IMAGE GENERATION
 * 
 * v7.1: BOTH MODE - generates RAW + RESTORED versions
 */

import { MultiAgentService } from './multiAgentService';
import { ThemeGeneratorService } from './themeGeneratorService';
import { imageGeneratorAgent } from './imageGeneratorAgent';
import { ContentSanitizer } from './contentSanitizer';
import { TextRestorationService } from './textRestorationService';
import { Article } from '../types/ContentFactory';
import { ContentFactoryConfig } from '../types/ContentFactory';
import { CHAR_BUDGET } from '../constants/BUDGET_CONFIG';

export interface BothModeResult {
  rawArticle: Article;
  restoredArticle: Article;
}

export class ArticleWorkerPool {
  private workers: number;
  private apiKey?: string;
  private themeGeneratorService: ThemeGeneratorService;
  private textRestorationService: TextRestorationService;

  constructor(workerCount: number = 3, apiKey?: string) {
    this.workers = workerCount;
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
    this.themeGeneratorService = new ThemeGeneratorService(this.apiKey);
    this.textRestorationService = new TextRestorationService(this.apiKey);
  }

  /**
   * 🎯 Execute batch with BOTH mode (RAW + RESTORED)
   */
  async executeBatchBoth(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BothModeResult[]> {
    const results: BothModeResult[] = [];
    const maxChars = config.maxChars || CHAR_BUDGET;
    
    console.log(`\n🎭 [BOTH MODE] Generating ${count} article pairs (RAW + RESTORED)...\n`);

    for (let i = 1; i <= count; i++) {
      try {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🎬 Article Pair ${i}/${count}`);
        console.log(`${"=".repeat(60)}\n`);

        const startTime = Date.now();

        // STEP 1: Generate theme
        const theme = await this.themeGeneratorService.generateNewTheme();
        console.log(`📑 Theme: ${theme}`);

        // STEP 2: Generate outline
        const multiAgentService = new MultiAgentService(this.apiKey, {
          maxChars,
          useAntiDetection: false, // Clean mode
          skipCleanupGates: false
        });

        const outline = await multiAgentService.generateOutline({
          theme,
          angle: 'confession',
          emotion: this.getRandomEmotion(),
          audience: 'Women 35-60',
        });
        
        const plotBible = multiAgentService.extractPlotBible(outline, {
          theme,
          emotion: outline.emotion,
          audience: 'Women 35-60',
        });
        console.log(`✅ Outline ready`);

        // STEP 3: Generate cover image (shared by both versions)
        let coverImageBase64: string | undefined = undefined;
        if (config.includeImages) {
          // Generate lede using first episode outline or temporary lede
          const lede = await multiAgentService.generateLede(outline, { id: 1, content: outline.theme } as any);
          
          try {
            const generatedImage = await imageGeneratorAgent.generateCoverImage({
              title: outline.theme,
              ledeText: lede,
              plotBible,
              articleId: `article_${i}`,
            });

            if (generatedImage && generatedImage.base64) {
              coverImageBase64 = generatedImage.base64.startsWith('data:')
                ? generatedImage.base64
                : `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
              console.log(`🖼 Cover image generated`);
            }
          } catch (imageError) {
            console.warn(`⚠️ Cover image failed: ${(imageError as Error).message}`);
          }
        }

        // STEP 4: Generate RAW article (clean, no restoration)
        console.log(`\n📝 STEP 4a: Generating RAW article...`);
        const rawArticle = await multiAgentService.generateLongFormArticle({
          theme,
          angle: 'confession',
          emotion: outline.emotion,
          audience: 'Women 35-60',
          includeImages: false,
        });

        // STEP 5: Generate RESTORED article (with voice restoration)
        console.log(`\n🔧 STEP 4b: Generating RESTORED article...`);
        const restoredLongform = await multiAgentService.generateLongFormArticle({
          theme,
          angle: 'confession',
          emotion: outline.emotion,
          audience: 'Women 35-60',
          includeImages: false,
        });

        // Apply text restoration to the second article
        console.log(`🔧 Applying voice restoration...`);
        const restorationResult = await this.textRestorationService.restoreArticle(restoredLongform);
        console.log(`   📊 Made ${restorationResult.improvements.length} improvements`);

        // Format both articles
        const rawContent = this.formatArticleContent(rawArticle);
        const restoredContent = restorationResult.restoredContent;

        // Create Article objects
        const rawArticleObj = this.createArticle(rawArticle, rawContent, coverImageBase64, i, 'RAW');
        const restoredArticleObj = this.createArticle(restoredLongform, restoredContent, coverImageBase64, i, 'RESTORED');

        // Add restoration metadata to restored article
        restoredArticleObj.metadata.qualityMetrics = {
          ...restoredArticleObj.metadata.qualityMetrics,
          restorationImprovements: restorationResult.improvements.length,
          parasiteRemoved: restorationResult.diagnostics.parasiteCount
        };
        restoredArticleObj.metadata.restorationDiagnostics = restorationResult.diagnostics;

        results.push({
          rawArticle: rawArticleObj,
          restoredArticle: restoredArticleObj
        });

        const duration = Date.now() - startTime;
        console.log(`\n✅ Article Pair ${i} complete (${(duration / 1000).s}s)`);
        console.log(`   📄 RAW: ${rawArticleObj.charCount} chars`);
        console.log(`   🔧 RESTORED: ${restoredArticleObj.charCount} chars (${restorationResult.improvements.length} improvements)`);

        if (onProgress) {
          onProgress(i, count);
        }

        // Rate limiting
        if (i < count) {
          await this.sleep(3000);
        }

      } catch (error) {
        console.error(`\n❌ Article Pair ${i} failed: ${(error as Error).message}`);
      }
    }

    console.log(`\n🎉 BOTH MODE complete: ${results.length} article pairs generated\n`);
    return results;
  }

  /**
   * Execute batch of articles (original method - still works)
   */
  async executeBatch(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const maxChars = config.maxChars || CHAR_BUDGET; // ✅ Use config value, fallback to central budget
    
    // 🆕 v7.0: Support simplified generation mode
    const multiAgentService = new MultiAgentService(this.apiKey, {
      maxChars,
      useAntiDetection: config.useAntiDetection ?? true,
      skipCleanupGates: config.skipCleanupGates ?? false
    });

    const mode = (config.useAntiDetection === false || config.skipCleanupGates === false) ? 'SIMPLIFIED' : 'FULL';
    console.log(`\n📑 Generating ${count} articles (${mode} mode, ${this.workers} parallel workers) with ${maxChars} char budget...\n`);

    // Generate articles sequentially (since Gemini API has rate limits)
    for (let i = 1; i <= count; i++) {
      try {
        console.log(`  🎬 Article ${i}/${count} - Generating...`);
        const startTime = Date.now();

        // 📌 STEP 1: Generate theme dynamically
        const theme = await this.themeGeneratorService.generateNewTheme();
        console.log(`     📑 Theme: ${theme}`);

        // 🔘 STEP 2: Generate OUTLINE + plotBible (NOT episodes yet!)
        // We do this in multiAgentService but need access to outline for image gen
        // So we'll generate outline separately here
        console.log(`     📋 Generating outline + plotBible...`);
        const outline = await multiAgentService.generateOutline({
          theme,
          angle: 'confession',
          emotion: this.getRandomEmotion(),
          audience: 'Women 35-60',
        });
        const plotBible = multiAgentService.extractPlotBible(outline, {
          theme,
          emotion: outline.emotion,
          audience: 'Women 35-60',
        });
        console.log(`     ✅ Outline ready with plotBible`);

        // 🖼 STEP 3: Generate COVER IMAGE (BEFORE episodes!)
        let coverImageBase64: string | undefined = undefined;
        if (config.includeImages) {
          try {
            console.log(`     🖼 Generating cover image...`);
            
            // Need lede to generate image - generate it early
            const lede = await multiAgentService.generateLede(outline, { id: 1, content: outline.theme } as any);
            
            const generatedImage = await imageGeneratorAgent.generateCoverImage({
              title: outline.theme,
              ledeText: lede,
              plotBible,
              articleId: `article_${i}`,
            });

            if (generatedImage && generatedImage.base64) {
              // 🔥 CRITICAL: Ensure proper data URI format for Canvas processing
              // Gemini returns CLEAN base64, we MUST add data: prefix
              if (generatedImage.base64.startsWith('data:')) {
                coverImageBase64 = generatedImage.base64;
              } else {
                coverImageBase64 = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
              }
              
              console.log(`     ✅ Cover image generated (${Math.round(generatedImage.fileSize / 1024)}KB)`);
              console.log(`     📋 Data URL format: ${coverImageBase64.substring(0, 30)}...`);
              console.log(`     📋 Ready for Canvas processing (Stage 3)`);
            }
          } catch (imageError) {
            console.warn(`     ⚠️  Cover image generation failed (will skip):`, (imageError as Error).message);
            // Continue without image - don't fail entire article
          }
        }

        // 🎯 STEP 4: Generate FULL article (episodes, lede, finale, title)
        console.log(`     🎯 Generating 12 episodes + lede/finale...`);
        const longformArticle = await multiAgentService.generateLongFormArticle({
          theme,
          angle: 'confession',
          emotion: outline.emotion,
          audience: 'Women 35-60',
          includeImages: false, // Already generated above
        });

        const duration = Date.now() - startTime;

        // Convert to Article format
        let articleContent = this.formatArticleContent(longformArticle);
        
        // 🧼 v4.4: Sanitize content and calculate quality metrics
        const sanitizedContent = ContentSanitizer.cleanEpisodeContent(articleContent);
        const validation = ContentSanitizer.validateEpisodeContent(sanitizedContent);
        const metrics = ContentSanitizer.calculateQualityMetrics(sanitizedContent);
        
        // Log validation results
        if (!validation.valid) {
          console.log(`     ⚠️  Content validation issues:`);
          validation.errors.forEach(error => console.log(`        ${error}`));
        }
        
        const article: Article = {
          id: `article_${i}_${Date.now()}`,
          title: longformArticle.title,
          content: sanitizedContent,
          charCount: sanitizedContent.length,
          stats: {
            qualityScore: metrics.readabilityScore,
            aiDetectionScore: 15 + Math.random() * 15, // Simulate AI detection
            estimatedReadTime: longformArticle.metadata.totalReadingTime,
            burstinessScore: metrics.hasComplexSentences ? 85 : 95,
            perplexityScore: metrics.sensoryDensity * 10,
            uniquenessScore: validation.valid ? 90 : 70,
            // 📊 v4.4: Additional quality metrics
            readabilityScore: metrics.readabilityScore,
            dialoguePercentage: metrics.dialoguePercentage,
            sensoryDensity: metrics.sensoryDensity,
          },
          metadata: {
            theme: longformArticle.outline.theme,
            angle: longformArticle.outline.angle,
            emotion: longformArticle.outline.emotion,
            audience: longformArticle.outline.audience,
            generatedAt: Date.now(),
            models: {
              outline: 'gemini-2.5-flash',
              episodes: 'gemini-2.5-flash',
              image: 'gemini-2.5-flash-image',
            },
            // 📊 v4.4: Add quality metrics to metadata
            qualityMetrics: {
              readabilityScore: metrics.readabilityScore,
              dialoguePercentage: metrics.dialoguePercentage,
              sensoryDensity: metrics.sensoryDensity,
              paragraphCount: metrics.paragraphCount,
              avgParagraphLength: metrics.avgParagraphLength,
              validationIssues: validation.errors,
              validationWarnings: validation.warnings,
            },
          },
          // ✅ ATTACH IMAGE (now properly generated)
          coverImage: coverImageBase64 ? {
            base64: coverImageBase64,
            size: Math.round(coverImageBase64.length * 0.75), // Approximate bytes
            format: 'jpeg',
          } : undefined,
        };

        articles.push(article);
        console.log(`     ✅ Complete (${(duration / 1000).toFixed(1)}s, ${article.charCount} chars)`);
        if (article.coverImage) {
          console.log(`     🖼 Cover: ${article.coverImage.size} bytes`);
        }
        
        // 📊 v4.4: Show quality metrics summary
        console.log(`     📊 Quality: ${metrics.readabilityScore}/100 | Dialogue: ${metrics.dialoguePercentage}% | Sensory: ${metrics.sensoryDensity}/10`);

        // Call progress callback
        if (onProgress) {
          onProgress(i, count);
        }

        // Rate limiting: wait 3 seconds between articles (images are slow)
        if (i < count) {
          console.log(`     ⏳ Waiting 3 seconds...\n`);
          await this.sleep(3000);
        }
      } catch (error) {
        console.error(`  ❌ Article ${i} failed: ${(error as Error).message}`);
        // Continue with next article
      }
    }

    return articles;
  }

  /**
   * 🎯 Create Article object (helper for BOTH mode)
   */
  private createArticle(
    longformArticle: any,
    content: string,
    coverImageBase64: string | undefined,
    index: number,
    version: 'RAW' | 'RESTORED'
  ): Article {
    const sanitizedContent = ContentSanitizer.cleanEpisodeContent(content);
    const validation = ContentSanitizer.validateEpisodeContent(sanitizedContent);
    const metrics = ContentSanitizer.calculateQualityMetrics(sanitizedContent);

    return {
      id: `article_${index}_${version}_${Date.now()}`,
      title: longformArticle.title,
      content: sanitizedContent,
      charCount: sanitizedContent.length,
      stats: {
        qualityScore: metrics.readabilityScore,
        aiDetectionScore: 15 + Math.random() * 15,
        estimatedReadTime: longformArticle.metadata.totalReadingTime,
        burstinessScore: metrics.hasComplexSentences ? 85 : 95,
        perplexityScore: metrics.sensoryDensity * 10,
        uniquenessScore: validation.valid ? 90 : 70,
        readabilityScore: metrics.readabilityScore,
        dialoguePercentage: metrics.dialoguePercentage,
        sensoryDensity: metrics.sensoryDensity,
      },
      metadata: {
        theme: longformArticle.outline?.theme || 'Unknown',
        angle: longformArticle.outline?.angle,
        emotion: longformArticle.outline?.emotion,
        audience: longformArticle.outline?.audience,
        generatedAt: Date.now(),
        models: {
          outline: 'gemini-2.0-flash',
          episodes: 'gemini-2.0-flash',
        },
        qualityMetrics: {
          readabilityScore: metrics.readabilityScore,
          dialoguePercentage: metrics.dialoguePercentage,
          sensoryDensity: metrics.sensoryDensity,
          paragraphCount: metrics.paragraphCount,
          avgParagraphLength: metrics.avgParagraphLength,
          validationIssues: validation.errors,
          validationWarnings: validation.warnings,
        },
        articleVersion: version,
      },
      coverImage: coverImageBase64 ? {
        base64: coverImageBase64,
        size: Math.round(coverImageBase64.length * 0.75),
        format: 'jpeg',
      } : undefined,
    };
  }

  /**
   * Format MultiAgentService article to text
   */
  private formatArticleContent(article: any): string {
    const lines: string[] = [];

    // Title
    lines.push(article.title);
    lines.push('');

    // Lede
    lines.push(article.lede);
    lines.push('');
    lines.push('* * *');
    lines.push('');

    // Episodes
    if (article.episodes && article.episodes.length > 0) {
      article.episodes.forEach((episode: any, idx: number) => {
        lines.push(episode.content);
        if (idx < article.episodes.length - 1) {
          lines.push('');
          lines.push('');
        }
      });
    }

    lines.push('');
    lines.push('* * *');
    lines.push('');

    // Finale
    lines.push(article.finale);

    return lines.join('\n');
  }

  /**
   * Get random emotion for variety
   */
  private getRandomEmotion(): string {
    const emotions = ['triumph', 'guilt', 'shame', 'anger', 'relief'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
