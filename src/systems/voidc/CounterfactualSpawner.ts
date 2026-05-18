/**
 * CounterfactualSpawner — the visual + mechanical escalation of
 * Ardax's safe-play self across Snake Eyes' 10 missions.
 *
 * Three escalating beats (per plan doc §"The Counterfactual"):
 *
 *   - **M2 (idx 1) — silhouette.** A figure on the far ridge.
 *     Renders for ~3 seconds at wave-1 start, fades. No interaction.
 *
 *   - **M4 (idx 3) — mirror tower.** When the player places a tower,
 *     the Counterfactual places a mirror one tile away. Looks like
 *     the player's tower with inverted palette. Fires at half rate.
 *     If the player sells the mirror: Debt -10g but Divergence
 *     resets for the mission.
 *
 *   - **M7 (idx 6) — Mirror Walker creep variant.** Inheritor-style
 *     creep that, on spawn, copies the player's last tower placement
 *     at low probability. Drops double gold when killed.
 *
 * The M10 boss is NOT spawned by this module — it's the final-mission
 * setpiece controller (commit 17, `MirrorLaneController`).
 *
 * Pure logic. GameScene wires:
 *   - M2: a `renderSilhouette` hook reads `getSilhouetteCell()` +
 *     `getSilhouetteVisibleMs()` at wave-1 start, fades the sprite.
 *   - M4: tower-placed callback into `recordPlayerTowerPlacement`,
 *     reads back `getPendingMirrorSpawns()` for the new Counterfactual
 *     tower. Sell-mirror calls into `recordMirrorTowerSold`.
 *   - M7: tower-placed callback into `recordPlayerTowerPlacement`;
 *     creep spawner queries `rollMirrorWalkerCopy()` per spawned
 *     Mirror Walker.
 *
 * Per-mission instance owned by GameScene (constructed if the
 * active beat is anything other than `'none'`).
 */

// ─── Beat dispatch ────────────────────────────────────────────────

export type CounterfactualBeat =
  | 'silhouette'
  | 'mirror_tower'
  | 'mirror_walker'
  | 'none';

/** Which Counterfactual beat the given Snake Eyes mission idx fires.
 *  Non-Snake-Eyes missions return 'none'. Other missions in the
 *  Snake Eyes campaign that don't carry a Counterfactual beat (M1,
 *  M3, M5, M6, M8, M9) also return 'none'. */
import {
  M2_ROAD_WEST,
  M4_FERRYMANS_GAME,
  M7_MIRROR_WALKERS,
} from './SnakeEyesMissionIds';

export function getCounterfactualBeat(missionIdx: number): CounterfactualBeat {
  switch (missionIdx) {
    case M2_ROAD_WEST:      return 'silhouette';
    case M4_FERRYMANS_GAME: return 'mirror_tower';
    case M7_MIRROR_WALKERS: return 'mirror_walker';
    default:                return 'none';
  }
}

// ─── Beat configs ─────────────────────────────────────────────────

/** M2 silhouette beat — single fixed cell, fixed render window. */
export const SILHOUETTE_BEAT = {
  cell: { col: 33, row: 2 } as const,
  visibleMs: 3000,
} as const;

/** M4 mirror-tower beat. */
export const MIRROR_TOWER_BEAT = {
  /** Debt paid down when the player sells a mirror tower. */
  sellDebtReward: -10,
  /** Whether selling a mirror also wipes mission Divergence to 0. */
  sellResetsDivergence: true,
  /** Fire-rate multiplier on the mirror (relative to the original). */
  mirrorFireRateMult: 0.5,
  /** Offset (in cells) from the player's tower to the mirror. */
  offset: { col: 1, row: 0 } as const,
} as const;

/** M7 Mirror Walker beat. */
export const MIRROR_WALKER_BEAT = {
  /** Per-spawn probability that a Mirror Walker copies the player's
   *  last tower placement (instead of behaving like a regular
   *  Inheritor walker). */
  copyChance: 0.15,
  /** Gold multiplier on Mirror Walker kills (vs base Inheritor gold). */
  killGoldMult: 2,
} as const;

// ─── Player placement record ─────────────────────────────────────

export interface PlayerTowerPlacement {
  col: number;
  row: number;
  towerTypeId: string;
}

/** Mirror tower the Counterfactual placed in response to a player
 *  tower. Persisted on the spawner until sold or mission ends. */
export interface MirrorTower extends PlayerTowerPlacement {
  /** Stable id within the spawner, monotonic per mission. Useful
   *  for diff'ing in tests + matching the sell call to the right
   *  mirror when multiple are live. */
  id: number;
  /** True once `recordMirrorTowerSold(id)` was called. */
  sold: boolean;
}

// ─── Spawner state machine ───────────────────────────────────────

/** Result of `rollMirrorWalkerCopy` — either the placement to copy
 *  (with the trait id the spawned creep should carry) or null if
 *  the RNG roll didn't trigger / no prior placement exists. */
