// ============================================================================
// AutoFix Orchestrator Demo & Test
// Demonstrates the engagement-oriented AI-fix system
// ============================================================================

import { MultiAgentService } from "./services/multiAgentService";
import { Episode } from "./types/ContentArchitecture";

async function runAutoFixDemo() {
  console.log("🎭 " + "=".repeat(70));
  console.log("🔧 AUTOFIX ORCHESTRATOR v1.0 - ENGAGEMENT-FOCUSED AI-FIX");
  console.log("🎯 Переписываем только если AI > 70%, но делаем интересно!");
  console.log("🎭 " + "=".repeat(70));
  console.log();

  // Mock data for testing
  const mockEpisodes: Episode[] = [
    {
      id: 1,
      content: "Я думала, это будет обычный день. Но вдруг все изменилось. Тяжело описать то, что я почувствовала в тот момент, когда увидела его. Это было неожиданно. Важно отметить, что я никогда не верила в такие вещи раньше. К сожалению, я ошибалась.",
      charCount: 0,
      // Simulated engagement analysis
      engagementAnalysis: {
        perSentence: [
          { sentence: "Я думала, это будет обычный день.", score: 35, reasons: ["low emotional intensity"] },
          { sentence: "Но вдруг все изменилось.", score: 75, reasons: ["hook detected"] },
          { sentence: "Тяжело описать то, что я почувствовала в тот момент, когда увидела его.", score: 55, reasons: ["avoidance language", "vague"] },
          { sentence: "Это было неожиданно.", score: 30, reasons: ["weak adjective", "generic statement"] },
          { sentence: "Важно отметить, что я никогда не верила в такие вещи раньше.", score: 25, reasons: ["AI_MARKER detected", "перефразировка"] },
          { sentence: "К сожалению, я ошибалась.", score: 45, reasons: ["predictable conclusion"] }
        ],
        overall: {
          averageScore: 44,
          lowestScoringSentence: "Важно отметить, что я никогда не верила в такие вещи раньше.",
          totalSentenceCount: 6
        }
      },
      aiConfidence: 85
    },
    {
      id: 2,
      content: "Я проснулась рано утром. Солние светило сквозь шторы. Мне нужно было идти на работу, но я не хочу. Это странно. Каждый день одно и то же. Безусловно, это неправильно. Я должна радоваться жизни. Тем не менее, я чувствую только усталость.",
      charCount: 0,
      engagementAnalysis: {
        perSentence: [
          { sentence: "Я проснулась рано утром.", score: 40, reasons: ["routine opening"] },
          { sentence: "Солние светило сквозь шторы.", score: 50, reasons: ["generic imagery"] },
          { sentence: "Мне нужно было идти на работу, но я не хочу.", score: 65, reasons: ["mild conflict"] },
          { sentence: "Это странно.", score: 35, reasons: ["weak statement"] },
          { sentence: "Каждый день одно и то же.", score: 55, reasons: ["relatable but generic"] },
          { sentence: "Безусловно, это неправильно.", score: 20, reasons: ["AI_MARKER detected", "перефразировка"] },
          { sentence: "Я должна радоваться жизни.", score: 30, reasons: ["moralistic tone"] },
          { sentence: "Тем не менее, я чувствую только усталость.", score: 45, reasons: ["generic emotion"] }
        ],
        overall: {
          averageScore: 42,
          lowestScoringSentence: "Безусловно, это неправильно.",
          totalSentenceCount: 8
        }
      },
      aiConfidence: 78
    },
    {
      id: 3,
      content: "Это было 15 лет назад, но я все еще помню. Я сидела на ступеньках и смотрела на дождь. Мне было одиноко. Быть может, мама была права. Да, это сложно объяснить. Но тогда мне казалось, что мир кончился. Я не хотела ничего.",
      charCount: 0,
      engagementAnalysis: {
        perSentence: [
          { sentence: "Это было 15 лет назад, но я все еще помню.", score: 60, reasons: ["temporal hook"] },
          { sentence: "Я сидела на ступеньках и смотрела на дождь.", score: 55, reasons: ["specific imagery"] },
          { sentence: "Мне было одиноко.", score: 70, reasons: ["emotional directness"] },
          { sentence: "Быть может, мама была права.", score: 75, reasons: ["conflict", "character dynamic"] },
          { sentence: "Да, это сложно объяснить.", score: 65, reasons: ["authentic uncertainty"] },
          { sentence: "Но тогда мне казалось, что мир кончился.", score: 80, reasons: ["dramatic emotion", "teen perspective"] },
          { sentence: "Я не хотела ничего.", score: 70, reasons: ["depression authentically rendered"] }
        ],
        overall: {
          averageScore: 68,
          lowestScoringSentence: "Я сидела на ступеньках и смотрела на дождь.",
          totalSentenceCount: 7
        }
      },
      aiConfidence: 82
    },
    {
      id: 4,
      content: "В тот день я просто сидела дома. Читала книгу. Ничего не происходило. И это было хорошо. Мне не нужны были приключения. Я люблю тишину. Да, возможно, это не для всех. Но для меня это норма. Я счастлива так.",
      charCount: 0,
      engagementAnalysis: {
        perSentence: [
          { sentence: "В тот день я просто сидела дома.", score: 30, reasons: ["passive opening"] },
          { sentence: "Читала книгу.", score: 35, reasons: ["routine activity"] },
          { sentence: "Ничего не происходило.", score: 25, reasons: ["anti-drama", "low stakes"] },
          { sentence: "И это было хорошо.", score: 40, reasons: ["mild positive"] },
          { sentence: "Мне не нужны были приключения.", score: 45, reasons: ["character preference"] },
          { sentence: "Я люблю тишину.", score: 50, reasons: ["authentic preference"] },
          { sentence: "Да, возможно, это не для всех.", score: 55, reasons: ["acknowledges difference"] },
          { sentence: "Но для меня это норма.", score: 50, reasons: ["self-acceptance"] },
          { sentence: "Я счастлива так.", score: 60, reasons: ["positive resolution"] }
        ],
        overall: {
          averageScore: 44,
          lowestScoringSentence: "Ничего не происходило.",
          totalSentenceCount: 9
        }
      },
      aiConfidence: 45
    }
  ];

  console.log("ТЕСТ-СЦЕНАРИЙ #1: Базовый демо");
  console.log("===============".repeat(3));
  console.log();

  mockEpisodes.forEach((episode, index) => {
    const classification = classifyEpisode(episode);
    console.log(`\n📊 ЭПИЗОД #${episode.id}: ` + `"${episode.content.substring(0, 60)}..."`);
    console.log(`   AI: ${episode.aiConfidence}% | Engagement: ${episode.engagementAnalysis?.overall?.averageScore}%`);
    console.log(`   РЕШЕНИЕ: ${classification.status} (${classification.reason})`);
    console.log(`   Приоритет: ${classification.priority}`);
    
    if (classification.status === 'REWRITE') {
      console.log(`   🎯 Целевой engagement: ${classification.targetEngagement}%`);
    }
  });

  console.log("\n\n🎯 ПРОГНОЗ СОКРАЩЕНИЯ (ROI):");
  console.log("===============".repeat(3));
  const toRewrite = mockEpisodes.filter(e => 
    (e.aiConfidence > 70) || 
    (e.engagementAnalysis?.overall?.averageScore < 45 && e.aiConfidence < 45)
  ).length;
  
  console.log(`✅ Оставляем: ${mockEpisodes.length - toRewrite} эпизодов (пропускаем)`);
  console.log(`🔴 Переписываем: ${toRewrite} эпизодов (оптимизируем)`);
  console.log(`📈 Экономия токенов: ${((mockEpisodes.length - toRewrite) / mockEpisodes.length * 100).toFixed(0)}%`);

  console.log("\n\n" + "=".repeat(70));
  console.log("✅ AUTOFIX ORCHESTRATOR DEMO ЗАВЕРШЁН УСПЕШНО");
  console.log("=".repeat(70));
}

