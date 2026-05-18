/**
 * DebtTracker — Snake Eyes campaign's persistent primary pressure
 * counter.
 *
 * Ardax leaves Talavar owing the House 800g. Every mission applies
 * interest (+50g) and leak surcharges (+5g per leaked creep);
 * declining all three Pactbook draws adds a penalty (+20g). Winning
 * a mission pays Debt down by `100 + (50 × Divergence)`, where
 * Divergence is the per-mission risk-tally from accepted Wagers
 * (see DivergenceTracker — commit 4).
 *
 * The bite arrives late: cross a Debt threshold and the Dealer pulls
 * a lever (bounty wave, repossess tower, void a Wager slot) — see
 * DealerActions, commit 9. If Ardax has paid down early on risky
 * Pacts, the late thresholds stay out of reach. If he's deferred,
 * the campaign closes in geometrically.
 *
 * Persistence: `PlayerProfile.campaignState['void']` via the shared
 * CampaignState plumbing. This module owns the Debt + first-mission
 * fields of `SnakeEyesState`; sibling modules (Divergence, Pactbook,
 * Theris, Collector) fill their slots in subsequent commits. The
 * whole shape is declared here so editors see one source of truth.
 *
 * Design rationale: see docs/snake-eyes-campaign-plan.md (§2 "Debt ×
 * Divergence").
 */

import { CampaignState } from '../campaign/CampaignState';

const FACTION_ID = 'void';

// ─── Persistent state shape ──────────────────────────────────────

/** Per-mission Pactbook accept/decline tally. Persists campaign-wide
 *  so the M10 epilogue composer can read the final pattern (risk-
 *  taker vs cashout vs mixed). Owned by Pactbook (commit 5). */
export interface PactbookTally {
  acceptedT1: number;
  acceptedT2: number;
  acceptedT3: number;
  declined: number;
  succeeded: number;
  failed: number;
}

/** Status of Theris, the partner gambler. Starts 'with_ardax'; flips
 *  to 'cashed_out' at the end of M6 (her vanishing beat). Owned by
 *  TheresInterludes (commit 13). Read by the M10 epilogue composer. */
export type TherisStatus = 'with_ardax' | 'cashed_out';

/** The persistent slot for Snake Eyes. Sibling-commit fields are
 *  placeholders here so the single-source-of-truth shape is editable
 *  in one file. Defaults below populate the field on first read. */
export interface SnakeEyesState {
  // ─── Owned by DebtTracker (this module) ───────────────────────
  /** How much Ardax owes the House. Starts at 800. Can go negative
   *  ("settled with the House" — paid more than owed). */
  debt: number;
  /** Becomes true on the first call to `applyMissionStart`. Used to
   *  gate the M1 "fresh game — no interest applied" rule. */
  firstMissionStarted: boolean;

  // ─── Owned by DivergenceTracker (commit 4) ────────────────────
  /** Snapshot of the most-recent mission's final Divergence (0-10).
   *  Persisted only so the HUD + epilogue can read "last mission
   *  ran at 7/10 risk." NOT the live counter — that lives in-mission
   *  on DivergenceTracker. */
  lastMissionDivergence: number;

  // ─── Owned by Pactbook (commit 5) ─────────────────────────────
  /** Campaign-wide tally of Pactbook acceptance / refusal / outcome.
   *  Read by the M10 epilogue composer to pick fragments matching
   *  the player's dominant pattern. */
  pactbookTally: PactbookTally;

  // ─── Owned by TheresInterludes (commit 13) ────────────────────
  theresStatus: TherisStatus;

  // ─── Owned by Collector boss creep (commit 14) ────────────────
  /** Mission idx (0..9) in which Ardax killed the Collector, or null
   *  if not yet defeated. Defeating the Collector cancels the NEXT
   *  mission's interest charge (see applyMissionStart). */
  collectorDefeatedAt: number | null;
}

// ─── Constants ───────────────────────────────────────────────────

/** Starting Debt at M1. */
export const INITIAL_DEBT = 800;
/** Interest applied at the start of every mission after the first.
 *  Can be cancelled for one mission by defeating the Collector in
 *  the prior mission (collectorDefeatedAt). */
export const INTEREST_PER_MISSION = 50;
/** Debt added per creep that leaks this mission. */
export const LEAK_SURCHARGE = 5;
/** Debt added when the player declines all three Pactbook draws. */
export const DECLINE_PENALTY = 20;
/** Base paydown when the mission is won. Multiplied by Divergence. */
export const PAYDOWN_BASE = 100;
/** Per-Divergence-point paydown multiplier. Total paydown =
 *  PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE × divergence. */
export const PAYDOWN_PER_DIVERGENCE = 50;

