/**
 * DivergenceTracker — Snake Eyes campaign's per-mission risk tally.
 *
 * Tracks how far Ardax has drifted from "safe play" in the current
 * mission. Every accepted Wager from the Pactbook adds Divergence
 * by its tier (1 / 2 / 3 for small / medium / high-risk). The
 * counter is capped at 10 — the Counterfactual stops getting more
 * upset past a point.
 *
 * Used by:
 *   - **DebtTracker.applyWinPaydown** — multiplies the Debt paydown
 *     by Divergence at mission end (more risk → more paydown).
 *   - **HUD** — displays "Divergence: N/10" alongside Debt in the
 *     Snake Eyes mission HUD.
 *   - **M10 epilogue** — `lastMissionDivergence` snapshot persisted
 *     into `SnakeEyesState` for the composer to read.
 *   - **M10 Counterfactual boss tactics scaling** — commit 17.
 *
 * Per-mission lifecycle. GameScene constructs one for each Snake
 * Eyes mission at scene init; calling `finalize()` at mission end
 * writes `lastMissionDivergence` into the persisted slot.
 *
 * Pure class, no Phaser dependency. Safe for unit tests.
 *
 * Design rationale: see docs/snake-eyes-campaign-plan.md (§2 "Debt ×
 * Divergence" + the Wager Deck tier table).
 */

import { getSnakeEyesState, setSnakeEyesState } from './DebtTracker';

/** Wager tier as it appears in the Pactbook deck. 1 = small, 2 =
 *  medium, 3 = high-risk. */
export type WagerTier = 1 | 2 | 3;

/** Maximum Divergence value the counter clamps at. Beyond this, more
 *  accepted Wagers don't increase Debt paydown — keeps the late game
 *  from ballooning into unwinnable runaway gains. */
export const MAX_DIVERGENCE = 10;

export class DivergenceTracker {
  private _current: number;

  constructor(initial: number = 0) {
    this._current = clamp(initial);
  }

  /** Current Divergence (0-MAX_DIVERGENCE, integer). */
  getCurrent(): number {
    return this._current;
  }

  /** Add Divergence for an accepted Wager of the given tier. Clamps
   *  at MAX_DIVERGENCE. Returns the new current value (useful for
   *  HUD updates). */
  add(tier: WagerTier): number {
    this._current = clamp(this._current + tier);
    return this._current;
  }

  /** Reset to zero. Typically not needed — a fresh tracker is
   *  constructed per mission — but exposed for testing + edge cases
   *  where a mission needs to mid-clear (e.g. a Wager that "wipes
   *  the slate"). */
  reset(): void {
    this._current = 0;
  }

  /** Persist the current Divergence as `lastMissionDivergence` in
   *  the campaign's SnakeEyesState slot. Called at mission end. The
   *  HUD + epilogue read this for "last mission ran at N/10 risk"
   *  display + ending-fragment selection. */
  finalize(): void {
    const state = getSnakeEyesState();
    setSnakeEyesState({ ...state, lastMissionDivergence: this._current });
  }
}

function clamp(n: number): number {
  if (n < 0) return 0;
  if (n > MAX_DIVERGENCE) return MAX_DIVERGENCE;
  return Math.floor(n);
}

/** Convenience accessor for the last persisted mission's Divergence.
 *  Reads directly from SnakeEyesState; safe to call outside a
 *  mission (returns 0 on a fresh install). */
export function getLastMissionDivergence(): number {
  return getSnakeEyesState().lastMissionDivergence;
}
