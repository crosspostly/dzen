/**
 * Mascot Configuration
 * Defines the visual and narrative DNA of the project's mascot.
 */

export const MASCOT_CONFIG = {
  id: 'white-fluffy-dog',
  name: 'Батон', // Возвращаем имя Батон
  species: 'Dog',
  breed_style: 'Bichon Frise / Maltipoo mix',
  visual_description: 'Small, fluffy white dog, curly soft fur, dark expressive eyes, black nose, playful and curious expression.',
  reference_url: 'https://raw.githubusercontent.com/crosspostly/dzen/main/dog.png',
  
  // Instructions for Image Generator
  image_prompt_injection: 'Include a small fluffy white dog (the travel companion) with curly fur and dark eyes. The dog should be integrated naturally into the travel scene (e.g., sitting on a bench, looking at the street food, or peeking from a backpack).',
  
  // Instructions for Text Generator
  narrative_instruction: 'Mention the dog ("Снежок") as a silent witness or companion. Describe his reactions to smells (food), sounds (rituals), or new places. He adds a layer of reality and emotion to the travel story.'
};
