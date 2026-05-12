/**
 * Quality Validator v4.9 (ENHANCED AUTHENTICITY SCORING)
 * 
 * Provides readSuccess/readFailure metrics for AI detection-proof content.
 * Works as Layer 2 validation on top of ContentSanitizer metrics.
 * 
 * AUTHENTICITY PRINCIPLE: "Perfection is the enemy of naturalness"
 * - Content that looks too perfect triggers AI detection
 * - Human content has imperfections, inconsistencies, context
 * - This validator scores content based on "human-like" qualities
 */
export class QualityValidator {
  
  /**
   * 🔍 Validate content for AI detection-proof authenticity
   * Returns readSuccess (content passes authenticity check) and readFailure (reasons if fails)
   * 
   * @param content The cleaned content to validate
   * @param qualityMetrics Metrics from ContentSanitizer
   * @returns Object with authenticity assessment
   */
  static validateContent(
    content: string,
    qualityMetrics: any
  ): {
    readSuccess: boolean;
    readFailure: string[];
    authenticityScore: number;
    retryPrompt: string;
    authenticityFactors: Record<string, any>;
  } {
    const failures: string[] = [];
    const factors: Record<string, any> = {};
    
    // 🔍 Step 1: Document appearance authenticity (40 points possible)
    const appearanceScore = this.checkDocumentAppearance(content, factors);
    
    // 🔍 Step 2: Narrative authenticity (30 points possible)
    const narrativeScore = this.checkNarrativeAuthenticity(content, factors);
    
    // 🔍 Step 3: Technical authenticity (20 points possible)
    const technicalScore = this.checkTechnicalAuthenticity(content, factors);
    
    // 🔍 Step 4: Linguistic authenticity (10 points possible)
    const linguisticScore = this.checkLinguisticAuthenticity(content, factors);
    
    // Calculate total authenticity score
    const totalScore = appearanceScore + narrativeScore + technicalScore + linguisticScore;
    
    // Determine pass/fail based on thresholds
    const authenticityScore = Math.round(totalScore);
    const readSuccess = authenticityScore >= 60; // Pass threshold: 60/100
    
    // Generate failure reasons if not passing
    if (!readSuccess) {
      if (totalScore < 40) {
        failures.push("Content lacks human-like imperfections and context");
        failures.push("Too polished - real human posts have inconsistencies");
      } else if (totalScore < 50) {
        failures.push("Needs more authentic visual/textual evidence");
        failures.push("Add real-world context (screenshots, imperfect grammar)");
      } else {
        failures.push("Close to authentic - add more human-like details");
        failures.push("Consider imperfect structures or cultural context");
      }
    }
    
    // Generate retry prompt with specific improvements
    const retryPrompt = this.generateRetryPrompt(totalScore, factors);
    
    return {
      readSuccess,
      readFailure: failures,
      authenticityScore,
      retryPrompt,
      authenticityFactors: factors,
    };
  }
  
  /**
   * 📸 Check for document appearance authenticity (screenshot evidence, formatting)
   * Returns score 0-40
   */
  private static checkDocumentAppearance(content: string, factors: Record<string, any>): number {
    let score = 0;
    
    // Factor 1: Visual evidence markers (15 points)
    const visualEvidence = this.extractVisualEvidence(content);
    factors.visualEvidence = visualEvidence;
    
    if (visualEvidence.hasScreenshotReferences) score += 8;
    if (visualEvidence.hasVkReferences) score += 3;
    if (visualEvidence.hasOkReferences) score += 2;
    if (visualEvidence.hasImageDescription) score += 2;
    
    // Factor 2: Manual photography angles (10 points)
    const hasManualPhotoAngles = /(съёмка снизу|съёмка сверху|случайно|не смогла|не получилось|рука дрожала|в движении)/i.test(content);
    factors.hasManualPhotoAngles = hasManualPhotoAngles;
    if (hasManualPhotoAngles) score += 10;
    
    // Factor 3: Environment context (10 points)
    const environmentContext = this.extractEnvironmentContext(content);
    factors.environmentContext = environmentContext;
    
    if (environmentContext.hasRussianApartmentElements) score += 5;
    if (environmentContext.hasNaturalBackground) score += 3;
    if (environmentContext.hasClutter) score += 2;
    
    // Factor 4: Timestamp authenticity (5 points)
    const hasNaturalTimestamp = /(сегодня|вчера|позавчера|на прошлой|в прошлом|недавно|уже|ещё|всё ещё|давно|с тех пор|потом|позже|раньше|ранее)/i.test(content);
    factors.hasNaturalTimestamp = hasNaturalTimestamp;
    if (hasNaturalTimestamp) score += 5;
    
    return Math.min(score, 40);
  }
  
