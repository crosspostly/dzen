/**
 * Mascot Configuration
 * Defines the visual and narrative DNA of Baton based on real dog.png.
 */

export const MASCOT_CONFIG = {
  id: 'baton-terrier-mix',
  name: 'Батон',
  species: 'Dog',
  breed_style: 'Scruffy wire-haired terrier mix',
  visual_description: 'Golden-brown (reddish-wheat) scruffy wire-haired dog, distinct white fluffy patch on chest, large erect (pointed) ears, dark expressive eyes, black nose, features a scruffy terrier beard and mustache. Always wearing a bright red bandana around his neck.',
  
  // 🆕 NARRATIVE DYNAMICS (Role Reversal)
  hierarchy: {
    leader: 'Батон',
    assistant: 'Человек (его часто называют "мой белый помощник" или "мой двуногий")',
    philosophy: 'Батон решает, куда идти по запаху, а человек отвечает за логистику, рюкзаки и чеки.'
  },

  // Instructions for Image Generator
  image_prompt_injection: 'The main subject is Baton: a golden-brown scruffy wire-haired terrier dog with large erect ears, a white chest patch, and a red bandana. He looks confident and adventurous. The human assistant is always behind the camera or in the deep background.',
  
  // Instructions for Text Generator
  narrative_traits: {
    standard: 'Baton is a silent witness, reacting to smells and sounds.',
    baton_pov: 'Narrated by Baton. He describes the world through his nose and his canine logic. He treats the human with loving irony as a clumsy but useful "white assistant". NO SLANG.'
  }
};
