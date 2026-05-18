import { GRID_COLS, GRID_ROWS } from '../config';
import { getCircleMap } from './CircleMaps';

export type MapId = 'plains' | 'crossroads' | 'fortress' | 'serpentine' | 'islands' | 'gauntlet' | 'spiral' | 'siege' | 'random' | 'hero_plains' | 'circle_2p' | 'circle_3p' | 'circle_4p' | 'circle_4p_hell_circle' | 'custom' | 'tutorial'
  // Plan 14 v1.1 — bespoke Arcane campaign maps. Use the
  // arcane_crystal terrain theme so blocked cells render as crystal
  // formations instead of generic walls.
  | 'arcane_outskirts' | 'arcane_pass' | 'arcane_throne'
  // Plan 11 — Base Defense. 4-edge spawn into a central base.
  | 'base_arena'
  // Plan 13 v1 — Heist. Vault on the east, exit to the west.
  | 'heist_vault'
  // Plan 12 v1 — Attacker. Open assault corridor with pre-placed
  // defender towers; player commands the creeps.
  | 'attacker_assault'
  // Plan 14 M10 — finale siege. Player builds mana drains on the right
  // to charge summoning circles, the hero attacks pre-placed CPU
  // towers (with HP) on the left. Win = all CPU towers destroyed.
  | 'arcane_throne_finale'
  // Mech M10 — Voss's foundry. Player Workshop on the right trains
  // Raiders. 4 generators each guard a CPU tower cluster on the left.
  // Throne (Voss) at the far west, invulnerable until generators are
  // down. Win = throne destroyed.
  | 'mech_throne_finale'
  // Campaign #3 — The Greenward (Nature). Ten bespoke maps; each
  // mission's per-mission commit replaces the skeleton stub with the
  // real JSON. See docs/greenward-campaign-plan.md.
  | 'greenward_boundary'      // M1 — wayshrine at the Wildwood edge
  | 'greenward_meadow'        // M2 — salt-tinted meadow with cairns
  | 'greenward_eadwin'        // M3 — inn-village, Heron intro
  | 'greenward_crows'         // M4 — marsh crossroads, Cethric
  | 'greenward_river'         // M5 — drying river, speedrun
  | 'greenward_tarrenford'    // M6 — village with chapel + well + wheat
  | 'greenward_weddingstone'  // M7 — frozen wedding pavilion
  | 'greenward_court'         // M8 — courtyard with three doors
  | 'greenward_lastgarden'    // M9 — Inheritor watchtower, attacker mode
  | 'greenward_cathedral';    // M10 — Caer Lythen three-setpiece

/** A multi-tile structure rendered as a single large sprite */
export interface LargeStructurePlacement {
  /** Structure type key (matches a registered LargeStructureDef) */
  structureId: string;
  /** Top-left grid column */
  col: number;
  /** Top-left grid row */
  row: number;
}

/** Suppression Pylon placement — shared between MapDefinition and
 *  per-mission overrides on CampaignDef so the schema doesn't drift. */
export interface SuppressionPylonSpec {
  col: number;
  row: number;
  /** Chebyshev tile radius. Default 5 = covers an 11×11 square. */
  radius?: number;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  description: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  blocked: { col: number; row: number }[];
  noBuild: { col: number; row: number }[];
  /** Explicitly-animated blocked cells (crystal pools, lava pits, etc).
   *  These cells are also included in `blocked` for pathfinding, but this list
   *  tells TerrainManager to render them as the theme's "animated" terrain
   *  instead of guessing from cluster shape. */
  animated?: { col: number; row: number }[];
  /** Terrain theme — determines how blocked cells are rendered.
   *  'generic' is used for random maps (automatic assignment). */
  theme?: string;
  /** Large structures that overlay multiple blocked cells with a single sprite */
  structures?: LargeStructurePlacement[];
  /** Circle co-op: zone definitions. zones[i] = list of cells player i can build on. */
  zones?: { col: number; row: number }[][];
  /** Circle co-op: zone colors for rendering */
  zoneColors?: number[];
  /** Circle co-op: number of players this map supports */
  circlePlayers?: number;
  /** Per-spawner path description. When present, GameScene stitches
   *  a waypoint-chained path (entry → waypoints[0] → ... → exit) for
   *  each spawner instead of a single entry→exit A* run. Enables the
   *  "creeps circumnavigate the map before exiting" circle-coop
   *  gameplay. `entries` / `exits` are still populated (derived from
   *  spawners) so code paths that predate this feature keep working. */
  spawners?: SpawnerDef[];
  /** Plan 12 — Attacker mode. Towers pre-placed by the defender
   *  (the AI) at scene init. Player can't build their own; these
   *  are the static defense the player's creep waves attempt to
   *  break through. Ignored outside attacker missions. */
  preplacedTowers?: { col: number; row: number; towerId: string }[];
  /** Plan 12 v2 Phase 3 — Attacker mode expansion sockets. Cells
   *  the CPU defender may build new towers on as treasury
   *  accumulates. Each socket lists allowed tower ids; the CPU
   *  picks the one that best counters the upcoming wave. Capped
   *  per mission by `attackerDefenderDifficulty`. */
  expansionSockets?: { col: number; row: number; allowedTowerIds: string[] }[];
  /** M10 finale — cells the player is allowed to build on. When set,
   *  the placement gate rejects player builds outside this set. Empty
   *  / undefined = no restriction (every other mission). */
  playerBuildableCells?: { col: number; row: number }[];
  /** M10 finale — Summoning Circle structures. Each circle is 2x2 at
   *  (col, row) top-left. Renders a charge ring; adjacent mana drains
   *  feed a shared charge meter that summons the hero at 100%. */
  summoningCircles?: { col: number; row: number; chargeRatePerDrain?: number }[];
  /** M10 finale — pre-placed CPU defender towers WITH HP. Distinct from
   *  `preplacedTowers` (attacker mode) so finale CPU towers carry HP
   *  + destructible flag without polluting attacker_assault. The Ult
   *  tower flags `isUlt: true` and triggers the ult_finale phase trait. */
  destructibleTowers?: {
    col: number;
    row: number;
    towerId: string;
    hp: number;
    /** Arcane finale — Ult tower flag. Triggers the ult_finale phase
     *  trait (heal at 50%, reinforcements at 25%, rage-fire at 10%). */
    isUlt?: boolean;
    /** Mech finale — generator flag. On death, the SabotageController
     *  expires every tower whose cell appears in `linkedTowers`. */
    isGenerator?: boolean;
    /** Mech finale — towers this generator powers (cells). When the
     *  generator dies, each tower at one of these cells is killed. */
    linkedTowers?: { col: number; row: number }[];
    /** Mech finale — throne (Voss). Invulnerable until every alive
     *  generator on the map is destroyed; then mortal, and destroying
     *  it wins the mission. */
    isThrone?: boolean;
  }[];
  /** Multi-tile boss structures the player must destroy. PRD 06 entry
   *  point — see `src/data/DestructibleStructures.ts` for the registry
   *  of allowed `id`s. Each structure occupies its `widthCells ×
   *  heightCells` footprint at top-left = (col, row). */
  destructibleStructures?: { id: string; col: number; row: number; hp?: number; isMissionWinTarget?: boolean; phaseHooks?: { [hpFraction: string]: string } }[];
  /** Mechanical campaign — Voss's Suppression Pylons. Pre-placed,
   *  invulnerable, project a tile-radius stress field that stalls
   *  player towers inside it after a few shots. SuppressionManager
   *  owns the runtime state; player counters them via channel. */
  suppressionPylons?: SuppressionPylonSpec[];
  /** Mech M10 finale — Workshop placement. The player's barracks for
   *  training Raiders. SabotageController owns the runtime
   *  Workshop instance + spawns Raiders at this cell's pixel center. */
  workshop?: { col: number; row: number };
}