export interface MirrorWalkerCopyResult {
  col: number;
  row: number;
  towerTypeId: string;
}

export interface CounterfactualSpawnerOptions {
  rng?: () => number;
}

export class CounterfactualSpawner {
  private readonly beat: CounterfactualBeat;
  private readonly rng: () => number;
  private _silhouetteShownAtMs: number | null = null;

  // M4 state
  private _mirrors: MirrorTower[] = [];
  private _nextMirrorId: number = 1;
  /** Set to true the moment any mirror tower is sold. Surfaces to
   *  GameScene + DivergenceTracker for the Divergence-reset side
   *  effect. */
  private _anyMirrorSoldThisMission: boolean = false;

  // M7 state
  private _lastPlayerPlacement: PlayerTowerPlacement | null = null;

  constructor(missionIdx: number, opts: CounterfactualSpawnerOptions = {}) {
    this.beat = getCounterfactualBeat(missionIdx);
    this.rng = opts.rng ?? Math.random;
  }

  getBeat(): CounterfactualBeat { return this.beat; }

  // ─── M2 silhouette ────────────────────────────────────────────

  /** Record that the silhouette became visible at this scene-time.
   *  GameScene calls once at wave-1 start. Subsequent calls are
   *  ignored (silhouette is single-shot). */
  markSilhouetteShown(nowMs: number): void {
    if (this.beat !== 'silhouette') return;
    if (this._silhouetteShownAtMs !== null) return;
    this._silhouetteShownAtMs = nowMs;
  }

  /** True iff the silhouette is currently mid-fade (within visibleMs
   *  of being shown). */
  isSilhouetteVisible(nowMs: number): boolean {
    if (this.beat !== 'silhouette') return false;
    if (this._silhouetteShownAtMs === null) return false;
    return nowMs - this._silhouetteShownAtMs < SILHOUETTE_BEAT.visibleMs;
  }

  /** Cell the silhouette appears at — far ridge. */
  getSilhouetteCell(): { col: number; row: number } | null {
    return this.beat === 'silhouette' ? { ...SILHOUETTE_BEAT.cell } : null;
  }

  // ─── M4 mirror tower ─────────────────────────────────────────

  /** Called every time the player places a tower. On M4 this spawns
   *  a mirror at the configured offset (clamped to grid coords
   *  caller-side — this module doesn't know the grid bounds).
   *  Returns the mirror that was queued for spawn (caller invokes
   *  actual tower creation), or null on non-mirror-tower beats. */
  recordPlayerTowerPlacement(placement: PlayerTowerPlacement): MirrorTower | null {
    // M7 also tracks placement (for mirror-walker copy).
    this._lastPlayerPlacement = { ...placement };

    if (this.beat !== 'mirror_tower') return null;

    const mirror: MirrorTower = {
      id: this._nextMirrorId++,
      col: placement.col + MIRROR_TOWER_BEAT.offset.col,
      row: placement.row + MIRROR_TOWER_BEAT.offset.row,
      towerTypeId: placement.towerTypeId,
      sold: false,
    };
    this._mirrors.push(mirror);
    return mirror;
  }

  /** Get current live mirrors (un-sold). For tests + HUD readout. */
  getLiveMirrors(): readonly MirrorTower[] {
    return this._mirrors.filter(m => !m.sold);
  }

  /** Mark a mirror tower as sold. Records the side-effect flag for
   *  Divergence reset. Returns the sell-Debt-reward (negative =
   *  Debt paid down). No-op on a non-mirror-tower beat. */
  recordMirrorTowerSold(mirrorId: number): number {
    if (this.beat !== 'mirror_tower') return 0;
    const m = this._mirrors.find(x => x.id === mirrorId);
    if (!m || m.sold) return 0;
    m.sold = true;
    this._anyMirrorSoldThisMission = true;
    return MIRROR_TOWER_BEAT.sellDebtReward;
  }

  /** True if any mirror was sold this mission. GameScene reads at
   *  mission-end to know whether to reset Divergence. */
  anyMirrorSoldThisMission(): boolean {
    return this._anyMirrorSoldThisMission;
  }

  // ─── M7 Mirror Walker ───────────────────────────────────────

  /** Per-Mirror-Walker-spawn RNG roll. Returns the player placement
   *  to copy, or null if (a) the beat isn't 'mirror_walker', (b)
   *  no prior placement exists, or (c) the RNG didn't trigger.
   *
   *  Caller (creep spawner) treats `null` as "spawn a regular
   *  Mirror Walker" and a non-null as "spawn one that mimics this
   *  placement's tower-type." */
  rollMirrorWalkerCopy(): MirrorWalkerCopyResult | null {
    if (this.beat !== 'mirror_walker') return null;
    if (this._lastPlayerPlacement === null) return null;
    if (this.rng() >= MIRROR_WALKER_BEAT.copyChance) return null;
    return { ...this._lastPlayerPlacement };
  }
}