  /**
   * 📖 Check for narrative authenticity (voice, style, imperfections)
   * Returns score 0-30
   */
  private static checkNarrativeAuthenticity(content: string, factors: Record<string, any>): number {
    let score = 0;
    
    // Factor 1: Skaz narrative style (10 points)
    const skazMarkers = this.extractSkazMarkers(content);
    factors.skazMarkers = skazMarkers;
    
    if (skazMarkers.hasConversationalOpenings) score += 3;
    if (skazMarkers.hasImperfectSpeech) score += 3;
    if (skazMarkers.hasOpinionatedStatements) score += 2;
    if (skazMarkers.hasDoubtExpressions) score += 2;
    
    // Factor 2: Emotional volatility (10 points)
    const emotionalVolatility = this.calculateEmotionalVolatility(content);
    factors.emotionalVolatility = emotionalVolatility;
    
    if (emotionalVolatility.conflictingEmotions) score += 5;
    if (emotionalVolatility.intensityChanges > 3) score += 3;
    if (emotionalVolatility.unstableNarrative) score += 2;
    
    // Factor 3: Self-contradiction (5 points)
    const hasSelfContradiction = this.detectSelfContradiction(content);
    factors.hasSelfContradiction = hasSelfContradiction;
    if (hasSelfContradiction) score += 5; // Humans contradict themselves
    
    // Factor 4: Imperfect grammar (5 points)
    const imperfectGrammar = this.extractImperfectGrammar(content);
    factors.imperfectGrammar = imperfectGrammar;
    
    if (imperfectGrammar.incompleteSentences > 0) score += 2;
    if (imperfectGrammar.grammaticalErrors.length > 0) score += 3;
    
    return Math.min(score, 30);
  }
  
  /**
   * 🔧 Check for technical authenticity (metadata, file info, processing traces)
   * Returns score 0-20
   */
  private static checkTechnicalAuthenticity(content: string, factors: Record<string, any>): number {
    let score = 0;
    
    // Factor 1: File information (8 points)
    const fileInfo = this.extractFileInformation(content);
    factors.fileInfo = fileInfo;
    
    if (fileInfo.hasFileSize) score += 2;
    if (fileInfo.hasResolution) score += 3;
    if (fileInfo.hasFormat) score += 3;
    
    // Factor 2: Processing traces (7 points)
    const processingTraces = this.extractProcessingTraces(content);
    factors.processingTraces = processingTraces;
    
    if (processingTraces.hasCompressionArtifacts) score += 3;
    if (processingTraces.hasNoise) score += 2;
    if (processingTraces.hasDistortion) score += 2;
    
    // Factor 3: Metadata presence (5 points)
    const metadata = this.extractMetadata(content);
    factors.metadata = metadata;
    
    if (metadata.hasExif) score += 2;
    if (metadata.hasTimestamp) score += 2;
    if (metadata.hasDeviceInfo) score += 1;
    
    return Math.min(score, 20);
  }
  
  /**
   * 🗣️ Check for linguistic authenticity (slang, context, cultural references)
   * Returns score 0-10
   */
  private static checkLinguisticAuthenticity(content: string, factors: Record<string, any>): number {
    let score = 0;
    
    // Factor 1: Russian cultural context (5 points)
    const culturalContext = this.extractCulturalContext(content);
    factors.culturalContext = culturalContext;
    
    if (culturalContext.hasRussianNames) score += 1;
    if (culturalContext.hasRussianLocations) score += 1;
    if (culturalContext.hasRussianProducts) score += 1;
    if (culturalContext.hasRussianSlang) score += 2;
    
    // Factor 2: Contemporary references (5 points)
    const contemporaryRefs = this.extractContemporaryReferences(content);
    factors.contemporaryRefs = contemporaryRefs;
    
    if (contemporaryRefs.hasSocialMediaRef) score += 2;
    if (contemporaryRefs.hasCurrentEvents) score += 2;
    if (contemporaryRefs.hasPopCulture) score += 1;
    
    return Math.min(score, 10);
  }
  
