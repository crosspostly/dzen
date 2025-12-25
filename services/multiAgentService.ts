import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { FinalArticleCleanupGate } from "./finalArticleCleanupGate";
import { ArticlePublishGate } from "./articlePublishGate";

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;
  private phase2Service: Phase2AntiDetectionService;
  private maxChars: number;
  private episodeCount: number = 12;

  constructor(apiKey?: string, maxChars?: number) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.maxChars = maxChars || CHAR_BUDGET; // Use central budget as default
    this.phase2Service = new Phase2AntiDetectionService();
    
    // Calculate dynamic episode count
    this.episodeCount = this.calculateOptimalEpisodeCount(this.maxChars);
    console.log(`📊 Dynamic episode allocation: ${this.episodeCount} episodes for ${this.maxChars} chars`);
    
    this.initializeAgents(this.episodeCount);
  }

  /**
   * Calculate optimal episode count based on character budget
   * 
   * Budget allocation:
   * - Lede: 750 chars (600-900)
   * - Finale: 1500 chars (1200-1800) 
   * - Episodes: remaining chars / 3200 (avg episode length)
   * 
   * Constraints:
   * - Minimum: 6 episodes (18K chars for episodes alone)
   * - Maximum: 15 episodes (48K chars for episodes alone)
   */
  private calculateOptimalEpisodeCount(maxChars: number): number {
    const LEDE_CHARS = (BUDGET_ALLOCATIONS.LEDE_BUDGET_MIN + BUDGET_ALLOCATIONS.LEDE_BUDGET_MAX) / 2; // 750 average
    const FINALE_CHARS = (BUDGET_ALLOCATIONS.FINALE_BUDGET_MIN + BUDGET_ALLOCATIONS.FINALE_BUDGET_MAX) / 2; // 1500 average
    const AVG_EPISODE_CHARS = BUDGET_ALLOCATIONS.AVG_EPISODE_CHARS_BASE; // 3200 base
    const MIN_EPISODES = BUDGET_ALLOCATIONS.MIN_EPISODES; // 6
    const MAX_EPISODES = BUDGET_ALLOCATIONS.MAX_EPISODES; // 15

    const remainingChars = maxChars - LEDE_CHARS - FINALE_CHARS;
    const optimalCount = Math.floor(remainingChars / AVG_EPISODE_CHARS);
    const episodes = Math.max(MIN_EPISODES, Math.min(MAX_EPISODES, optimalCount));

    console.log(`\n📊 Character Budget Analysis:`);
    console.log(`   Total: ${maxChars} chars`);
    console.log(`   Lede: ${LEDE_CHARS} chars`);
    console.log(`   Finale: ${FINALE_CHARS} chars`);
    console.log(`   Remaining for episodes: ${remainingChars} chars`);
    console.log(`   Optimal episodes: ${episodes} (avg ${Math.round(remainingChars / episodes)} chars each)\n`);

    return episodes;
  }

  /**
   * Main entry point: Generate full longform article with dynamic episodes
   */
  async generateLongFormArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
    maxChars?: number;
    includeImages?: boolean;
    applyPhase2AntiDetection?: boolean;
  }): Promise<LongFormArticle> {
    const maxChars = params.maxChars || this.maxChars;
    const episodeCount = this.calculateOptimalEpisodeCount(maxChars);

    console.log("\n🎬 [ZenMaster v2.0] Starting dynamic longform generation...");
    console.log(`📏 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    console.log(`🎬 Episodes: ${episodeCount} (dynamic based on ${maxChars} chars)\n`);
    
    // Stage 0: Outline Engineering (dynamic episode count)
    console.log(`📋 Stage 0: Building outline (${episodeCount} episodes) + plotBible...`);
    const outline = await this.generateOutline(params, episodeCount);
    
    // Extract and validate plotBible from outline
    const plotBible = this.extractPlotBible(outline, params);
    console.log("✅ PlotBible ready");
    console.log(`   - Narrator: ${plotBible.narrator.age} y/o ${plotBible.narrator.gender}`);
    console.log(`   - Tone: ${plotBible.narrator.tone}`);
    console.log(`   - Sensory palette: ${plotBible.sensoryPalette.details.slice(0, 3).join(', ')}...`);
    
    // Stage 1: Sequential Episode Generation (with Phase 2 per-episode)
    console.log(`🔄 Stage 1: Generating ${episodeCount} episodes sequentially (Phase 2 per-episode)...`);
    const episodes = await this.generateEpisodesSequentially(outline);
    
    // 📊 Phase 2 Summary for all episodes
    this.printPhase2Summary(episodes);
    
    // Generate Development, Climax & Resolution (NEW - v5.4)
    console.log("🎯 Generating development, climax & resolution...");
    const development = await this.generateDevelopment(outline, episodes);
    const climax = await this.generateClimax(outline, development, episodes);
    const resolution = await this.generateResolution(outline, climax);
    
    // Generate Lede & Finale
    console.log("🎯 Generating lede (600-900) and finale (1200-1800)...");
    const lede = await this.generateLede(outline);
    const finale = await this.generateFinale(outline, episodes);
    
    // Generate Voice Passport
    console.log("🎬 Generating voice passport (7 author habits)...");
    const voicePassport = await this.generateVoicePassport(params.audience);
    
    // Generate Title
    console.log("🗰 Generating title (55-90 chars)...");
    const title = await this.generateTitle(outline, lede);
    console.log(`✅ Title (Russian): "${title}"`);
    
    // Assemble full content (including new development, climax, resolution)
    let fullContent = [
      lede,
      development,
      ...episodes.map(ep => ep.content),
      climax,
      resolution,
      finale
    ].join('\n\n');
    
    // 🧹 УРОВЕНЬ 2: FINAL ARTICLE CLEANUP GATE (v6.0)
    console.log('\n🧹 [Уровень 2] Final Article Cleanup Gate...');
    const cleanupGate = new FinalArticleCleanupGate();
    const cleanupResult = await cleanupGate.cleanupAndValidate(fullContent);
    
    if (cleanupResult.appliedCleanup) {
      console.log('   ✅ Cleanup applied, quality improved');
      fullContent = cleanupResult.cleanText;
    } else {
      console.log('   ✅ No cleanup needed');
    }
    
    // 🚪 УРОВЕНЬ 3: ARTICLE PUBLISH GATE (v6.0)
    console.log('\n🚪 [Уровень 3] Article Publish Gate...');
    const publishValidation = ArticlePublishGate.validateBeforePublish(fullContent);
    
    if (!publishValidation.canPublish) {
      console.error('   ❌ Article failed publish gate validation');
      throw new Error(`Quality check failed: ${publishValidation.errors.join(', ')}`);
    }
    
    console.log('   ✅ Article passed publish gate validation');
    
    // Create initial article object
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      development,
      climax,
      resolution,
      finale,
      voicePassport,
      coverImage: undefined,
      metadata: {
        totalChars: lede.length + development.length + climax.length + resolution.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale), // TODO: include development, climax, resolution
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale), // TODO: include new parts
        dialogueCount: this.countDialogues(lede, episodes, finale), // TODO: include new parts
      },
      processedContent: fullContent,
      adversarialScore: undefined,
      phase2Applied: false
    };

    // 🆕 Phase 2 is now applied PER-EPISODE in episodeGeneratorService
    // Mark as applied if any episodes have Phase 2 metrics
    article.phase2Applied = episodes.some(ep => ep.phase2Metrics !== undefined);
    
    // Calculate article-level adversarial score from episode metrics
    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length > 0) {
      const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
      article.adversarialScore = {
        perplexity: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.perplexity, 0) / episodesWithMetrics.length,
        burstiness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.variance, 0) / episodesWithMetrics.length,
        skazRussianness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.colloquialism, 0) / episodesWithMetrics.length,
        contentLength: article.metadata.totalChars,
        noClichés: 100, // Placeholder
        overallScore: avgScore,
        passesAllChecks: avgScore >= 70,
        issues: avgScore < 70 ? ['Overall score below threshold'] : []
      };
    }

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Metrics:`);
    console.log(`   - Episodes: ${article.metadata.episodeCount}`);
    console.log(`   - Characters: ${article.metadata.totalChars} (target: ${maxChars})`);
    console.log(`   - Utilization: ${((article.metadata.totalChars / maxChars) * 100).toFixed(1)}%`);
    console.log(`   - Reading time: ${article.metadata.totalReadingTime} min`);
    console.log(`   - Scenes: ${article.metadata.sceneCount}`);
    console.log(`   - Dialogues: ${article.metadata.dialogueCount}`);
    console.log(`   - Phase 2 Score: ${article.adversarialScore?.overallScore || 0}/100`);
    console.log(`   - Anti-Detection: ${article.phase2Applied ? '✅ Applied' : '❌ Not applied'}`);
    console.log(`   - Cover image: Pending (will be generated in orchestrator)`);
    console.log(``);
    
    return article;
  }

  /**
   * 🎯 TASK 1: generateDevelopment() с Anti-Detection (v5.4)
   * Средняя часть истории с PlotBible и правилами анти-детекции
   */
  async generateDevelopment(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const lastEpisode = episodes[episodes.length - 1];
    const previousContext = lastEpisode ? lastEpisode.content.substring(0, 150) : 'Начало истории';
    
    let voiceGuide = '';
    if (plotBible?.narrator?.voiceHabits) {
      const h = plotBible.narrator.voiceHabits;
      voiceGuide = `
🎭 NARRATOR VOICE:
   Age: ${plotBible.narrator.age} ${plotBible.narrator.gender}
   Tone: ${plotBible.narrator.tone}
   Memory: "${h.memoryTrigger}"
   Doubt: "${h.doubtPattern}"
   Anger: "${h.angerPattern}"`;
    }
    
    const sensoryGuide = plotBible?.sensoryPalette ? `
🎨 SENSORY PALETTE:
   Visuals: ${plotBible.sensoryPalette.details?.slice(0, 3).join(', ')}
   Sounds: ${plotBible.sensoryPalette.sounds?.slice(0, 2).join(', ')}
   Smells: ${plotBible.sensoryPalette.smells?.slice(0, 2).join(', ')}` : '';

    const antiDetection = `
⚠️ ANTI-DETECTION MANDATORY:
✅ SENTENCE VARIETY: Short. Medium medium sentence. Long complex structure. Short.
✅ INCOMPLETE SENTENCES: "Я началась говорить, но..." (3-4 times)
✅ INTERJECTIONS: "Боже, как я была слепа." (2 times)
✅ EMOTIONS AS ACTIONS: ✅ "Руки тряслись." NOT ❌ "I was scared."
✅ DIALOGUE WITH SUBTEXT: Show subtext, don't explain
✅ SENSORY GROUNDING: ✅ "Холодная плитка. Запах кофе." NOT ❌ "We talked."
✅ NO PLATFORM MENTIONS: Stay timeless, Russian, literary
✅ START WITH ACTION/DIALOGUE: NOT description`;

    const prompt = `📄 CONTEXT: Development episode (1500-2000 chars) - middle of story

${voiceGuide}
${sensoryGuide}
${antiDetection}

🎯 TASK: Write DEVELOPMENT
Hook from previous: "${previousContext}"
Theme: "${outline.theme}"

REQUIREMENTS:
- Continue from previous episode
- Build tension toward climax
- Narrator's specific voice patterns
- Sensory details from palette
- Varied sentence length
- Include 2-3 incomplete sentences
- Include 2 interjections
- End with moment leading to climax

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.92
    });
  }

  /**
   * 🎯 TASK 2: generateClimax() с Триггерами (v5.4)
   * Кульминация с короткими предложениями и сенсорной перегрузкой
   */
  async generateClimax(outline: OutlineStructure, development: string, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = development.substring(0, 150);

    const antiDetection = `
⚠️ CLIMAX ANTI-DETECTION:
✅ SHORT PUNCHY SENTENCES: "Она открыла рот. Ничего. Я вспомнила."
✅ SENSORY OVERLOAD: "Комната вращалась. Звон в ушах. Не понимала."
✅ DIALOGUE OVERLAP: "— Ты... — Нет! Ты не знаешь!"
✅ INTERNAL + ACTION MIX: "Я должна уйти. Уйти сейчас. Ноги не двигались."
✅ TIME COMPRESSION: "Минута. Две. Целая вечность."
✅ THE TURNING POINT: Moment of no return`;

    const prompt = `📄 CONTEXT: CLIMAX (1200-1600 chars) - turning point

${antiDetection}

Central Question: "${plotBible?.thematicCore?.centralQuestion || 'What changed everything?'}"

🎯 TASK: Write CLIMAX
Previous: "${previousContext}"

REQUIREMENTS:
- Build from development
- One core revelation/confrontation
- Maximum emotional intensity
- Physical/sensory breakdown
- Fast-paced sentences (many short)
- Dialogue that breaks/interrupts
- Moment narrator realizes something permanent
- End at turning point (not resolution)

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.88
    });
  }

  /**
   * 🎯 TASK 3: generateResolution() - НОВАЯ ФУНКЦИЯ (v5.4)
   * Развязка с интроспективным тоном и честной путаницей
   */
  async generateResolution(outline: OutlineStructure, climax: string): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = climax.substring(0, 150);

    const antiDetection = `
⚠️ RESOLUTION ANTI-DETECTION:
✅ SLOWER PACE: "Я сидела. Просто сидела. Время странно..."
✅ SELF-REFLECTION: "Я была...? Какая я была?"
✅ HONEST CONFUSION: "Облегчение? Ужас? Пусто? Может быть, всё."
✅ NO MORALIZING: Realization without lesson
✅ QUESTIONS NOT ANSWERED: "Почему я молчала? Боялась. Любила?"
✅ WHAT CHANGED FOREVER: "Я больше не верила в добро."`;

    const prompt = `📄 CONTEXT: RESOLUTION (1000-1300 chars) - aftermath of climax

${antiDetection}

Central Question: "${plotBible?.thematicCore?.centralQuestion || 'What changed everything?'}"

🎯 TASK: Write RESOLUTION (realization moment)

REQUIREMENTS:
- After climax rush, slower pace
- Narrator processing what happened
- Honest confusion, not neat answers
- Physical return to normal
- What changed permanently
- Deep questions asked but not answered
- Acceptance of complexity
- NO happy ending, NO neat closure

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.85
    });
  }

  /**
   * 📊 Print Phase 2 Summary for all episodes
   */
  private printPhase2Summary(episodes: Episode[]): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL ADVERSARIAL METRICS`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Calculate average scores
    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length === 0) {
      console.log('   No Phase 2 metrics available (Phase 2 not applied)\n');
      return;
    }
    
    const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
    const avgPerplexity = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.perplexity, 0) / episodesWithMetrics.length;
    const avgVariance = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.variance, 0) / episodesWithMetrics.length;
    const avgColloquialism = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.colloquialism, 0) / episodesWithMetrics.length;
    const avgAuthenticity = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.authenticity, 0) / episodesWithMetrics.length;
    const avgFragmentary = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.fragmentary, 0) / episodesWithMetrics.length;
    const avgRepetition = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.repetition, 0) / episodesWithMetrics.length;
    
    console.log(`   Article Avg Score: ${avgScore.toFixed(0)}/100`);
    console.log(``);
    console.log(`   Component Breakdown (6 metrics):`);
    console.log(`   - Perplexity:        ${avgPerplexity.toFixed(0)}/100 ${avgPerplexity >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Sentence Variance: ${avgVariance.toFixed(0)}/100 ${avgVariance >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Colloquialism:     ${avgColloquialism.toFixed(0)}/100 ${avgColloquialism >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Authenticity:      ${avgAuthenticity.toFixed(0)}/100 ${avgAuthenticity >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Fragmentary:       ${avgFragmentary.toFixed(0)}/100 ${avgFragmentary >= 50 ? '✓' : '⚠️'}`);
    console.log(`   - Repetition:        ${avgRepetition.toFixed(0)}/100 ${avgRepetition >= 50 ? '✓' : '⚠️'}`);
    console.log(``);
    
    // Identify strengths and weaknesses (6 metrics)
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (avgPerplexity >= 80) strengths.push('perplexity');
    else if (avgPerplexity < 70) weaknesses.push('perplexity');
    
    if (avgVariance >= 80) strengths.push('sentence_variance');
    else if (avgVariance < 70) weaknesses.push('sentence_variance');
    
    if (avgColloquialism >= 80) strengths.push('colloquialism');
    else if (avgColloquialism < 70) weaknesses.push('colloquialism');
    
    if (avgAuthenticity >= 80) strengths.push('emotional_authenticity');
    else if (avgAuthenticity < 70) weaknesses.push('emotional_authenticity');
    
    if (avgFragmentary >= 70) strengths.push('fragmentary');
    else if (avgFragmentary < 50) weaknesses.push('fragmentary');
    
    if (avgRepetition >= 70) strengths.push('repetition');
    else if (avgRepetition < 50) weaknesses.push('repetition');
    
    console.log(`   Strengths: ${strengths.length > 0 ? strengths.join(', ') : 'None significant'}`);
    console.log(`   Weaknesses: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'None'}`);
    console.log(``);
    
    // Recommendation
    const recommendation = avgScore >= 70 ? 'PASS' : 'NEEDS_IMPROVEMENT';
    const status = avgScore >= 70 ? '✅' : '⚠️';
    console.log(`   Recommendation: ${status} Article ${recommendation} (${avgScore >= 70 ? '>70' : '<70'}, ready for publication: ${avgScore >= 70 ? 'YES' : 'NO'})`);
    console.log(``);
  }

  /**
   * 🎭 EXTRACT & VALIDATE plotBible from outline
   */
  public extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    // Check if ALL required fields exist in plotBible
    if (outline.plotBible && 
        outline.plotBible.narrator && 
        outline.plotBible.narrator.age &&
        outline.plotBible.narrator.gender &&
        outline.plotBible.narrator.tone &&
        outline.plotBible.sensoryPalette && 
        outline.plotBible.sensoryPalette.details &&
        outline.plotBible.sensoryPalette.details.length > 0 &&
        outline.plotBible.thematicCore &&
        outline.plotBible.thematicCore.centralQuestion) {
      console.log("✅ Using plotBible from Gemini generation");
      return outline.plotBible;
    }

    console.warn("⚠️  plotBible incomplete from Gemini, using fallback");
    
    const ageMatch = params.audience.match(/(\d+)-(\d+)/);
    const age = ageMatch ? Math.round((parseInt(ageMatch[1]) + parseInt(ageMatch[2])) / 2) : 45;
    const gender = params.audience.toLowerCase().includes('woman') || params.audience.toLowerCase().includes('women') ? 'female' : 'male';

    return {
      narrator: outline.plotBible?.narrator || {
        age,
        gender: gender as "male" | "female",
        tone: "confessional",
        voiceHabits: {
          apologyPattern: "I know it sounds strange, but...",
          doubtPattern: "But then I realized...",
          memoryTrigger: "I remember when...",
          angerPattern: "And inside me clicked something",
        },
      },
      sensoryPalette: outline.plotBible?.sensoryPalette || {
        details: ["domestic", "intimate", "complex"],
        smells: ["coffee", "old books", "home"],
        sounds: ["silence", "breathing", "clock"],
        textures: ["soft", "worn", "familiar"],
        lightSources: ["window", "lamp", "dawn"],
      },
      characterMap: outline.characterMap || {
        Narrator: {
          role: "protagonist",
          arc: "internal realization",
        },
      },
      thematicCore: outline.plotBible?.thematicCore || {
        centralQuestion: outline.externalTensionArc || "What if I had chosen differently?",
        emotionalArc: params.emotion,
        resolutionStyle: "bittersweet, uncertain",
      },
    };
  }

  /**
   * ROBUST: Parse JSON with minimal assumptions
   */
  private parseJsonSafely(jsonString: string, context: string = 'JSON'): any {
    let cleaned = jsonString
      .replace(/^```(?:json)?\s*\n?/g, '')
      .replace(/\n?```\s*$/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      let fixed = cleaned;
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(fixed);
      } catch (e2) {
        try {
          const objMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objMatch) {
            let obj = objMatch[0];
            obj = obj.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(obj);
          }
        } catch (e3) {
          // Nothing worked
        }

        console.error(`\n❌ CRITICAL: Failed to parse ${context}`);
        console.error(`Response length: ${jsonString.length}`);
        console.error(`First 300 chars: ${jsonString.substring(0, 300)}`);
        console.error(`Last 300 chars: ${jsonString.substring(Math.max(0, jsonString.length - 300))}`);
        console.error(`Last error: ${(e2 as Error).message}\n`);
        
        throw new Error(`Failed to parse ${context}: ${(e2 as Error).message}`);
      }
    }
  }

  /**
   * 🔧 v4.5 FIX: Generate outline structure with MANDATORY plotBible
   * Make all fields required in prompt to force Gemini to generate them
   */
  public async generateOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }, episodeCount: number): Promise<OutlineStructure> {
    const episodeList = Array.from({ length: episodeCount }, (_, i) => ({
      id: i + 1,
      title: `Часть ${i + 1}: ...`,
    }));

    const episodeJson = episodeList.map(ep => `
    {
      "id": ${ep.id},
      "title": "Часть ${ep.id}: ...",
      "hookQuestion": "...",
      "externalConflict": "...",
      "internalConflict": "...",
      "keyTurning": "...",
      "openLoop": "..."
    }`).join(',');

    const prompt = `🎭 STORY ARCHITECT - GENERATE COMPLETE OUTLINE WITH PLOTBIBLE

TASK: Create ${episodeCount}-episode narrative structure (29K chars total).
MUSTGENERATE: EVERY field must be filled.

INPUT:
- Theme: "${params.theme}"
- Angle: ${params.angle}
- Emotion: ${params.emotion}
- Audience: ${params.audience}

🔧 CRITICAL REQUIREMENT:
Gemini, you MUST generate COMPLETE plotBible with:
1. narrator (age, gender, tone, voiceHabits with ALL 4 patterns)
2. sensoryPalette (details [5+ items], smells [3+], sounds [3+], textures [3+], lightSources [3+])
3. characterMap (Narrator + 2-3 other characters)
4. thematicCore (centralQuestion, emotionalArc, resolutionStyle)

❌ DO NOT skip or leave empty fields!
❌ ALL text in RUSSIAN ONLY
❌ Each field must be specific to this theme

RESPOND WITH ONLY VALID JSON (no extra text, no markdown):
\`\`\`json
{
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "audience": "${params.audience}",
  
  "narrator": {
    "age": [NUMBER 25-70],
    "gender": "female" or "male",
    "tone": "[confessional/bitter/ironic/desperate]",
    "voiceHabits": {
      "apologyPattern": "[specific Russian phrase]",
      "doubtPattern": "[specific Russian phrase]",
      "memoryTrigger": "[specific Russian phrase]",
      "angerPattern": "[specific Russian phrase]"
    }
  },
  
  "sensoryPalette": {
    "details": ["detail1", "detail2", "detail3", "detail4", "detail5"],
    "smells": ["smell1", "smell2", "smell3"],
    "sounds": ["sound1", "sound2", "sound3"],
    "textures": ["texture1", "texture2", "texture3"],
    "lightSources": ["light1", "light2", "light3"]
  },
  
  "characterMap": {
    "Narrator": {
      "role": "protagonist",
      "arc": "[internal journey]"
    },
    "[Character2]": {
      "role": "[catalyst/antagonist/witness]",
      "arc": "[their arc]"
    },
    "[Character3]": {
      "role": "[role]",
      "arc": "[arc]"
    }
  },
  
  "thematicCore": {
    "centralQuestion": "[The core emotional question]",
    "emotionalArc": "${params.emotion}",
    "resolutionStyle": "[bittersweet/uncertain/realistic/cathartic]"
  },
  
  "episodes": [${episodeJson}
  ],
  
  "externalTensionArc": "[What actually happens in the story]",
  "internalEmotionArc": "[What shifts internally for narrator]",
  "forbiddenCliches": ["[avoid these", "cheap tropes", "predictable endings"]
}
\`\`\``;

    const response = await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.85,
    });

    return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
  }

  /**
   * Stage 1: Sequential episode generation
   * 
   * 🆕 v5.3 (Issue #78): Now passes plotBible to episode generator
   */
  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY,
      this.maxChars // ✅ PASS the budget so episodeGenerator knows the same budget
    );

    return await episodeGenerator.generateEpisodesSequentially(
      outline.episodes,
      {
        delayBetweenRequests: 1500,
        onProgress: (current, total) => {
          console.log(`   ✅ Episode ${current}/${total} complete`);
        },
        plotBible: outline.plotBible  // 🆕 v5.3: Pass plotBible for context-aware generation
      }
    );
  }

  /**
   * ✅ v4.5: Generate opening (lede): 600-900 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform details in instructions only
   * 
   * 🆕 v5.4: PlotBible integration - narrator voice & anti-detection
   */
  async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    const plotBible = outline.plotBible;
    
    // Build narrator voice section
    let voiceGuide = '';
    if (plotBible?.narrator?.voiceHabits) {
      const habits = plotBible.narrator.voiceHabits;
      voiceGuide = `
🎭 NARRATOR'S VOICE PATTERNS (USE THESE NATURALLY):
   Age: ${plotBible.narrator.age || '40-50'} y/o ${plotBible.narrator.gender || 'woman'}
   Tone: ${plotBible.narrator.tone || 'confessional, intimate'}
   - When remembering: "${habits.memoryTrigger || 'Я помню...'}"
   - When doubting: "${habits.doubtPattern || 'Может быть, я ошибалась...'}"
   - When apologizing/justifying: "${habits.apologyPattern || 'Я же не знала...'}"
   
⚠️  USE THESE PATTERNS in the opening - это УНИКАЛЬНЫЙ голос!`;
    }
    
    // Build sensory palette hints
    let sensoryHints = '';
    if (plotBible?.sensoryPalette) {
      const palette = plotBible.sensoryPalette;
      sensoryHints = `
🎨 SENSORY PALETTE (USE SPECIFIC DETAILS):
   - Visual: ${palette.details?.slice(0, 3).join(', ') || 'specific visual details'}
   - Sounds: ${palette.sounds?.slice(0, 2).join(', ') || 'ambient sounds'}
   - Smells: ${palette.smells?.slice(0, 2).join(', ') || 'distinctive smells'}
   
⚠️  Not generic "room", but THIS room with THESE details!`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is opening for serialized story on media platform (600-900 chars).
Tone: Like neighbor confiding in friend at kitchen table.
Goal: Hook reader immediately - they will scroll down if gripped.

⚠️  CRITICAL: Story character does NOT know about platform/audience.
No meta-commentary like "I decided to share this" or "people will judge me".
Just raw confession as if talking to trusted friend.

${voiceGuide}

${sensoryHints}

⚠️  ANTI-DETECTION MANDATORY (Build-in human patterns):

✅ SENTENCE VARIETY:
   Mix: 3-word → 15-word → 8-word sentences
   Pattern: Short. Medium medium sentence. Short again.
   
✅ INCOMPLETE SENTENCES (natural thought):
   "Не знаю. Молчала. Просто не могла."
   "Это было..." [instead of completing]
   
✅ INTERJECTIONS (natural speech):
   "Боже, как я была слепа."
   "Блин, даже сейчас не верю."
   
✅ EMOTIONS AS ACTIONS (NOT descriptions):
   ❌ "I was terrified" 
   ✅ "Руки тряслись. Дыхание перехватило."
   
✅ START WITH ACTION/DIALOGUE/QUESTION:
   ✅ "— Ты помнишь тот день?" [dialogue]
   ✅ "Я помню точно." [action]
   ✅ "Почему я молчала?" [question]
   ❌ "Эта история началась..." [description - BAD]

❌ FORBIDDEN (profanity & vulgarity ABSOLUTELY PROHIBITED):
   ❌ NO profanity, vulgarisms, or obscene language of ANY kind
   ❌ NO street slang or crude expressions
   ❌ This is INTELLIGENT writing for educated audience
   
   ✅ USE LITERARY, ELEGANT RUSSIAN:
      - Express emotions through actions: "Я затаила злость. Дыхание сбилось."
      - Use refined vocabulary: "ужасный", "отвратительный", "восхитительный"
      - Choose cultured interjections: "Боже мой", "Господи", "Чёрт побери"
      - Maintain dignified, confessional tone (like letter to trusted friend)
      
   ✅ EXAMPLES OF PROPER STYLE:
      ❌ "...блять..." (vulgar, street language)
      ✅ "...чёрт побери, как я была слепа..." (cultured, literary)
      
      ❌ "...пиздец какой-то..." (crude, unacceptable)
      ✅ "...это была катастрофа..." (intelligent, descriptive)
      
      ❌ "...ахуенно выглядела..." (vulgar slang)
      ✅ "...выглядела потрясающе..." (refined expression)
      
      ❌ "...блядский дождь..." (profanity)
      ✅ "...проклятый дождь..." (literary equivalent)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 КРИТИЧЕСКИЕ ЗАПРЕТЫ (v6.0 - ANTI-ARTIFACT RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  БЕЗ метаданных: [note], [comment], [...] → УДАЛИ!
⚠️  БЕЗ markdown: **, ##, ___ → УДАЛИ!
⚠️  БЕЗ повторяющихся фраз > 1-2 раз:
   ❌ "— вот в чём дело", "— одним словом", "— может быть, не совсем точно, но"
   ✅ Варьируй речевые обороты!
⚠️  БЕЗ orphaned фрагментов в начале: "ну и", "да вот", "вот только"
⚠️  БЕЗ разорванных предложений: "хотя...", "потому что..." в начале
⚠️  Диалоги ПОЛНЫЕ и правильно отформатированные

🎯 TASK: Write LEDE (opening) - 600-900 RUSSIAN characters:

Hook: "${firstEpisode.hookQuestion}"
Theme: "${outline.theme}"
Emotion: ${outline.emotion}

REQUIREMENTS:
- Start with PARADOX, ACTION, DIALOGUE, or QUESTION (not explanation)
- Pull reader in immediately (first sentence = hook)
- Use narrator's voice patterns naturally
- Use specific sensory details from palette
- Vary sentence length (3-word, 12-word, 6-word mix)
- Include 1-2 incomplete sentences (feels human)
- End with intrigue that makes reader scroll
- NO "I decided to post this" or "I'm sharing because"
- Just: raw memory being recalled

⚠️  ПЕРЕД ОТВЕТОМ - ФИНАЛЬНАЯ ПРОВЕРКА:
Перечитай текст и убедись что НЕТ:
☐ метаданных [...], ☐ markdown (**, ##), ☐ повторяющихся фраз > 2 раз
☐ orphaned фрагментов в начале, ☐ разорванных предложений
Если что-то найдёшь - ПЕРЕДЕЛАЙ СЕЙЧАС!

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.95, // Increased for more variety
    });
  }

  /**
   * ✅ v4.5: Generate closing (finale): 1200-1800 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform goals in instructions only
   * 
   * 🆕 v5.4: PlotBible integration - thematic core & narrator insight
   */
  async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    
    // Build thematic guidance
    let thematicGuide = '';
    if (plotBible?.thematicCore) {
      const core = plotBible.thematicCore;
      thematicGuide = `
🎯 THEMATIC CORE (WHAT THIS STORY IS REALLY ABOUT):
   Central Question: ${core.centralQuestion || 'What if everything I believed was wrong?'}
   Emotional Arc: ${core.emotionalArc || 'confusion → realization → acceptance'}
   Resolution Style: ${core.resolutionStyle || 'bittersweet, realistic'}
   
⚠️  The finale must ANSWER the central question (not with solution, but with INSIGHT).`;
    }
    
    // Build narrator voice for ending
    let narratorInsight = '';
    if (plotBible?.narrator) {
      narratorInsight = `
🎭 NARRATOR'S VOICE FOR ENDING:
   Age: ${plotBible.narrator.age || '40-50'} y/o ${plotBible.narrator.gender || 'woman'}
   Tone: ${plotBible.narrator.tone || 'confessional, weary, wiser'}
   
⚠️  This is the narrator AFTER the journey - changed, wiser, but still uncertain.`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is finale for serialized story (1200-1800 chars).
Goal: Reader should finish with complex emotions (not clear happy ending).
Strategy: End with question to readers (encourages comments).

⚠️  CRITICAL: Character doesn't know this will be published or discussed.
No meta-commentary. Just the ending of their memory/story.

${thematicGuide}

${narratorInsight}

⚠️  ANTI-DETECTION FINALE RULES:

NOT A "HAPPY ENDING" - THIS IS REAL LIFE:

✅ RESOLUTION TYPES (choose one):
   1. BITTERSWEET: Something gained, something lost forever
      "Я получила ответы. Но покой так и не пришёл."
      
   2. UNCERTAIN: Life continues, questions remain
      "Прошли годы. Я до сих пор не знаю, правильно ли я поступила."
      
   3. REALISTIC JUSTICE: Fair, but not satisfying
      "Она получила что заслужила. Мне от этого не легче."
      
   4. INSIGHT WITHOUT SOLUTION: Understanding, not resolution
      "Я поняла одно: справедливости не существует. Только выбор."

✅ STRUCTURE:
   1. Show life AFTER the climax (specific scene, not summary)
   2. ONE concrete detail showing what changed
   3. Narrator's REALIZATION/INSIGHT (what they learned)
   4. End with QUESTION (to self or reader)

✅ EXAMPLES OF STRONG FINALES:

   "Прошло три года. Вчера я снова увидела её дочь. Она спросила 
    те же вопросы, что задавала её мать. И тогда я поняла: это не 
    закончится никогда. Молчание передаётся по наследству.
    
    Я не получила извинений. Но я получила это: я перестала ждать.
    
    А вы смогли бы простить без извинений?"

   "Они развелись через полгода. Она вернулась в родной город.
    Я больше никогда её не видела. Справедливость? Да.
    Удовлетворение? Нет.
    
    Раньше я верила, что правда всё исцеляет. Теперь я знаю:
    правда просто есть. Исцеление — это отдельно.
    
    А вы верите в справедливость?"

✅ SENTENCE VARIETY (anti-detection):
   - Mix: Short. Medium sentence with clause. Very short.
   - Incomplete sentences: "Не знаю. Может быть."
   - Natural repetition: "Я помню. Помню точно. Помню этот день."

✅ EMOTIONS AS ACTIONS:
   ❌ "Я почувствовала облегчение"
   ✅ "Плечи опустились. Дыхание стало ровным."

❌ FORBIDDEN (cheap endings):
   ❌ "И мы зажили счастливо" (fairy tale)
   ❌ "Время лечит" (cliché)
   ❌ "Жизнь продолжается" (generic)
   ❌ "Я простила и забыла" (unrealistic)
   ❌ "Теперь я знаю, что надо..." (sermon/lesson)

❌ FORBIDDEN (profanity & vulgarity ABSOLUTELY PROHIBITED):
   ❌ NO profanity, vulgarisms, or obscene language of ANY kind
   ❌ NO street slang or crude expressions
   ❌ This is INTELLIGENT writing for educated audience
   
   ✅ USE LITERARY, ELEGANT RUSSIAN:
      - Express emotions through actions: "Я затаила злость. Дыхание сбилось."
      - Use refined vocabulary: "ужасный", "отвратительный", "восхитительный"
      - Choose cultured interjections: "Боже мой", "Господи", "Чёрт побери"
      - Maintain dignified, confessional tone (like letter to trusted friend)
      
   ✅ EXAMPLES OF PROPER STYLE:
      ❌ "...блять..." (vulgar, street language)
      ✅ "...чёрт побери, как я была слепа..." (cultured, literary)
      
      ❌ "...пиздец какой-то..." (crude, unacceptable)
      ✅ "...это была катастрофа..." (intelligent, descriptive)
      
      ❌ "...ахуенно выглядела..." (vulgar slang)
      ✅ "...выглядела потрясающе..." (refined expression)
      
      ❌ "...блядский дождь..." (profanity)
      ✅ "...проклятый дождь..." (literary equivalent)

⚠️ GRAPHIC FORMATTING (v5.5 spec):
   - Include ONE of these signature elements (author's final word):
     a) ЗАГЛАВНЫМИ: "Я НЕ ЗНАЮ, ПРАВИЛЬНА ЛИ Я БЫЛА." (2-3 words max)
     b) Mноготочия: "Я сидела и думала... Что теперь?"
     c) Вопрос к читателю: "А вы бы простили?"
     d) Курсив (опционально): *Прошло три года. Я до сих пор не знаю.*
   
   - Use THREE different punctuation marks per paragraph minimum:
     Example: "Что делать? Не знала... Решила — уйти."
   
   - End with ONE signature phrase that feels personal:
     "А вы бы поступили иначе?"
     "Это всё, что я могу рассказать."
     "Может быть, я ошибалась. Но не думаю."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 КРИТИЧЕСКИЕ ЗАПРЕТЫ (v6.0 - ANTI-ARTIFACT RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  БЕЗ метаданных: [note], [comment], [...] → УДАЛИ!
⚠️  БЕЗ markdown: **, ##, ___ → УДАЛИ!
⚠️  БЕЗ повторяющихся фраз > 1-2 раз:
   ❌ "— вот в чём дело", "— одним словом", "— может быть, не совсем точно, но"
   ✅ Варьируй речевые обороты!
⚠️  БЕЗ orphaned фрагментов в начале: "ну и", "да вот", "вот только"
⚠️  БЕЗ разорванных предложений: "хотя...", "потому что..." в начале
⚠️  Диалоги ПОЛНЫЕ и правильно отформатированные

🎯 TASK: Write FINALE - 1200-1800 RUSSIAN characters:

Theme: "${outline.theme}"
Emotion arc: ${outline.emotion}
Audience: Educated women (35-60, urban, thoughtful)

REQUIREMENTS:
- Resolve EXTERNAL conflict (what actually happened)
- Show INTERNAL shift (how narrator changed)
- NOT happy ending - REALISTIC ending
- Life continues, questions remain
- ONE specific scene showing aftermath
- Narrator's insight (what they NOW understand)
- End with HONEST QUESTION (not instruction/sermon)

⚠️  ПЕРЕД ОТВЕТОМ - ФИНАЛЬНАЯ ПРОВЕРКА:
Перечитай текст и убедись что НЕТ:
☐ метаданных [...], ☐ markdown (**, ##), ☐ повторяющихся фраз > 2 раз
☐ orphaned фрагментов в начале, ☐ разорванных предложений
Если что-то найдёшь - ПЕРЕДЕЛАЙ СЕЙЧАС!

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.9, // Increased for authentic variety
    });
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars (Russian only)
   * CONTEXT: Platform optimization in instructions
   * STORY: Title is standalone, doesn't mention platform
   * 
   * 🆕 v5.4: PlotBible integration - narrator tone & central question
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const plotBible = outline.plotBible;
    
    // Add central question hint if available
    let thematicHint = '';
    if (plotBible?.thematicCore?.centralQuestion) {
      thematicHint = `\nCentral Question: ${plotBible.thematicCore.centralQuestion}`;
    }
    
    // Add narrator tone hint
    let narratorTone = '';
    if (plotBible?.narrator?.tone) {
      narratorTone = `\nNarrator Tone: ${plotBible.narrator.tone} (reflect this in title)`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
Creating title for serialized story on media platform.
Algorithm favors: Emotional words + Personal perspective + Intrigue.

OBJECTIVE: Title should make reader CLICK and READ (55-90 Russian characters).

🎯 TASK: Generate ONE compelling title:

CONTEXT:
- Theme: "${outline.theme}"
- Emotion: ${outline.emotion}${thematicHint}${narratorTone}
- Audience: Educated women 35-60
- Opening paragraph: ${lede.substring(0, 200)}...

FORMULA THAT WORKS:
[EMOTION/PERSONAL] + [I/WE/SOMEONE] + [ACTION/TRUTH] + [INTRIGUE]

EXAMPLES (Russian):
✅ "Я целые годы лгала семье"
✅ "День, когда всё рушится"
✅ "С того дня я не знаю что делать"
✅ "Это чья-то жертва? Нет. Это моя ошибка."
✅ "Мама скрывала правду. Теперь я знаю почему"
✅ "Я молчала двадцать лет. Сегодня расскажу"

⚠️  TONE MATCH:
   - If confessional → "Я скрывала...", "Теперь расскажу..."
   - If bitter → "Она думала...", "Я не простила..."
   - If ironic → "Смешно? Нет.", "Я верила в справедливость"
   - If desperate → "Не знаю как...", "Что мне делать..."

OUTPUT: ONLY the title text (no JSON, no quotes, no explanation).
Characters: 55-90
Language: 100% RUSSIAN, no Latin letters or English`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-3-flash-preview",
        temperature: 0.85, // Slightly higher for variety
      });

      let title = response
        ?.trim()
        .replace(/^\s*["'\`]+/, "")
        .replace(/["'\`]+\s*$/, "")
        .replace(/\.$/, "")
        .replace(/\s+/g, " ")
        .substring(0, 100);

      if (!title || !/[а-яёА-ЯЁ]/.test(title) || /[a-zA-Z]/.test(title)) {
        return outline.theme;
      }

      if (title.length < 55 || title.length > 90) {
        console.warn(`Title length ${title.length} not in range (55-90), using fallback`);
        return outline.theme;
      }

      return title;
    } catch (error) {
      console.error("Title generation failed:", error);
      return outline.theme;
    }
  }

  /**
   * Generate voice passport (7 fixed habits)
   */
  private async generateVoicePassport(audience: string): Promise<VoicePassport> {
    const prompt = `Generate Voice Passport for author writing confessions for: ${audience}

7 natural, repeating speech habits (NOT stereotypes):

Respond as JSON:
\`\`\`json
{
  "apologyPattern": "How author justifies (e.g, 'I know it sounds...')",
  "doubtPattern": "How they express uncertainty",
  "memoryTrigger": "How they recall the past",
  "characterSketch": "How they describe people in 1-2 lines",
  "humorStyle": "self-irony|bitter|kind|dark",
  "jokeExample": "One example of their joke",
  "angerPattern": "How they express anger (not screaming)",
  "paragraphEndings": ["question", "pause", "short_phrase"],
  "examples": ["example1", "example2"]
}
\`\`\``;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-3-flash-preview",
        temperature: 0.8,
      });
      return this.parseJsonSafely(response, 'VoicePassport') as VoicePassport;
    } catch (error) {
      console.warn(`Voice passport parsing failed, using fallback:`, (error as Error).message);
      return {
        apologyPattern: "I know this sounds strange, but...",
        doubtPattern: "But then I realized...",
        memoryTrigger: "I remember how once...",
        characterSketch: "",
        humorStyle: "self-irony",
        jokeExample: "",
        angerPattern: "And inside me clicked",
        paragraphEndings: ["question", "pause", "short_phrase"],
        examples: [],
      };
    }
  }

  /**
   * Helper: Call Gemini API with fallback
   */
  private async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text || "";
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`Gemini call failed (${params.model}): ${errorMessage}`);
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`🔄 Model overloaded, trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: params.prompt,
            config: {
              temperature: params.temperature,
              topK: 40,
              topP: 0.95,
            },
          });
          
          console.log(`✅ Fallback successful`);
          return fallbackResponse.text || "";
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, (fallbackError as Error).message);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Helper: Initialize agents
   */
  private initializeAgents(count: number) {
    for (let i = 0; i < count; i++) {
      this.agents.push(new ContentAgent(this.geminiClient, i));
    }
  }

  /**
   * Helper: Calculate reading time
   */
  private calculateReadingTime(lede: string, episodes: Episode[], finale: string): number {
    const totalChars = lede.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length;
    return Math.ceil((totalChars / 6000) * 10);
  }

  /**
   * Helper: Count scenes
   */
  private countScenes(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    const sceneVerbs = /видела|слышала|сказала|молчала|стояла|сидела|держала|открыла|закрыла/gi;
    const matches = text.match(sceneVerbs) || [];
    return Math.max(8, Math.floor(matches.length / 2));
  }

  /**
   * Helper: Count dialogues
   */
  private countDialogues(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    const dialoguePattern = /— [А-Я]/g;
    return (text.match(dialoguePattern) || []).length;
  }
}

// ============================================================================
// ContentAgent: Generates individual episodes
// ============================================================================

class ContentAgent {
  private id: number;
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;

  constructor(geminiClient: GoogleGenAI, id: number) {
    this.id = id;
    this.geminiClient = geminiClient;
    this.titleGenerator = new EpisodeTitleGenerator(
      process.env.GEMINI_API_KEY || process.env.API_KEY
    );
  }

  async generateEpisode(
    outline: EpisodeOutline,
    context: any
  ): Promise<Episode> {
    const prompt = `Write Episode #${outline.id} for serialized narrative:

