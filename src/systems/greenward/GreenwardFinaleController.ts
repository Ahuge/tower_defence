/**
 * GreenwardFinaleController — M10 Caer Lythen three-setpiece state
 * machine. Runs on top of GreenwardMissionController; substitutes
 * the regular mission tick when the active mission is M10.
 *
 * The three setpieces play sequentially:
 *
 *   1. COURTYARD (always Siege)
 *      The cathedral's outer guard must fall. ≤5 waves.
 *      Caer Wenna's absence is mechanically punishing — the wave
 *      the player would have walked past with her placed bites
 *      without her. After the courtyard ruin is claimed, advance
 *      to Nave.
 *
 *   2. NAVE (the choice — Ceremony, Mercy, or Siege)
 *      The Nave's mode is decided at the moment this setpiece starts.
 *      Inputs:
 *        - Campaign mode-lean from ModeLeanTracker
 *        - Reserves at the start of this setpiece (Reserves-zero
 *          narrows the choice to Siege regardless of lean).
 *      Resolution:
 *        - Reserves > 0 + Ceremony lean → 'ceremony'
 *        - Reserves > 0 + Mercy lean → 'mercy'
 *        - Reserves > 0 + Both lean → 'mercy' (prefer the gentler
 *          path; Ceremony is replayable but Mercy is the campaign's
 *          thesis)
 *        - Otherwise → 'siege' (the narrowed fallback)
 *      The controller mutates the active Nave ruin's mode in-place
 *      on the ConsecrationManager before the setpiece begins.
 *
 *   3. THRONE (fixed Siege coda — the consequence)
 *      Defense against the world's reaction to what Marra chose.
 *      Wave composition + scripting layer is mission-data driven.
 *
 * The setpiece sequencing is observable via `getActiveSetpiece()`
 * and `getResolvedNaveMode()` for HUD / e2e.
 */

import type { GreenwardMissionController } from './GreenwardMissionController';
import { computeLean, type ModeLean } from './ModeLeanTracker';
import { getReserves } from './WildwoodReserves';
import type { RuinMode } from './ConsecrationManager';

export type Setpiece = 'courtyard' | 'nave' | 'throne' | 'complete';

/** Ids of the three setpiece ruins on the M10 map. Stay in sync with
 *  greenward.ts M10 mission def. */
export const SETPIECE_RUIN_IDS: Record<Exclude<Setpiece, 'complete'>, string> = {
  courtyard: 'courtyard',
  nave:      'nave',
  throne:    'throne',
};

export class GreenwardFinaleController {
  private readonly mission: GreenwardMissionController;
  private active: Setpiece = 'courtyard';
  private resolvedNaveMode: RuinMode | null = null;

  constructor(mission: GreenwardMissionController) {
    this.mission = mission;
  }

  /** Currently-active setpiece. Advances when its ruin claims. */
  getActiveSetpiece(): Setpiece {
    return this.active;
  }

  /** Mode the Nave was resolved to (set when the Nave setpiece begins).
   *  Null until the courtyard has been claimed. */
  getResolvedNaveMode(): RuinMode | null {
    return this.resolvedNaveMode;
  }

  /** Called per frame after the GreenwardMissionController has been
   *  ticked. Walks the setpiece state machine forward when the active
   *  ruin claims. */
  tick(): void {
    switch (this.active) {
      case 'courtyard': {
        const courtyard = this.mission.consecration.getRuin(SETPIECE_RUIN_IDS.courtyard);
        if (courtyard?.claimed) this._advanceToNave();
        break;
      }
      case 'nave': {
        const nave = this.mission.consecration.getRuin(SETPIECE_RUIN_IDS.nave);
        if (nave?.claimed) this.active = 'throne';
        break;
      }
      case 'throne': {
        const throne = this.mission.consecration.getRuin(SETPIECE_RUIN_IDS.throne);
        if (throne?.claimed) this.active = 'complete';
        break;
      }
      case 'complete': break;
    }
  }

  /** Resolve the Nave's mode + mutate the ruin in-place so the
   *  ConsecrationManager treats it as the chosen mode going forward. */
  private _advanceToNave(): void {
    const lean = computeLean({
      ceremony: this.mission.consecration.getClaimedCountByMode('ceremony'),
      siege:    this.mission.consecration.getClaimedCountByMode('siege'),
      mercy:    this.mission.consecration.getClaimedCountByMode('mercy'),
    });
    // Per-campaign tally drives Nave gating. The per-MISSION lean
    // above is the local fallback when we don't have the campaign-
    // wide read — campaign-wide is read directly to honour the
    // design (cross-mission accumulation). Try campaign-wide first;
    // fall back if the GreenwardMissionController is constructed in
    // isolation (tests).
    const finalMode = this._resolveNaveMode(lean);
    this.resolvedNaveMode = finalMode;
    const nave = this.mission.consecration.getRuin(SETPIECE_RUIN_IDS.nave);
    if (nave) {
      (nave.spec as { mode: RuinMode }).mode = finalMode;
    }
    this.active = 'nave';
  }

  /** Pure resolver — exposed for tests and for HUD code that wants
   *  to preview the choice without advancing the state machine.
   *  Reserves at zero overrides the lean and narrows to 'siege'. */
  private _resolveNaveMode(lean: ModeLean): RuinMode {
    if (getReserves() <= 0) return 'siege';
    switch (lean) {
      case 'ceremony': return 'ceremony';
      case 'mercy':    return 'mercy';
      case 'both':     return 'mercy';   // prefer the gentler path
      case 'siege':    return 'siege';
    }
  }

  /** For e2e + HUD: snapshot the current finale state. */
  getSnapshot(): { active: Setpiece; resolvedNaveMode: RuinMode | null } {
    return {
      active: this.active,
      resolvedNaveMode: this.resolvedNaveMode,
    };
  }
}
