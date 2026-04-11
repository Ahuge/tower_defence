/**
 * Custom Map Storage — localStorage-backed CRUD for user-created maps.
 * Maps are stored as JSON and can be converted to MapDefinition for gameplay.
 */
import { GRID_COLS, GRID_ROWS } from '../config';
import { MapDefinition, LargeStructurePlacement } from '../data/Maps';

type Pos = { col: number; row: number };

/** JSON map format — matches GauntletMaps.ts MapJSON */
export interface MapJSON {
  faction?: string;
  theme: string;
  name: string;
  description: string;
  entries: Pos[];
  exits: Pos[];
  blocked: ([number, number] | Pos)[];
  animated?: ([number, number] | Pos)[];
  noBuild: ([number, number] | Pos)[];
  structures?: LargeStructurePlacement[];
}

export interface StoredCustomMap {
  id: string;
  name: string;
  description: string;
  theme: string;
  json: MapJSON;
  createdAt: number;
}

const STORAGE_KEY = 'td_custom_maps';

/** Convert [col,row] tuples or {col,row} objects to Pos[] */
function toPosArray(arr: ([number, number] | Pos)[]): Pos[] {
  return arr.map(item => {
    if (Array.isArray(item)) return { col: item[0], row: item[1] };
    return item as Pos;
  });
}

export class MapStorage {
  /** List all stored custom maps */
  static list(): StoredCustomMap[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as StoredCustomMap[];
    } catch {
      return [];
    }
  }

  /** Find a stored map by id */
  static get(id: string): StoredCustomMap | undefined {
    return MapStorage.list().find(m => m.id === id);
  }

  /** Upsert a map into storage */
  static save(map: StoredCustomMap): void {
    const maps = MapStorage.list();
    const idx = maps.findIndex(m => m.id === map.id);
    if (idx >= 0) {
      maps[idx] = map;
    } else {
      maps.push(map);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }

  /** Delete a map by id */
  static delete(id: string): void {
    const maps = MapStorage.list().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }

  /** Validate that a parsed JSON object has the required map fields and cells are in bounds */
  static validate(json: unknown): json is MapJSON {
    if (!json || typeof json !== 'object') return false;
    const obj = json as Record<string, unknown>;

    // Required arrays
    if (!Array.isArray(obj.entries) || obj.entries.length === 0) return false;
    if (!Array.isArray(obj.exits) || obj.exits.length === 0) return false;
    if (!Array.isArray(obj.blocked)) return false;
    if (!Array.isArray(obj.noBuild)) return false;

    // Required strings
    if (typeof obj.name !== 'string') return false;
    if (typeof obj.theme !== 'string') return false;

    // Check all positions are within grid bounds
    const checkBounds = (arr: unknown[]): boolean => {
      for (const item of arr) {
        let col: number, row: number;
        if (Array.isArray(item)) {
          col = item[0]; row = item[1];
        } else if (item && typeof item === 'object') {
          const p = item as Record<string, unknown>;
          col = p.col as number; row = p.row as number;
        } else {
          return false;
        }
        if (typeof col !== 'number' || typeof row !== 'number') return false;
        if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
      }
      return true;
    };

    if (!checkBounds(obj.entries as unknown[])) return false;
    if (!checkBounds(obj.exits as unknown[])) return false;
    if (!checkBounds(obj.blocked as unknown[])) return false;
    if (!checkBounds(obj.noBuild as unknown[])) return false;

    return true;
  }

  /** Convert a StoredCustomMap to a MapDefinition usable by GameScene */
  static toMapDefinition(stored: StoredCustomMap): MapDefinition {
    const json = stored.json;
    const blocked = [
      ...toPosArray(json.blocked),
      ...toPosArray(json.animated || []),
    ];
    const noBuild = toPosArray(json.noBuild);
    const entries = json.entries.map(e => Array.isArray(e) ? { col: (e as unknown as number[])[0], row: (e as unknown as number[])[1] } : e);
    const exits = json.exits.map(e => Array.isArray(e) ? { col: (e as unknown as number[])[0], row: (e as unknown as number[])[1] } : e);

    return {
      id: 'custom',
      name: stored.name,
      description: stored.description,
      theme: stored.theme,
      entries,
      exits,
      blocked,
      noBuild,
      structures: json.structures,
    };
  }

  /** Convert a raw MapJSON object directly to a MapDefinition (for multiplayer sync) */
  static mapJSONToDefinition(json: MapJSON): MapDefinition {
    const stored: StoredCustomMap = {
      id: 'custom',
      name: json.name || 'Custom Map',
      description: json.description || '',
      theme: json.theme || 'generic',
      json,
      createdAt: 0,
    };
    return MapStorage.toMapDefinition(stored);
  }

  /** Parse a JSON string from clipboard, validate, and return a StoredCustomMap (or null) */
  static fromClipboard(text: string): StoredCustomMap | null {
    try {
      const parsed = JSON.parse(text);
      if (!MapStorage.validate(parsed)) return null;
      const json = parsed as MapJSON;
      return {
        id: crypto.randomUUID?.() ?? `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: json.name || 'Untitled Map',
        description: json.description || '',
        theme: json.theme || 'generic',
        json,
        createdAt: Date.now(),
      };
    } catch {
      return null;
    }
  }
}
