/**
 * 🔧 SINGLE SOURCE OF TRUTH: Character Budget Configuration
 * 
 * This file eliminates budget duplication and ensures all services
 * use the same character budget value throughout the system.
 * 
 * BEFORE (PR❌BLEM):
 * - multiAgentService.ts: maxChars = 29000 (hardcoded)
 * - episodeGeneratorService.ts: TOTAL_BUDGET = 19000 (different!)
 * - articleWorkerPool.ts: who knows what value is used
 * - CONFLICT: Services use different budgets causing confusion
 * 
 * AFTER (SOLUTI✅N):
 * - ONE place where budget is defined: CHAR_BUDGET = 12000
 * - All services import and use this value
 * - Services can override via constructor params if needed
 * - NO duplication, NO conflicts
 */

/**
 * Default character budget for 2026 VIRAL articles (3500-4500 chars with spaces)
 * - Lede: ~500 chars
 * - Episodes: 3-5 segments
 * - Finale: ~800 chars
 * 
 * Total: 4500 characters (with spaces) = ~3600 symbols (without spaces)
 * This is the "Sweet Spot" for 2026 Dzen: 2-3 ad blocks, high read-through rate.
 */
export const CHAR_BUDGET = 4500;

/**
 * SYMBOL_BUDGET_WITHOUT_SPACES - 2026 Optimized
 * Targeting 3000-4000 symbols (without spaces)
 */
export const SYMBOL_BUDGET_WITHOUT_SPACES = {
  min: 3000,
  max: 4000,
  target: Math.round(CHAR_BUDGET * 0.8), // ~3600 symbols
  currentFormat: "2026 STANDARDS: HIGH RETENTION"
};

/**
 * Budget allocation guidelines (calculated dynamically)
 */
export const BUDGET_ALLOCATIONS = {
  LEDE_BUDGET_MIN: 400,
  LEDE_BUDGET_MAX: 600,
  FINALE_BUDGET_MIN: 700,
  FINALE_BUDGET_MAX: 1000,
  AVG_EPISODE_CHARS_BASE: 800, 
  MIN_EPISODES: 3,
  MAX_EPISODES: 6,
} as const;

/**
 * Export budget config for logging/debugging
 */
export const BUDGET_CONFIG = {
  total: CHAR_BUDGET,
  lede: `${BUDGET_ALLOCATIONS.LEDE_BUDGET_MIN}-${BUDGET_ALLOCATIONS.LEDE_BUDGET_MAX}`,
  finale: `${BUDGET_ALLOCATIONS.FINALE_BUDGET_MIN}-${BUDGET_ALLOCATIONS.FINALE_BUDGET_MAX}`,
  episodeBase: BUDGET_ALLOCATIONS.AVG_EPISODE_CHARS_BASE,
};