export const DEFAULT_SNAKE_EYES_STATE: SnakeEyesState = {
  debt: INITIAL_DEBT,
  firstMissionStarted: false,
  lastMissionDivergence: 0,
  pactbookTally: {
    acceptedT1: 0,
    acceptedT2: 0,
    acceptedT3: 0,
    declined: 0,
    succeeded: 0,
    failed: 0,
  },
  theresStatus: 'with_ardax',
  collectorDefeatedAt: null,
};

// ─── Accessors ───────────────────────────────────────────────────

/** Read the current Snake Eyes state, defaulting on first read. Does
 *  NOT persist the default — persistence happens on the next mutation. */
export function getSnakeEyesState(): SnakeEyesState {
  return CampaignState.get<SnakeEyesState>(FACTION_ID, DEFAULT_SNAKE_EYES_STATE);
}

/** Replace the persisted state wholesale. Internal — callers should
 *  prefer the typed mutators below. Exported for tests + the future
 *  EpilogueComposer that reads + writes derived snapshots. */
export function setSnakeEyesState(next: SnakeEyesState): void {
  CampaignState.set<SnakeEyesState>(FACTION_ID, next);
}

/** Current Debt. */
export function getDebt(): number {
  return getSnakeEyesState().debt;
}

// ─── Mutators (Debt lifecycle) ───────────────────────────────────

/** Apply mission-start effects:
 *
 *    - First mission: no interest. Flips `firstMissionStarted = true`.
 *    - Subsequent missions: +INTEREST_PER_MISSION unless the prior
 *      mission's Collector was defeated (collectorDefeatedAt is set
 *      AND equals the prior mission's idx). After applying, the
 *      collectorDefeatedAt flag is cleared so the cancellation is
 *      one-shot.
 *
 *  Returns the Debt-delta applied (positive = added). Callers can
 *  surface this to the UI ("Interest +50g") if desired.
 */
export function applyMissionStart(currentMissionIdx: number): number {
  const state = getSnakeEyesState();
  if (!state.firstMissionStarted) {
    setSnakeEyesState({ ...state, firstMissionStarted: true });
    return 0;
  }

  // Collector cancellation: defeated in immediately-preceding mission.
  const collectorCancels =
    state.collectorDefeatedAt !== null &&
    state.collectorDefeatedAt === currentMissionIdx - 1;

  if (collectorCancels) {
    // One-shot: clear the flag.
    setSnakeEyesState({ ...state, collectorDefeatedAt: null });
    return 0;
  }

  setSnakeEyesState({ ...state, debt: state.debt + INTEREST_PER_MISSION });
  return INTEREST_PER_MISSION;
}

/** Apply per-mission leak surcharges. Called from the leak handler
 *  in GameScene during Snake Eyes missions. Adds `leakCount × LEAK_SURCHARGE`
 *  to Debt and returns the delta applied. */
export function applyLeaks(leakCount: number): number {
  if (leakCount <= 0) return 0;
  const state = getSnakeEyesState();
  const delta = leakCount * LEAK_SURCHARGE;
  setSnakeEyesState({ ...state, debt: state.debt + delta });
  return delta;
}

/** Apply the decline penalty for a mission where the player rejected
 *  all three Pactbook draws. Idempotent on the same mission — callers
 *  should only invoke once per mission. Returns delta applied. */
export function applyDeclinePenalty(): number {
  const state = getSnakeEyesState();
  setSnakeEyesState({ ...state, debt: state.debt + DECLINE_PENALTY });
  return DECLINE_PENALTY;
}

/** Apply mission-win paydown. `divergence` is the player's accepted-
 *  Wager risk-tally for the mission (0-10, capped). Returns the
 *  Debt-delta applied (negative = paid down). */
export function applyWinPaydown(divergence: number): number {
  // Defensive NaN guard — divergence is integer-clean in normal
  // paths (DivergenceTracker.getCurrent), but a runtime corruption
  // here would silently NaN the Debt counter forever. Cheap.
  const safe = Number.isFinite(divergence) ? divergence : 0;
  const clamped = Math.max(0, Math.min(10, Math.floor(safe)));
  const state = getSnakeEyesState();
  const delta = -(PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE * clamped);
  setSnakeEyesState({ ...state, debt: state.debt + delta });
  return delta;
}

/** Mark the Collector as defeated in the given mission. The next
 *  call to applyMissionStart will treat this as the trigger for
 *  the one-shot interest cancellation. */
export function markCollectorDefeated(missionIdx: number): void {
  const state = getSnakeEyesState();
  setSnakeEyesState({ ...state, collectorDefeatedAt: missionIdx });
}

/** Test-only reset: wipe the persisted slot back to defaults. */
export function resetSnakeEyesState(): void {
  CampaignState.reset(FACTION_ID);
}
