/**
 * Mascot Configuration
 * Defines the visual and narrative DNA of Baton.
 */

export const MASCOT_CONFIG = {
  id: 'white-fluffy-dog',
  name: 'Батон',
  species: 'Dog',
  breed_style: 'Bichon Frise / Maltipoo mix',
  visual_description: 'Small, fluffy white dog, curly soft fur, dark expressive eyes, black nose.',
  
  // 🆕 NARRATIVE DYNAMICS (Role Reversal)
  hierarchy: {
    leader: 'Батон',
    assistant: 'Человек (его часто называют "мой белый помощник" или "мой двуногий")',
    philosophy: 'Батон решает, куда идти по запаху, а человек отвечает за логистику, рюкзаки и чеки.'
  },

  // Instructions for Image Generator
  image_prompt_injection: 'Include a small fluffy white dog (Baton) looking confident. The dog is the main focus. The human assistant can be in the background.',
  
  // Instructions for Text Generator
  narrative_traits: {
    standard: 'Baton is a silent witness, reacting to smells and sounds.',
    baton_pov: 'Narrated by Baton. He describes the world through his nose and his canine logic. He treats the human with loving irony as a clumsy but useful "white assistant". NO SLANG.'
  }
};
