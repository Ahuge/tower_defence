/**
 * UnlockGates — single source of truth for which modes / maps / factions
 * are unlocked at a given Player Level.
 *
 * The menu reads these helpers to decide which tiles to show vs. hide
 * (per Plan 2: "hide locked modes/maps; faction list stays visible
 * with locked entries silhouetted"). When a feature is below its
 * unlock-level, it is *removed* from the menu rather than shown
 * greyed. The roadmap explicitly wanted the menu to feel uncluttered
 * for new players.
 *
 * The GATE here is *level-only*. Some features additionally require
 * Shards spent / campaign completion / etc. Those layered routes
 * (Faction Tree → Plan 5; Campaign unlock → Plan 14) read this gate
 * AND their own per-route checks.
 *
 * The faction list is exempt: Plan 2 leaves the existing
 * PlayerInventory.ownsFaction() shard-route as-is. The faction tree
 * (Plan 5) introduces level-tiered faction unlocks; for now we expose
 * `factionLevelTier(factionId)` that returns the L0/L3/L6/L18/L20 tier
 * a faction would sit in, so screens that want to preview the tree can
 * already silhouette factions out of reach.
 */

import { PlayerProfileStore } from './PlayerProfileStore';
import { levelFromXp } from './PlayerLevel';

// ---- Mode unlocks --------------------------------------------------------

/** All MatchMode ids that *can* appear in the menu, mapped to the
 *  Player Level that unlocks them. Modes not listed here (e.g.
 *  'tutorial') are always available. Career / Campaign / Base
 *  Defense / Attacker / Heist sit at level 999 — they get exposed
 *  by their own plans. */
export const MODE_UNLOCK_LEVEL: Record<string, number> = {
  standard:     1,
  tutorial:     1,
  endless:      5,
  battle:       9,
  hero_defense: 8,
  gauntlet:     14,
  circle_coop:  12,
  // Modes shipped via later plans — not exposed in menu yet.
  career:       15,
  campaign:     7,
  base_defense: 999,
  attacker:     999,
  heist:        999,
};

/** Lobby tiles in the menu use mode-aliases that aren't in MatchMode. */
export const LOBBY_UNLOCK_LEVEL: Record<string, number> = {
  versus_lobby: 10, // 'lobby' tile in MenuScreen → versus 1v1
  circle_lobby: 12, // 'circle' tile in MenuScreen → coop
};

export function isModeUnlocked(modeId: string, level: number): boolean {
  const required = MODE_UNLOCK_LEVEL[modeId];
  if (required === undefined) return true;
  return level >= required;
}

export function modeUnlockLevel(modeId: string): number | null {
  return MODE_UNLOCK_LEVEL[modeId] ?? null;
}

// ---- Map unlocks ---------------------------------------------------------

/** Map ids by Player Level. Custom + circle maps are mode-gated, not
 *  level-gated; they're available whenever their parent mode is. */
export const MAP_UNLOCK_LEVEL: Record<string, number> = {
  plains:       1,
  hero_plains:  1,  // available as soon as Hero Defense is — no extra gate
  tutorial:     1,
  crossroads:   2,
  fortress:     4,
  serpentine:   5,
  islands:      6,
  gauntlet:     8,
  spiral:       10,
  siege:        12,
  random:       6,  // unlocks alongside custom maps milestone
};

export function isMapUnlocked(mapId: string, level: number): boolean {
  const required = MAP_UNLOCK_LEVEL[mapId];
  if (required === undefined) return true;
  return level >= required;
}

export function mapUnlockLevel(mapId: string): number | null {
  return MAP_UNLOCK_LEVEL[mapId] ?? null;
}

// ---- Faction tier (informational; Plan 5 turns into hard gating) --------

