# 📖 Character Limit Configuration (FIXED)

**Last Updated:** 2025-12-21  
**Status:** ✅ FINAL CONFIGURATION - DO NOT CHANGE WITHOUT REVIEW

---

## 🔴 CRITICAL CONFIGURATION

**ABSOLUTE CHAR LIMIT FOR ALL ARTICLES: 19,000 characters**

This is the MAXIMUM total article length across:
- Lede (introduction)
- Episodes (all 12)
- Finale (conclusion)

**This value is FIXED and should NOT be changed.**

---

## 📊 Character Budget Breakdown

### Total Budget: 19,000 characters

```
┌─────────────────────────────────────────┐
│ TOTAL ARTICLE: 19,000 chars            │
├─────────────────────────────────────────┤
│ Lede (intro):    ~750 chars            │
│ 12 Episodes:     ~16,000 chars         │
│ Finale (outro):  ~1,500 chars          │
├─────────────────────────────────────────┤
│ EPISODES BUDGET: ~1,333 chars per ep   │
└─────────────────────────────────────────┘
```

### Recommended Episode Allocation

For 12 episodes with 16,000 char budget:
- **Avg per episode:** 1,333 characters
- **Min per episode:** 1,100 characters (urgent scenes)
- **Max per episode:** 1,600 characters (climax scenes)
- **Flexibility:** ±300 characters per episode

---

## 🔧 Implementation Files

### Files that MUST use 19,000:

1. **services/articleWorkerPool.ts** (Line ~32)
   ```typescript
   const optimalEpisodes = multiAgentService.calculateOptimalEpisodeCount(19000);
   ```

2. **services/multiAgentService.ts**
   ```typescript
   calculateOptimalEpisodeCount(charLimit: number = 19000) {
     // Uses 19000 as default
   }
   ```

3. **services/episodeGeneratorService.ts**
   ```typescript
   const maxCharsPerEpisode = Math.floor(19000 / episodes);
   ```

4. **README.md** - Documentation
   ```markdown
   - Total article: **19,000 characters max**
   - Per episode: ~1,333 characters
   ```

5. **ARCHITECTURE.md** - Design document
   ```markdown
   Total character budget is fixed at 19,000.
   ```

---

## ❌ WRONG VALUES (Do NOT use)

These are INCORRECT and should be removed:

- ❌ 29,000 characters (TOO LARGE)
- ❌ 26,750 characters (TOO LARGE)
- ❌ Dynamic calculations based on 29,000
- ❌ "Remaining budget" calculations based on anything other than 19,000

---

## ✅ Verification Checklist

Before running factory, verify:

- [ ] articleWorkerPool.ts line 32: `19000` ✓
- [ ] multiAgentService.ts: calculateOptimalEpisodeCount uses `19000` ✓
- [ ] episodeGeneratorService.ts: maxCharsPerEpisode based on `19000` ✓
- [ ] No hardcoded `29000` values in services/ ✓
- [ ] No hardcoded `26750` values in services/ ✓
- [ ] README.md documents: "19,000 characters max" ✓
- [ ] cli.ts passes correct limits ✓

---

## 🔍 How to Search for Wrong Values

```bash
# Find all hardcoded character limits
grep -r "29000\|26750\|27000" services/ --include="*.ts"

# Should return: NOTHING (empty result)

# Find correct 19000 usage
grep -r "19000" services/ --include="*.ts"

# Should return: All files that use the limit
```

---

## 📝 Log Output Format

When running factory, logs should show:

```
📊 Character Budget Analysis:
   Total: 19000 chars
   Lede: 750 chars
   Finale: 1500 chars
   Remaining for episodes: 16750 chars
   Optimal episodes: 12-13 (avg 1340 chars each)
```

**NOT:**
```
❌ Total: 29000 chars (WRONG!)
❌ Remaining for episodes: 26750 chars (WRONG!)
```

---

## 🚀 Deployment Checklist

Before merging to main:

1. ✅ Search repo for `29000` → should find NOTHING
2. ✅ Search repo for `26750` → should find NOTHING  
3. ✅ Search repo for `19000` → should find in ALL config files
4. ✅ Run factory: `npx tsx cli.ts factory --count=1 --channel=test`
5. ✅ Verify output: "19,000 chars" in logs
6. ✅ Export folder shows correct character counts

---

## 💬 FAQ

**Q: Why 19,000 and not 29,000?**  
A: 19,000 is the production limit. Zen requirement.

**Q: Can we increase it to 25,000?**  
A: NO. 19,000 is FIXED. Contact team lead if change needed.

**Q: What if episode needs 1,500 chars?**  
A: Reduce other episodes. Keep total at 19,000.

**Q: Where do I find character limits?**  
A: This file (CHAR_LIMIT_CONFIG.md) + code comments in services/

---

## 📞 Support

If you see logs showing wrong character limits:

1. Check this file ✅
2. Run verification grep commands ✅
3. Review recent changes to services/ ✅
4. Contact: Review PR #XX before merge ✅

---

**LOCK:** This configuration is FROZEN. No changes without review.