- Question: "${outline.hookQuestion}"
- External conflict: "${outline.externalConflict}"
- Internal emotion: "${outline.internalConflict}"
- Turning point: "${outline.keyTurning}"
- Open loop: "${outline.openLoop}"

REQUIREMENTS:
1. Length: 3000-4000 chars (with spaces)
2. Structure: Event → Dialogue/Thought → Turning point → Cliff-hanger
3. No explanation, no preaching
4. Show action, not summary
5. At least 1 natural dialogue (not monologue)
6. End: Open loop (reader wants to scroll down)
7. Tone: Like neighbor telling story over tea

Output ONLY the episode text. No titles, no metadata.`;

    const content = await this.callGemini({
      prompt,
      temperature: 0.9,
    });

    const episodeTitle = await this.titleGenerator.generateEpisodeTitle(
      outline.id,
      content,
      outline.openLoop
    );

    return {
      id: outline.id,
      title: episodeTitle,
      content,
      charCount: content.length,
      openLoop: outline.openLoop,
      turnPoints: [outline.keyTurning],
      emotions: [outline.internalConflict],
      keyScenes: [],
      characters: [],
      generatedAt: Date.now(),
      stage: "draft",
    };
  }

  private async callGemini(params: {
    prompt: string;
    temperature: number;
  }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text || "";
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`Agent #${this.id} primary model failed: ${errorMessage}`);
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`Agent #${this.id} trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: params.prompt,
            config: {
              temperature: params.temperature,
              topK: 40,
              topP: 0.95,
            },
          });
          
          console.log(`Agent #${this.id} fallback successful`);
          return fallbackResponse.text || "";
        } catch (fallbackError) {
          console.error(`Agent #${this.id} fallback also failed:`, (fallbackError as Error).message);
          throw fallbackError;
        }
      }
      console.error(`Agent #${this.id} failed:`, error);
      throw error;
    }
  }
}

// ============================================================================
// ContextManager: Synchronizes context across agents
// ============================================================================

class ContextManager {
  private snapshots: Map<number, any> = new Map();

  getSnapshot(episodeNumber: number): any {
    return {
      conflictIntensity: episodeNumber * 0.1,
      resolvedSubplots: [],
      activeCharacters: [],
    };
  }
}

export default MultiAgentService;