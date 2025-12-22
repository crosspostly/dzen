// ============================================================================
// ZenMaster v2.0 — Multi-Agent Service
// Orchestrates dynamic episode generation for 29K longform articles
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";
import { AutoFixOrchestrator } from "./autoFixOrchestrator";

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;
  private phase2Service: Phase2AntiDetectionService;
  private autoFixOrchestrator: AutoFixOrchestrator;
  private maxChars: number = 29000;
  private episodeCount: number = 12;

  constructor(apiKey?: string, maxChars?: number) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.maxChars = maxChars || 29000;
    this.phase2Service = new Phase2AntiDetectionService();
    this.autoFixOrchestrator = new AutoFixOrchestrator(key);
    
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
    const LEDE_CHARS = 750;
    const FINALE_CHARS = 1500;
    const AVG_EPISODE_CHARS = 3200;
    const MIN_EPISODES = 6;
    const MAX_EPISODES = 15;

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
    applyAutoFix?: boolean;
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
    
    // Stage 1: Sequential Episode Generation
    console.log(`🔄 Stage 1: Generating ${episodeCount} episodes sequentially...`);
    const episodes = await this.generateEpisodesSequentially(outline);
    
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
    
    // 🎭 Phase 2: Apply Anti-Detection processing
    console.log("🎭 Phase 2: Applying anti-detection transformations...");
    const fullContent = [
      lede,
      ...episodes.map(ep => ep.content),
      finale
    ].join('\n\n');
    
    const phase2Result = await this.phase2Service.processArticle(
      title,
      fullContent,
      {
        applyPerplexity: true,
        applyBurstiness: true,
        applySkazNarrative: true,
        enableGatekeeper: true,
        sanitizeImages: false,
        verbose: true,
      }
    );
    
    console.log(`✅ Phase 2 complete! Score: ${phase2Result.adversarialScore.overallScore}/100`);
    
    // Assemble article
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      finale,
      voicePassport,
      coverImage: undefined,
      metadata: {
        totalChars: lede.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale),
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale),
        dialogueCount: this.countDialogues(lede, episodes, finale),
      },
      processedContent: phase2Result.processedContent,
      adversarialScore: phase2Result.adversarialScore,
      phase2Applied: true
    };

    // 🎭 Optional AutoFix Orchestrator (engagement-oriented AI-fix)
    let finalArticle = article;
    if (params.applyAutoFix !== false) { // Default: enabled
      console.log("\n🎭 Stage 3: Running AutoFix Orchestrator (engagement-focused)...");
      
      try {
        const autoFixResult = await this.autoFixOrchestrator.orchestrate(finalArticle, { verbose: true });
        
        if (autoFixResult.completed > 0) {
          finalArticle = autoFixResult.refinedArticle || finalArticle;
          console.log(`   ✅ AutoFix: ${autoFixResult.completed} episodes refined`);
          console.log(`   📈 Average AI reduction: ${
            autoFixResult.improvements.reduce((sum, imp) => sum + imp.aiReduction, 0) / autoFixResult.improvements.length
          }%`);
        } else {
          console.log("   ✅ AutoFix: No episodes needed rewriting");
        }
      } catch (error) {
        console.log("   ⚠️  AutoFix failed (non-critical), returning original article");
        console.error(`   Error: ${error}`);
      }
    } else {
      console.log("\n🎭 Stage 3: AutoFix skipped (applyAutoFix: false)");
    }

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Metrics:`);
    console.log(`   - Episodes: ${finalArticle.metadata.episodeCount}`);
    console.log(`   - Characters: ${finalArticle.metadata.totalChars} (target: ${maxChars})`);
    console.log(`   - Utilization: ${((finalArticle.metadata.totalChars / maxChars) * 100).toFixed(1)}%`);
    console.log(`   - Reading time: ${finalArticle.metadata.totalReadingTime} min`);
    console.log(`   - Scenes: ${finalArticle.metadata.sceneCount}`);
    console.log(`   - Dialogues: ${finalArticle.metadata.dialogueCount}`);
    console.log(`   - Phase 2 Score: ${finalArticle.adversarialScore?.overallScore || 0}/100`);
    console.log(`   - Anti-Detection: ${finalArticle.phase2Applied ? '✅ Applied' : '❌ Not applied'}`);
    console.log(`   - AutoFix: ${params.applyAutoFix !== false ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`   - Cover image: Pending (will be generated in orchestrator)`);
    console.log(``);
    
    return finalArticle;
  }

  /**
   * 🎭 EXTRACT & VALIDATE plotBible from outline
   */
  private extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
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
  private async generateOutline(params: {
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
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });

    return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
  }

  /**
   * Stage 1: Sequential episode generation
   */
  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY
    );

    return await episodeGenerator.generateEpisodesSequentially(
      outline.episodes,
      {
        delayBetweenRequests: 1500,
        onProgress: (current, total) => {
          console.log(`   ✅ Episode ${current}/${total} complete`);
        }
      }
    );
  }

  /**
   * ✅ v4.5: Generate opening (lede): 600-900 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform details in instructions only
   */
  async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is opening for serialized story on media platform (600-900 chars).
