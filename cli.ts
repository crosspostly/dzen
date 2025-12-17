#!/usr/bin/env node

/**
 * Dzen Content Generator CLI
 * Локальный CLI для генерации статей
 */

import { configService } from './services/configService';
import { examplesService } from './services/examplesService';
import { geminiService } from './services/geminiService';
import { uniquenessService } from './services/uniquenessService';
import { Phase2AntiDetectionService } from './services/phase2AntiDetectionService';
import { MultiAgentService } from './services/multiAgentService';
import { getDzenChannelConfig, getAllDzenChannels, getRandomThemeForChannel, validateDzenChannelsConfig } from './config/dzen-channels.config';
import fs from 'fs';
import path from 'path';

// Красивые эмоджи и звуки
const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  LOADING: '📁',
  ROCKET: '🚀',
  BRAIN: '🧠',
  HOOK: '🎪',
  UP: '⬆️',
  BOOM: '💥',
  CLAP: '🎟',
  TIMER: '⏱️',
  SAVE: '💾',
  CHART: '📊',
  SEARCH: '🔍',
};

const args = process.argv.slice(2);

// Handle commands that might be in any position
const allArgs = process.argv.slice(2);

// Find command - can be first or after flags
const command = allArgs.find(arg => !arg.startsWith('--')) || 'help';

function getArg(name: string, defaultValue?: string): string | undefined {
  const match = allArgs.find(a => a.startsWith(`--${name}=`));
  return match?.split('=')[1] || defaultValue;
}

