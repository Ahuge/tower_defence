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
  | 'attacker_assault';

/** A multi-tile structure rendered as a single large sprite */
export interface LargeStructurePlacement {
  /** Structure type key (matches a registered LargeStructureDef) */
  structureId: string;
  /** Top-left grid column */
  col: number;
  /** Top-left grid row */
  row: number;
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
    entries: [
      { col: MID_COL, row: 0 },              // North
      { col: MID_COL, row: GRID_ROWS - 1 },  // South
      { col: GRID_COLS - 1, row: MID_ROW },  // East
      { col: 0, row: MID_ROW },              // West
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
    noBuild: [
      // Reserve a small ring around the base so the player can't
      // wall the central tile shut from arm's length.
      ...rect(MID_COL - 1, MID_ROW - 1, MID_COL + 1, MID_ROW + 1),
    ],
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
    description: 'You command the attack. Their pre-built defense is in the way.',
    theme: 'stone',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Outer arena walls — funnel the path through the central
      // corridor where defender towers sit.
      ...rect(0, 0, GRID_COLS - 1, 5),
      ...rect(0, GRID_ROWS - 6, GRID_COLS - 1, GRID_ROWS - 1),
    ],
    noBuild: [],
    preplacedTowers: [
      // Pre-placed defender lattice. Cheap towers at staggered rows
      // along the corridor — the player's wave has to walk past all
      // of these. Picked from the basic-faction kit so any campaign
      // mission against any faction reads as "their basic outposts."
      // Mix of damage profiles: arrows (fast single-target), cannons
      // (splash), one sniper for late-corridor pressure.
      { col: 6,  row: MID_ROW - 2, towerId: 'arrow' },
      { col: 6,  row: MID_ROW + 2, towerId: 'arrow' },
      { col: 12, row: MID_ROW - 2, towerId: 'cannon' },
      { col: 12, row: MID_ROW + 2, towerId: 'cannon' },
      { col: 18, row: MID_ROW - 2, towerId: 'arrow' },
      { col: 18, row: MID_ROW + 2, towerId: 'slow' },
      { col: 24, row: MID_ROW - 2, towerId: 'cannon' },
      { col: 24, row: MID_ROW + 2, towerId: 'arrow' },
      { col: 30, row: MID_ROW - 2, towerId: 'sniper' },
      { col: 30, row: MID_ROW + 2, towerId: 'arrow' },
    ],
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
