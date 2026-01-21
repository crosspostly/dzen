// This script generates a test story using the Neuro-Narrative prompt and Skaz engine.
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const TEST_TOPIC = "Измена жены и как героиня обрела себя";
const START_STATE = "Grief/Betrayal";
const TARGET_STATE = "Courage/Self-Discovery";
const HERO_PROFILE = "Woman, 35 years old, previously dependent, now seeking independence. Tone: Confessional.";

const PROMPT_FILE = path.join(__dirname, '../prompts/neuro-narrative.md');
const OUTPUT_FILE = path.join(__dirname, '../neuro_story_test.md');

// --- Simple Skaz Engine Mock (Direct Implementation for JS) ---
class SkazNarrativeEngine {
  constructor() {
    this.particles = ["ведь", "же", "ну", "вот", "вот только", "вот это", "-то", "да вот"];
  }

  applySkazTransformationsExtended(text) {
    let result = text;
    // 1. Basic Particles
    result = this.injectParticles(result);
    // 2. Syntax Dislocation (simple mock)
    result = result.replace(/я вижу/gi, "вижу я");
    result = result.replace(/я знаю/gi, "знаю я");
    // 3. Sensory Details (simple mock)
    result = result.replace(/холодно/gi, "холод вползал под кожу");
    return result;
  }

  injectParticles(text) {
    const sentences = text.split(/([.!?])/);
    const result = [];
    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      if (Math.random() < 0.3 && sentence.trim().length > 10) {
        const particle = this.particles[Math.floor(Math.random() * this.particles.length)];
        sentence = particle + " " + sentence;
      }
      result.push(sentence);
      if (i + 1 < sentences.length) result.push(sentences[i + 1]);
    }
    return result.join("");
  }
}

const engine = new SkazNarrativeEngine();

// --- Mock AI Call ---
async function generateStory(promptContent, theme, startState, targetState, heroProfile) {
  let fullPrompt = promptContent;
  fullPrompt = fullPrompt.replace('{theme}', theme);
  fullPrompt = fullPrompt.replace('{start_state}', startState);
  fullPrompt = fullPrompt.replace('{target_state}', targetState);
  fullPrompt = fullPrompt.replace('{hero_profile}', heroProfile);

  console.log("--- Sending Prompt to AI ---");
  // console.log(fullPrompt); // Uncomment to see full prompt
  console.log("(Prompt loaded successfully)");
  console.log("----------------------------");

  // Mocked AI Response representing the Neuro-Bridge output
  return `
[PHASE 1: SYNCHRONIZATION]
Я помню этот холод. Не тот, что снаружи, а тот, что внутри. Словно тело наполнили свинцом, а душу — ледяной водой. Он сказал "прощай", и мир стал серым. Просто серым. Запах его парфюма — цитрус и что-то терпкое — до сих пор преследует меня, вызывая тошноту. Я смотрела на него, а он — сквозь меня, как будто меня и не было. Пустота. Она такая тяжелая.

[PHASE 2: THE IMPULSE]
Я сидела на кухне, глядя в окно. Моросил мелкий дождь. Пахло сырой землей и пылью. Чашка кофе давно остыла, её горечь казалась единственной реальной вещью в этом мире. И тут я заметила его — крошечный, ярко-красный листок, зацепившийся за ветку куста напротив. Он трепыхался на ветру, такой маленький, но такой упрямый. Он боролся.

[PHASE 3: THE ASCENT]
И что-то щелкнуло. Меня перестал душить этот свинец. Я встала. Руки еще дрожали, но я подошла к окну и открыла его. В комнату ворвался свежий, мокрый воздух. Я сделала глубокий вдох. Потом еще один. Я решила — нет, я просто сделала. Взяла ключи от машины.

[PHASE 4: THE SETBACK]
Я поехала к его новой квартире. Просто посмотреть. Сердце колотилось так, что, казалось, выпрыгнет. У подъезда я увидела их — она выходила из его машины, смеясь. Смеялась над чем-то, что он сказал. И тогда я почувствовала не боль, а ярость. Лютая, всепоглощающая ярость. Я развернулась и поехала прочь, не дав себе ни секунды на сожаление. Я поняла: это не конец, это только начало.

[PHASE 5: THE ANCHOR]
Я вернулась домой. Вошла в ванную. Открыла кран с холодной водой. И плеснула себе в лицо. Ледяная вода обожгла кожу. Я посмотрела в зеркало. Глаза были другие — не пустые, а горящие. Я взяла телефон, зашла в контакты и нажала "Удалить". Потом закрыла крышку ноутбука. Я сделала это. Я справилась.
`;
}

async function main() {
  try {
    const promptContent = fs.readFileSync(PROMPT_FILE, 'utf-8');
    const rawStory = await generateStory(promptContent, TEST_TOPIC, START_STATE, TARGET_STATE, HERO_PROFILE);
    
    // Apply Skaz transformations
    const skazifiedStory = engine.applySkazTransformationsExtended(rawStory);
    
    fs.writeFileSync(OUTPUT_FILE, skazifiedStory, 'utf-8');

    console.log(`\n✅ Test story generated and saved to: ${OUTPUT_FILE}`);
    console.log("--- Generated Story Fragment (Skazified) ---");
    console.log(skazifiedStory);
    console.log("--------------------------------------------");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();