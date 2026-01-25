/**
 * VoiceRestorationService (v7.1)
 * 
 * Purpose: Transform RAW articles into RESTORED versions
 * RAW = Clean, professional, neutral tone
 * RESTORED = Emotional, dramatic, voice-driven narrative
 * 
 * Process:
 * 1. Parse RAW article structure
 * 2. Identify emotional moments
 * 3. Expand with sensory details
 * 4. Add dramatic breaks and emphasis
 * 5. Inject narrator's voice throughout
 * 6. Preserve all facts, enhance feeling
 */

import { GoogleGenerativeAI } from "@google/genai";

interface RestorationConfig {
  emotionalIntensity: 'medium' | 'high' | 'very-high';
  voiceDepth: 'light' | 'medium' | 'deep';
  preserveLength: boolean; // If true, maintain character count ±10%
}

interface ArticleSections {
  lede: string;
  development: string;
  climax: string;
  resolution: string;
  finale: string;
  episodes: string[];
}

const DEFAULT_CONFIG: RestorationConfig = {
  emotionalIntensity: 'high',
  voiceDepth: 'deep',
  preserveLength: true
};

export class VoiceRestorationService {
  private genai: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genai = new GoogleGenerativeAI(apiKey);
    this.model = this.genai.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemPrompt: `You are a master storyteller specializing in emotional narrative restoration.

Your role is to take a RAW article (clean, neutral, informative) and transform it into a RESTORED article (emotional, dramatic, voice-driven).

CRITICAL RULES:
1. PRESERVE ALL FACTS - Don't change dates, names, numbers, events
2. ENHANCE FEELINGS - Add sensory details, emotional reactions, internal monologue
3. INCREASE DRAMA - Break sentences for emphasis, use incomplete thoughts
4. INJECT VOICE - Add narrator's personality, speech patterns, idioms
5. MAINTAIN STRUCTURE - Keep lede → development → climax → resolution → finale flow

RESTORATION TECHNIQUES:

**Sensory Injection**
❌ "I felt sad"
✅ "My chest tightened. Couldn't breathe. The world turned gray."

**Dramatic Breaks**
❌ "I decided to leave and start a business."
✅ "I left. Packed my things at 2 AM. Started a business. No plan. No money. Just... anger."

**Voice Patterns** (Russian speakers often use):
- Incomplete sentences: "Руки тряслись. Молчала. Не могла говорить."
- Repetition for emphasis: "Он хотел. Он просил. Он требовал."
- Rhetorical questions: "Как я могла слушать такую критику?"
- Interjections: "Боже!", "Ужас!", "Наконец-то!"

**Internal Monologue**
❌ "I was thinking about quitting"
✅ "A voice in my head kept asking: 'What if I fail?' Another voice answered: 'Then I start again.'"

**Emotional Escalation**
Build tension across the article:
- LEDE: Shock/confusion (What happened?)
- EPISODES 1-3: Growing awareness (This is serious!)
- EPISODES 4-6: Taking action (I'm fighting back!)
- CLIMAX: Confrontation (This is the moment!)
- RESOLUTION: Victory position (I won!)
- FINALE: Challenge to reader (What would YOU do?)

Remember: You're not adding fiction. You're revealing the emotional truth that was hidden in the RAW version.`
    });
  }

  /**
   * Parse article into sections
   */
  private parseArticle(text: string): ArticleSections {
    // Split by section markers
    const sections: ArticleSections = {
      lede: '',
      development: '',
      climax: '',
      resolution: '',
      finale: '',
      episodes: []
    };

    // Simple heuristic: first 800-1000 chars = lede
    let charCount = 0;
    let ledeEnd = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n' && charCount > 600) {
        ledeEnd = i;
        break;
      }
      charCount++;
    }

    sections.lede = text.substring(0, ledeEnd).trim();
    const rest = text.substring(ledeEnd).trim();

    // Split rest into paragraphs
    const paragraphs = rest.split('\n\n').filter(p => p.trim().length > 100);

    // Heuristic: episodes are in middle, climax near end, resolution after climax
    if (paragraphs.length > 8) {
      // Assume structure: dev (1-2) + episodes (3-7) + climax (8-9) + resolution (10-11) + finale (12+)
      sections.development = paragraphs.slice(0, 2).join('\n\n');
      sections.episodes = paragraphs.slice(2, Math.floor(paragraphs.length * 0.6));
      sections.climax = paragraphs.slice(
        Math.floor(paragraphs.length * 0.6),
        Math.floor(paragraphs.length * 0.75)
      ).join('\n\n');
      sections.resolution = paragraphs.slice(
        Math.floor(paragraphs.length * 0.75),
        Math.floor(paragraphs.length * 0.9)
      ).join('\n\n');
      sections.finale = paragraphs.slice(Math.floor(paragraphs.length * 0.9)).join('\n\n');
    }

    return sections;
  }

  /**
   * Restore each section with emotional depth
   */
  async restoreSection(
    section: string,
    sectionType: 'lede' | 'development' | 'episode' | 'climax' | 'resolution' | 'finale',
    config: RestorationConfig
  ): Promise<string> {
    const prompts: Record<string, string> = {
      lede: `Transform this opening into an EMOTIONAL HOOK that makes readers STOP and READ:

ORIGINAL:
${section}

Guidelines:
1. Start with ACTION or EMOTION, not explanation
2. Pose a compelling question the reader wants answered
3. Use sensory details (what did you see, hear, feel?)
4. Keep original facts, enhance emotional impact
5. Target length: ${Math.round(section.length * 1.1)} characters

Transform it now. Only output the restored section.`,

      development: `Deepen the emotional journey in this section:

ORIGINAL:
${section}

Guidelines:
1. Add sensory details (smells, sounds, physical sensations)
2. Show internal conflict (thoughts racing, emotions conflicting)
3. Use dramatic sentence variety: Short. Medium. Long. Short.
4. Inject narrator's voice and personality
5. Maintain all facts, enhance the feeling
6. Target length: ${Math.round(section.length * 1.05)} characters

Transform it now. Only output the restored section.`,

      episode: `Make this scene VISCERAL and MEMORABLE:

ORIGINAL:
${section}

Guidelines:
1. Add specific dialogue or internal monologue
2. Show physical reactions (trembling, tears, anger)
3. Use incomplete sentences for dramatic effect: "Couldn't move. Couldn't think."
4. Include sensory moments: "The smell of coffee. Cold down my spine."
5. Inject the narrator's unique voice
6. Maintain all facts and events
7. Target length: ${Math.round(section.length * 1.05)} characters

Transform it now. Only output the restored section.`,

      climax: `Make this CONFRONTATION scene UNFORGETTABLE:

ORIGINAL:
${section}

Guidelines:
1. Show the ANTAGONIST'S REACTION in detail (expression, words, body language)
2. Describe the narrator's internal experience of this moment
3. Use short, punchy sentences building to the turning point
4. Include dialogue that reveals the power shift
5. Make the emotional climax clear
6. Target length: ${Math.round(section.length * 1.1)} characters

Transform it now. Only output the restored section.`,

      resolution: `Make the VICTORY POSITION absolutely clear and powerful:

ORIGINAL:
${section}

Guidelines:
1. Show the narrator's NEW POSITION firmly
2. Include the consequences for the antagonist
3. Add the narrator's emotional state (pride, relief, determination)
4. Use strong, decisive language (remove uncertainty words like "maybe", "perhaps")
5. Include specific details proving the win
6. Target length: ${Math.round(section.length * 1.05)} characters

Transform it now. Only output the restored section.`,

      finale: `Create an UNFORGETTABLE ENDING that challenges the reader:

ORIGINAL:
${section}

Guidelines:
1. End with a rhetorical question or challenge: "What would YOU do?"
2. Include a powerful statement in CAPS for emotional impact
3. Don't introduce new information
4. Reference the journey taken
5. Leave the reader with something to think about
6. Target length: ${Math.round(section.length * 1.0)} characters

Transform it now. Only output the restored section.`
    };

    try {
      const response = await this.model.generateContent({
        contents: [{
          parts: [{ text: prompts[sectionType] }]
        }]
      });

      return response.response.text().trim();
    } catch (error) {
      console.error(`Failed to restore ${sectionType}:`, error);
      // Fallback: return original
      return section;
    }
  }

  /**
   * Main restoration pipeline
   */
  async restore(
    rawArticle: string,
    config: RestorationConfig = DEFAULT_CONFIG
  ): Promise<string> {
    console.log('🔧 Starting voice restoration...');

    // Parse article into sections
    const sections = this.parseArticle(rawArticle);

    // Restore each section
    console.log('   🔨 Restoring lede...');
    const restoredLede = await this.restoreSection(sections.lede, 'lede', config);

    console.log('   🔨 Restoring development...');
    const restoredDevelopment = await this.restoreSection(sections.development, 'development', config);

    console.log('   🔨 Restoring episodes...');
    const restoredEpisodes = await Promise.all(
      sections.episodes.map(ep => this.restoreSection(ep, 'episode', config))
    );

    console.log('   🔨 Restoring climax...');
    const restoredClimax = await this.restoreSection(sections.climax, 'climax', config);

    console.log('   🔨 Restoring resolution...');
    const restoredResolution = await this.restoreSection(sections.resolution, 'resolution', config);

    console.log('   🔨 Restoring finale...');
    const restoredFinale = await this.restoreSection(sections.finale, 'finale', config);

    // Reconstruct article
    const restored = [
      restoredLede,
      restoredDevelopment,
      ...restoredEpisodes,
      restoredClimax,
      restoredResolution,
      restoredFinale
    ]
      .filter(s => s.length > 0)
      .join('\n\n');

    console.log('✅ Voice restoration complete');

    return restored;
  }

  /**
   * Quick restore for testing (uses simpler prompts)
   */
  async quickRestore(rawArticle: string): Promise<string> {
    const prompt = `You are a professional editor specializing in emotional narrative enhancement.

Transform this article to be more emotional, dramatic, and personal while keeping ALL facts unchanged:

ORIGINAL ARTICLE:
${rawArticle}

GUIDELINES:
1. Add sensory details (smells, sounds, textures, physical sensations)
2. Show emotional reactions throughout (tears, trembling, anger, joy)
3. Vary sentence length dramatically: "Short. Medium sentence. Very long sentence here with details."
4. Use incomplete sentences for emphasis: "Couldn't move. Couldn't think. Couldn't breathe."
5. Add internal monologue showing the narrator's thoughts
6. Inject personality through speech patterns and voice
7. Keep all facts, events, names, dates EXACTLY as they were
8. Maintain the original structure (beginning, middle, climax, resolution, ending)
9. Target length: Keep within 10% of original length

OUTPUT ONLY the transformed article. Do not add commentary or explanations.`;

    try {
      const response = await this.model.generateContent({
        contents: [{
          parts: [{ text: prompt }]
        }]
      });

      return response.response.text().trim();
    } catch (error) {
      console.error('Quick restore failed:', error);
      return rawArticle;
    }
  }
}

export default VoiceRestorationService;
