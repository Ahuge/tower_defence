/**
 * ActiveMissionPactbook — module-level state for the Snake Eyes
 * per-mission Pactbook lifecycle.
 *
 * The bridge between the pre-mission UI (PactbookPanel inside
 * LoadingScreen) and the in-mission consumers (WagerEffectHandler
 * hooks read this for the active wager id at scene init, kill events,
 * wave clears, mission end). Single-instance — Snake Eyes plays one
 * mission at a time and the panel ensures the player resolves the
 * draw before the mission starts.
 *
 * Lifecycle:
 *
 *   begin(rng?)        →  new Pactbook, draw 3, returns the instance
 *                         for the panel to render. Idempotent: calling
 *                         twice replaces the prior instance (covers
 *                         scene re-init / retry flows).
 *   accept(id) / decline()
 *                      →  Driven by PactbookPanel via the Pactbook
 *                         instance directly. This module only watches
 *                         the resolved state via getActiveWager().
 *   resolveAtEnd(result)
 *                      →  Called from snakeEyesMissionStateAspect's
 *                         applyMissionResult. Updates Pactbook tally
 *                         + applies win-paydown for accepted wagers.
 *                         Clears state so the next mission starts
 *                         clean.
 *   clear()            →  Test-only escape hatch / abandoned-mission
 *                         reset.
 *
 * Why a module singleton: the gameplay aspect (per-mission, returned
 * by buildRuntime) and the missionState aspect (per-campaign, on the
 * extension) need to read the SAME accepted-wager state. The panel
 * lives in DOM land; the aspects live in scene land. A shared module
 * is the simplest channel; everything reads the same instance.
 */
import { Pactbook, type Wager } from './Pactbook';
import { applyWinPaydown } from './DebtTracker';
import type { MissionResult } from '../campaign/types';

let _pactbook: Pactbook | null = null;

/** Start a new Pactbook for the upcoming mission. Draws 3 cards
 *  immediately so the panel has something to render on its first
 *  effect cycle. The `rng` is hard to inject from the LoadingScreen
 *  call site; defaults to Math.random (deterministic seeding can
 *  land later by threading a per-mission seed through the
 *  campaignRuntime). */
export function beginMissionPactbook(rng?: () => number): Pactbook {
  _pactbook = new Pactbook(rng ? { rng } : {});
  _pactbook.draw();
  return _pactbook;
}

/** Returns the active Pactbook instance, or null if none has been
 *  begun for this mission. The PactbookPanel passes this directly
 *  to its `pactbook` prop; consumers checking selection should
 *  prefer `getActiveWager()` which reads through the Pactbook. */
export function getMissionPactbook(): Pactbook | null {
  return _pactbook;
}

/** The Wager the player accepted for this mission, or null if no
 *  Pactbook exists, the panel hasn't resolved yet, or the player
 *  chose declineAll. Consumed by WagerEffectHandler hooks at
 *  gameplay time. */
export function getActiveWager(): Wager | null {
  return _pactbook?.getSelected() ?? null;
}

/** True iff the player resolved the panel (accepted OR declined).
 *  Used by LoadingScreen to gate the Begin button — the player
 *  shouldn't be able to enter the mission with the panel still
 *  open. */
export function isMissionPactbookResolved(): boolean {
  return _pactbook?.isResolved() ?? true; // no panel = nothing to resolve
}

/** Called at mission end from snakeEyesMissionStateAspect.
 *  Resolves the accepted Wager's success/fail tally + applies the
 *  base paydown for any wager-success path. Returns the active
 *  wager that was resolved (for analytics / HUD callouts) or null
 *  if there was no accepted wager. */
export function resolveActiveWagerAtMissionEnd(result: MissionResult): Wager | null {
  if (!_pactbook) return null;
  const accepted = _pactbook.getSelected();
  if (accepted) {
    // Tally + success/fail counter update.
    _pactbook.resolveOutcome(result);
    // Apply win-paydown. The Wager effect handler's
    // `getPaydownMultiplier(result)` would scale this in a future
    // commit that wires the mid-mission wager-effect application;
    // for now we apply the base paydown unconditionally on a win.
    if (result.won) {
      // Divergence is the accepted-tier risk. Tier 1 = 1, Tier 2 = 2,
      // Tier 3 = 3 (matches the campaign plan's "Debt × Divergence"
      // shorthand). Future Wager effects will scale this further.
      const divergence = accepted.tier;
      applyWinPaydown(divergence);
    }
  }
  const out = accepted;
  // Clear so the next mission's begin() starts fresh.
  _pactbook = null;
  return out;
}

/** Test-only and emergency-reset hook. Clears the active Pactbook
 *  without resolving (used by abandon-mission flows and unit tests). */
export function _clearMissionPactbook(): void {
  _pactbook = null;
}
