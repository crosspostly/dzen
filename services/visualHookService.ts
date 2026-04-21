import { VisualHook, VisualPlan } from "../types/VisualHooks";

export class VisualHookService {
  private visualMarkers = {
    objects: [
      "кольцо", "записка", "письмо", "телефон", "экран", "чашка", "кофе", "чай", 
      "окно", "дверь", "чемодан", "сумка", "ключи", "зеркало", "фото", "стол",
      "кровать", "платье", "пальто", "дождь", "снег", "свеча"
    ],
    emotions: [
      "слез", "улыбк", "смех", "дрож", "кулак", "глаз", "лицо", "плеч", "рук"
    ],
    locations: [
      "кухн", "парк", "улиц", "кафе", "вокзал", "метро", "спальн", "офис"
    ]
  };

  /**
   * Анализирует текст и составляет план расстановки визуальных хуков
   */
  public analyzeText(text: string, articleId: string): VisualPlan {
    const paragraphs = text.split("\n\n").filter(p => p.trim().length > 50);
    const hooks: VisualHook[] = [];

    paragraphs.forEach((p, index) => {
      const weight = this.calculateWeight(p);
      if (weight > 0) {
        hooks.push({
          paragraphIndex: index,
          text: p,
          weight: weight,
          suggestedObject: this.detectMarker(p, this.visualMarkers.objects),
          suggestedEmotion: this.detectMarker(p, this.visualMarkers.emotions),
          context: p.substring(0, 200)
        });
      }
    });

    // Выбираем 2-3 лучших хука, распределенных по тексту
    const selectedHooks = this.selectDiverseHooks(hooks, paragraphs.length);

    return {
      hooks: selectedHooks,
      articleId
    };
  }

  /**
   * Считает "визуальный вес" абзаца
   */
  private calculateWeight(text: string): number {
    let weight = 0;
    const lowerText = text.toLowerCase();

    this.visualMarkers.objects.forEach(m => {
      if (lowerText.includes(m)) weight += 2;
    });

    this.visualMarkers.emotions.forEach(m => {
      if (lowerText.includes(m)) weight += 1.5;
    });

    this.visualMarkers.locations.forEach(m => {
      if (lowerText.includes(m)) weight += 1;
    });

    return weight;
  }

  /**
   * Ищет конкретный маркер в тексте
   */
  private detectMarker(text: string, markers: string[]): string | undefined {
    const lowerText = text.toLowerCase();
    return markers.find(m => lowerText.includes(m));
  }

  /**
   * Отбирает хуки так, чтобы они не шли подряд и покрывали всю статью
   */
  private selectDiverseHooks(hooks: VisualHook[], totalParagraphs: number): VisualHook[] {
    if (hooks.length <= 2) return hooks;

    // Сортируем по весу
    const sorted = [...hooks].sort((a, b) => b.weight - a.weight);
    const selected: VisualHook[] = [];

    // Ищем лучший хук в первой трети, второй трети и последней трети текста
    const zones = [
      { start: 0, end: Math.floor(totalParagraphs / 3) },
      { start: Math.floor(totalParagraphs / 3), end: Math.floor(totalParagraphs * 2 / 3) },
      { start: Math.floor(totalParagraphs * 2 / 3), end: totalParagraphs }
    ];

    zones.forEach(zone => {
      const bestInZone = sorted.find(h => 
        h.paragraphIndex >= zone.start && 
        h.paragraphIndex < zone.end &&
        !selected.some(s => Math.abs(s.paragraphIndex - h.paragraphIndex) < 2)
      );
      if (bestInZone) selected.push(bestInZone);
    });

    // Если в зонах не нашли, берем просто топ-2
    if (selected.length < 2) {
      return sorted.slice(0, 2);
    }

    return selected.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
  }
}
