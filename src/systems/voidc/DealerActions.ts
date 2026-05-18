/**
 * DealerActions — the House's threshold-gated pressure on Ardax.
 *
 * Read at mission start: given the current Debt, the Dealer picks
 * one or more levers to pull this mission. Each lever activates
 * cumulatively per threshold-crossing (per plan doc §"Debt × Divergence"):
 *
 *   - Debt ≥ 1000g  → +1 bounty wave (extra fast creeps mid-mission).
 *   - Debt ≥ 1300g  → +1 random tower repossession at wave start.
 *   - Debt ≥ 1600g  → +1 Wager slot voided (Pactbook draws 2 instead of 3).
 *   - Debt ≥ 2000g  → +1 MORE bounty wave + +1 MORE voided slot.
 *
 * So at 800g (start) the Dealer is quiet. At 2000g+ he's pushed
 * every lever and a bounty wave fires twice. The geometric
 * intent: defer paying down Debt and the late-mission Dealer
 * shuts the campaign down before the player can recover.
 *
 * Pure function — `computeDealerActions(debt)` reads Debt + returns
 * the structured plan. Runtime application (GameScene applying
 * bounty wave / repossess; Pactbook respecting slotsVoided) lands
 * later in Phase 3. This commit ships the lookup + tests; the call
 * sites integrate when mission wiring lands.
 *
 * Design rationale: see docs/snake-eyes-campaign-plan.md (the
 * Debt × Divergence "bite" table).
 */

import { getDebt } from './DebtTracker';

/** The four published Dealer thresholds. Kept as named constants so
 *  balance changes don't need to track magic numbers across tests +
 *  HUD code. */
export const DEALER_THRESHOLDS = {
  BOUNTY_WAVE: 1000,
  REPOSSESS: 1300,
  VOID_SLOT: 1600,
  EXTRA_BOUNTY_AND_VOID: 2000,
} as const;

/** Action plan computed at mission start. Cumulative (each threshold
 *  ADDS to prior steps), not replacing. */
export interface DealerActions {
  /** Number of additional bounty waves the mission will fire. 0 at
   *  Debt < 1000; 1 at Debt ≥ 1000; 2 at Debt ≥ 2000. */
  bountyWaves: number;
  /** Random tower repossessions at the start of the first real wave.
   *  0 at Debt < 1300; 1 at Debt ≥ 1300. */
  repossesses: number;
  /** Pactbook draws (3 - wagerSlotsVoided) cards. 0 at Debt < 1600;
   *  1 at Debt ≥ 1600; 2 at Debt ≥ 2000. Note: the Pactbook's
   *  `draw(count, ...)` consumes the reduced count value. */
  wagerSlotsVoided: number;
}

const NO_ACTIONS: DealerActions = {
  bountyWaves: 0,
  repossesses: 0,
  wagerSlotsVoided: 0,
};

/** Compute the Dealer's action plan for the given Debt level.
 *  Pure function — no read of campaign state, no side effects.
 *  Callers that want the live Debt should pass `getDebt()`. */
export function computeDealerActions(debt: number): DealerActions {
  if (!Number.isFinite(debt) || debt < DEALER_THRESHOLDS.BOUNTY_WAVE) {
    return { ...NO_ACTIONS };
  }
  const actions: DealerActions = { ...NO_ACTIONS };

  // Threshold 1 — ≥1000: bounty wave.
  actions.bountyWaves += 1;

  // Threshold 2 — ≥1300: + repossess.
  if (debt >= DEALER_THRESHOLDS.REPOSSESS) {
    actions.repossesses += 1;
  }

  // Threshold 3 — ≥1600: + 1 Wager slot void.
  if (debt >= DEALER_THRESHOLDS.VOID_SLOT) {
    actions.wagerSlotsVoided += 1;
  }

  // Threshold 4 — ≥2000: + 1 MORE bounty wave + 1 MORE slot void.
  if (debt >= DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID) {
    actions.bountyWaves += 1;
    actions.wagerSlotsVoided += 1;
  }

  return actions;
}

/** Convenience: compute the Dealer's plan from the live Debt state.
 *  Used by GameScene + Pactbook integration once mission wiring
 *  lands. Pure wrapper around `computeDealerActions(getDebt())`. */
export function liveDealerActions(): DealerActions {
  return computeDealerActions(getDebt());
}

/** Pactbook draw-count helper: the Pactbook normally draws 3; the
 *  Dealer's `wagerSlotsVoided` reduces that. Clamps so the draw
 *  count never goes below 1 (you always see at least one card to
 *  accept-or-decline). */
export function pactbookDrawCountAfterDealer(actions: DealerActions, baseCount: number = 3): number {
  return Math.max(1, baseCount - actions.wagerSlotsVoided);
}
