/**
 * DestructibleStructures — registry of multi-tile boss structures the
 * player must destroy to clear a mission. M10's Archmage Throne is the
 * first; future campaigns reuse the same framework (Mech War-Furnace,
 * Nature Elder Tree, Void Rift Gate, etc).
 *
 * The on-disk PNG format is `<keyN>×84 vertical strip` — N damage
 * frames stacked vertically, each frame WxH px (where W = 28 *
 * widthCells, H = 28 * heightCells). DestructibleStructure picks the
 * frame index at draw time as `floor((1 - hp/maxHp) * damageFrames)`.
 *
 * Structures may optionally **attack** by referencing an embedded
 * TowerType (`embeddedTowerId`). The structure occupies its full
 * `widthCells × heightCells` footprint on the grid; the embedded tower
 * is anchored at the structure's center cell and handles firing logic
 * (so we don't duplicate Tower's combat code). HP synchronizes through
 * delegation — when the player attacks the structure, damage routes
 * to the embedded tower; when the tower dies, the structure dies.
 *
 * Phase hooks fire at HP fractions (e.g. 0.5, 0.25, 0.10), each
 * dispatched through `FinaleEffects.dispatch(id, structure, ctx)`
 * exactly once.
 */

export interface DestructibleStructureDef {
  /** Stable id (e.g. 'arcane_archmage_throne'). */
  id: string;
  /** Display name surfaced to the player (event log, win cinematic). */
  name: string;
  /** Grid footprint. The center cell anchors the optional embedded
   *  tower. Convention: odd dimensions only (so a single center cell
   *  exists); 2×2 / 4×4 footprints would need a different anchor rule. */
  widthCells: number;
  heightCells: number;
  /** Phaser texture key for the spritesheet (matches ArenaFloorRenderer
   *  preload). */
  textureKey: string;
  /** Number of vertical damage frames in the sheet. */
  damageFrames: number;
  /** Default HP if a placement doesn't override. */
  defaultHp: number;
  /** Optional: embed a tower at the center cell to provide firing
   *  capability. The structure inherits the tower's HP (delegated). */
  embeddedTowerId?: string;
  /** HP-fraction → effect-id phase hooks. Each fires at most once when
   *  HP first drops to or below the fraction. Effect handlers live in
   *  `FinaleEffects`. */
  phaseHooks?: { [hpFraction: string]: string };
}

export interface DestructibleStructurePlacement {
  /** Ref to a DESTRUCTIBLE_STRUCTURES entry. */
  id: string;
  /** Top-left grid coord. The structure occupies cells
   *  [col, col + def.widthCells) × [row, row + def.heightCells). */
  col: number;
  row: number;
  /** HP override. Falls back to def.defaultHp when omitted. */
  hp?: number;
  /** Override: when true, FinaleController.checkWin() requires this
   *  structure to be dead before victory fires. M10's throne uses
   *  this; decorative destructible structures (future) wouldn't. */
  isMissionWinTarget?: boolean;
  /** Per-placement override of the shared `phaseHooks`. */
  phaseHooks?: { [hpFraction: string]: string };
}

export const DESTRUCTIBLE_STRUCTURES: Record<string, DestructibleStructureDef> = {
  arcane_archmage_throne: {
    id: 'arcane_archmage_throne',
    name: 'The Archmage Throne',
    widthCells: 3,
    heightCells: 3,
    textureKey: 'struct_arcane_archmage_throne',
    damageFrames: 5,
    defaultHp: 5000,
    embeddedTowerId: 'arcane_ult_throne',
    phaseHooks: {
      '0.50': 'arcane_throne_heal',
      '0.25': 'arcane_throne_summon_reinforcements',
      '0.10': 'arcane_throne_rage',
    },
  },
  // Future:
  //   mech_war_furnace: { 4×3, 6000hp, 5 frames, embeddedTowerId: 'mech_titan' },
  //   nature_elder_tree: { 3×4, 4500hp, 5 frames, embeddedTowerId: undefined  /* passive */ },
  //   void_rift_gate: { 3×3, 5000hp, 5 frames, embeddedTowerId: 'void_oblivion' },
};

/** Lookup helper. Throws if id unknown — callers should validate first. */
export function getDestructibleStructureDef(id: string): DestructibleStructureDef {
  const def = DESTRUCTIBLE_STRUCTURES[id];
  if (!def) throw new Error(`Unknown destructible structure id: ${id}`);
  return def;
}