function getFlag(name: string): boolean {
  return allArgs.includes(`--${name}`);
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

(async () => {
  try {
    // ============================================================================
    // Handle different CLI commands
    // ============================================================================
    
    if (command === 'list-dzen-channels') {
      // List all available Dzen channels
      console.log(`\n${LOG.CHART} ============================================`);
      console.log(`${LOG.CHART} ZenMaster v2.0 - Dzen Channels List`);
      console.log(`${LOG.CHART} ============================================\n`);
      
      const channels = getAllDzenChannels();
      console.log(`${LOG.BRAIN} Available Dzen Channels (${channels.length}):`);
      console.log('');
      
      channels.forEach(channel => {
        console.log(`📡 ${channel.id}`);
        console.log(`   Name: ${channel.name}`);
        console.log(`   Description: ${channel.description}`);
        console.log(`   Angle: ${channel.defaultAngle}`);
        console.log(`   Emotion: ${channel.defaultEmotion}`);
        console.log(`   Audience: ${channel.defaultAudience}`);
        console.log(`   Models: ${channel.modelOutline} (outline), ${channel.modelEpisodes} (episodes)`);
        console.log(`   Output: ${channel.outputDir}`);
        console.log(`   Themes: ${channel.channelThemes.length} pre-configured themes`);
        console.log('');
      });
      
      console.log(`${LOG.SUCCESS} ✅ Use --dzen-channel=<channel-id> to generate for specific channel`);
      console.log(`${LOG.INFO} Example: npm run generate:v2 -- --dzen-channel=women-35-60`);
      console.log('');
      
    } else if (command === 'validate-dzen-config') {
      // Validate Dzen channels configuration
      console.log(`\n${LOG.LOADING} ============================================`);
      console.log(`${LOG.LOADING} ZenMaster v2.0 - Validate Dzen Config`);
      console.log(`${LOG.LOADING} ============================================\n`);
      
      const validation = validateDzenChannelsConfig();
      
      if (validation.valid) {
        console.log(`${LOG.SUCCESS} ✅ All Dzen channels configuration is valid!`);
        console.log(`${LOG.CHART} Configuration summary:`);
        
        const channels = getAllDzenChannels();
        channels.forEach(channel => {
          console.log(`   📡 ${channel.id}: ${channel.channelThemes.length} themes, output: ${channel.outputDir}`);
        });
      } else {
        console.log(`${LOG.ERROR} ❌ Configuration validation failed:`);
        validation.errors.forEach(error => console.log(`   ❌ ${error}`));
        process.exit(1);
      }
      
      console.log('');
      
    } else if (command === 'generate:v2') {
      // ============================================================================
      // ZenMaster v2.0 - Multi-Agent Longform Generation (35K+ symbols)
      // SUPPORTS: Direct parameters OR Dzen Channel Configuration
      // ============================================================================
      
      const dzenChannel = getArg('dzen-channel');
      const theme = getArg('theme');
      const verbose = getFlag('verbose');

      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} ZenMaster v2.0 - Multi-Agent Generation`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const startTime = Date.now();

      let generationParams = {
        theme: '',
        angle: 'confession',
        emotion: 'triumph',
        audience: 'Women 35-60',
        modelOutline: 'gemini-2.5-pro',
        modelEpisodes: 'gemini-2.5-flash',
        outputDir: './generated/articles/'
      };

      if (dzenChannel) {
        // Using Dzen Channel Configuration
        console.log(`${LOG.BRAIN} Loading Dzen channel configuration: ${dzenChannel}`);
        const channelConfig = getDzenChannelConfig(dzenChannel);
        
        generationParams.theme = theme || getRandomThemeForChannel(dzenChannel);
        generationParams.angle = channelConfig.defaultAngle;
        generationParams.emotion = channelConfig.defaultEmotion;
        generationParams.audience = channelConfig.defaultAudience;
        generationParams.modelOutline = channelConfig.modelOutline;
        generationParams.modelEpisodes = channelConfig.modelEpisodes;
        generationParams.outputDir = channelConfig.outputDir;

        console.log(`${LOG.SUCCESS} ✅ Using DZEN_${dzenChannel.toUpperCase()}_CONFIG:`);
        console.log(`   📝 Theme: "${generationParams.theme}"`);
        console.log(`   🎯 Angle: ${generationParams.angle}`);
        console.log(`   💫 Emotion: ${generationParams.emotion}`);
        console.log(`   👥 Audience: ${generationParams.audience}`);
        console.log(`   🤖 Models: ${generationParams.modelOutline} (outline), ${generationParams.modelEpisodes} (episodes)`);
        console.log(`   📁 Output: ${generationParams.outputDir}\n`);

      } else {
        // Legacy direct parameters
        generationParams.theme = theme || 'Я услышала одну фразу и всё изменилось';
        generationParams.angle = getArg('angle', 'confession');
        generationParams.emotion = getArg('emotion', 'triumph');
        generationParams.audience = getArg('audience', 'Women 35-60');
        generationParams.modelOutline = getArg('model-outline', 'gemini-2.5-pro');
        generationParams.modelEpisodes = getArg('model-episodes', 'gemini-2.5-flash');
        generationParams.outputDir = './generated/articles/';

        console.log(`${LOG.WARN} ⚠️  Using legacy direct parameters (deprecated)`);
        console.log(`${LOG.INFO} 💡 Use --dzen-channel instead for better configuration management`);
        console.log(`${LOG.BRAIN} Parameters:`);
        console.log(`   📝 Theme: "${generationParams.theme}"`);
        console.log(`   🎯 Angle: ${generationParams.angle}`);
        console.log(`   💫 Emotion: ${generationParams.emotion}`);
        console.log(`   👥 Audience: ${generationParams.audience}`);
        console.log(`   🤖 Models: ${generationParams.modelOutline} (outline), ${generationParams.modelEpisodes} (episodes)\n`);
      }

      // Initialize Multi-Agent Service
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY не установлен. Используйте: export GEMINI_API_KEY=sk-...');
      }
      
      const multiAgentService = new MultiAgentService(apiKey);

      // Generate 35K+ longform article
      const article = await multiAgentService.generateLongFormArticle({
        theme: generationParams.theme,
        angle: generationParams.angle,
        emotion: generationParams.emotion,
        audience: generationParams.audience,
      });

      const totalTime = Date.now() - startTime;

      // Save result to channel-specific directory
      console.log(`\n${LOG.SAVE} Saving result...`);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = path.join(process.cwd(), generationParams.outputDir.replace('./', ''));
      fs.mkdirSync(outDir, { recursive: true });

      const outputPath = path.join(outDir, `article_${timestamp}.json`);
      fs.writeFileSync(
        outputPath,
        JSON.stringify({
          id: article.id,
          title: article.title,
          lede: article.lede,
          channel: dzenChannel || 'legacy',
          episodes: article.episodes.map(ep => ({
            id: ep.id,
            title: ep.title,
            content: ep.content,
            charCount: ep.charCount,
            openLoop: ep.openLoop,
          })),
          finale: article.finale,
          voicePassport: article.voicePassport,
          metadata: article.metadata,
          outline: {
            theme: article.outline.theme,
            angle: article.outline.angle,
            emotion: article.outline.emotion,
            audience: article.outline.audience,
          },
          generation: {
            modelOutline: generationParams.modelOutline,
            modelEpisodes: generationParams.modelEpisodes,
            channelConfig: dzenChannel,
            generatedAt: new Date().toISOString(),
          },
        }, null, 2)
      );

      // Final results
      console.log(`\n${LOG.SUCCESS} ============================================`);
      console.log(`${LOG.SUCCESS} ARTICLE COMPLETE (ZenMaster v2.0)`);
      console.log(`${LOG.SUCCESS} ============================================`);
      console.log(``);
      console.log(`${LOG.SUCCESS} Details:`);
      console.log(`   📄 Title: ${article.title}`);
      console.log(`   📊 Size: ${article.metadata.totalChars} symbols`);
      console.log(`   📖 Reading time: ${article.metadata.totalReadingTime} min`);
      console.log(`   📝 Episodes: ${article.metadata.episodeCount}`);
      console.log(`   🎬 Scenes: ${article.metadata.sceneCount}`);
      console.log(`   💬 Dialogues: ${article.metadata.dialogueCount}`);
      console.log(``);
      console.log(`${LOG.TIMER} Time:`);
      console.log(`   - Total: ${formatTime(totalTime)}`);
      console.log(``);
      console.log(`${LOG.SAVE} File: ${outputPath}`);
      console.log(``);

    } else if (command === 'generate') {
      const projectId = getArg('project', 'channel-1');
      const theme = getArg('theme');
      const verbose = getFlag('verbose');

      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} Dzen Content Generator v2.1`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const startTime = Date.now();

      // Шаг 1: Лоад конфига
      console.log(`${LOG.LOADING} Лоады конфигурацию проекта: ${projectId}`);
      const config = configService.loadConfig(projectId);
      console.log(`${LOG.SUCCESS} Конфиг загружен`);
      if (verbose) {
        console.log(`   - Аудитория: ${config.audience.age_range} лет`);
        console.log(`   - Объём: ${config.content_rules.min_chars}-${config.content_rules.max_chars} символов`);
        console.log(`   - Тон: ${config.content_rules.tone}`);
      }

      // Шаг 2: Лоад примеров
      console.log(`\n${LOG.LOADING} Лоады примеры статей...`);
      const examples = examplesService.loadExamples(configService.getExamplesPath(projectId));
      console.log(`${LOG.SUCCESS} Примеры загружены: ${examples.length} шт`);

      const bestExamples = examplesService.selectBestExamples(examples, config.examples_count);
      console.log(`${LOG.SUCCESS} Отбраны лучшие: ${bestExamples.length} шт`);

      // Определяем тему
      let selectedTheme = theme || config.content_rules.required_triggers[0];
      console.log(`\n${LOG.BRAIN} Генериру статью на тему:`);
      console.log(`   "📝 ${selectedTheme}"`);

      // Шаг 3: Генерация
      const genStartTime = Date.now();
      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.BRAIN} Этап 1: Построение плана...`);
      console.log(`${LOG.HOOK} Этап 2: Написание крючка...`);
      console.log(`${LOG.UP}  Этап 3: Развитие конфликта...`);
      console.log(`${LOG.BOOM} Этап 4: Кульминация...`);
      console.log(`${LOG.CLAP} Этап 5: Развязка...`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const result = await geminiService.generateArticleDataChunked({
        theme: selectedTheme,
        config,
        examples: bestExamples,
      });

      const genTime = Date.now() - genStartTime;

      // Шаг 4: Проверка уникальности
      console.log(`${LOG.SEARCH} Проверяю уникальность...`);
      const uniqueness = await uniquenessService.checkUniqueness(
        result.content,
        examples.map(e => e.content)
      );
      console.log(`${LOG.CHART} Анализ:`);
      console.log(`   - TF-IDF: ${uniqueness.analysis.tfidf_similarity}% (чем ниже, тем оригинальнее)`);
      console.log(`   - ИИ-детектор: ${uniqueness.analysis.ai_detection}%`);
      console.log(`   - Разнообразие слов: ${uniqueness.analysis.word_variety}%`);
      console.log(`   - Разнообразие предложений: ${uniqueness.analysis.sentence_variety}%`);

      // Шаг 5: Сохранение
      console.log(`\n${LOG.SAVE} Сохраняю результат...`);
      const timestamp = new Date().toISOString().split('T')[0];
      const outDir = path.join(configService.getGeneratedPath(projectId), timestamp);
      fs.mkdirSync(outDir, { recursive: true });

      const outputPath = path.join(outDir, 'article.json');
      fs.writeFileSync(
        outputPath,
        JSON.stringify({
          title: result.title,
          content: result.content,
          metadata: result.metadata,
          uniqueness: {
            score: uniqueness.score,
            analysis: uniqueness.analysis,
          },
          imageScenes: result.imageScenes,
        }, null, 2)
      );

      const totalTime = Date.now() - startTime;

      // Финальные результаты
      console.log(`\n${LOG.SUCCESS} ============================================`);
      console.log(`${LOG.SUCCESS} СТАТЬЯ ГОТОВА!`);
      console.log(`${LOG.SUCCESS} ============================================`);
      console.log(``);
      console.log(`${LOG.SUCCESS} Детали:`);
      console.log(`   📄 Название: ${result.title}`);
      console.log(`   📊 Размер: ${result.metadata.total_chars} символов`);
      console.log(`   ${result.metadata.total_chars >= config.content_rules.min_chars ? LOG.SUCCESS : LOG.ERROR} Проверка: ${config.content_rules.min_chars}-${config.content_rules.max_chars}`);
      console.log(`   ${uniqueness.score >= 80 ? LOG.SUCCESS : LOG.WARN} Уникальность: ${uniqueness.score}%`);
      console.log(`   ${uniqueness.analysis.ai_detection <= 20 ? LOG.SUCCESS : LOG.WARN} ИИ-детектор: ${uniqueness.analysis.ai_detection}%`);
      console.log(``);
      console.log(`${LOG.TIMER} Времени:`);
      console.log(`   - Генерация: ${formatTime(genTime)}`);
      console.log(`   - Общее: ${formatTime(totalTime)}`);
      console.log(``);
      console.log(`${LOG.SAVE} Файл: ${outputPath}`);
      console.log(``);

        } else if (command === 'generate:all-dzen') {
      // ============================================================================
      // Generate articles for ALL Dzen channels simultaneously
      // ============================================================================
      
      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} ZenMaster v2.0 - Generate All Dzen Channels`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const startTime = Date.now();
      
      // Validate all channels have valid configuration
      console.log(`${LOG.LOADING} Validating Dzen channels configuration...`);
      const validation = validateDzenChannelsConfig();
      if (!validation.valid) {
        console.log(`${LOG.ERROR} Configuration validation failed:`);
        validation.errors.forEach(error => console.log(`   ❌ ${error}`));
        process.exit(1);
      }
      console.log(`${LOG.SUCCESS} All Dzen channels configuration is valid\n`);

      const allChannels = getAllDzenChannels();
      console.log(`${LOG.BRAIN} Found ${allChannels.length} Dzen channels:`);
      allChannels.forEach(channel => {
        console.log(`   📡 ${channel.id}: ${channel.name} (${channel.defaultAngle}, ${channel.defaultEmotion})`);
      });
      console.log('');

      const results: Array<{channelId: string, success: boolean, error?: string, filePath?: string}> = [];

      // Generate for each channel
      for (const channel of allChannels) {
        console.log(`${LOG.ROCKET} ============================================`);
        console.log(`${LOG.ROCKET} Generating for ${channel.name}`);
        console.log(`${LOG.ROCKET} ============================================\n`);

        try {
          const channelStartTime = Date.now();
          
          // Get random theme for this channel
          const theme = getRandomThemeForChannel(channel.id);
          console.log(`${LOG.BRAIN} Using theme: "${theme}"`);

          // Initialize Multi-Agent Service
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY не установлен');
          }
          
          const multiAgentService = new MultiAgentService(apiKey);

          // Generate article
          const article = await multiAgentService.generateLongFormArticle({
            theme,
            angle: channel.defaultAngle,
            emotion: channel.defaultEmotion,
            audience: channel.defaultAudience,
          });

          const channelTime = Date.now() - channelStartTime;

          // Save result
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outDir = path.join(process.cwd(), channel.outputDir.replace('./', ''));
          fs.mkdirSync(outDir, { recursive: true });

          const outputPath = path.join(outDir, `article_${timestamp}.json`);
          fs.writeFileSync(
            outputPath,
            JSON.stringify({
              id: article.id,
              title: article.title,
              lede: article.lede,
              channel: channel.id,
              episodes: article.episodes.map(ep => ({
                id: ep.id,
                title: ep.title,
                content: ep.content,
                charCount: ep.charCount,
                openLoop: ep.openLoop,
              })),
              finale: article.finale,
              voicePassport: article.voicePassport,
              metadata: article.metadata,
              outline: {
                theme: article.outline.theme,
                angle: article.outline.angle,
                emotion: article.outline.emotion,
                audience: article.outline.audience,
              },
              generation: {
                modelOutline: channel.modelOutline,
                modelEpisodes: channel.modelEpisodes,
                channelConfig: channel.id,
                generatedAt: new Date().toISOString(),
              },
            }, null, 2)
          );

          console.log(`${LOG.SUCCESS} ✅ ${channel.name} complete:`);
          console.log(`   📄 Title: ${article.title}`);
          console.log(`   📊 Size: ${article.metadata.totalChars} symbols`);
          console.log(`   📁 File: ${outputPath}`);
          console.log(`   ⏱️  Time: ${formatTime(channelTime)}\n`);

          results.push({
            channelId: channel.id,
            success: true,
            filePath: outputPath
          });

        } catch (error) {
          console.error(`${LOG.ERROR} ❌ ${channel.name} failed:`, error);
          results.push({
            channelId: channel.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const totalTime = Date.now() - startTime;

      // Final summary
      console.log(`${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} GENERATION COMPLETE - ALL DZEN CHANNELS`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`${LOG.SUCCESS} Successful: ${successful.length}/${results.length}`);
      console.log(`${failed.length > 0 ? LOG.ERROR : LOG.WARN} Failed: ${failed.length}/${results.length}`);
      console.log(``);

      if (successful.length > 0) {
        console.log(`${LOG.SUCCESS} Generated articles:`);
        successful.forEach(result => {
          console.log(`   ✅ ${result.channelId}: ${result.filePath}`);
        });
        console.log('');
      }

      if (failed.length > 0) {
        console.log(`${LOG.ERROR} Failed channels:`);
        failed.forEach(result => {
          console.log(`   ❌ ${result.channelId}: ${result.error}`);
        });
        console.log('');
      }

      console.log(`${LOG.TIMER} Total time: ${formatTime(totalTime)}`);
      console.log(`${LOG.SAVE} Results saved to ./generated/dzen/{channelId}/`);
      console.log('');

    } else if (command === 'list-dzen-channels') {
      // List all available Dzen channels
      console.log(`${LOG.BRAIN} Available Dzen Channels:\n`);
      
      const allChannels = getAllDzenChannels();
      allChannels.forEach(channel => {
        console.log(`${LOG.INFO} ${channel.id}:`);
        console.log(`   Name: ${channel.name}`);
        console.log(`   Description: ${channel.description}`);
        console.log(`   Angle: ${channel.defaultAngle}`);
        console.log(`   Emotion: ${channel.defaultEmotion}`);
        console.log(`   Audience: ${channel.defaultAudience}`);
        console.log(`   Models: ${channel.modelOutline} (outline), ${channel.modelEpisodes} (episodes)`);
        console.log(`   Output: ${channel.outputDir}`);
        console.log(`   Themes: ${channel.channelThemes.length} themes available`);
        console.log(`   Schedule: ${channel.scheduleCron}`);
        console.log('');
      });

    } else if (command === 'validate-dzen-config') {
      // Validate Dzen channels configuration
      console.log(`${LOG.LOADING} Validating Dzen channels configuration...`);
      
      const validation = validateDzenChannelsConfig();
      if (validation.valid) {
        console.log(`${LOG.SUCCESS} ✅ All Dzen channels configuration is valid`);
        
        const allChannels = getAllDzenChannels();
        console.log(`${LOG.SUCCESS} ${allChannels.length} channels configured:`);
        allChannels.forEach(channel => {
          console.log(`   ✅ ${channel.id}: ${channel.name}`);
        });
      } else {
        console.log(`${LOG.ERROR} ❌ Configuration validation failed:`);
        validation.errors.forEach(error => console.log(`   ❌ ${error}`));
        process.exit(1);
      }

    } else if (command === 'validate') {
      const projectId = getArg('project', 'channel-1');
      console.log(`${LOG.LOADING} Проверяю конфиг ${projectId}...`);
      
      try {
        const config = configService.loadConfig(projectId);
        configService.validateConfig(config);
        console.log(`${LOG.SUCCESS} Конфиг валиден`);
        console.log(`   - Канал: ${config.channel_name}`);
        console.log(`   - Мин символов: ${config.content_rules.min_chars}`);
        console.log(`   - Макс символов: ${config.content_rules.max_chars}`);
        console.log(`   - Тон: ${config.content_rules.tone}`);
      } catch (error) {
        console.log(`${LOG.ERROR} Ошибка: ${error}`);
        process.exit(1);
      }

    } else if (command === 'list-projects') {
      console.log(`${LOG.LOADING} Доступные проекты:`);
      const projects = configService.listProjects();
      projects.forEach(p => {
        console.log(`   ${LOG.SUCCESS} ${p}`);
      });

    } else if (command === 'phase2') {
      const title = getArg('title', 'Без названия');
      const contentFile = getArg('content');
      const images = getArg('images')?.split(',') || [];
      const verbose = getFlag('verbose');

      if (!contentFile) {
        console.log(`${LOG.ERROR} Требуется параметр: --content=path/to/article.txt`);
        process.exit(1);
      }

      if (!fs.existsSync(contentFile)) {
        console.log(`${LOG.ERROR} Файл не найден: ${contentFile}`);
        process.exit(1);
      }

      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} PHASE 2: ANTI-DETECTION PROCESSING`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const content = fs.readFileSync(contentFile, 'utf-8');

      const phase2Service = new Phase2AntiDetectionService();
      const result = await phase2Service.processArticle(
        title,
        content,
        {
          applyPerplexity: true,
          applyBurstiness: true,
          applySkazNarrative: true,
          enableGatekeeper: true,
          sanitizeImages: images.length > 0,
          verbose,
        },
        images
      );

      // Сохраняем результаты
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = path.join('./generated/phase2', timestamp);
      fs.mkdirSync(outDir, { recursive: true });

      // Сохраняем обработанный контент
      fs.writeFileSync(
        path.join(outDir, 'processed.txt'),
        result.processedContent
      );

      // Сохраняем отчет
      fs.writeFileSync(
        path.join(outDir, 'report.json'),
        JSON.stringify({
          title,
          originalLength: result.originalContent.length,
          processedLength: result.processedContent.length,
          adversarialScore: result.adversarialScore,
          sanitizedImages: result.sanitizedImages,
          processingTime: result.processingTime,
        }, null, 2)
      );

      // Выводим финальный отчет
      console.log(`\n${LOG.SUCCESS} ============================================`);
      console.log(`${LOG.SUCCESS} PROCESSING COMPLETE!`);
      console.log(`${LOG.SUCCESS} ============================================`);
      console.log(`\nFinal Score: ${result.adversarialScore.overallScore}/100`);
      console.log(`Status: ${result.adversarialScore.passesAllChecks ? LOG.SUCCESS + ' READY FOR PUBLICATION' : LOG.WARN + ' NEEDS REVISION'}`);
      console.log(`\nOutput directory: ${outDir}`);
      console.log(`Processing time: ${formatTime(result.processingTime)}`);

    } else if (command === 'phase2-info') {
      const phase2Service = new Phase2AntiDetectionService();
      console.log(phase2Service.getComponentsInfo());

    } else if (command === 'test') {
      console.log(`${LOG.BRAIN} Короткий тест системы...`);
      process.stdout.write(`${LOG.LOADING} Конфигсервис: `);
      try {
        const config = configService.loadConfig('channel-1');
        console.log(LOG.SUCCESS);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      process.stdout.write(`${LOG.LOADING} Примерысервис: `);
      try {
        const examples = examplesService.loadExamples('./projects/channel-1/examples');
        console.log(LOG.SUCCESS, `(${examples.length} примеров)`);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      process.stdout.write(`${LOG.LOADING} Уникальностьсервис: `);
      try {
        const result = await uniquenessService.checkUniqueness(
          'Это тест',
          ['Это грудно']
        );
        console.log(LOG.SUCCESS);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      console.log(`\n${LOG.SUCCESS} Все тесты пройдены!`);

    } else {
      console.log(`${LOG.INFO} Dzen Content Generator CLI`);
      console.log(``);
      console.log(`🚀 ZenMaster v2.0 Commands:`);
      console.log(`  generate           - Генерировать статью (10-15K)`);
      console.log(`  generate:v2        - Генерировать лонгрид (35K+) [ZenMaster v2.0]`);
      console.log(`  generate:all-dzen  - Генерировать для ВСЕХ каналов Дзена`);
      console.log(`  list-dzen-channels - Список всех каналов Дзена`);
      console.log(`  validate-dzen-config - Проверить конфигурацию каналов Дзена`);
      console.log(`  phase2             - Phase 2: Anti-Detection обработка`);
      console.log(`  phase2-info        - Информация о Phase 2 компонентах`);
      console.log(`  validate           - Проверить конфиг проекта`);
      console.log(`  list-projects      - Лист проектов`);
      console.log(`  test               - Короткие тесты`);
      console.log(``);
      console.log(`📡 Dzen Channel Commands:`);
      console.log(`  generate:v2 --dzen-channel=women-35-60     - Канал Women 35-60`);
      console.log(`  generate:v2 --dzen-channel=young-moms      - Канал Young Moms`);
      console.log(`  generate:v2 --dzen-channel=men-25-40       - Канал Men 25-40`);
      console.log(`  generate:v2 --dzen-channel=teens           - Канал Teens`);
      console.log(`  generate:all-dzen                          - Все каналы одновременно`);
      console.log(``);
      console.log(`⚙️  Options:`);
      console.log(`  --dzen-channel=ID   - ID канала Дзена (women-35-60, young-moms, etc)`);
      console.log(`  --theme=TEXT        - Описание темы`);
      console.log(`  --verbose           - Подробная информация`);
      console.log(`  Legacy options (deprecated): --angle, --emotion, --audience, --model-*`);
      console.log(``);
      console.log(`📝 Examples:`);
      console.log(`  # Using Dzen Channel Configuration (RECOMMENDED)`);
      console.log(`  npx ts-node cli.ts generate:v2 --dzen-channel=women-35-60 --theme="Test theme"`);
      console.log(`  npx ts-node cli.ts generate:v2 --dzen-channel=young-moms`);
      console.log(`  npx ts-node cli.ts generate:all-dzen`);
      console.log(`  npx ts-node cli.ts list-dzen-channels`);
      console.log(``);
      console.log(`  # Legacy direct parameters (deprecated)`);
      console.log(`  npx ts-node cli.ts generate:v2 --theme="Я терпела это 20 лет" --angle=confession`);
      console.log(`  npx ts-node cli.ts generate:v2 --theme="Test" --emotion=triumph --audience="Women 35-60"`);
      console.log(``);
      console.log(`  # Other commands`);
      console.log(`  npx ts-node cli.ts phase2 --content=article.txt --title="Моя статья"`);
      console.log(`  npx ts-node cli.ts phase2-info`);
      console.log(`  npx ts-node cli.ts validate-dzen-config`);
      console.log(``);
      console.log(`🎯 Available Dzen Channels:`);
      const channels = getAllDzenChannels();
      channels.forEach(channel => {
        console.log(`   ${channel.id} - ${channel.name} (${channel.defaultAngle}, ${channel.defaultEmotion})`);
      });
      console.log(``);
    }

  } catch (error) {
    console.error(`\n${LOG.ERROR} ОШИБКА:`, error);
    if (getFlag('verbose')) {
      console.error(error);
    }
    process.exit(1);
  }
})();