  /**
   * 📸 Extract visual evidence markers
   */
  private static extractVisualEvidence(content: string): any {
    return {
      hasScreenshotReferences: /(скриншот|скрин|фотография|фото|изображение|картинка|jpg|png|jpeg)/i.test(content),
      hasVkReferences: /(vk\.com|vkontakte|вк|вконтакте|vk[^a-z])/i.test(content),
      hasOkReferences: /(ok\.ru|odnoklassniki|одноклассники|ок|od[^a-z])/i.test(content),
      hasImageDescription: /(слева|справа|центр|верх|низ|угол|фон|задник)/i.test(content),
    };
  }
  
  /**
   * 🏠 Extract environment context (Modern Luxury / Elite City elements)
   */
  private static extractEnvironmentContext(content: string): any {
    return {
      hasRussianApartmentElements: /(элитный ЖК|панорамные окна|мрамор|лобби|терасса|авто|кожаные сиденья|дизайнерский)/i.test(content),
      hasNaturalBackground: /(шелк|атлас|бархат|золото|хрусталь|парфюм|сандал|мускус)/i.test(content),
      hasClutter: /(препарировать|анализировать|диагностировать|паттерн|инфантилизм)/i.test(content),
    };
  }
  
  /**
   * 💬 Extract skaz narrative markers (Hostile Elegance version)
   */
  private static extractSkazMarkers(content: string): any {
    return {
      hasConversationalOpenings: /(Знаете|Понимаете|Давайте будем честными|Препарируем|Смотрите|Задумайтесь)/i.test(content),
      hasImperfectSpeech: /(дошла себя|куй в себе|сексофон|мужеловка|мозгоёлка|пронежность|бездаты)/i.test(content),
      hasOpinionatedStatements: /(ледяное спокойствие|интеллектуальный скальпель|диагностический интерес|холодная ирония)/i.test(content),
      hasDoubtExpressions: /(препарировала|разложила на атомы|унизила вежливостью|вышла победителем)/i.test(content),
    };
  }
  
  /**
   * 💔 Calculate emotional volatility (conflicting emotions, intensity changes)
   */
  private static calculateEmotionalVolatility(content: string): any {
    const emotionPatterns = {
      positive: /(радост|счастлив|довольн|облегч|успокоен|надежд|надежд)/gi,
      negative: /(груст|печаль|плак|плач|разочарован|зл|ненавижу|завидую|болезн|страх|боюсь)/gi,
      neutral: /(дума|смотр|вижу|слыш|чита|пиш|говор|рассказыва|объясня)/gi,
    };
    
    const results: any = [];
    const paragraphs = content.split('\n\n');
    
    paragraphs.forEach((para, index) => {
      const emotions = { positive: 0, negative: 0, neutral: 0 };
      
      for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
        const matches = para.match(pattern);
        if (matches) {
          emotions[emotion as keyof typeof emotions] = matches.length;
        }
        
        results.push({ paragraph: index, emotions });
      }
    });
    
    // Check for conflicting emotions in same paragraph
    let conflictingEmotions = false;
    let intensityChanges = 0;
    
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      
      // Check for major emotional shifts
      if ((prev.emotions.positive > 0 && curr.emotions.negative > 0) ||
          (prev.emotions.negative > 0 && curr.emotions.positive > 0)) {
        intensityChanges++;
      }
      
      // Check for high volatility
      const prevMax = Math.max(prev.emotions.positive, prev.emotions.negative, prev.emotions.neutral);
      const currMax = Math.max(curr.emotions.positive, curr.emotions.negative, curr.emotions.neutral);
      
