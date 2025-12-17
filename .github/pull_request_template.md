# 🎬 ZenMaster v2.0 Phase Implementation PR

## Type of Change
- [ ] Phase 1: Type Definitions + MultiAgentService (COMPLETE - ready to review)
- [ ] Phase 2: Montage Service
- [ ] Phase 3: Humanization Service (6 levels)
- [ ] Phase 4: Quality Control Pipeline
- [ ] Integration/Fixes

## Description

This PR implements ZenMaster v2.0 multi-agent architecture for generating 35-40K character longform articles.

### What's included in this PR

- [ ] Type definitions (Episode, OutlineStructure, LongFormArticle)
- [ ] MultiAgentService (Stages 0-1)
- [ ] ContentAgent (parallel ×12 episodes)
- [ ] ContextManager (cross-episode synchronization)
- [ ] GitHub Actions workflow (every 3 hours)
- [ ] Documentation

## Testing

### Local Validation
```bash
# Compilation
npm run build

# Type checking
npx tsc --noEmit

# Linting (if applicable)
npm run lint

# Generate test article
GEMINI_API_KEY=sk-... npx ts-node cli.ts generate:v2 \
  --theme="Test theme for CI" \
  --angle="confession" \
  --emotion="triumph"
```

### Expected Results
- ✅ No compilation errors
- ✅ All types valid
- ✅ Article generated successfully
- ✅ Character count: 32-40K
- ✅ Reading time: 6-10 minutes
- ✅ Episodes: 9-12
- ✅ Scenes: 8-10
- ✅ Dialogues: 6-10

## Article Metrics

**Test Run Results**:
- Total characters: ___ (expected: 32-40K)
- Reading time: ___ minutes (expected: 6-10)
- Episode count: ___ (expected: 9-12)
- Scene count: ___ (expected: 8-10)
- Dialogue count: ___ (expected: 6-10)
- Generation time: ___ minutes (expected: 8-10)

## Multi-Agent Architecture Components

### Stage 0: Outline Engineering
- [ ] Generates 12-episode structure
- [ ] Dual tension lines (external + internal)
- [ ] Uses Gemini 2.5 Flash
- [ ] JSON output validation

### Stage 1: Parallel Draft
- [ ] ContentAgent ×12 agents
- [ ] Batch processing (3 agents at a time)
- [ ] ContextManager synchronization
- [ ] Uses Gemini 2.5-Flash
- [ ] 2400-3200 chars per episode

### Stage 2-4: (Future Phases)
- [ ] Phase 2: Montage (strengthen open loops)
- [ ] Phase 3: Humanization (6-level voice editing)
- [ ] Phase 4: Quality Control (AI-detection, pre-pub checks)

## Related Documentation

Please review these documents before merging:
- 📖 [ZENMASTER_V2_README.md](ZENMASTER_V2_README.md) — Overview
- 📋 [AI_AGENT_TECH_SPEC.md](AI_AGENT_TECH_SPEC.md) — Technical specification
- 📚 [zenmaster-v2-arch.md](../zenmaster-v2-arch.md) — Full architecture
- 🔧 [integration-guide.md](../integration-guide.md) — Integration steps

## GitHub Actions

### Workflow: Generate Every 3 Hours

**File**: `.github/workflows/generate-every-3-hours.yml`
**Trigger**: Every 3 hours (cron schedule)
**Runs on**: Ubuntu latest
**Timeout**: 30 minutes

**What it does**:
1. 🎲 Selects random theme from predefined list
2. 🔀 Selects random angle (confession/scandal/observer)
3. 😊 Selects random emotion (triumph/guilt/shame/liberation/anger)
4. 📝 Runs `generate:v2` CLI command
5. 💾 Commits metadata to `generated/articles/`
6. 📦 Uploads artifact (90-day retention)

**Schedule**:
- 00:00 UTC
- 03:00 UTC
- 06:00 UTC
- 09:00 UTC
- 12:00 UTC
- 15:00 UTC
- 18:00 UTC
- 21:00 UTC

## Quality Checklist

### Code Quality
- [ ] No TypeScript compilation errors
- [ ] No `console.log` debug statements (except info logging)
- [ ] Proper error handling
- [ ] Memory usage optimized for 35K generation
- [ ] No hardcoded secrets

### Architecture
- [ ] Follows multi-agent pattern
- [ ] ContextManager properly synchronizes across agents
- [ ] OpenLoop implementation validated
- [ ] Dual tension (external + internal) maintained

### Performance
- [ ] Generation time: 8-10 minutes
- [ ] Gemini API quota checked
- [ ] Parallel batch processing working
- [ ] No memory leaks detected

### Testing
- [ ] Local test passed ✅
- [ ] Workflow test passed ✅
- [ ] 3+ different themes tested
- [ ] Article metrics within targets

## Checklist Before Merge

- [ ] All tests passing
- [ ] Code reviewed
- [ ] No merge conflicts
- [ ] Documentation updated
- [ ] GitHub Actions configured
- [ ] GEMINI_API_KEY added to Secrets
- [ ] Branch protection rules followed

## Next Steps After Merge

- [ ] Monitor workflow runs in Actions
- [ ] Collect 10+ generated articles for Phase 2 testing
- [ ] Start Phase 2 (Montage Service) development
- [ ] Plan Phase 3-4 features

## Related Issues

Closes #__ (if applicable)
Related to ZenMaster v2.0 Multi-Agent Architecture

---

## Reviewer Notes

This PR represents Phase 1 of ZenMaster v2.0 implementation. Phase 2-4 will follow in subsequent PRs.

**Key Files**:
- `types/ContentArchitecture.ts` — Type system
- `services/multiAgentService.ts` — Main service logic
- `.github/workflows/generate-every-3-hours.yml` — Automation
- `ZENMASTER_V2_README.md` — User documentation

**Important**: Ensure GEMINI_API_KEY is configured in repository secrets before merging.
