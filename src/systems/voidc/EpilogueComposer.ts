/**
 * EpilogueComposer — Snake Eyes' M10 single-tableau personalised
 * epilogue.
 *
 * Greenward's M10 forked into three hard-coded ending tableaux
 * (Ceremony / Mercy / Siege). Snake Eyes instead ships a SINGLE
 * illustrated tableau + a stitched epilogue paragraph that reads
 * as written-for-this-run. The composer picks one fragment from
 * each of four families and concatenates them:
 *
 *    Debt    × Divergence × Theris × Pactbook-tally
 *      3     ×      3     ×    2   ×       3        =  54 states
 *
 * 11 writer-authored fragments power those 54 reachable epilogues.
 *
 * Selection rules:
 *
 *   - **Debt**: at M10's end, settled (≤ 0), lingering (1..1500),
 *     crushing (>1500).
 *   - **Divergence**: low (0-3), mid (4-7), high (8-10).
 *   - **Theris**: with_ardax (loss before M6 OR M6 loss replays —
 *     the canonical run flips at M6 win, so 'with_ardax' at M10
 *     means the player never beat M6 on a non-replayed run; defensive
 *     handle) vs cashed_out (normal post-M6 state).
 *   - **Pactbook tally dominant tier**: T1 if accepted-T1 > both
 *     T2 and T3; T3 if accepted-T3 > both T1 and T2; T2 otherwise
 *     (default lean for mixed / decline-heavy / no-data runs).
 *
 * Fragments are first-pass prose locked to the campaign's stable-
 * cocky-noir voice. A follow-up polish PR can run a writer-agent
 * sweep on every reachable combination (54 states) for grammar +
 * connector cleanliness.
 *
 * Pure logic. Reads SnakeEyesState at compose time.
 */

import {
  getSnakeEyesState,
  type SnakeEyesState,
  type PactbookTally,
  type TherisStatus,
} from './DebtTracker';

// ─── Fragment families ───────────────────────────────────────────

export type DebtBand = 'settled' | 'lingering' | 'crushing';
export type DivergenceBand = 'low' | 'mid' | 'high';
export type TallyDominantTier = 't1' | 't2' | 't3';

export interface EpilogueAxes {
  debt: DebtBand;
  divergence: DivergenceBand;
  theris: TherisStatus;
  tally: TallyDominantTier;
}

// ─── Writer-authored fragments ───────────────────────────────────
// Each fragment is one sentence. The composer concatenates them in
// fixed order (debt → divergence → theris → tally) with a single
// space between. First-pass prose; polish PR can iterate per state.

const DEBT_FRAGMENTS: Readonly<Record<DebtBand, string>> = {
  settled:
    "The Dealer's ledger came up balanced — I'd paid every column, and the column I'd been was paid.",
  lingering:
    "I owed less than I'd started owing, which is the closest thing to winning a man like me ever managed.",
  crushing:
    "The Debt didn't come down to anything I could carry. The Dealer would collect the rest in pieces over years I wouldn't see.",
};

const DIVERGENCE_FRAGMENTS: Readonly<Record<DivergenceBand, string>> = {
  low:
    "I'd played the road safe by my standards — which Theris would have called reckless and the Counterfactual called fair.",
  mid:
    "I'd picked the cards a man my age was supposed to pick, and a few my age wasn't.",
  high:
    "I'd taken every Wager the Dealer had laid down, the way a man takes every step on a bridge that's already burning.",
};

const THERIS_FRAGMENTS: Readonly<Record<TherisStatus, string>> = {
  with_ardax:
    "Theris was at my shoulder, which was a kindness I hadn't earned and a courtesy she hadn't asked for.",
  cashed_out:
    "Theris was on the other side of the table now. She didn't meet my eye; she didn't have to. The note had said it all.",
};

const TALLY_FRAGMENTS: Readonly<Record<TallyDominantTier, string>> = {
  t1:
    "I'd kept my Wagers small. The Pactbook still had teeth, but they were short ones.",
  t2:
    "I'd played the middle line — middle Wagers, middle rolls, middle cards. The book closed on a man neither saved nor destroyed.",
  t3:
    "Every Wager I'd taken had been a high one. The Pactbook closed on a man who'd argued with the table on its own terms.",
};

// ─── Selection ───────────────────────────────────────────────────

export function debtBand(debt: number): DebtBand {
  if (debt <= 0) return 'settled';
  if (debt <= 1500) return 'lingering';
  return 'crushing';
}

export function divergenceBand(div: number): DivergenceBand {
  if (div >= 8) return 'high';
  if (div >= 4) return 'mid';
  return 'low';
}

export function dominantTier(tally: PactbookTally): TallyDominantTier {
  const t1 = tally.acceptedT1;
  const t2 = tally.acceptedT2;
  const t3 = tally.acceptedT3;
  if (t3 > t1 && t3 > t2) return 't3';
  if (t1 > t2 && t1 > t3) return 't1';
  // Mixed, declined, or otherwise unclear → middle.
  return 't2';
}

/** Pick the 4 axes from a state snapshot. Exported separately so
 *  tests can verify the axis logic without bundling it with prose. */
export function pickAxes(state: SnakeEyesState): EpilogueAxes {
  return {
    debt: debtBand(state.debt),
    divergence: divergenceBand(state.lastMissionDivergence),
    theris: state.theresStatus,
    tally: dominantTier(state.pactbookTally),
  };
}

/** Compose the 4-sentence epilogue from a state snapshot. */
export function composeEpilogue(state: SnakeEyesState = getSnakeEyesState()): string {
  const axes = pickAxes(state);
  return [
    DEBT_FRAGMENTS[axes.debt],
    DIVERGENCE_FRAGMENTS[axes.divergence],
    THERIS_FRAGMENTS[axes.theris],
    TALLY_FRAGMENTS[axes.tally],
  ].join(' ');
}

/** Compose with explicit axes (test convenience + future per-state
 *  writer-agent sweeps). */
export function composeFromAxes(axes: EpilogueAxes): string {
  return [
    DEBT_FRAGMENTS[axes.debt],
    DIVERGENCE_FRAGMENTS[axes.divergence],
    THERIS_FRAGMENTS[axes.theris],
    TALLY_FRAGMENTS[axes.tally],
  ].join(' ');
}

/** All 11 raw fragments exposed for testing + future polish passes. */
export const EPILOGUE_FRAGMENTS = {
  debt: DEBT_FRAGMENTS,
  divergence: DIVERGENCE_FRAGMENTS,
  theris: THERIS_FRAGMENTS,
  tally: TALLY_FRAGMENTS,
} as const;
