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
 * Default character budget for LONGFORM articles (10000-12000 chars with spaces)
 * - Lede: ~600-900 chars (500-750 symbols without spaces)
 * - Episodes: adjustable based on episode count  
 * - Finale: ~1200-1800 chars (1000-1500 symbols without spaces)
 * 
 * Total: 12000 characters (with spaces) = ~10000 symbols (without spaces)
 * This aligns with editorial spec: "7000-10000 symbols" (non-space characters)
 * 
 * Note: "Символы без пробелов" = we count characters, not words
 */
export const CHAR_BUDGET = 12000;

/**
 * SYMBOL_BUDGET_WITHOUT_SPACES - Editorial requirement from client spec
 * Client requires: 7000-10000 символов (без пробелов)
 * Our system: 12000 chars (with spaces) × 0.8 = ~9600 symbols (without spaces)
 */
export const SYMBOL_BUDGET_WITHOUT_SPACES = {
  min: 7000,
  max: 10000,
  target: Math.round(CHAR_BUDGET * 0.8), // ~9600 symbols
  currentFormat: "СЛЕДИМ ЗА СИМВОЛАМИ БЕЗ ПРОБЕЛОВ (используем CHAR_BUDGET × 0.8)"
};

/**
 * Budget allocation guidelines (calculated dynamically)
 * These are RECOMMENDED defaults, not hardcoded constraints
 */
export const BUDGET_ALLOCATIONS = {
  LEDE_BUDGET_MIN: 600,
  LEDE_BUDGET_MAX: 900,
  FINALE_BUDGET_MIN: 1200,
  FINALE_BUDGET_MAX: 1800,
  AVG_EPISODE_CHARS_BASE: 1500, // Average per episode at 12 episodes (calculated dynamically)
  MIN_EPISODES: 6,
  MAX_EPISODES: 15,
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
