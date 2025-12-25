/**
 * 🚀 DZEN PUBLISHER SERVICE
 * 
 * Implements automatic publishing of articles to Yandex.Dzen
 * Uses Playwright for browser automation
 * Integrates with GitHub Secrets for authentication
 */

import { PlaywrightService, PublishOptions, PublishResult } from './playwrightService';
import * as fs from 'fs';
import * as path from 'path';
import { Article } from '../types/ContentFactory';
import matter from 'gray-matter';

export interface DzenPublishConfig {
  cookies: string; // JSON string of Dzen cookies from GitHub Secrets
  channelId: string;
  dryRun?: boolean; // Don't actually publish, just validate
  maxArticles?: number; // Limit number of articles to publish
}

export interface DzenPublishResult {
  success: boolean;
  publishedArticles: Array<{
    articleId: string;
    title: string;
    url?: string;
    status: 'published' | 'draft' | 'failed';
    error?: string;
  }>;
  summary: {
    totalArticles: number;
    published: number;
    failed: number;
    drafts: number;
  };
}

export class DzenPublisherService {
  private playwrightService: PlaywrightService;
  private config: DzenPublishConfig;

  constructor(config: DzenPublishConfig) {
    this.config = config;
    this.playwrightService = new PlaywrightService();
  }

  /**
   * 🎯 Main method: Publish articles from articles directory to Dzen
   */
  async publishArticlesFromDirectory(directoryPath: string): Promise<DzenPublishResult> {
    console.log(`\n🚀 Starting Dzen publishing from: ${directoryPath}`);
    console.log(`📁 Channel: ${this.config.channelId}`);
    console.log(`🔐 Using cookies: ${this.config.cookies.substring(0, 20)}...`);
    console.log(`📄 Mode: ${this.config.dryRun ? 'DRY RUN (validation only)' : 'LIVE PUBLISHING'}`);

    const result: DzenPublishResult = {
      success: true,
      publishedArticles: [],
      summary: {
        totalArticles: 0,
        published: 0,
        failed: 0,
        drafts: 0,
      },
    };

    try {
      // 1. Validate cookies first
      const cookiesValid = await this.validateDzenCookies();
      if (!cookiesValid) {
        throw new Error('❌ Invalid Dzen cookies - cannot authenticate');
      }
      console.log('✅ Dzen cookies validated successfully');

      // 2. Find all article files in directory
      const articleFiles = await this.findArticleFiles(directoryPath);
      result.summary.totalArticles = articleFiles.length;

      if (articleFiles.length === 0) {
        console.log('⚠️  No articles found in directory');
        return result;
      }

      console.log(`📄 Found ${articleFiles.length} articles to publish`);

      // 3. Process each article
      const limit = this.config.maxArticles || articleFiles.length;
      const articlesToProcess = articleFiles.slice(0, limit);

      for (const [index, filePath] of articlesToProcess.entries()) {
        try {
          console.log(`\n📝 Processing article ${index + 1}/${articlesToProcess.length}: ${path.basename(filePath)}`);

          // Read and parse article
          const articleContent = fs.readFileSync(filePath, 'utf8');
          const { data: frontmatter, content: articleText } = matter(articleContent);

          // Prepare publish options
          const publishOptions: PublishOptions = {
            title: frontmatter.title,
            plainContent: articleText,
            isDraft: false, // Publish directly
            tags: frontmatter.category ? [frontmatter.category] : ['lifestory'],
          };

          // Publish or validate
          let publishResult: PublishResult;
          if (this.config.dryRun) {
            console.log('🔍 DRY RUN: Validating article without publishing');
            publishResult = await this.validateArticleForPublishing(publishOptions);
          } else {
            console.log('🚀 Publishing article to Dzen...');
            publishResult = await this.playwrightService.publishArticle(
              { cookies: this.config.cookies },
              publishOptions
            );
          }

          // Record result
          const articleResult = {
            articleId: path.basename(filePath, '.md'),
            title: frontmatter.title,
            status: publishResult.success ? (publishResult.status || 'published') : 'failed',
            url: publishResult.url,
            error: publishResult.error,
          };

          result.publishedArticles.push(articleResult);

          if (publishResult.success) {
            if (publishResult.status === 'published') {
              result.summary.published++;
              console.log(`✅ Published: ${publishResult.url}`);
            } else if (publishResult.status === 'draft') {
              result.summary.drafts++;
              console.log(`📝 Saved as draft: ${publishResult.url}`);
            }

            // Move published article to published directory
            await this.moveToPublishedDirectory(filePath, articleResult);
          } else {
            result.summary.failed++;
            result.success = false;
            console.log(`❌ Failed: ${publishResult.error}`);
          }

        } catch (error) {
          console.error(`❌ Error processing ${path.basename(filePath)}:`, error);
          result.publishedArticles.push({
            articleId: path.basename(filePath, '.md'),
            title: 'Unknown',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.summary.failed++;
          result.success = false;
        }

        // Rate limiting: wait between articles to avoid rate limits
        if (index < articlesToProcess.length - 1) {
          await this.sleep(5000); // 5 seconds between articles
        }
      }

      // 4. Print summary
      this.printPublishSummary(result);

    } catch (error) {
      console.error('❌ Publishing failed:', error);
      result.success = false;
      result.summary.failed = result.summary.totalArticles;
    } finally {
      await this.playwrightService.close();
    }

    return result;
  }

  /**
   * 🔍 Validate Dzen cookies before publishing
   */
  private async validateDzenCookies(): Promise<boolean> {
    try {
      const result = await this.playwrightService.checkCookiesValidity(this.config.cookies);
      if (result.valid) {
        console.log('✅ Dzen cookies are valid');
        return true;
      } else {
        console.error(`❌ Invalid cookies: ${result.reason}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error validating cookies:', error);
      return false;
    }
  }

  /**
   * 📁 Find all article files in directory
   */
  private async findArticleFiles(directoryPath: string): Promise<string[]> {
    try {
      const files = fs.readdirSync(directoryPath);
      return files
        .filter(file => file.endsWith('.md') && !file.startsWith('.'))
        .map(file => path.join(directoryPath, file));
    } catch (error) {
      console.error(`❌ Error reading directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * 📝 Validate article for publishing (dry run)
   */
  private async validateArticleForPublishing(options: PublishOptions): Promise<PublishResult> {
    // Basic validation
    if (!options.title || options.title.length < 10) {
      return {
        success: false,
        error: 'Title too short (minimum 10 characters)',
      };
    }

    if (!options.plainContent || options.plainContent.length < 1000) {
      return {
        success: false,
        error: 'Content too short (minimum 1000 characters)',
      };
    }

    // Simulate successful validation
    return {
      success: true,
      status: 'published',
      url: 'https://zen.yandex.ru/validate-only',
    };
  }

  /**
   * 📁 Move published article to published directory
   */
  private async moveToPublishedDirectory(filePath: string, articleResult: any): Promise<void> {
    try {
      const publishedDir = path.join(path.dirname(filePath), 'published');
      
      // Create published directory if it doesn't exist
      if (!fs.existsSync(publishedDir)) {
        fs.mkdirSync(publishedDir, { recursive: true });
      }

      // Move the article file
      const fileName = path.basename(filePath);
      const newPath = path.join(publishedDir, fileName);
      fs.renameSync(filePath, newPath);

      // Also move the corresponding image if it exists
      const imageFileName = fileName.replace('.md', '.jpg');
      const imagePath = path.join(path.dirname(filePath), imageFileName);
      if (fs.existsSync(imagePath)) {
        const newImagePath = path.join(publishedDir, imageFileName);
        fs.renameSync(imagePath, newImagePath);
      }

      console.log(`📁 Moved to published: ${newPath}`);

    } catch (error) {
      console.error(`⚠️  Could not move article to published directory:`, error);
    }
  }

  /**
   * 📊 Print publishing summary
   */
  private printPublishSummary(result: DzenPublishResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DZEN PUBLISHING SUMMARY');
    console.log('='.repeat(60));
    console.log(`📄 Total articles: ${result.summary.totalArticles}`);
    console.log(`✅ Published: ${result.summary.published}`);
    console.log(`📝 Drafts: ${result.summary.drafts}`);
    console.log(`❌ Failed: ${result.summary.failed}`);
    console.log(`🎯 Success rate: ${this.calculateSuccessRate(result)}%`);
    console.log('='.repeat(60));

    if (result.summary.failed > 0) {
      console.log('\n❌ Failed articles:');
      result.publishedArticles
        .filter(a => a.status === 'failed')
        .forEach(a => {
          console.log(`   - ${a.title}: ${a.error}`);
        });
    }

    console.log('');
  }

  /**
   * 📊 Calculate success rate
   */
  private calculateSuccessRate(result: DzenPublishResult): number {
    const total = result.summary.totalArticles;
    const successful = result.summary.published + result.summary.drafts;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }

  /**
   * ⏳ Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🎯 Factory method to create DzenPublisherService from environment
 */
export function createDzenPublisherFromEnv(channelId: string, dryRun: boolean = false): DzenPublisherService {
  // Get cookies from environment (GitHub Secrets in production)
  const cookies = process.env.DZEN_COOKIES;
  
  if (!cookies) {
    throw new Error(
      '❌ DZEN_COOKIES environment variable not set. ' +
      'Please set it to the JSON string of your Dzen authentication cookies.'
    );
  }

  const config: DzenPublishConfig = {
    cookies,
    channelId,
    dryRun,
  };

  return new DzenPublisherService(config);
}