Tone: Like neighbor confiding in friend at kitchen table.
Goal: Hook reader immediately - they will scroll down if gripped.

⚠️  CRITICAL: Story character does NOT know about platform/audience.
No meta-commentary like "I decided to share this" or "people will judge me".
Just raw confession as if talking to trusted friend.

🎯 TASK: Write LEDE (opening) - 600-900 RUSSIAN characters:

Hook: "${firstEpisode.hookQuestion}"
Theme: "${outline.theme}"
Emotion: ${outline.emotion}

REQUIREMENTS:
- Start with PARADOX or INTRIGUE (not explanation)
- Pull reader in immediately
- End with something that makes reader WANT to scroll
- NO "I decided to post this" or "I'm sharing because"
- Just: "That night when...", "I still remember...", "The worst part..."

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.9,
    });
  }

  /**
   * ✅ v4.5: Generate closing (finale): 1200-1800 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform goals in instructions only
   */
  async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is finale for serialized story (1200-1800 chars).
Goal: Reader should finish with complex emotions (not clear happy ending).
Strategy: End with question to readers (encourages comments).

⚠️  CRITICAL: Character doesn't know this will be published or discussed.
No meta-commentary. Just the ending of their memory/story.

🎯 TASK: Write FINALE - 1200-1800 RUSSIAN characters:

Theme: "${outline.theme}"
Emotion arc: ${outline.emotion}
Audience: Educated women (35-60, urban, thoughtful)

REQUIREMENTS:
- Resolve EXTERNAL conflict (what actually happened)
- Leave EMOTIONAL echo (no neat closure)
- End with HONEST QUESTION (not instruction/sermon)
- Example questions:
  ✅ "А вы бы поверили?"
  ✅ "Ну а правила ли я?"
  ✅ "Как вы думаете — это есть холодность или правда?"

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars (Russian only)
   * CONTEXT: Platform optimization in instructions
   * STORY: Title is standalone, doesn't mention platform
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
Creating title for serialized story on media platform.
Algorithm favors: Emotional words + Personal perspective + Intrigue.

OBJECTIVE: Title should make reader CLICK and READ (55-90 Russian characters).

🎯 TASK: Generate ONE compelling title:

CONTEXT:
- Theme: "${outline.theme}"
- Emotion: ${outline.emotion}
- Audience: Educated women 35-60
- Opening paragraph: ${lede.substring(0, 200)}...

FORMULA THAT WORKS:
[EMOTION/PERSONAL] + [I/WE/SOMEONE] + [ACTION/TRUTH] + [INTRIGUE]

EXAMPLES (Russian):
✅ "Я целые годы лгала семье"
✅ "День, когда все рушится"
✅ "От это го деня я не знаю что делать"
✅ "Это чья-то жентва? Нет. Это моя ошибка."

OUTPUT: ONLY the title text (no JSON, no quotes, no explanation).
Characters: 55-90
Language: 100% RUSSIAN, no Latin letters or English`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
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
        model: "gemini-2.5-flash",
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
        model: "gemini-2.5-flash",
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