function classifyEpisode(episode: Episode): ProblemAnalysis {
  const avgEngagement = episode.engagementAnalysis?.overall?.averageScore || 0;
  const aiConfidence = episode.aiConfidence || 0;

  if (aiConfidence > 70) {
    return {
      episodeId: episode.id,
      aiConfidence: aiConfidence,
      engagementScore: avgEngagement,
      status: 'REWRITE',
      reason: 'AI_DETECTED',
      priority: avgEngagement < 45 ? 'CRITICAL' : 'HIGH',
      targetEngagement: Math.max(65, avgEngagement + 20),
    };
  }

  if (avgEngagement < 45 && aiConfidence < 45) {
    return {
      episodeId: episode.id,
      aiConfidence: aiConfidence,
      engagementScore: avgEngagement,
      status: 'LEAVE',
      reason: 'BORING_BUT_AUTHENTIC',
      priority: 'LOW',
    };
  }

  return {
    episodeId: episode.id,
    aiConfidence: aiConfidence,
    engagementScore: avgEngagement,
    status: 'LEAVE',
    reason: 'OK',
    priority: 'LOW',
  };
}

type ProblemAnalysis = {
  episodeId: number;
  aiConfidence: number;
  engagementScore: number;
  status: 'LEAVE' | 'REWRITE';
  reason: 'OK' | 'AI_DETECTED' | 'BORING_BUT_AUTHENTIC';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  targetEngagement?: number;
};

// Run the demo
runAutoFixDemo().catch(console.error);