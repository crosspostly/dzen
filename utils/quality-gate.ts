// Проверка качества на каждом этапе

import { AdversarialGatekeeper } from '../services/adversarialGatekeeper';

const gatekeeper = new AdversarialGatekeeper();

export async function qualityGate(
  content: string,
  minPhase2Score: number = 70,
  minLength: number = 3000,
  title: string = "Заголовок"
): Promise<{
  isValid: boolean
  phase2Score: number
  length: number
  issues: string[]
}> {
  const issues: string[] = []
  
  // Проверка 1: Длина
  if (content.length < minLength) {
    issues.push(`Слишком короткая: ${content.length}/${minLength} знаков`)
  }
  
  // Проверка 2: Phase 2 Score
  const assessment = gatekeeper.assessArticle(title, content);
  const phase2Score = assessment.overallScore;
  
  if (phase2Score < minPhase2Score) {
    issues.push(`Phase2 Score низкий: ${phase2Score}/${minPhase2Score}`)
    issues.push(...assessment.issues);
  }
  
  // Проверка 3: Нет запрещённого контента
  const forbidden = ['как язык модели', 'как AI', 'I apologize', 'as an AI']
  for (const word of forbidden) {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      issues.push(`Найден AI-маркер: "${word}"`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    phase2Score,
    length: content.length,
    issues
  }
}