/** Tier under the future faction tree (Plan 5):
 *    L0 root: arcane (free)
 *    L1 archetypes: mechanical, nature, void  (unlock at Player L3)
 *    L2 specialists: military, cypherpunk, aliens, harmonic, psionic, infernal (Player L6)
 *    L3 capstone: celestial (Player L18, plus 4 prerequisites)
 *  Meta entries (chaos, random) are tierless. */
export function factionLevelTier(factionId: string): { tier: 0 | 1 | 2 | 3 | null; minLevel: number | null } {
  switch (factionId) {
    case 'arcane':     return { tier: 0, minLevel: 1 };
    case 'mechanical':
    case 'nature':
    case 'void':       return { tier: 1, minLevel: 3 };
    case 'military':
    case 'cypherpunk':
    case 'aliens':
    case 'harmonic':
    case 'psionic':
    case 'infernal':   return { tier: 2, minLevel: 6 };
    case 'celestial':  return { tier: 3, minLevel: 18 };
    case 'chaos':
    case 'random':     return { tier: null, minLevel: null };
    default:           return { tier: null, minLevel: null };
  }
}

// ---- "What's next" reveal table ------------------------------------------

export interface UnlockReveal {
  type: 'mode' | 'map' | 'feature';
  id: string;
  label: string;
}

/** Things that are revealed *exactly at* the given level. Used by the
 *  level-up modal and the menu's "More unlocks at L_" teaser. */
export function unlocksAtLevel(level: number): UnlockReveal[] {
  const out: UnlockReveal[] = [];
  for (const [modeId, lvl] of Object.entries(MODE_UNLOCK_LEVEL)) {
    if (lvl === level && lvl < 999) out.push({ type: 'mode', id: modeId, label: prettyModeLabel(modeId) });
  }
  for (const [mapId, lvl] of Object.entries(MAP_UNLOCK_LEVEL)) {
    if (lvl === level) out.push({ type: 'map', id: mapId, label: prettyMapLabel(mapId) });
  }
  // Plan-driven feature reveals.
  const FEATURE_REVEALS: Record<number, { id: string; label: string }[]> = {
    2: [{ id: 'frontier', label: 'Frontier income buildings' }],
    4: [{ id: 'sends',    label: 'Send creeps (Z/X/C/V)' }],
    5: [{ id: 'draft',    label: 'Draft modifiers' }],
  };
  for (const f of FEATURE_REVEALS[level] ?? []) out.push({ type: 'feature', id: f.id, label: f.label });
  return out;
}

/** Cheapest preview: the next level that unlocks anything, and what. */
export function nextUnlockHint(currentLevel: number, lookaheadLevels = 10): { level: number; items: UnlockReveal[] } | null {
  for (let l = currentLevel + 1; l <= currentLevel + lookaheadLevels; l++) {
    const items = unlocksAtLevel(l);
    if (items.length > 0) return { level: l, items };
  }
  return null;
}

// ---- Convenience: read profile directly ---------------------------------

export function getCurrentLevel(): number {
  return levelFromXp(PlayerProfileStore.load().xp);
}

// ---- Pretty labels (small, internal) ------------------------------------

function prettyModeLabel(modeId: string): string {
  const M: Record<string, string> = {
    standard: 'Standard',
    endless: 'Endless',
    battle: 'Essence (Dual Economy)',
    hero_defense: 'Hero Defense',
    gauntlet: 'Faction Gauntlet',
    circle_coop: 'Circle Co-op',
    career: 'Career',
    campaign: 'Campaign',
  };
  return M[modeId] ?? modeId;
}

function prettyMapLabel(mapId: string): string {
  const M: Record<string, string> = {
    plains: 'Plains',
    crossroads: 'Crossroads',
    fortress: 'Fortress',
    serpentine: 'Serpentine',
    islands: 'Islands',
    gauntlet: 'Gauntlet',
    spiral: 'Spiral',
    siege: 'Siege',
    random: 'Random',
    hero_plains: 'Hero Plains',
    tutorial: 'Tutorial',
  };
  return M[mapId] ?? mapId;
}
