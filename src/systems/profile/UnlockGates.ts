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
import { StorePersistence } from '../monetization/StorePersistence';
import { getTreeNode } from '../../data/FactionTree';
import { getCampaign, isCampaignComplete } from '../../data/campaigns';
import type { FactionId } from '../../data/Factions';

// We deliberately do NOT import PlayerProfile here — UnlockGates is
// imported by PlayerProfile, so the dependency must point one way.
// Read flags + campaign progress directly from the store layer.
function readProfileFlag(key: string): boolean {
  return !!PlayerProfileStore.load().flags[key];
}
function readCampaignProgress(factionId: string): { [missionIdx: number]: number } {
  return PlayerProfileStore.load().campaignProgress[factionId] ?? {};
}

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
  // Campaign is the polished onboarding path into the game's faction
  // content — always available so a fresh player can dive straight
  // into Arcane (the free root) without a Player Level grind first.
  campaign:     1,
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

// ---- Faction tree state machine (Plan 5) -------------------------------

/** State of a single faction in the tree, used to render the tree UI
 *  and gate the unlock CTA. */
export type FactionNodeState =
  | 'locked_level'         // Player Level too low — silhouette + L_ tooltip
  | 'locked_parents'       // Parent(s) not yet Shards-unlocked
  | 'locked_capstone'      // Capstone — needs N other unlocks
  | 'unlockable'           // All gates clear, can spend Shards now
  | 'campaign_pending'     // Shards spent, campaign exists but not started / not shipped
  | 'campaign_in_progress' // At least one mission won, not all
  | 'playable';            // Free root OR Shards spent + campaign complete

/** Has the Shards purchase happened for this faction's campaign?
 *  Tracked in `PlayerInventory.unlockedFactions` (existing field; Plan 5
 *  reuses it — the meaning shifted from "playable" to
 *  "campaign-purchased"). */
export function isFactionCampaignPurchased(factionId: FactionId): boolean {
  if (factionId === 'arcane') return true; // free root, implicitly purchased
  return StorePersistence.load().unlockedFactions.includes(factionId);
}

/** Has the player completed the campaign for this faction?
 *  True when every mission has at least one star. Returns false if
 *  the campaign content hasn't shipped yet — can't complete what
 *  isn't there. */
export function isFactionCampaignComplete(factionId: FactionId): boolean {
  const def = getCampaign(factionId);
  if (!def) return false;
  return isCampaignComplete(factionId, readCampaignProgress(factionId));
}

/** Is this faction playable in non-campaign modes (Standard, Endless,
 *  etc.)? Two-step unlock:
 *    1. Pay Shards → campaign purchased
 *    2. Beat campaign → playable
 *  Arcane is the free root and is always playable. Legacy migration
 *  may also pre-grant playable status to factions the player already
 *  used pre-Plan-5 via `legacy_faction_playable.<id>` flags. */
export function isFactionPlayable(factionId: FactionId): boolean {
  if (factionId === 'arcane') return true;
  if (factionId === 'chaos' || factionId === 'random') return true; // meta — not gated
  if (readProfileFlag(`legacy_faction_playable.${factionId}`)) return true;
  if (!isFactionCampaignPurchased(factionId)) return false;
  return isFactionCampaignComplete(factionId);
}

/** Compute tree-state for a node. Drives the UI badge + whether the
 *  unlock CTA fires. */
export function getFactionNodeState(factionId: FactionId): FactionNodeState {
  const node = getTreeNode(factionId);
  if (!node) return 'playable'; // chaos / random — not in tree
  const level = getCurrentLevel();

  if (isFactionPlayable(factionId)) return 'playable';

  if (isFactionCampaignPurchased(factionId)) {
    const def = getCampaign(factionId);
    if (!def) return 'campaign_pending';
    const progress = readCampaignProgress(factionId);
    return Object.values(progress).some(s => s >= 1) ? 'campaign_in_progress' : 'campaign_pending';
  }

  if (level < node.minLevel) return 'locked_level';

  if (node.requiresAnyN !== undefined) {
    let count = 0;
    for (const peer of ['mechanical', 'nature', 'void', 'military', 'celestial', 'aliens', 'infernal', 'psionic', 'cypherpunk'] as FactionId[]) {
      if (isFactionCampaignPurchased(peer)) count++;
    }
    return count >= node.requiresAnyN ? 'unlockable' : 'locked_capstone';
  }

  for (const parentId of node.parents) {
    if (!isFactionCampaignPurchased(parentId)) return 'locked_parents';
  }
  return 'unlockable';
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
