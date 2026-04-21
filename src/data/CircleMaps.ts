/**
 * Circle Co-Op map registry.
 *
 * Mirrors the pattern `GauntletMaps.ts` uses for faction homeworld
 * maps: data lives in JSON under `src/data/maps/circle/`, the
 * module imports each JSON, and exports a typed registry + lookup
 * functions. Adding a new circle map is a one-line change here plus
 * dropping a JSON file into the folder.
 *
 * Each JSON describes:
 *   - playerCount       2, 3, or 4
 *   - blocked           impassable cells (tuple format `[col, row]`)
 *   - zones             per-player buildable-cell lists
 *   - zoneColors        hex strings for zone rendering
 *   - spawners          ordered { entry, waypoints, exit } per player
 *
 * `GameScene.recalculatePaths` reads the spawners and stitches a
 * waypoint-chained A* path for each one (see Circle Co-Op 5b). The
 * older `entries` / `exits` arrays on `MapDefinition` are still
 * populated for compatibility with non-circle code paths — derived
 * from the spawners here.
 */
import { MapDefinition, MapId, SpawnerDef } from './Maps';

import circle2p from './maps/circle/circle_2p.json';
import circle3p from './maps/circle/circle_3p.json';
import circle4p from './maps/circle/circle_4p.json';

type Tuple = [number, number];
type Pos = { col: number; row: number };

interface CircleSpawnerJSON {
  entry: Tuple;
  waypoints: Tuple[];
  exit: Tuple;
}

interface CircleMapJSON {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  theme: string;
  blocked: Tuple[];
  animated: Tuple[];
  noBuild: Tuple[];
  zones: Tuple[][];
  /** Hex strings ("#ff4444") for each zone. Converted to 0xRRGGBB
   *  at load time since the rest of the game uses numeric colours. */
  zoneColors: string[];
  spawners: CircleSpawnerJSON[];
}

function toPos(t: Tuple): Pos { return { col: t[0], row: t[1] }; }
function toPosArray(arr: Tuple[]): Pos[] { return arr.map(toPos); }
function hexToNum(hex: string): number {
  // Accepts '#RRGGBB' or 'RRGGBB'; returns numeric 0xRRGGBB.
  const trimmed = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(trimmed, 16);
}

function toSpawner(j: CircleSpawnerJSON): SpawnerDef {
  return {
    entry: toPos(j.entry),
    waypoints: j.waypoints.map(toPos),
    exit: toPos(j.exit),
  };
}

function fromJSON(json: CircleMapJSON): MapDefinition {
  const spawners = json.spawners.map(toSpawner);
  return {
    id: json.id as MapId,
    name: json.name,
    description: json.description,
    theme: json.theme,
    entries: spawners.map(s => s.entry),
    exits: spawners.map(s => s.exit),
    blocked: toPosArray(json.blocked),
    animated: toPosArray(json.animated),
    noBuild: toPosArray(json.noBuild),
    zones: json.zones.map(toPosArray),
    zoneColors: json.zoneColors.map(hexToNum),
    circlePlayers: json.playerCount,
    spawners,
  };
}

/** All registered circle maps, in display order. Multiple maps per
 *  playerCount are sorted by the order they appear in this array. */
const ALL_CIRCLE_MAPS: CircleMapJSON[] = [
  circle2p as unknown as CircleMapJSON,
  circle3p as unknown as CircleMapJSON,
  circle4p as unknown as CircleMapJSON,
];

/** All circle maps as MapDefinition objects, built once at module
 *  load. Stable references — callers can use object identity to
 *  test equality. */
export const CIRCLE_MAPS: MapDefinition[] = ALL_CIRCLE_MAPS.map(fromJSON);

/** Get a circle map by id. Returns undefined for unknown ids. */
export function getCircleMap(id: string): MapDefinition | undefined {
  return CIRCLE_MAPS.find(m => m.id === id);
}

/** Get all circle maps for a given player count. Used by the lobby
 *  screen when the user picks "Co-op 3P" and we need to offer the
 *  available variants. */
export function getCircleMapsForPlayerCount(playerCount: number): MapDefinition[] {
  return CIRCLE_MAPS.filter(m => m.circlePlayers === playerCount);
}
