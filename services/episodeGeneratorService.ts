import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";

/**
   * 🎬 Episode Generator Service v4.6 (QUALITY STORYTELLING UPGRADE)
   *
   * Generates episodes with INTELLIGENT CHARACTER BUDGETING:
   * - Total budget: ${CHAR_BUDGET} chars (v4.6: REDUCED from 29K to 19K)
   * - Lede: ~600 chars (v4.6: Adjusted) 
   * - Finale: ~1200 chars (v4.6: Adjusted)
   * - Remaining divided equally among episodes initially
   * - Each episode gets specific char limit in prompt
   * - If episode exceeds limit: account for actual size, adjust next episode budget
   * - NO RETRIES for oversized - just continue with recalculated pool
   *
   * v4.6 CHANGES - ENHANCED QUALITY METRICS for STORYTELLING:
   * - ✅ REDUCED total budget from 29K to ${CHAR_BUDGET} chars (user request) 
   * - ✅ ENHANCED quality metrics to target sophisticated storytelling
   * - ✅ ADDED character arc quality checking
   * - ✅ ADDED emotional catharsis verification
   * - ✅ ENHANCED cultural authenticity requirements
   * - ✅ IMPROVED plot twist sophistication detection
   * - ✅ ADDED ending satisfaction metrics
   * - ✅ STRENGTHENED sensory density with taste/smell details
   * - ✅ ADDED dialogue subtext quality requirements
   * - ✅ IMPROVED integration of internal monologue
   *
   * Previous v4.5 features remain:
   * - ✅ MOVED platform context to INSTRUCTIONS ONLY
   * - ✅ Story remains CLEAN (no 4th wall breaks about publishing)
   * - ✅ Character perspective: pure narrative, not aware of audience
   * 
   * v5.0 FIX: Single Source of Truth via constants/BUDGET_CONFIG.ts
   * - Removed hardcoded TOTAL_BUDGET
   * - Now accepts maxChars via constructor parameter
   * - Falls back to CHAR_BUDGET from central config
   */
