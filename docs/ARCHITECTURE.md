## Service Architecture

### Current Services (v4.0.2)

#### Production Services
- **ContentFactoryOrchestrator**: Main orchestration for mass content generation
- **ContentSanitizer**: Content validation and cleaning (v4.9 with authenticity scoring)
- **ArticleWorkerPool**: Parallel article generation (3 concurrent workers)
- **ImageGeneratorAgent**: Production image generation v4.1+ (with PlotBible, validation, fallback)
- **EpisodeGeneratorService**: Episode generation with quality metrics (v4.5)
- **ThemeGeneratorService**: Viral hook generation using dynamic few-shot learning (v5.0)

#### Legacy Services (Still Active)
- **MultiAgentService (v2.0)**: DEPRECATED - Legacy orchestration, being migrated to ContentFactory
  - Still used by: ArticleWorkerPool (legacy support)
  - Replacement: ContentFactoryOrchestrator
  - Migration timeline: Complete by v4.5 (Dec 23, 2025)

- **ImageGeneratorService (v3.5)**: LEGACY - Used by test scripts only
  - Still used by: test-image-functionality.ts, scripts/generateImagePrompt.ts
  - Production replacement: ImageGeneratorAgent
  - Purpose: Simpler testing interface

#### Planned Services (Phase 2 - v4.5, Dec 22-23)
- **Phase2AntiDetectionService**: Anti-detection system (not yet integrated)
- **AdversarialGatekeeper**: Detection simulation and quality gate (not yet integrated)

#### Planned Services (v5.0+, Early 2026)
- **PlaywrightService**: Browser automation for auto-publishing (not yet integrated)

### Service Status Summary

| Service | Status | Version | Used By | Replacement |
|---------|--------|---------|---------|-------------|
| ContentFactoryOrchestrator | Production | v4.0 | CLI factory command | - |
| ContentSanitizer | Production | v4.9 | ContentFactory | - |
| ImageGeneratorAgent | Production | v4.1 | ContentFactory | - |
| EpisodeGeneratorService | Production | v4.5 | ContentFactory | - |
| ThemeGeneratorService | Production | v5.0 | ContentFactory | - |
| MultiAgentService | Deprecated | v2.0 | ArticleWorkerPool | ContentFactoryOrchestrator |
| ImageGeneratorService | Legacy | v3.5 | Test scripts | ImageGeneratorAgent |
| Phase2AntiDetectionService | Planned | v4.5 | Not integrated | - |
| AdversarialGatekeeper | Planned | v4.5 | Not integrated | - |
| PlaywrightService | Planned | v5.0+ | Not integrated | - |

### Migration Path

#### MultiAgentService → ContentFactory
- **Current**: MultiAgentService still generates articles in ArticleWorkerPool
- **Target**: All generation moved to ContentFactoryOrchestrator
- **Timeline**: Migration complete by v4.5 release (Dec 23, 2025)
- **Impact**: No breaking changes expected, internal refactoring only

#### ImageGeneratorService → ImageGeneratorAgent
- **Current**: Test scripts use legacy service
- **Target**: Test scripts updated to use ImageGeneratorAgent
- **Timeline**: Update test scripts after v4.5
- **Impact**: Test-only, no production impact

### Service Documentation

Each service now includes header comments indicating:
- Status (Production/Deprecated/Legacy/Planned)
- Version and timeline
- Usage context
- Replacement service (if deprecated)
- Integration status
- See references to documentation