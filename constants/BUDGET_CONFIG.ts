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
 * - ONE place where budget is defined: CHAR_BUDGET = 19000
 * - All services import and use this value
 * - Services can override via constructor params if needed
 * - NO duplication, NO conflicts
 */

/**
 * Default character budget for LONGFORM articles
 * - Lede: ~6-7 minutes (600-900 chars)
 * - Episodes: adjustable based on episode count  
 * - Finale: ~12-15 minutes (1200-1800 chars)
 * 
 * Total: 19000 characters (reduced from 29000 to tighten content)
 */
export const CHAR_BUDGET = 19000;

/**
 * Budget allocation guidelines (calculated dynamically)
 * These are RECOMMENDED defaults, not hardcoded constraints
 */
export const BUDGET_ALLOCATIONS = {
  LEDE_BUDGET_MIN: 600,
  LEDE_BUDGET_MAX: 900,
  FINALE_BUDGET_MIN: 1200,
  FINALE_BUDGET_MAX: 1800,
  AVG_EPISODE_CHARS_BASE: 3200, // Average per episode at 12 episodes (calculated dynamically)
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