      if (Math.abs(prevMax - currMax) > 2) {
        intensityChanges++;
      }
    }
    
    return {
      conflictingEmotions: conflictingEmotions || intensityChanges > 2,
      intensityChanges,
      unstableNarrative: intensityChanges > 3,
    };
  }
  
  /**
   * 🔄 Detect self-contradiction in narrative
   */
  private static detectSelfContradiction(content: string): boolean {
    const contradictionPatterns = [
      /(раньше.*теперь|прежде.*теперь|сначала.*потом|однако.*вместе|но.*тем.*временем)/i,
      /(считала.*оказалось|думала.*оказалось|верила.*оказалось|надеялась.*оказалось)/i,
      /(я.*но.*я|я.*всё.*ещё.*я|я.*хотя.*я|я.*который.*я)/i,
    ];
    
    return contradictionPatterns.some(pattern => pattern.test(content));
  }
  
  /**
   * ✏️ Extract imperfect grammar patterns
   */
  private static extractImperfectGrammar(content: string): any {
    const incompleteSentences = (content.match(/[^.!?]+$/g) || []).length;
    
    return {
      incompleteSentences,
      grammaticalErrors: [], // Would need deeper linguistic analysis in real implementation
    };
  }
  
  /**
   * 📄 Extract file information (size, resolution, format)
   */
  private static extractFileInformation(content: string): any {
    return {
      hasFileSize: /(мб|кб|гб|байт|размер|вес|ва|кб|мб|гб)/i.test(content),
      hasResolution: /(пикс|разреш|квалит|HD|4K|1080|720|480|360)/i.test(content),
      hasFormat: /(jpg|png|jpeg|mp4|avi|mov|gif|webp|heic|raw)/i.test(content),
    };
  }
  
  /**
   * 🖼️ Extract processing traces (compression, noise, artifacts)
   */
  private static extractProcessingTraces(content: string): any {
    return {
      hasCompressionArtifacts: /(артефакты|сжатие|качество|потеря|искажен|искажение|деформ|исказил|исказил)/i.test(content),
      hasNoise: /(шум|зерн|полосы|перекос|искаж|помех|шумность|зернистость)/i.test(content),
      hasDistortion: /(искажен|искажение|деформ|изогн|перекос|перекос|исказил|исказил)/i.test(content),
    };
  }
  
  /**
   * 📸 Extract metadata information
   */
  private static extractMetadata(content: string): any {
    return {
      hasExif: /(exif|meta|данные|информация|дата|время|создан|снят|сделан)/i.test(content),
      hasTimestamp: /(время|час|минут|секунд|мс|миллисекунд|timestamp|date|time)/i.test(content),
      hasDeviceInfo: /(iphone|android|самсунг|xiaomi|huawei|sony|камера|телефон|смартфон|мобильн|устройств)/i.test(content),
    };
  }
  
  /**
   * 🇷🇺 Extract Russian cultural context (Hostile Elegance edition)
   */
  private static extractCulturalContext(content: string): any {
    return {
      hasRussianNames: /(Марина|Ольга|Елена|Наталья|Светлана|Ирина|Виктория|Маргарита)/i.test(content),
      hasRussianLocations: /(крупный город|элитный квартал|центр города|ЖК|лобби|ресторан на крыше)/i.test(content),
      hasRussianProducts: /(шелк|кожа|золото|парфюм|кофе|мрамор|хрусталь)/i.test(content),
      hasRussianSlang: /(мозгоёлка|мужеловка|сексофон|дошла себя|бездаты|благодатная)/i.test(content),
    };
  }
  
  /**
   * 📱 Extract contemporary references
   */
  private static extractContemporaryReferences(content: string): any {
    return {
      hasSocialMediaRef: /(вк|вконтакте|vk|ок|одноклассники|телеграм|телега|тг|инстаграм|инста|твиттер|тикток|ютуб|youtube|telegram|instagram|tiktok|facebook|fb)/i.test(content),
      hasCurrentEvents: /(кризис|пандем|ковид|карантин|санкции|спецоперация|война|конфликт|полит|эконом|призыв|мобилизация|ден|зарплат|цены|инфляция|курс|валют)/i.test(content),
      hasPopCulture: /(Netflix|Нетфликс|Тикток|TikTok|Марвел|Marvel|Дисней|Disney|Гарри|Гарри|Гарри|поттер|potter|ласт|last|of|of|us|стран|stranger|things|меч|корона|королевск|Bridgerton|Бриджертон)/i.test(content),
    };
  }
  
  /**
   * 📝 Generate retry prompt with specific improvements
   */
  private static generateRetryPrompt(score: number, factors: Record<string, any>): string {
    if (score >= 70) {
      return "Content is close to authentic. Add 1-2 small imperfections (imperfect angle, slight contradiction, casual slang).";
    } else if (score >= 50) {
      return `Content needs more authentic markers. 
              Add: screenshot references (${!factors.visualEvidence?.hasScreenshotReferences ? 'missing' : 'ok'}),
              Russian cultural context (${Object.values(factors.culturalContext || {}).filter(v => v).length < 2 ? 'add more' : 'ok'}),
              imperfect narrative (${Object.values(factors.skazMarkers || {}).filter(v => v).length < 2 ? 'add conversational style' : 'ok'}).`;
    } else {
      return `Content significantly lacks authenticity. 
              Major improvements needed:
              - Add visual evidence (screenshots, photos, angles)
              - Include Russian cultural context (apartment details, slang)
              - Use conversational style with imperfections
              - Add technical details (file info, metadata, processing traces)`;
    }
  }
  
  /**
   * 📊 Generate detailed authenticity report
   */
  static generateAuthenticityReport(
    content: string,
    qualityMetrics: any
  ): string {
    const validation = this.validateContent(content, qualityMetrics);
    const factors = validation.authenticityFactors;
    
    const lines: string[] = [];
    
    lines.push("🔍 AUTHENTICITY VALIDATION REPORT v4.9");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`OVERALL SCORE: ${validation.authenticityScore}/100 ${validation.readSuccess ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`THRESHOLD: 60/100 to pass`);
    lines.push("");
    
    if (validation.readFailure.length > 0) {
      lines.push("FAILURE REASONS:");
      validation.readFailure.forEach(reason => lines.push(`  • ${reason}`));
      lines.push("");
    }
    
    lines.push("SCORING BREAKDOWN:");
    lines.push("─".repeat(60));
    
    // Document Appearance (40 points max)
    const appearanceScore = this.checkDocumentAppearance(content, {});
    lines.push(`📸 Document Appearance: ${appearanceScore}/40`);
    if (factors.visualEvidence) {
      lines.push(`   ├─ Visual evidence: ${factors.visualEvidence.hasScreenshotReferences ? '✅' : '❌'}`);
      lines.push(`   ├─ VK references: ${factors.visualEvidence.hasVkReferences ? '✅' : '❌'}`);
      lines.push(`   ├─ Manual angles: ${factors.hasManualPhotoAngles ? '✅' : '❌'}`);
    }
    if (factors.environmentContext) {
      lines.push(`   └─ Russian context: ${factors.environmentContext.hasRussianApartmentElements ? '✅' : '❌'}`);
    }
    lines.push("");
    
    // Narrative (30 points max)
    const narrativeScore = this.checkNarrativeAuthenticity(content, {});
    lines.push(`📖 Narrative Style: ${narrativeScore}/30`);
    if (factors.skazMarkers) {
      lines.push(`   ├─ Conversational: ${factors.skazMarkers.hasConversationalOpenings ? '✅' : '❌'}`);
      lines.push(`   ├─ Opinionated: ${factors.skazMarkers.hasOpinionatedStatements ? '✅' : '❌'}`);
    }
    if (factors.emotionalVolatility) {
      lines.push(`   ├─ Emotional changes: ${factors.emotionalVolatility.intensityChanges || 0}`);
    }
    lines.push("");
    
    // Technical (20 points max)
    const technicalScore = this.checkTechnicalAuthenticity(content, {});
    lines.push(`🔧 Technical Details: ${technicalScore}/20`);
    if (factors.fileInfo) {
      lines.push(`   ├─ File info: ${factors.fileInfo.hasFileSize || factors.fileInfo.hasResolution ? '✅' : '❌'}`);
    }
    lines.push("");
    
    // Linguistic (10 points max)
    const linguisticScore = this.checkLinguisticAuthenticity(content, {});
    lines.push(`🗣️ Linguistic Context: ${linguisticScore}/10`);
    if (factors.culturalContext) {
      lines.push(`   ├─ Russian names: ${factors.culturalContext.hasRussianNames ? '✅' : '❌'}`);
      lines.push(`   ├─ Locations: ${factors.culturalContext.hasRussianLocations ? '✅' : '❌'}`);
    }
    lines.push("");
    
    lines.push("💡 RECOMMENDATIONS:");
    lines.push("─".repeat(60));
    lines.push(validation.retryPrompt);
    lines.push("");
    
    return lines.join("\n");
  }
}

export interface QualityValidationResult {
  readSuccess: boolean;
  readFailure: string[];
  authenticityScore: number;
  retryPrompt: string;
  authenticityFactors: Record<string, any>;
}