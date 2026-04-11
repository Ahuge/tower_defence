/**
 * Gauntlet Mode — 10 faction homeworld maps.
 * Maps are loaded from JSON files in src/data/maps/.
 * Use the structure-editor tab in sprites.html to visually edit maps,
 * then export the Full Map JSON and save to the corresponding file.
 */
import { GRID_COLS, GRID_ROWS } from '../config';
import { MapDefinition, LargeStructurePlacement } from './Maps';
import { FactionId } from './Factions';

// Import map JSON files
import arcaneMap from './maps/arcane.json';
import mechanicalMap from './maps/mechanical.json';
import natureMap from './maps/nature.json';
import voidMap from './maps/void.json';
import militaryMap from './maps/military.json';
import aliensMap from './maps/aliens.json';
import cypherpunkMap from './maps/cypherpunk.json';
import infernalMap from './maps/infernal.json';
import celestialMap from './maps/celestial.json';
import psionicMap from './maps/psionic.json';
import harmonicMap from './maps/harmonic.json';

type Pos = { col: number; row: number };

/** JSON map file format */
interface MapJSON {
  faction: string;
  theme: string;
  name: string;
  description: string;
  entries: Pos[];
  exits: Pos[];
  blocked: [number, number][] | Pos[];
  animated: [number, number][] | Pos[];
  noBuild: [number, number][] | Pos[];
  structures: LargeStructurePlacement[];
}

/** Convert [col,row] tuples or {col,row} objects to Pos[] */
function toPosArray(arr: ([number, number] | Pos)[]): Pos[] {
  return arr.map(item => {
    if (Array.isArray(item)) return { col: item[0], row: item[1] };
    return item as Pos;
  });
}

/** Convert a JSON map to builder result */
function fromJSON(json: MapJSON): { blocked: Pos[]; noBuild: Pos[]; structures?: LargeStructurePlacement[] } {
  const blocked = [
    ...toPosArray(json.blocked),
    ...toPosArray(json.animated || []),
  ];
  const noBuild = toPosArray(json.noBuild);
  return { blocked, noBuild, structures: json.structures };
}

// =====================================================================
// GAUNTLET MAP REGISTRY
// =====================================================================

export interface GauntletMapConfig {
  faction: FactionId;
  name: string;
  description: string;
  theme: string;
  entries: Pos[];
  exits: Pos[];
  builder: () => { blocked: Pos[]; noBuild: Pos[]; structures?: LargeStructurePlacement[] };
}

const MAP_DATA: Record<string, MapJSON> = {
  arcane: arcaneMap as unknown as MapJSON,
  mechanical: mechanicalMap as unknown as MapJSON,
  nature: natureMap as unknown as MapJSON,
  void: voidMap as unknown as MapJSON,
  military: militaryMap as unknown as MapJSON,
  aliens: aliensMap as unknown as MapJSON,
  cypherpunk: cypherpunkMap as unknown as MapJSON,
  infernal: infernalMap as unknown as MapJSON,
  celestial: celestialMap as unknown as MapJSON,
  psionic: psionicMap as unknown as MapJSON,
  harmonic: harmonicMap as unknown as MapJSON,
};

function makeConfig(json: MapJSON): GauntletMapConfig {
  return {
    faction: json.faction as FactionId,
    name: json.name,
    description: json.description,
    theme: json.theme,
    entries: json.entries,
    exits: json.exits,
    builder: () => fromJSON(json),
  };
}

export const GAUNTLET_MAP_CONFIGS: GauntletMapConfig[] = [
  makeConfig(MAP_DATA.arcane),
  makeConfig(MAP_DATA.mechanical),
  makeConfig(MAP_DATA.nature),
  makeConfig(MAP_DATA.void),
  makeConfig(MAP_DATA.military),
  makeConfig(MAP_DATA.aliens),
  makeConfig(MAP_DATA.cypherpunk),
  makeConfig(MAP_DATA.infernal),
  makeConfig(MAP_DATA.celestial),
  makeConfig(MAP_DATA.psionic),
  makeConfig(MAP_DATA.harmonic),
];

/** Get the gauntlet map for a given faction */
export function getGauntletMap(faction: FactionId): MapDefinition {
  const config = GAUNTLET_MAP_CONFIGS.find(m => m.faction === faction);
  if (!config) throw new Error(`No gauntlet map for faction: ${faction}`);
  const { blocked, noBuild, structures } = config.builder();
  const mapId = `gauntlet_${config.faction}` as any;
  return {
    id: mapId,
    name: config.name,
    description: config.description,
    theme: config.theme,
    entries: config.entries,
    exits: config.exits,
    blocked,
    noBuild,
    structures,
  };
}

/** Get all gauntlet faction IDs (excluding a given player faction) */
export function getGauntletFactions(excludeFaction: FactionId): FactionId[] {
  return GAUNTLET_MAP_CONFIGS
    .map(m => m.faction)
    .filter(f => f !== excludeFaction);
}

/** Shuffle an array (Fisher-Yates) */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