export interface SpawnerDef {
  entry: { col: number; row: number };
  /** Ordered waypoint list between entry and exit. Empty array →
   *  straight entry→exit run, matching non-circle behaviour. */
  waypoints: { col: number; row: number }[];
  exit: { col: number; row: number };
}

const MID_COL = Math.floor(GRID_COLS / 2);
const MID_ROW = Math.floor(GRID_ROWS / 2);
type Pos = { col: number; row: number };

function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

/** Generate a filled rectangle of positions */
function rect(c1: number, r1: number, c2: number, r2: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = c1; c <= c2; c++) {
    for (let r = r1; r <= r2; r++) {
      if (inBounds(c, r)) ps.push({ col: c, row: r });
    }
  }
  return ps;
}

/** Generate a filled circle of positions */
function circle(cx: number, cy: number, radius: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = cx - radius; c <= cx + radius; c++) {
    for (let r = cy - radius; r <= cy + radius; r++) {
      const dx = c - cx, dy = r - cy;
      if (dx * dx + dy * dy <= radius * radius && inBounds(c, r)) {
        ps.push({ col: c, row: r });
      }
    }
  }
  return ps;
}

// Reusable template used by Greenward map stubs at the bottom of
// MAPS. Cloned with `...MAPS_PLAINS_TEMPLATE` so each Greenward map
// entry can be authored independently. Maps not yet authored fall
// back to this template.
const MAPS_PLAINS_TEMPLATE: Omit<MapDefinition, 'id' | 'name'> = {
  description: 'Greenward — stub map. Replaced by per-mission commit.',
  theme: 'forest',
  entries: [{ col: 0, row: MID_ROW }],
  exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
  blocked: [],
  noBuild: [],
};

// ─── Greenward map helpers ─────────────────────────────────────
// Reusable helpers for hand-authoring Greenward maps without an
// editor. Each returns Pos[] suitable for blocked / noBuild fields.

function greenwardForestEdge(): Pos[] {
  // Sparse forest along the north + south edges of M1 — narrows
  // the player's view into a single road corridor through the
  // open middle band.
  const ps: Pos[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    // Sparse top / bottom rows
    if (c % 3 === 0) {
      ps.push({ col: c, row: 1 });
      ps.push({ col: c, row: GRID_ROWS - 2 });
    }
  }
  return ps;
}

function greenwardSaltCairns(): Pos[] {
  // The two cairn cells are noBuild — the player can't drop a tower
  // ON the shepherd's marker but mazes around it.
  return [
    { col: 14, row: 8 },
    { col: 14, row: 18 },
    { col: 22, row: 13 },
  ];
}

function greenwardEadwinBuildings(): Pos[] {
  // Inn block (NE) — 3x3 footprint
  const ps: Pos[] = [];
  for (let c = 16; c <= 20; c++) {
    for (let r = 7; r <= 9; r++) ps.push({ col: c, row: r });
  }
  // Shop fronts (central E-W band, sparse)
  for (let c = 10; c <= 26; c += 4) {
    ps.push({ col: c, row: 13 });
    ps.push({ col: c, row: 14 });
  }
  return ps;
}

function greenwardEadwinRuins(): Pos[] {
  return [
    { col: 18, row: 10 }, // inn_hearth Mercy
    { col: 14, row: 15 }, // village_square Siege
  ];
}

function greenwardMarshPatches(): Pos[] {
  // Marsh patches at irregular intervals — water-themed.
  // Critically: leave a "safe pocket" buffer around Cethric (col 18,
  // row 13) so splash placement nearby is intentional not accidental.
  const ps: Pos[] = [];
  // North-west marsh
  for (let c = 4; c <= 10; c += 2) for (let r = 4; r <= 8; r += 2) ps.push({ col: c, row: r });
  // South-east marsh
  for (let c = 24; c <= 30; c += 2) for (let r = 16; r <= 20; r += 2) ps.push({ col: c, row: r });
  // South-west marsh
  for (let c = 4; c <= 8; c += 2) for (let r = 18; r <= 22; r += 2) ps.push({ col: c, row: r });
  // Filter out anything within 2 cells of Cethric (Chebyshev) — keep the safe pocket.
  return ps.filter(p => Math.max(Math.abs(p.col - 18), Math.abs(p.row - 13)) > 2);
}

function greenwardRiverBanks(): Pos[] {
  // Linear river: top + bottom banks forming a 5-row corridor in
  // the middle. The river itself isn't blocked — creeps walk it.
  const ps: Pos[] = [];
  for (let c = 0; c < GRID_COLS; c++) {
    ps.push({ col: c, row: 9 });
    ps.push({ col: c, row: 17 });
  }
  return ps;
}

