# 🎭 ZenMaster v7.1 - Complete Pipeline Architecture

**ПОЛНАЯ логика генерации статей: тема → эпизоды → hard restoration → image generation → публикация**

> ℹ️ This document consolidates all ai_work/ documentation into ONE authoritative source  
> Last Updated: 2026-01-05  
> Version: 7.1  
> Status: ✅ Ready for Implementation

---

## 📋 СОДЕРЖАНИЕ

1. [Overview](#overview-общий-поток)
2. [Phase A: Theme & Concept](#phase-a--тема-и-концепция)
3. [Phase B: Episode Generation](#phase-b--генерация-эпизодов)
4. [Phase C: Assembly & Restoration](#phase-c--сборка--финальная-реставрация)
5. [Phase D: Image Generation](#phase-d--генерация-изображений)
6. [Phase E: Export & Publish](#phase-e--export--publish)
7. [Stage Gates & Quality Standards](#stage-gates--quality-standards)
8. [Voice Restoration Details](#voice-restoration-details)
9. [Error Scenarios](#error-scenarios)
10. [Metrics & Monitoring](#metrics--monitoring)

---

## 📊 OVERVIEW - ОБЩИЙ ПОТОК

```
ТЕМА
  ↓
[PHASE A: 5-10 мин] Theme Selection + Research + Plot Bible
  ↓
[PHASE B: ~20 мин] Generate 6-8 Episodes (per-episode processing)
  - B1: Generate Episode Text
  - B2: Per-Episode Anti-Detection (Phase2 >= 80)
  - B3: Voice Polish
  - B4: Per-Episode Light Restoration ← ⚠️ MISSING!
  ↓
[PHASE C: ~8 мин] Assembly + Final Restoration
  - C1: Assembly (join episodes)
  - C1 CHECK: Logic Continuity
  - C2: HARD Restoration of FULL article ← ⚠️ CRITICAL MISSING!
  - C2 VALIDATION: Phase2 >= 85 (iterative)
  ↓
[PHASE D: ~5 мин] Image Generation (4 stages)
  - D1: Extract Key Scene ← NEW
  - D2a: Generate Base Image (Gemini)
  - D2b: Canvas Post-Processing
  - D3: Mobile Photo Authenticity (DYNAMIC device!)
  - D4: Attach to Article
  ↓
[PHASE E: ~2 мин] Export & Publish
  ↓
📊 OUTPUT: Ready for Publication
   - Article: 15-20K chars, Phase2=85+, Grammar=PASS
   - Image: 1280x720, Device-authentic
   - Time: 35-40 minutes total
```

(See full document on GitHub for complete implementation details)

---

**Status**: ✅ Complete Documentation | 🔴 Implementation Missing (B4, C2)  
**Version**: 7.1  
**Updated**: 2026-01-05  
**Ready**: For development + implementation