export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private phase2Service: Phase2AntiDetectionService;
  private TOTAL_BUDGET: number; // Use single source of truth
  private LEDE_BUDGET = 600;  // v4.6: Adjusted for tighter budget
  private FINALE_BUDGET = 1200; // v4.6: Adjusted for tighter budget
  private MAX_RETRIES = 2; // Only for API failures or too-short content
  private CONTEXT_LENGTH = 1200; // v4.1: Increased from 800 to 1200 chars

  constructor(apiKey?: string, maxChars?: number) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
    this.phase2Service = new Phase2AntiDetectionService();
    this.TOTAL_BUDGET = maxChars || CHAR_BUDGET; // Use central budget as default
  }

  /**
   * 📊 Calculate budget allocation
   * 
   * Total: 29000 chars
   * - Lede: 700
   * - Finale: 1500
   * - Episodes: remaining / episode_count
   */
  private calculateBudget(episodeCount: number) {
    const remainingBudget = this.TOTAL_BUDGET - this.LEDE_BUDGET - this.FINALE_BUDGET;
    const perEpisodeBudget = Math.floor(remainingBudget / episodeCount);
    
    return {
      total: this.TOTAL_BUDGET,
      lede: this.LEDE_BUDGET,
      finale: this.FINALE_BUDGET,
      perEpisode: perEpisodeBudget,
      episodeCount: episodeCount,
      remaining: remainingBudget,
    };
  }

  /**
   * 🎯 Generate episodes sequentially with DYNAMIC EPISODE COUNT
   * 
   * v5.1 CHANGES:
   * - Dynamic episode count: generate episodes until budget exhausted
   * - MIN_EPISODE_SIZE = 1500 chars (stop if remaining budget < MIN)
   * - Phase 2 per-episode processing
   * - If episode exceeds budget, we accept it and adjust remaining pool
   * 
   * 🆕 v5.3 (Issue #78): PlotBible integration
   * - Pass plotBible to each episode generation
   * - Use narrator voice, sensory palette, character details in prompts
   */
  async generateEpisodesSequentially(
    episodeOutlines: EpisodeOutline[],
    options?: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number, charCount: number) => void;
      plotBible?: any;  // 🆕 Pass plotBible for richer context
    }
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const delay = options?.delayBetweenRequests || 1500;
    const MIN_EPISODE_SIZE = 1500; // Minimum viable episode size
    
    // Calculate initial budget allocation
    const budget = this.calculateBudget(episodeOutlines.length);
    console.log(`\n📊 BUDGET ALLOCATION [Dynamic Episodes]:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Max episodes planned: ${episodeOutlines.length} × ${budget.perEpisode} chars each (estimated)`);
    console.log(`   Lede: ${budget.lede} | Finale: ${budget.finale}`);
    console.log(`   (Remaining for episodes: ${budget.remaining} chars)`);
    console.log(`   MIN_EPISODE_SIZE: ${MIN_EPISODE_SIZE} chars (stop if remaining < this)\n`);
    
    let charCountSoFar = 0;
    let remainingPool = budget.remaining;
    let episodeIndex = 0;

    // 🔄 Dynamic episode generation: while budget allows
    while (remainingPool > MIN_EPISODE_SIZE && episodeIndex < episodeOutlines.length) {
      const outline = episodeOutlines[episodeIndex];
      const episodesLeft = episodeOutlines.length - episodeIndex;
      const charsForThisEpisode = Math.floor(remainingPool / episodesLeft);
      
      console.log(`\n   🎬 Episode #${outline.id} - Starting generation...`);
      console.log(`      Budget: ${charsForThisEpisode} chars (${remainingPool} remaining for rest)`);
      
      // Check if remaining budget is sufficient
      if (charsForThisEpisode < MIN_EPISODE_SIZE) {
        console.log(`      📊 Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping...`);
        break;
      }
      
      try {
        const episode = await this.generateSingleEpisode(
          outline, 
          episodes,
          charsForThisEpisode,  // Pass specific budget to this episode
          episodeIndex + 1,
          episodeOutlines.length,
          1,                    // attempt
          false,                // useFallbackModel
          options?.plotBible    // 🆕 v5.3: Pass plotBible
        );
        episodes.push(episode);
        
        // UPDATE POOL: subtract actual chars from remaining pool
        remainingPool -= episode.charCount;
        charCountSoFar += episode.charCount;
        
        // Warn if significantly over budget
        if (episode.charCount > charsForThisEpisode * 1.1) {
          console.log(`      ⚠️  Over budget: ${episode.charCount}/${charsForThisEpisode} chars`);
          console.log(`      📋 Pool adjusted: remaining ${remainingPool} chars for ${episodesLeft - 1} episodes`);
        } else {
          console.log(`      ✅ Generated: ${episode.charCount} chars (on budget)`);
        }
        console.log(`      📊 Total so far: ${charCountSoFar}/${budget.total}`);
        
        if (options?.onProgress) {
          options.onProgress(episodeIndex + 1, episodeOutlines.length, charCountSoFar);
        }
        
        // Check if we should continue
        if (remainingPool < MIN_EPISODE_SIZE) {
          console.log(`\n   📊 Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping generation...`);
          break;
        }
        
        // Wait before next request
        if (episodeIndex < episodeOutlines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        episodeIndex++;
      } catch (error) {
        console.error(`   ❌ Episode #${outline.id} failed:`, error);
        throw error;
      }
    }
    
    const utilization = ((charCountSoFar / budget.total) * 100).toFixed(1);
    console.log(`\n🔄 Dynamic episode generation:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Generated: ${episodes.length} episodes (not ${episodeOutlines.length})`);
    console.log(`   Used: ${charCountSoFar} chars (${utilization}%)`);
    console.log(`   Remaining: ${remainingPool} chars ${remainingPool < MIN_EPISODE_SIZE ? '(< MIN_EPISODE_SIZE, stopping)' : ''}`);
    console.log(``);
    return episodes;
  }

  /**
   * 🎨 Generate single episode with SPECIFIC CHAR LIMIT
   * 
   * NO RETRY on oversized! Just generate once, accept, move on.
   * 
   * 🆕 v5.3 (Issue #78): Now accepts plotBible for context-aware generation
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    useFallbackModel: boolean = false,
    plotBible?: any  // 🆕 v5.3: PlotBible for narrator voice & sensory details
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(
      outline, 
      previousContext, 
      charLimit,  // Pass char limit to prompt
      episodeNum,
      totalEpisodes,
      attempt,
      plotBible   // 🆕 v5.3: Pass plotBible to prompt builder
    );
    const model = useFallbackModel ? "gemini-2.5-flash-lite" : "gemini-3-flash-preview";

    try {
      const response = await this.callGemini({
        prompt,
        model,
        temperature: 0.9,
      });

      let content = response.trim();
      
      // ✅ VALIDATION: Only check for TOO SHORT
      // If too long: we ACCEPT it and let pool management handle it
      
      // Check if TOO SHORT
      if (content.length < charLimit * 0.7) {
        console.log(`      ⚠️  Too short (${content.length}/${charLimit} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`      🔄 Retrying with expanded prompt...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND SIGNIFICANTLY)" },
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            attempt + 1,
            useFallbackModel,
            plotBible
          );
        } else if (!useFallbackModel) {
          console.log(`      🔄 Retrying with fallback model...`);
          return this.generateSingleEpisode(
            outline,
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            1,
            true,
            plotBible
          );
        } else {
          console.error(`      ❌ CRITICAL: Episode #${outline.id} too short`);
          throw new Error(
            `Episode #${outline.id} too short (${content.length}/${charLimit}). Tried ${this.MAX_RETRIES} retries.`
          );
        }
      }
      
      // ✅ ACCEPT ANY LENGTH >= 70% of budget
      // If too long: just use it, pool adjusts for next episodes
      if (content.length > charLimit * 1.1) {
        console.log(`      ℹ️  Episode length: ${content.length}/${charLimit} (${((content.length/charLimit)*100).toFixed(0)}%)`);
        console.log(`      ℹ️  Accepting oversized - pool will adjust for remaining episodes`);
      } else {
        console.log(`      ✅ Episode ${episodeNum}: ${content.length} chars (within budget)`);
      }

      // 🆕 PHASE 2: Anti-Detection processing (per-episode)
      console.log(`\n   📋 [Phase 2] Processing episode ${episodeNum} for anti-detection...`);
      const phase2Result = await this.phase2Service.processEpisodeContent(
        content,
        episodeNum,
        charLimit, // Target length
        {
          applyPerplexity: true,
          applyBurstiness: true,
          applySkazNarrative: true,
          verbose: true
        }
      );
      
      // Use processed content
      content = phase2Result.processedContent;

      // Generate title
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
        // 🆕 Add Phase 2 metrics
        phase2Metrics: {
          adversarialScore: phase2Result.adversarialScore,
          breakdown: phase2Result.breakdown,
          modificationStats: phase2Result.modificationStats,
          suggestion: phase2Result.suggestion
        }
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`      ❌ Generation failed (attempt ${attempt}): ${errorMessage}`);
      
      if (attempt < this.MAX_RETRIES && (errorMessage.includes('503') || errorMessage.includes('overloaded'))) {
        console.log(`      🔄 API overloaded, retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.generateSingleEpisode(
          outline,
          previousEpisodes,
          charLimit,
          episodeNum,
          totalEpisodes,
          attempt + 1,
          useFallbackModel,
          plotBible
        );
      }
      
      throw error;
    }
  }

  /**
   * 🎯 Build QUALITY-FOCUSED prompt section
   * v4.5: добавить МЕТРИКИ КАЧЕСТВА в инструкции
   */
  private buildQualityGuidelines(charLimit: number): string {
    const minChars = Math.floor(charLimit * 0.8);
    const maxChars = Math.ceil(charLimit * 1.2);
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ QUALITY METRICS (YOUR EPISODE WILL BE AUTOMATICALLY SCORED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 METRIC 1: READABILITY SCORE (0-100)
   ✅ TARGET: 75+/100 (75+ = excellent, 60-74 = good, <60 = poor)
   🏆 BONUS: 85+ = bestseller quality
   
   How to achieve 75+:
   ✅ Keep PARAGRAPHS SHORT (max 300 chars, ideal 150-250)
   ✅ Keep SENTENCES SHORT (max 15 words, ideal 8-12)
   ✅ VARY sentence length (don't be monotonous: 5 words, 12 words, 8 words...)
   ✅ NO academic language (no "которая", "при этом", "более того")
   ✅ NO complex nested sentences
   
   ✅ GOOD (easy to read):
   "Её голос дрожал. Я смотрела на стекло. Снег шёл. Холодный апрельский снег."
   (Each sentence: 3-7 words. Very readable.)
   
   ❌ BAD (hard to read, readability ~40):
   "Когда я услышала её голос, который дрожал, я поняла, что смотрела на стекло
    кабинета, и снег шёл на улице, и это был холодный апрельский снег."
   (One sentence: 32 words. HARD!)

🎯 METRIC 2: DIALOGUE PERCENTAGE (0-100%)
   ✅ TARGET: 35-40% (35-40% dialogue = professional balance)
   🏆 BONUS: Exactly 36-37% = perfect
   
   What counts as dialogue:
   ✅ "— Откуда ты это знаешь? — спросила я."
   ✅ "— Я не могу сказать."
   ✅ "— Может быть, я ошибалась?"
   
   How to achieve 35-40%:
   ✅ Include 6-8 dialogues per episode (not 2, not 10, but 6-8)
   ✅ Each dialogue 1-3 exchanges (not entire conversation)
   ✅ Intersperse with narrative (don't block dialogue)
   ✅ Varies from paragraph to paragraph
   
   ✅ GOOD MIX (≈36% dialogue):
   "От неё пахло духами. Я узнала их запах.     [narrative: 64%]
    — Откуда ты знаешь? — спросила я.            [dialogue: 36%]
    Она молчала. Я смотрела на стекло.
    — Я не могу сказать. Но..."
   
   ❌ BAD (too much dialogue ≈80%):
   "— Откуда ты знаешь?
    — Я не могу сказать.
    — Почему?
    — Потому что это опасно.
    — Опасно для кого?
    [entire page of dialogue]"
   
   ❌ BAD (too little dialogue ≈5%):
   "[page of narrative without dialogue]"

🎯 METRIC 3: PLOT TWISTS (MINIMUM 2)
   ✅ TARGET: Exactly 2+ unexpected turns
   🏆 BONUS: 2 small twists > 1 huge twist (more engaging)
   
   What counts as twist:
   ✅ "I thought X, but it was Y" (expectation vs reality)
   ✅ "Character does opposite of expected" (subversion)
   ✅ "New information changes everything" (revelation)
   ✅ "Wait, THAT happened?!" (shock value)
   
   Examples:
   ✅ "Я думала, муж ушёл от скуки. Но оказалось, его искал полицейский."
   ✅ "Я была уверена, что она моя враги. Потом узнала — она спасала меня."
   ✅ "Письмо пришло из мёртвого города. Но почтовая дата была сегодня."
   
   How to create twists:
   • Set expectation: "Я была уверена, что..."
   • Build tension: Details that seem to confirm expectation
   • Subvert it: "Но вот тогда я узнала..."
   • Reveal: "Оказывается, он..."
   • Reader shocked: "А это значит..."
   
   ✅ GOOD (2 clear twists):
   "Я думала, муж ушёл от скуки.            [expectation]
    Но когда увидела письмо, поняла:        [turn 1]
    он уходил не от меня.                    [twist: not bored, but...]
    Его увели. Против его воли.             [turn 2]
    Вот это был шок!"                        [twist complete]

🎯 METRIC 4: SENSORY DENSITY (0-10 scale)
   ✅ TARGET: 4+/10 (minimum 10 sensory details per episode)
   🏆 BONUS: 5+/10 = rich, immersive storytelling
   
   What counts (MUST HAVE MIX):
   👁️  VISUAL (color, texture, movement, appearance)
       ✅ "холодный чай", "зелень листьев", "тёмное окно", "серая краска"
   
   👂 AUDIO (sound, voice, silence, music)
       ✅ "шёпот", "звон стекла", "тишина комнаты", "гудок машины"
   
   🤝 TOUCH (temperature, texture, pain, pressure)
       ✅ "гладкий стол", "острая боль", "холод ветра", "мягкая подушка"
   
   👃 SMELL/TASTE (optional but very effective)
       ✅ "запах духов", "горечь слёз", "дым сигареты", "свежесть весны"
   
   How to achieve 10+ details:
   • Every 300-400 chars (paragraph) add 1-2 sensory details
   • Episode 3500 chars = 8-10 paragraphs = 10-15 sensory details
   • Mix all senses (don't just describe sight)
   • Spread throughout, not bunched
   
   ✅ GOOD (rich sensory, ≈4.5/10):
   "От неё пахло [SMELL: духами]. Я узнала [SMELL: запах].
    — Откуда? — спросила я [AUDIO: голос].
    Её голос дрожал [TOUCH: emotion]. Я смотрела
    на [VISUAL: стекло кабинета]. На улице шёл [VISUAL: снег].
    Хладный [TOUCH: temperature] снег [VISUAL] в апреле.
    Я чувствовала [TOUCH: sensation] ледяную боль [TOUCH: pain] в груди.
    Письмо было в руке [TOUCH: texture]. Бумага пахла [SMELL] старостью."
    
    Count: пахло, запах, голос, дрожал, стекло, снег, холодный,
           чувствовала, боль, письмо, бумага = 11 sensory details!
   
   ❌ BAD (only visual, ≈1.5/10):
   "[page of only visual description, no sounds, no touch, no smell - BORING!]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUALITY CHECKLIST (verify before finishing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before you output the episode, verify:

☐ READABILITY (target 75+)?
   ✅ SCAN: Do most paragraphs look SHORT (< 300 chars)?
   ✅ SCAN: Do most sentences look SHORT (< 15 words)?
   ✅ SCAN: Is there VARIETY (not all sentences same length)?
   ✅ CHECK: Any "которая", "при этом", "более того"? REMOVE them!

☐ DIALOGUE (target 35-40%)?
   ✅ COUNT: Do I have 6-8 dialogues? (not 2, not 10)
   ✅ FLOW: Are they natural and conversational?
   ✅ FORMAT: Using em-dash (—) correctly?
   ✅ MIX: Dialogue with narrative, not solid blocks?

☐ TWISTS (minimum 2)?
   ✅ TURN 1: Where does reader NOT expect?
   ✅ TURN 2: Another surprise?
   ✅ IMPACT: Do they change the story direction?
   ✅ SHOCK: Would reader say "wait, really?"?

☐ SENSORY (target 10+ details)?
   ✅ VISUAL: 3+ specific things reader can SEE?
   ✅ AUDIO: 2+ sounds?
   ✅ TOUCH: 2+ tactile sensations?
   ✅ SMELL: 1-2 details (optional)?
   ✅ TOTAL: 10+ details scattered throughout?

☐ CHARACTER BUDGET?
   ✅ TARGET: ${charLimit} chars
   ✅ ACCEPTABLE: ${minChars}-${maxChars} chars
   ✅ PRIORITY: QUALITY > LENGTH
   ✅ If story needs 4000 chars for excellence → write 4000!
   ✅ If story fits naturally in 3000 → write 3000!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 WHY THIS MATTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your episode quality directly impacts revenue:

✅ HIGH QUALITY (readability 75+, dialogue 36%, twists 2, sensory 4.5)
   → Reader reads ENTIRE episode
   → Reader returns for next episode
   → Average spend: \$1.50+ per reader
   → 100 readers × \$1.50 = \$150

❌ POOR QUALITY (readability 45, dialogue 10%, twists 0, sensory 1.5)
   → Reader reads 30 seconds, then switches
   → Reader doesn't return
   → Average spend: \$0.05 per reader
   → 100 readers × \$0.05 = \$5

Difference: 30X REVENUE (150/5 = 30)!

Your job: make every word count.
`;
  }

  /**
   * 📝 Build the prompt with SPECIFIC CHAR LIMIT
   * v4.5: ✅ CLEAN STORY (no platform mentions) + CONTEXT IN INSTRUCTIONS
   * 
   * 🆕 v5.3 (Issue #78): Now includes plotBible context
   * - Narrator voice (age, gender, tone, habits)
   * - Sensory palette (details, smells, sounds, textures, lights)
   * - Character map
   * - Thematic core
   */
  private buildPrompt(
    outline: EpisodeOutline, 
    previousContext: string,
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    plotBible?: any  // 🆕 v5.3: PlotBible for richer context
  ): string {
    const retryNote = attempt > 1 ? `\n⚠️  RETRY ATTEMPT #${attempt}\n` : '';
    const minChars = Math.floor(charLimit * 0.7);
    const maxChars = charLimit;
    
    // 🆕 v5.3: Build PlotBible section if available
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    return `
🎬 EPISODE #${outline.id} of ${totalEpisodes} - ZenMaster v4.5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 THIS IS FOR MEDIA PLATFORM (Yandex.Zen):
   • Platform: Serialized longform (29K chars total)
   • Medium: Mobile-first reader (need tight paragraphs)
   • Monetization: Ad-based (reader engagement = revenue)
   • Distribution: Algorithm favors emotional engagement & comments
   • Audience: Russian women 35-60 from cities

💰 REVENUE MODEL:
   • High quality episode → reader stays engaged → \$1.50+ per reader
   • Poor quality episode → reader bounces → \$0.05 per reader
   • Difference: 30X income

🎬 YOUR ROLE:
   Create story that is SO GRIPPING reader can't stop scrolling.
   Write as if narrator is confiding in close friend (authentic voice).
   Never break character - story remains 100% in narrator's perspective.

⚠️  CRITICAL: Character does NOT know they're writing for publication.
    • NO meta-commentary ("I posted this online")
    • NO awareness of audience
    • NO "people will judge me"
    • Just: raw, honest memory being recalled
    • As if confiding to trusted friend at 3 AM

${plotBibleSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 STYLE GUIDE: Donna Latenko + Rubina Daud (BEST RUSSIAN NARRATIVE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TARGET VOICE: Urban Russian woman (educated, modern, honest)
NOT: Village dialect, NOT: clichés, NOT: "I feel" (SHOW don't tell)

TONE EXAMPLES:
✅ "Я же тебе скажу" (conversational, intimate)
✅ "Вот тогда всё и началось" (turning point)
✅ "Может быть, я ошибалась. Но не думаю" (doubt + conviction)
✅ "И главное — я не знала, что это последний раз" (revelation)

❌ AVOID:
❌ Village words: "дыбать", "шарить", "пялиться", "кумекать" (OFFENSIVE)
❌ AI clichés: "к сожалению", "как известно", "можно сказать"
❌ Telling emotions: "я почувствовала грусть" → SHOW: "Голос дрожал"
❌ Explanations: "я была в депрессии потому что" → SHOW: "Я не вставала три дня"

STRUCTURE (alternating pace):
┌─────────────────────────────────────────────────────┐
│ PACE 1: FAST (Donna) - Action, dialogue  │
│ PACE 2: DEEP (Rubina) - Psychology      │
│ PACE 3: FAST (Donna) - Confrontation    │
│ PACE 4: DEEP (Rubina) - Reflection      │
└─────────────────────────────────────────────────────┘

EXAMPLE - SHOWING EMOTION (not telling):

✅ GOOD (visual, emotional, immersive):
"Её голос дрожал. Я смотрела на стекло кабинета.
 Па улице шёл снег. Холодный апрельский снег.
 Я чувствовала ледяную боль в груди. Письмо было
 в руке. Бумага пахла старостью."

→ Reader FEELS the emotion through sensory details.

❌ BAD (explaining, detached, AI-like):
"Я почувствовала грусть и страх. Было очень больно и холодно в душе.
 Я понимала, что произошла трагедия."

→ Reader just reads facts, no immersion.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REAL WORLD DETAILS (urban, modern, contemporary):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GOOD (modern, urban):
- Phone notification at 3 AM
- Letter in sealed envelope (vs email)
- Cold coffee, hot tea
- Taxi to the station
- Lawyer's office, glass building
- News feed, screenshot

❌ BAD (village, old, clichéd):
- "Скрип половицы" (creaky floorboards)
- "Запах дешёвого табака" (cheap tobacco smell)
- "Деревенская изба" (village hut)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 VOCAL READABILITY (FOR AUDIO VERSION - IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your text will be READ ALOUD. Follow these rules:

✅ AVOID DIFFICULT CONSTRUCTIONS:
   - Complex participles: "говоривший" → "который говорил"
   - Many prefixes: "пре-", "super-" → use simple words
   - Long compounds: "самоуправленческий" → "самоуправление"
   - Rare archaisms: "селение", "жительство"

✅ TEST BY READING ALOUD:
   - Read paragraph aloud. If you stumble > 2 times → SIMPLIFY
   - Sentence should be speakable in ONE breath
   - Rhythm: mix short and long, but max 20-25 words per sentence

✅ FORBIDDEN LEXICON (profanity ABSOLUTELY PROHIBITED):
   ❌ NO profanity, vulgarisms, or obscene language of ANY kind
   ❌ NO street slang or crude expressions
   ❌ This is INTELLIGENT writing with LITERARY RUSSIAN
   
   ✅ USE CULTURED EXPRESSIONS:
      - Express emotions through actions and sensations
      - Use refined vocabulary: "ужасный", "отвратительный", "восхитительный"
      - Choose literary interjections: "Боже мой", "Господи", "Чёрт побери"
      - Maintain dignified, confessional tone
      
   ✅ EXAMPLES:
      ❌ "...блять..." (street language, vulgar)
      ✅ "...чёрт побери, как я была слепа..." (cultured, literary)
      
      ❌ "...пиздец какой-то..." (unacceptable)
      ✅ "...это была катастрофа..." (intelligent, descriptive)

✅ GOOD (easy to speak):
"Я села. Взяла письмо. Прочитала. И всё."
(Short. Clear. Natural rhythm.)

❌ BAD (tongue-twister):
"После того как я получила данное корреспонденциарное отправление,
 я, пребывая в состоянии неопределённости, приступила к его осмотру."
(Difficult words, nested structure, unnatural.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 DIALOGUE (REALISTIC RUSSIAN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMAT:
— Это ты или он? — спросила я.
— Я, конечно. Откуда?

PRO TIPS:
✅ Use em-dash (—) for dialogue start
✅ Natural interruptions: "— Слушай, я не имею... — Но ты..."
✅ Pauses: "— Я... не знаю. Может быть, я ошибалась?"
✅ Short exchanges (3-5 lines max per dialogue block)
✅ Mix with action: "— Закрой дверь, — сказала она. Я закрыла."

${retryNote}
${this.buildQualityGuidelines(charLimit)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 EPISODE OUTLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question (Hook): "${outline.hookQuestion}"

External Conflict: ${outline.externalConflict}

Internal Emotion: ${outline.internalConflict}

Turning Point: ${outline.keyTurning}

Open Loop (Why reader continues): "${outline.openLoop}"

${previousContext ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 PREVIOUS EPISODE ENDING (CONTINUE FROM HERE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previousContext}

🔥 HOW TO CONTINUE (CRITICAL):
✅ START IMMEDIATELY with NEW action/dialogue/thought
✅ DO NOT repeat or rephrase the ending above
✅ DO NOT start with connector words like "и" or "тогда"
✅ Assume reader already knows context - MOVE FORWARD
✅ Continue as if one paragraph ends, next begins naturally` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CHARACTER LENGTH GUIDELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

️ℹ️  GUIDELINE: ${minChars}-${maxChars} characters (with spaces)

✅ QUALITY FIRST: Prioritize story over hitting exact numbers
✅ If you need 3500 chars for great storytelling → write 3500
✅ If story fits perfectly in 3000 chars → write 3000
✅ Don't artificially expand or trim

The system adapts remaining episodes based on ACTUAL length.
 Better to have 1 magnificent 4000-char episode than 2 mediocre 2000-char episodes!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 FINAL INSTRUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY the episode text.
No titles. No metadata. No explanations.

Make this episode UNFORGETTABLE.
Readers' experience depends on it.
`;
  }

  /**
   * 🔗 Build context from previous episodes (v4.1: Increased to 1200 chars)
   */
  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return "";
    
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    const contextLength = this.CONTEXT_LENGTH; // v4.1: 1200 chars
    
    if (lastEpisode.content.length <= contextLength) {
      return lastEpisode.content;
    }
    
    return lastEpisode.content.slice(-contextLength);
  }

  /**
   * 🎭 Build PlotBible section for prompt (v5.3 Issue #78)
   * 
   * Inserts narrator voice, sensory palette, and thematic core
   * into the generation prompt for context-aware episode creation.
   */
  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) {
      return ''; // No PlotBible available, skip section
    }
    
    const narrator = plotBible.narrator;
    const sensory = plotBible.sensoryPalette;
    const thematic = plotBible.thematicCore;
    
    // Build narrator section
    let narratorSection = '';
    if (narrator) {
      narratorSection = `
📖 NARRATOR VOICE (THIS STORY'S DNA):
   Age: ${narrator.age || '40-50'} years old
   Gender: ${narrator.gender === 'female' ? 'Woman' : narrator.gender === 'male' ? 'Man' : 'Neutral'}
   Tone: ${narrator.tone || 'confessional, intimate'}
   
   Speech Patterns (USE THESE):`;
      
      if (narrator.voiceHabits) {
        if (narrator.voiceHabits.apologyPattern) {
          narratorSection += `\n   - When apologizing/justifying: "${narrator.voiceHabits.apologyPattern}"`;
        }
        if (narrator.voiceHabits.doubtPattern) {
          narratorSection += `\n   - When doubting: "${narrator.voiceHabits.doubtPattern}"`;
        }
        if (narrator.voiceHabits.memoryTrigger) {
          narratorSection += `\n   - When recalling: "${narrator.voiceHabits.memoryTrigger}"`;
        }
        if (narrator.voiceHabits.angerPattern) {
          narratorSection += `\n   - When angry: "${narrator.voiceHabits.angerPattern}"`;
        }
      }
    }
    
    // Build sensory palette section
    let sensorySection = '';
    if (sensory) {
      sensorySection = `

🎨 SENSORY PALETTE (USE THESE SPECIFIC DETAILS):`;
      
      if (sensory.details && sensory.details.length > 0) {
        sensorySection += `\n   Visual Details: ${sensory.details.slice(0, 5).join(', ')}`;
      }
      if (sensory.smells && sensory.smells.length > 0) {
        sensorySection += `\n   Smells: ${sensory.smells.slice(0, 3).join(', ')}`;
      }
      if (sensory.sounds && sensory.sounds.length > 0) {
        sensorySection += `\n   Sounds: ${sensory.sounds.slice(0, 3).join(', ')}`;
      }
      if (sensory.textures && sensory.textures.length > 0) {
        sensorySection += `\n   Textures: ${sensory.textures.slice(0, 3).join(', ')}`;
      }
      if (sensory.lightSources && sensory.lightSources.length > 0) {
        sensorySection += `\n   Lighting: ${sensory.lightSources.slice(0, 3).join(', ')}`;
      }
    }
    
    // Build thematic core section
    let thematicSection = '';
    if (thematic) {
      thematicSection = `

🎯 THEMATIC CORE:
   Central Question: ${thematic.centralQuestion || 'What if everything I believed was wrong?'}
   Emotional Arc: ${thematic.emotionalArc || 'confusion → realization → acceptance'}
   Resolution Style: ${thematic.resolutionStyle || 'bittersweet, realistic'}`;
    }
    
    // Combine all sections
    if (!narratorSection && !sensorySection && !thematicSection) {
      return ''; // Nothing to show
    }
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PLOT BIBLE (THIS STORY'S UNIQUE DNA - MANDATORY CONTEXT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${narratorSection}${sensorySection}${thematicSection}

⚠️  CRITICAL: Use these SPECIFIC details in your episode.
   Don't make up generic details - use the palette above.
   The narrator voice patterns MUST appear naturally in dialogue and thought.
`;
  }

  /**
   * 📞 Call Gemini API with fallback
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
      throw error;
    }
  }

  /**
   * 🔨 Refine Episode (AutoFix Orchestrator Support)
   * Переписывает эпизод для уменьшения AI-признаков
   * Используется в AutoFix Orchestrator для селективного улучшения
   */
  async refineEpisode(
    episode: Episode,
    refinementPrompt: string,
    options: { retryCount?: number } = {}
  ): Promise<Episode> {
    const retries = options.retryCount || 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const content = await this.callGemini({
          prompt: refinementPrompt,
          model: 'gemini-3-flash-preview',
          temperature: 0.8, // Higher temperature for more creative rewriting
        });

        if (!content || content.length < 100) {
          throw new Error('Generated content too short');
        }

        // Создаём новый эпизод с обновлённым контентом
        const refinedEpisode: Episode = {
          ...episode,
          content: content.trim(),
          charCount: content.length,
          stage: 'humanized' as const,
          generatedAt: Date.now(),
        };

        return refinedEpisode;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Refinement attempt ${attempt} failed:`, lastError.message);
        
        if (attempt === retries) {
          throw new Error(`Failed to refine episode after ${retries} attempts: ${lastError.message}`);
        }
      }
    }

    throw lastError!;
  }
}

// Export singleton instance
export const episodeGeneratorService = new EpisodeGeneratorService();