function greenwardTarrenfordBuildings(): Pos[] {
  // Chapel footprint NE (3x3), well center, wheat field rows south.
  const ps: Pos[] = [];
  // Chapel
  for (let c = 12; c <= 16; c++) for (let r = 6; r <= 9; r++) ps.push({ col: c, row: r });
  // Wheat field rows
  for (let c = 18; c <= 28; c += 2) ps.push({ col: c, row: 19 });
  for (let c = 18; c <= 28; c += 2) ps.push({ col: c, row: 21 });
  return ps;
}

function greenwardWeddingPavilion(): Pos[] {
  // Circular pillar arrangement around the altar at (18, 10).
  const ps: Pos[] = [];
  const pillars: Pos[] = [
    { col: 14, row: 8 },  { col: 22, row: 8 },
    { col: 12, row: 11 }, { col: 24, row: 11 },
    { col: 14, row: 14 }, { col: 22, row: 14 },
  ];
  ps.push(...pillars);
  // Feast tables at south edge.
  for (let c = 14; c <= 22; c += 2) ps.push({ col: c, row: 21 });
  return ps;
}

export const MAPS: Record<MapId, MapDefinition> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open field. Two lakes force creative pathing.',
    theme: 'forest',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Lake in upper half
      ...circle(10, 5, 3),
      // Lake in lower half
      ...circle(GRID_COLS - 12, GRID_ROWS - 7, 3),
    ],
    noBuild: [],
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'Two entries. Mountain range divides the map.',
    theme: 'mountain',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Mountain range across middle with 3-wide gaps
      ...Array.from({ length: GRID_COLS }, (_, c) => {
        if (c >= MID_COL - 1 && c <= MID_COL + 1) return null; // center gap
        if (c <= 2 || c >= GRID_COLS - 3) return null; // edge gaps
        return { col: c, row: MID_ROW };
      }).filter(Boolean) as Pos[],
      // Mountain pillars flanking the gaps
      ...rect(MID_COL - 3, MID_ROW - 2, MID_COL - 2, MID_ROW - 1),
      ...rect(MID_COL + 2, MID_ROW + 1, MID_COL + 3, MID_ROW + 2),
    ],
    noBuild: [
      // Small no-build near exit convergence
      ...rect(GRID_COLS - 4, MID_ROW - 1, GRID_COLS - 3, MID_ROW + 1),
    ],
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    description: 'Three entries. Stone walls around the center exit.',
    theme: 'stone',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      // Fortress wall ring with gaps at cardinal directions
      for (let dc = -4; dc <= 4; dc++) {
        for (let dr = -4; dr <= 4; dr++) {
          const c = MID_COL + dc, r = MID_ROW + dr;
          const isEdge = Math.abs(dc) >= 3 || Math.abs(dr) >= 3;
          const isCorner = Math.abs(dc) >= 3 && Math.abs(dr) >= 3;
          const isGap = (dc === 0 && Math.abs(dr) >= 3) || (dr === 0 && Math.abs(dc) >= 3);
          if (isEdge && !isCorner && !isGap && inBounds(c, r)) {
            b.push({ col: c, row: r });
          }
        }
      }
      // Corner towers
      b.push(...rect(MID_COL - 5, MID_ROW - 5, MID_COL - 4, MID_ROW - 4));
      b.push(...rect(MID_COL + 4, MID_ROW - 5, MID_COL + 5, MID_ROW - 4));
      b.push(...rect(MID_COL - 5, MID_ROW + 4, MID_COL - 4, MID_ROW + 5));
      b.push(...rect(MID_COL + 4, MID_ROW + 4, MID_COL + 5, MID_ROW + 5));
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  serpentine: {
    id: 'serpentine',
    name: 'Serpentine',
    description: 'Canyon walls force a winding path.',
    theme: 'mountain',
    entries: [{ col: 0, row: 2 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 3 }],
    blocked: (() => {
      const b: Pos[] = [];
      // Horizontal canyon walls creating snake pattern
      const wallRows = [5, 10, 15, 20];
      for (let i = 0; i < wallRows.length; i++) {
        const r = wallRows[i];
        if (r >= GRID_ROWS) continue;
        const startCol = (i % 2 === 0) ? 5 : 0;
        const endCol = (i % 2 === 0) ? GRID_COLS : GRID_COLS - 5;
        for (let c = startCol; c < endCol; c++) {
          if (inBounds(c, r)) b.push({ col: c, row: r });
          // Thicker walls (2 high)
          if (inBounds(c, r + 1)) b.push({ col: c, row: r + 1 });
        }
      }
      return b;
    })(),
    noBuild: [],
  },
  islands: {
    id: 'islands',
    name: 'Islands',
    description: 'Build zones separated by mountain ridges and lakes.',
    theme: 'water',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      const r1 = Math.floor(GRID_COLS / 3);
      const r2 = Math.floor(GRID_COLS * 2 / 3);
      // Vertical mountain ridges with path gaps
      for (let r = 0; r < GRID_ROWS; r++) {
        if (r >= MID_ROW - 1 && r <= MID_ROW + 1) continue; // path gap
        if (r >= 3 && r <= 5) continue; // upper gap
        if (r >= GRID_ROWS - 6 && r <= GRID_ROWS - 4) continue; // lower gap
        b.push({ col: r1, row: r });
        b.push({ col: r1 + 1, row: r });
        b.push({ col: r2, row: r });
        b.push({ col: r2 - 1, row: r });
      }
      // Lakes in corners
      b.push(...circle(5, 4, 2));
      b.push(...circle(GRID_COLS - 6, 4, 2));
      b.push(...circle(5, GRID_ROWS - 5, 2));
      b.push(...circle(GRID_COLS - 6, GRID_ROWS - 5, 2));
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  gauntlet: {
    id: 'gauntlet',
    name: 'Gauntlet',
    description: 'Four entries. Volcanic pillars block the field.',
    theme: 'volcanic',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
      { col: MID_COL, row: GRID_ROWS - 1 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      // Large volcanic pillars scattered around
      const pillars: [number, number, number][] = [
        [MID_COL - 7, MID_ROW - 5, 2],
        [MID_COL + 7, MID_ROW - 5, 2],
        [MID_COL - 7, MID_ROW + 5, 2],
        [MID_COL + 7, MID_ROW + 5, 2],
        [MID_COL - 4, MID_ROW - 8, 1],
        [MID_COL + 4, MID_ROW - 8, 1],
        [MID_COL - 4, MID_ROW + 8, 1],
        [MID_COL + 4, MID_ROW + 8, 1],
        [MID_COL - 12, MID_ROW, 2],
        [MID_COL + 12, MID_ROW, 2],
      ];
      for (const [pc, pr, rad] of pillars) {
        b.push(...circle(pc, pr, rad));
      }
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [
      // Small no-build around exit
      ...circle(MID_COL, MID_ROW, 2).filter(p => !(p.col === MID_COL && p.row === MID_ROW)),
    ],
  },
  spiral: {
    id: 'spiral',
    name: 'Spiral',
    description: 'Concentric walls spiral to the center.',
    theme: 'stone',
    entries: [{ col: 0, row: 0 }],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      const margin = 2;
      let top = margin, bottom = GRID_ROWS - 1 - margin;
      let left = margin, right = GRID_COLS - 1 - margin;
      let layer = 0;

      while (top < bottom - 2 && left < right - 2) {
        // Top wall
        for (let c = left; c <= right; c++) {
          if (layer % 2 === 0 && c >= right - 2) continue;
          if (layer % 2 === 1 && c <= left + 2) continue;
          b.push({ col: c, row: top });
        }
        // Right wall
        for (let r = top + 1; r <= bottom; r++) {
          if (layer % 2 === 0 && r >= bottom - 2) continue;
          if (layer % 2 === 1 && r <= top + 3) continue;
          b.push({ col: right, row: r });
        }
        // Bottom wall
        for (let c = left; c < right; c++) {
          if (layer % 2 === 0 && c <= left + 2) continue;
          if (layer % 2 === 1 && c >= right - 2) continue;
          b.push({ col: c, row: bottom });
        }
        // Left wall
        for (let r = top + 1; r < bottom; r++) {
          if (layer % 2 === 0 && r <= top + 3) continue;
          if (layer % 2 === 1 && r >= bottom - 2) continue;
          b.push({ col: left, row: r });
        }
        top += 4; bottom -= 4; left += 4; right -= 4;
        layer++;
      }
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  siege: {
    id: 'siege',
    name: 'Empty',
    description: 'Wide open. No obstacles — pure mazing.',
    theme: 'forest',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: [],
  },
  random: {
    id: 'random',
    name: 'Random',
    description: 'Procedurally generated — unique every time.',
    theme: 'generic',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: [],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'User-created map loaded from JSON.',
    theme: 'generic',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: [],
  },
  tutorial: {
    // Tutorial match map — single straight left-to-right path with generous
    // build space on both sides. Intentionally empty of obstacles so the
    // mazing moment is clean: placing the suggested tower on the path forces
    // an obvious detour the player can see. Not listed in MAP_ORDER.
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Onboarding map — simple straight path for your first match.',
    theme: 'forest',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: [],
  },
  hero_plains: {
    id: 'hero_plains',
    name: 'Hero Plains',
    description: 'Open field for Hero Defense. 12 rows.',
    theme: 'forest',
    entries: [{ col: 0, row: 6 }],
    exits: [{ col: GRID_COLS - 1, row: 6 }],
    blocked: [
      // Two small lakes
      ...circle(10, 3, 2),
      ...circle(GRID_COLS - 12, 9, 2),
    ],
    noBuild: [],
  },
  // === Arcane campaign maps (Plan 14 v1.1) ===
  // Plan 14 v1 launched the Arcane campaign on existing standard maps;
  // v1.1 adds 3 bespoke Arcane-tileset maps for the marquee missions
  // so the campaign feels like its own place. Crystal motifs (clusters
  // of blocked cells via `circle()`) render via the `arcane_crystal`
  // terrain theme. Layouts are intentionally kept on validated path
  // shapes rather than radically new geometry — first content pass.

  arcane_outskirts: {
    id: 'arcane_outskirts',
    name: 'Crystal Outskirts',
    description: 'Wide corridor approaching the caverns. A central crystal cluster forces a single deflection.',
    theme: 'arcane_crystal',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Single central crystal cluster — visible obstacle, soft mazing
      // hint, but the player can route around either side.
      ...circle(MID_COL - 4, MID_ROW - 4, 3),
      ...circle(MID_COL + 4, MID_ROW + 4, 3),
    ],
    noBuild: [],
  },

  arcane_pass: {
    id: 'arcane_pass',
    name: 'The Crystal Pass',
    description: 'Long winding pass through crystal walls. Forces a serpentine route — built for speedruns.',
    theme: 'arcane_crystal',
    entries: [{ col: 0, row: 4 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 5 }],
    blocked: [
      // Two mirrored crystal walls force a long S-shape from top-left
      // entry down to bottom-right exit.
      // Top wall (forces creeps down)
      ...rect(8, 0, 12, 9),
      ...rect(8, 0, 22, 4),
      // Bottom wall (forces creeps back up to weave)
      ...rect(14, 12, 27, 17),
      // Final wall guarding the exit
      ...rect(24, 18, 28, 25),
    ],
    noBuild: [],
  },

  // === Base Defense (Plan 11) ===
  // Open arena with 4 entries (one per edge) converging on a single
  // exit at the geometric center. The exit cell is the "base" — a
  // leak there costs lives. Player builds defensive structure
  // anywhere; pathfinder routes each spawner to the central exit so
  // a thoughtful maze can lengthen the walk for every direction.
  // Light decorative blockers in each corner stop the player from
  // fully ringing the base — they have to pick which lanes to wall.
  base_arena: {
    id: 'base_arena',
    name: 'Citadel Arena',
    description: 'Spawns from every side converging on the base. The whole map is your maze.',
    theme: 'stone',
    // Truly 360° threat — 32 spawn points distributed around the
    // entire perimeter (8 per edge). Creeps round-robin across
    // paths via the standard SpawnManager pathIndex split, so each
    // wave hits the player from many directions simultaneously.
    entries: [
      // North edge (8 points, row 0)
      { col: 2,  row: 0 }, { col: 6,  row: 0 }, { col: 11, row: 0 }, { col: 15, row: 0 },
      { col: 20, row: 0 }, { col: 24, row: 0 }, { col: 29, row: 0 }, { col: 33, row: 0 },
      // South edge (8 points, row GRID_ROWS - 1)
      { col: 2,  row: GRID_ROWS - 1 }, { col: 6,  row: GRID_ROWS - 1 }, { col: 11, row: GRID_ROWS - 1 }, { col: 15, row: GRID_ROWS - 1 },
      { col: 20, row: GRID_ROWS - 1 }, { col: 24, row: GRID_ROWS - 1 }, { col: 29, row: GRID_ROWS - 1 }, { col: 33, row: GRID_ROWS - 1 },
      // West edge (8 points, col 0)
      { col: 0, row: 1 },  { col: 0, row: 4 },  { col: 0, row: 8 },  { col: 0, row: 11 },
      { col: 0, row: 14 }, { col: 0, row: 17 }, { col: 0, row: 21 }, { col: 0, row: 24 },
      // East edge (8 points, col GRID_COLS - 1)
      { col: GRID_COLS - 1, row: 1 },  { col: GRID_COLS - 1, row: 4 },  { col: GRID_COLS - 1, row: 8 },  { col: GRID_COLS - 1, row: 11 },
      { col: GRID_COLS - 1, row: 14 }, { col: GRID_COLS - 1, row: 17 }, { col: GRID_COLS - 1, row: 21 }, { col: GRID_COLS - 1, row: 24 },
    ],
    // Single exit at the center — visualized as the "base."
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: [
      // Corner pillars — decorative obstructions that prevent the
      // player from sealing the base behind a four-cell wall, and
      // anchor a sense of "arena" geometry.
      ...rect(4, 4, 5, 5),
      ...rect(GRID_COLS - 6, 4, GRID_COLS - 5, 5),
      ...rect(4, GRID_ROWS - 6, 5, GRID_ROWS - 5),
      ...rect(GRID_COLS - 6, GRID_ROWS - 6, GRID_COLS - 5, GRID_ROWS - 5),
    ],
    // No noBuild ring — the player can build right up to the base.
    // Pathfinder still prevents placement that would seal off any
    // spawn from the exit, so the base remains reachable.
    noBuild: [],
  },

  // === Attacker (Plan 12 v1) ===
  // Long open assault corridor. The player commands the attacking
  // creeps; the defender (AI) is represented by a fixed lattice of
  // pre-placed towers along the path. Player can't build, can't
  // upgrade — they watch each wave try to break through and (in
  // future v2) buff their next wave with essence.
  //
  // Win: leak count >= mission threshold (set per-mission, default
  // around 5 of the wave creeps surviving the gauntlet).
  attacker_assault: {
    id: 'attacker_assault',
    name: 'The Assault Corridor',
    description: 'You command the attack. The Arcane defender plays a full game — mazes, builds, upgrades.',
    theme: 'stone',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Outer arena walls — funnel the path through the central
      // corridor where the CPU defender mazes their towers.
      ...rect(0, 0, GRID_COLS - 1, 5),
      ...rect(0, GRID_ROWS - 6, GRID_COLS - 1, GRID_ROWS - 1),
    ],
    noBuild: [],
    // Plan 12 v3 — no static lattice. The CPU defender plays this
    // map as a full game (BalancedBrain), placing + upgrading +
    // mazing with the Arcane kit from a starting gold seed and
    // kill-gold income. Removed the old pre-placed arrow / cannon /
    // sniper lattice + expansion sockets; both are obsolete now
    // that the brain owns the entire map.
  },

  // === Heist (Plan 13 v1) ===
  // Reverse-direction map: creeps spawn from a vault on the east
  // edge and try to escape west. v1 reuses the standard "creep
  // exits = lives lost" semantics; v2 adds gold-on-ground (carried
  // gold drops on death; surviving creeps absorb pickups) once the
  // creep base class gains a `carriedGold` field.
  //
  // Vault placement: east-side narrow opening so the spawn pours
  // out along a single column. Exit: west edge, full open. Two
  // diagonal walls force creeps through a central kill funnel.
  heist_vault: {
    id: 'heist_vault',
    name: 'The Vault Heist',
    description: 'Loot pours from the eastern vault. Stop them before they reach the west exit.',
    theme: 'stone',
    entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
    exits: [{ col: 0, row: MID_ROW }],
    blocked: [
      // Vault structure on the east side — implies a heavy stone
      // building creeps stream out of.
      ...rect(GRID_COLS - 4, MID_ROW - 4, GRID_COLS - 2, MID_ROW - 2),
      ...rect(GRID_COLS - 4, MID_ROW + 2, GRID_COLS - 2, MID_ROW + 4),
      // Central diagonal walls forcing a serpentine kill zone.
      ...rect(MID_COL + 4, 4, MID_COL + 5, MID_ROW - 2),
      ...rect(MID_COL - 4, MID_ROW + 2, MID_COL - 3, GRID_ROWS - 5),
    ],
    noBuild: [],
  },

  arcane_throne: {
    id: 'arcane_throne',
    name: 'The Arcane Throne',
    description: 'The wizards\' inner sanctum. Three approaches converge on the central nexus.',
    theme: 'arcane_crystal',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: MID_ROW },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Outer crystal pillars guard the throne's flanks.
      ...rect(8, 6, 9, 9),
      ...rect(8, GRID_ROWS - 10, 9, GRID_ROWS - 7),
      // Central crystal nexus — the throne itself, decorative + forces
      // attackers to thread around.
      ...circle(MID_COL + 6, MID_ROW, 3),
      // Funnel walls before the exit
      ...rect(GRID_COLS - 8, 6, GRID_COLS - 7, MID_ROW - 2),
      ...rect(GRID_COLS - 8, MID_ROW + 2, GRID_COLS - 7, GRID_ROWS - 7),
    ],
    noBuild: [
      // The throne dais itself — visually striking but unbuildable so
      // the player can't simply turtle on the central tile.
      ...rect(MID_COL + 4, MID_ROW - 1, MID_COL + 5, MID_ROW + 1),
    ],
  },

  // === Circle Co-op Maps ===
  // Loaded from JSON under src/data/maps/circle/*.json via the
  // `CircleMaps` loader. Each map declares per-player spawners with
  // ordered waypoint lists — GameScene stitches waypoint-chained
  // paths through them so creeps circumnavigate the map before
  // returning to their entry. The `CircleMaps` module owns schema
  // + load logic; these entries are thin re-exports so callers that
  // index `MAPS.circle_2p` etc. keep working.

  circle_2p: getCircleMapById('circle_2p'),
  circle_3p: getCircleMapById('circle_3p'),
  circle_4p: getCircleMapById('circle_4p'),
  circle_4p_hell_circle: getCircleMapById('circle_4p_hell_circle'),

  // === M10 Arcane finale siege ===
  // Layout matches the user's reference image:
  //   - Brown perimeter walls + central arrow-cross divider (col ~17).
  //   - LEFT half (cols 1-13): CPU territory. ~25 destructible Arcane
  //     towers in scattered clusters around the green exit. The Ult
  //     Throne sits behind the exit at (2, midRow).
  //   - RIGHT half (cols 19-34): Player territory. Two magenta build
  //     zones each ringing a 2x2 lavender Summoning Circle.
  //   - Red entry at the right edge mid-row, green exit at the left
  //     edge mid-row. Wave creeps walk right→left.
  arcane_throne_finale: (() => {
    const cols = GRID_COLS;          // 36
    const rowsTop = 0, rowsBot = GRID_ROWS - 1;
    const midRow = Math.floor(GRID_ROWS / 2);
    // Outer wall around the perimeter (entry + exit cells stay open).
    const outerWall: Pos[] = [];
    for (let c = 0; c < cols; c++) { outerWall.push({ col: c, row: rowsTop }, { col: c, row: rowsBot }); }
    for (let r = 1; r < rowsBot; r++) {
      if (r !== midRow) {
        outerWall.push({ col: 0, row: r }, { col: cols - 1, row: r });
      }
    }
    // Central arrow-cross divider at col ~17 — forces creeps to detour
    // around it. Vertical spine + horizontal arms forming a +/Y shape.
    const centerCross: Pos[] = [
      ...rect(17, 4, 17, 8),       // top vertical spine
      ...rect(17, 14, 17, 20),     // bottom vertical spine
      ...rect(15, 9, 19, 13),      // central thick body
      { col: 18, row: 8 },
      { col: 16, row: 11 }, { col: 20, row: 11 },
      // Two lone blocks above + below the central body (matches the
      // reference image's arrow-cross silhouette).
      { col: 17, row: 2 },
      { col: 17, row: 22 },
    ];
    // Pre-placed CPU defender towers — scattered clusters across the
    // left half. Mix of Arcane kit + the Ult Throne.
    const destructibleTowers = [
      // Top cluster (rows 4-7)
      { col: 2,  row: 5,  towerId: 'arcane_bolt',  hp: 500 },
      { col: 4,  row: 4,  towerId: 'arcane_storm', hp: 600 },
      { col: 6,  row: 6,  towerId: 'arcane_bolt',  hp: 500 },
      { col: 8,  row: 5,  towerId: 'arcane_focus', hp: 700 },
      { col: 10, row: 4,  towerId: 'arcane_storm', hp: 600 },
      { col: 12, row: 5,  towerId: 'arcane_bolt',  hp: 500 },
      // Mid cluster (rows 9-15) — densest, around the green exit
      { col: 2,  row: 10, towerId: 'arcane_bolt',  hp: 500 },
      { col: 5,  row: 11, towerId: 'arcane_storm', hp: 600 },
      { col: 7,  row: 10, towerId: 'arcane_bolt',  hp: 500 },
      { col: 9,  row: 12, towerId: 'arcane_focus', hp: 700 },
      { col: 11, row: 11, towerId: 'arcane_storm', hp: 600 },
      { col: 13, row: 10, towerId: 'arcane_bolt',  hp: 500 },
      // The Archmage Throne moved to `destructibleStructures` (PRD 06):
      // 3×3 boss structure with damage frames + win-target flag.
      { col: 4,  row: 14, towerId: 'arcane_drain', hp: 800 },
      { col: 6,  row: 13, towerId: 'arcane_storm', hp: 600 },
      { col: 9,  row: 14, towerId: 'arcane_bolt',  hp: 500 },
      { col: 11, row: 13, towerId: 'arcane_focus', hp: 700 },
      // Bottom cluster (rows 17-20)
      { col: 2,  row: 17, towerId: 'arcane_bolt',  hp: 500 },
      { col: 4,  row: 19, towerId: 'arcane_storm', hp: 600 },
      { col: 6,  row: 18, towerId: 'arcane_bolt',  hp: 500 },
      { col: 8,  row: 17, towerId: 'arcane_focus', hp: 700 },
      { col: 10, row: 19, towerId: 'arcane_storm', hp: 600 },
      { col: 13, row: 18, towerId: 'arcane_bolt',  hp: 500 },
    ];
    // Two summoning circles — top + bottom of right half. 2x2 each,
    // top-left corner specified.
    const summoningCircles = [
      { col: 30, row: 5 },
      { col: 30, row: 17 },
    ];
    // Player buildable zones — the ENTIRE right half of the map (right
    // of the central arrow-cross divider). The player decides per-cell:
    // build damage towers (Bolt / Frost / Storm / etc.) for defense, or
    // a Mana Conduit specifically adjacent to a Summoning Circle to
    // charge the summon faster. Only the conduit-adjacency matters for
    // charging — non-adjacent conduits are wasted gold.
    const playerBuildableCells: Pos[] = [];
    const buildableMinCol = 18;  // just right of the central arrow-cross
    for (let c = buildableMinCol; c < cols - 1; c++) {
      for (let r = 1; r < GRID_ROWS - 1; r++) {
        playerBuildableCells.push({ col: c, row: r });
      }
    }
    // PRD 06 — Archmage Throne destructible structure. 3×3 footprint
    // anchored top-left at (2, midRow-2) so its center cell is (3, midRow-1)
    // — shifted off the green exit row + one column inward from the
    // outer wall so the throne reads as a separate boss structure
    // rather than overlapping the leak path. `isMissionWinTarget` means
    // FinaleController.checkWin() requires it to be dead before victory.
    const destructibleStructures = [
      { id: 'arcane_archmage_throne', col: 2, row: midRow - 2, hp: 5000, isMissionWinTarget: true },
    ];
    // The summoning circle footprints are noBuild so the player can't
    // drop a tower on top of them. Throne footprint also noBuild +
    // blocked (the structure occupies the cells, period).
    const noBuild: Pos[] = [];
    for (const c of summoningCircles) {
      for (let dc = 0; dc <= 1; dc++) for (let dr = 0; dr <= 1; dr++) {
        noBuild.push({ col: c.col + dc, row: c.row + dr });
      }
    }
    for (const s of destructibleStructures) {
      for (let dc = 0; dc < 3; dc++) for (let dr = 0; dr < 3; dr++) {
        noBuild.push({ col: s.col + dc, row: s.row + dr });
      }
    }
    return {
      id: 'arcane_throne_finale' as MapId,
      name: 'The Reckoning',
      description: 'Siege the Arcane archmage spire. Charge your summoning circles, summon the mage, destroy the cabal\'s lattice.',
      theme: 'arcane_crystal',
      // Wave creeps are the cabal's own — they emerge from the spire
      // (left edge, near the CPU towers) and walk RIGHT toward the
      // player's home. CPU towers ignore them (same team). Player
      // sends walk the reverse direction (right→left, into the
      // tower lattice) and DO get shot at.
      entries: [{ col: 0, row: midRow }],
      exits: [{ col: cols - 1, row: midRow }],
      blocked: [...outerWall, ...centerCross],
      noBuild,
      playerBuildableCells,
      summoningCircles,
      destructibleTowers,
      destructibleStructures,
    };
  })(),

  // === Mech M10 finale: The Overthrow ===
  //   - LEFT half (cols 1-13): Voss's foundry. Throne (col 2, midRow),
  //     four generators distributed vertically, each with 3-4 linked
  //     CPU defender towers nearby. Throne is invulnerable until every
  //     generator dies; SabotageController wires that gating.
  //   - RIGHT half (cols 18-34): player territory. Workshop pre-placed
  //     at (32, midRow); buildable zone covers the rest. Player trains
  //     Raiders at the Workshop and walks them across the map to chip
  //     down generators + the throne.
  //   - Wave creeps spawn from the throne side (col 0, midRow) and
  //     walk RIGHT toward the player's base. Sends walk reverse.
  mech_throne_finale: (() => {
    const cols = GRID_COLS;
    const rowsTop = 0, rowsBot = GRID_ROWS - 1;
    const midRow = Math.floor(GRID_ROWS / 2);
    // Outer perimeter wall (entry + exit cells stay open at midRow).
    const outerWall: Pos[] = [];
    for (let c = 0; c < cols; c++) outerWall.push({ col: c, row: rowsTop }, { col: c, row: rowsBot });
    for (let r = 1; r < rowsBot; r++) {
      if (r !== midRow) outerWall.push({ col: 0, row: r }, { col: cols - 1, row: r });
    }
    // Central cross divider — same shape as Arcane finale to force a
    // consistent path topology.
    const centerCross: Pos[] = [
      ...rect(17, 4, 17, 8),
      ...rect(17, 14, 17, 20),
      ...rect(15, 9, 19, 13),
      { col: 18, row: 8 },
      { col: 16, row: 11 }, { col: 20, row: 11 },
      { col: 17, row: 2 },
      { col: 17, row: 22 },
    ];

    // Four generators distributed vertically on the left. Each owns
    // a small cluster of linked CPU towers — when the generator dies,
    // SabotageController expires the linked towers immediately.
    // TODO(art): bespoke generator sprite — currently reuses mech_mortar silhouette.
    const G = (col: number, row: number, linked: { col: number; row: number }[]) => ({
      col, row, towerId: 'mech_mortar', hp: 1200,
      isGenerator: true, linkedTowers: linked,
    });
    const T = (col: number, row: number, towerId = 'mech_turret') => ({
      col, row, towerId, hp: 500,
    });
    const generatorTopLinks = [{ col: 4, row: 4 }, { col: 6, row: 5 }, { col: 8, row: 4 }];
    const generatorMid1Links = [{ col: 4, row: 9 }, { col: 6, row: 10 }, { col: 8, row: 9 }];
    const generatorMid2Links = [{ col: 4, row: 14 }, { col: 6, row: 15 }, { col: 8, row: 14 }];
    const generatorBotLinks = [{ col: 4, row: 19 }, { col: 6, row: 20 }, { col: 8, row: 19 }];

    const destructibleTowers = [
      // Top cluster — generator + linked turrets.
      G(11, 4, generatorTopLinks),
      ...generatorTopLinks.map(c => T(c.col, c.row)),
      // Mid-1 cluster.
      G(11, 9, generatorMid1Links),
      ...generatorMid1Links.map(c => T(c.col, c.row)),
      // Mid-2 cluster.
      G(11, 14, generatorMid2Links),
      ...generatorMid2Links.map(c => T(c.col, c.row)),
      // Bottom cluster.
      G(11, 19, generatorBotLinks),
      ...generatorBotLinks.map(c => T(c.col, c.row)),
    ];

    // Voss's Throne — 3×3 destructible boss structure. Top-left at
    // (col 3, row midRow-1) so the footprint spans cols 3-5 × rows
    // midRow-1..midRow+1, center cell at (4, midRow). Leaves cols
    // 1-2 of the entry row open so creeps spawning at (0, midRow)
    // can walk east to (2, midRow), then detour above/below to
    // route around the throne to the open east corridor.
    const destructibleStructures = [
      { id: 'mech_voss_throne', col: 3, row: midRow - 1, hp: 5000, isMissionWinTarget: true },
    ];

    // Player buildable zone — entire right half, mirrors Arcane M10.
    const playerBuildableCells: Pos[] = [];
    for (let c = 18; c < cols - 1; c++) {
      for (let r = 1; r < GRID_ROWS - 1; r++) {
        playerBuildableCells.push({ col: c, row: r });
      }
    }

    return {
      id: 'mech_throne_finale' as MapId,
      name: 'The Overthrow',
      description: 'Storm Voss\'s foundry. Train raiders, drop the generators, end the tyrant.',
      theme: 'factory',
      entries: [{ col: 0, row: midRow }],
      exits: [{ col: cols - 1, row: midRow }],
      blocked: [...outerWall, ...centerCross],
      noBuild: [],
      playerBuildableCells,
      destructibleTowers,
      destructibleStructures,
      workshop: { col: 32, row: midRow },
    };
  })(),

  // ── Campaign #3 — Greenward maps ───────────────────────────────
  // Act I — Border. Forest-edge wayshrine, salt meadow, inn-village.

  greenward_boundary: {
    id: 'greenward_boundary',
    name: 'The Boundary Stones',
    description: 'A road leaving the Wildwood at sunrise. The wayshrine waits at the road\'s end.',
    theme: 'forest',
    // Creeps approach from the east (the south kingdoms); they walk
    // toward the Wildwood (west exit).
    entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
    exits:   [{ col: 0,             row: MID_ROW }],
    blocked: greenwardForestEdge(),
    // Wayshrine cell — noBuild so the player can't drop a tower
    // ON the shrine but mazes around it.
    noBuild: [{ col: 18, row: 13 }],
  },

  greenward_meadow: {
    id: 'greenward_meadow',
    name: 'The Salt Meadow',
    description: 'A meadow turned saline. Two cairns + a barrow. Open and exposed.',
    theme: 'generic',
    // Two entries (north + south) — Inheritors creep in from both
    // flanks, suggesting Marra is exposed in the middle of the field.
    entries: [
      { col: 17, row: 0 },
      { col: 17, row: GRID_ROWS - 1 },
    ],
    exits: [{ col: 0, row: MID_ROW }],
    blocked: [], // The meadow is OPEN by design — salt killed everything.
    noBuild: greenwardSaltCairns(),
  },

  greenward_eadwin: {
    id: 'greenward_eadwin',
    name: 'The Circle at Eadwin',
    description: 'An inn-village. Hearth still burning. Strange chants in the square.',
    theme: 'stone',
    entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
    exits:   [{ col: 0,             row: MID_ROW }],
    // Inn block (NE) + shop fronts in a central band create a
    // forced weave through the village.
    blocked: greenwardEadwinBuildings(),
    // The inn-hearth + village square ruins are noBuild.
    noBuild: greenwardEadwinRuins(),
  },
  // Act II — Salt Roads. Marsh crossroads, dying river, still-alive
  // Tarrenford, frozen wedding pavilion.

  greenward_crows: {
    id: 'greenward_crows',
    name: 'The Road of Crows',
    description: 'Marsh crossroads. Cethric sits cross-legged at the meeting of paths.',
    theme: 'water',
    // Multi-path crossroads — two entries (N+S) and two exits (E+W).
    entries: [
      { col: 17, row: 0 },
      { col: 17, row: GRID_ROWS - 1 },
    ],
    exits: [
      { col: 0,             row: 13 },
      { col: GRID_COLS - 1, row: 13 },
    ],
    blocked: greenwardMarshPatches(),
    // crossroads (Mercy — Cethric) + eastern_road (Ceremony)
    noBuild: [
      { col: 18, row: 13 }, // crossroads
      { col: 26, row: 13 }, // eastern_road
    ],
  },

  greenward_river: {
    id: 'greenward_river',
    name: 'The Dry River',
    description: 'A river going salt as Marra watches. The headwater is upstream.',
    theme: 'water',
    // Linear east-to-west river. The headwater is east; creeps
    // approach from the east, exit to the west toward the Wildwood.
    entries: [{ col: GRID_COLS - 1, row: 13 }],
    exits:   [{ col: 0,             row: 13 }],
    blocked: greenwardRiverBanks(),
    // headwater (Ceremony at east) + river_west + river_east (Siege).
    noBuild: [
      { col: 30, row: 13 }, // headwater
      { col: 8,  row: 13 }, // river_west
      { col: 18, row: 13 }, // river_east
    ],
  },

  greenward_tarrenford: {
    id: 'greenward_tarrenford',
    name: 'Tarrenford',
    description: 'A village still alive. Chapel, well, wheat. Forty-seven people.',
    theme: 'forest',
    // North entry, south exit — Inheritors approach the village from
    // above; civilians cross the path in both directions.
    entries: [{ col: MID_COL, row: 0 }],
    exits:   [{ col: MID_COL, row: GRID_ROWS - 1 }],
    blocked: greenwardTarrenfordBuildings(),
    // chapel + well + wheat_field — three Ceremony ruins.
    noBuild: [
      { col: 14, row: 8 },  // chapel
      { col: 18, row: 13 }, // well
      { col: 22, row: 18 }, // wheat_field
    ],
  },

  greenward_weddingstone: {
    id: 'greenward_weddingstone',
    name: 'Wedding-Stone',
    description: 'A wedding turned to stone. The bride still stands at the altar.',
    theme: 'stone',
    // Two entries (E+W, the wedding party approaches from both
    // sides) + one north exit (the cleared path the bride was
    // meant to walk).
    entries: [
      { col: 0,             row: 13 },
      { col: GRID_COLS - 1, row: 13 },
    ],
    exits: [{ col: MID_COL, row: 0 }],
    blocked: greenwardWeddingPavilion(),
    noBuild: [
      { col: 18, row: 10 }, // altar (Mercy)
      { col: 18, row: 18 }, // pavilion (Siege)
    ],
  },
  greenward_court:        { ...MAPS_PLAINS_TEMPLATE, id: 'greenward_court',        name: 'Stillborn Court', theme: 'stone' },
  greenward_lastgarden:   { ...MAPS_PLAINS_TEMPLATE, id: 'greenward_lastgarden',   name: 'Last Garden',     theme: 'mountain' },
  greenward_cathedral:    { ...MAPS_PLAINS_TEMPLATE, id: 'greenward_cathedral',    name: 'Caer Lythen',     theme: 'arcane_crystal' },
};

// (Legacy-shaped IIFE bodies removed; data lives in
// src/data/maps/circle/*.json and loads via CircleMaps.ts. See
// scripts/extract-circle-maps.mjs for the one-shot that produced
// the JSONs.)

/** Fallback for the registry when a circle map id is unknown. Only
 *  hit if someone accidentally renames a JSON file without updating
 *  CircleMaps.ts; in practice always returns a real definition. */
function getCircleMapById(id: string): MapDefinition {
  const map = getCircleMap(id);
  if (!map) throw new Error(`CircleMaps registry is missing ${id}`);
  return map;
}


export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress', 'serpentine', 'islands', 'gauntlet', 'spiral', 'siege', 'random', 'custom'];
export const CIRCLE_MAP_ORDER: MapId[] = ['circle_2p', 'circle_3p', 'circle_4p', 'circle_4p_hell_circle'];
