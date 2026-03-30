# TRAVEL BLOG FIX - Summary of Changes

## Problem Identified
Articles for `ethno-food-ritual` channel were being generated in **dramatic story style** (women-35-60 format) instead of **travel blog style**.

### Symptoms
- Articles had melodramatic structure (Lede → Development → Climax → Resolution → Finale)
- Emotional patterns suited for family dramas, not travel narratives
- Voice habits included "apologyPattern", "angerPattern" - inappropriate for travel blogs
- Quality gates referenced "antagonist reaction" and "emotional arc" from drama format

## Root Cause
The prompt system was using **dramatic story templates** originally designed for the `women-35-60` channel, which were never properly adapted for travel blog channels.

## Files Changed

### 1. `/prompts/stage-0-plan.md`
**Before:** Drama-style plot architecture with voice habits for emotional patterns
**After:** Travel blog plot architecture focused on:
- Real locations and prices
- Sensory palette (smells, sounds, textures)
- 5-phase travel narrative (Recall → Arrival → Interaction → Insight → Anchor)
- NO melodrama, NO antagonists

### 2. `/prompts/stage-1-episodes.md`
**Before:** Episode writer with dramatic tension and conflict arcs
**After:** Travel episode writer with:
- Authentic travel narrative structure
- Sensory realism (dust, food, animals, weather)
- Baton's reactions as narrative device
- Real prices and place names required
- NO reduced lexicon, NO slang

### 3. `/prompts/stage-2-assemble.md`
**Before:** Dramatic story assembly (Lede/Development/Climax/Resolution/Finale)
**After:** Travel blog assembly with:
- **Открытие** (Opening) instead of Lede
- **Путь** (Journey) instead of Development
- **Встреча** (Meeting) instead of Climax
- **Отдых** (Rest) instead of Resolution
- **Итоги** (Summary) instead of Finale
- Explicit prohibition of melodrama ("невестки", "свекрови", etc.)

### 4. `/prompts/stage-3-restore.md`
**Before:** Voice restoration optimized for women-35-60 audience
**After:** Voice restoration for travel blogs with:
- Travel blog authenticity requirements
- Natural conversational phrases (not drama particles)
- Real prices and names preservation
- Baton as full travel companion
- NO drama, NO melodrama

### 5. `/prompts/shared/voice-guidelines.md`
**Before:** Generic voice guidelines with conflicting rules
**After:** Travel-specific voice guidelines with:
- Clear character definitions (Author 50+ traveler, Baton the dog)
- Sensory requirements (smells, sounds, textures, tastes)
- Practical details requirements (prices, names, distances)
- Forbidden content list (slang, melodrama, AI markers, clichés)
- Good style examples for travel writing

### 6. `/prompts/shared/quality-gates.md`
**Before:** Drama-focused gates (antagonist, emotional arc, conflict resolution)
**After:** Travel blog gates with:
- Travel authenticity checks (real prices, names, places)
- Baton consistency checks
- Cultural respect requirements
- Budget transparency requirements
- Forbidden content auto-reject (family dramas, fictional characters)

### 7. `/prompts/shared/archetype-rules.md`
**Before:** Generic archetypes with drama undertones
**After:** Travel-specific archetypes:
- **БРОДЯГА (NOMAD):** Road, borders, discomfort, survival
- **ГАСТРО-ИССЛЕДОВАТЕЛЬ (FOODIE):** Markets, food rituals, recipes
- **МОЛЧАЛИВЫЙ НАБЛЮДАТЕЛЬ (OBSERVER):** Ruins, mountains, silence, eternity
- Clear sensory focus for each archetype
- NO melodrama, NO artificial conflicts

### 8. `/services/multiAgentService.ts`
**Before:** Outline JSON with drama-style voiceHabits (apologyPattern, angerPattern, etc.)
**After:** Outline JSON with travel-focused structure:
- Simple narrator description (experienced traveler, observant, calm)
- Sensory palette (smells, sounds, textures)
- Character map (traveler + companion dog)
- Forbidden clichés list expanded

## Expected Results

After these changes, articles generated for `ethno-food-ritual` channel should:

1. **Start with action or sensory detail**, not emotional drama
   - ✅ "Батон чихнул от пыли, а я понял: мы заблудились."
   - ❌ "Меня звали невесткой, но я терпела..."

2. **Include real practical details**
   - ✅ "Жилье: 1500 руб, еда: 450 руб, транспорт: 300 руб"
   - ❌ "Мы потратили немного денег на..."

3. **Show cultural respect**
   - ✅ "Хозяин протянул лепешку так, будто мы сто лет знакомы"
   - ❌ "Эти дикари с их странными обычаями..."

4. **Feature Baton as companion**
   - ✅ "Батон лег рядом, положил голову на лапы"
   - ❌ "Батон жалобно скулил" (unless actually in danger)

5. **End with budget and teaser**
   - ✅ "ЗАВТРА ЕДЕМ ДАЛЬШЕ. А вы когда-нибудь чувствовали...?"
   - ❌ "И я поняла, что всё кончено..."

## Testing Recommendation

Run the following command to test the fix:

```bash
cd /home/varsmana/dzen/dzen
node --import tsx cli.ts both --count=1 --channel=ethno-food-ritual --images
```

Check the generated article for:
- [ ] No melodrama or family conflicts
- [ ] Real prices and place names
- [ ] Baton reacting to events (not just present)
- [ ] Sensory details (smells, sounds, textures)
- [ ] Budget breakdown at the end
- [ ] Teaser for next destination
- [ ] Natural conversational tone (not drama, not academic)

## Files NOT Changed (Working Correctly)

- `/config/dzen-channels.config.ts` - Channel configs are correct
- `/travel_examples.json` - Example articles are correct travel blog style
- `/services/travel_examples.json` - Already has correct travel examples

## Next Steps

1. Test article generation with new prompts
2. Validate output against quality gates
3. If needed, fine-tune specific prompt sections
4. Consider adding more travel examples to `travel_examples.json`

---
**Date:** 2026-03-29
**Author:** AI Assistant
**Status:** ✅ COMPLETE - All prompts updated for travel blog format
