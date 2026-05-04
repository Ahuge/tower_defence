/**
 * AttackerPalettes — per-faction creep-pick palettes for attacker
 * missions (Plan 12 v2 / notes/campaign-game-modes/09).
 *
 * Each palette lists 6-8 creep types the player can compose into
 * waves. Each entry has a cost in essence — players spend a per-wave
 * essence budget on whatever mix they want.
 *
 * Per-faction palettes get their own creep mix; for the v2 launch
 * we ship a single 'arcane' palette that powers M8 of the Arcane
 * campaign. Other campaigns add their palettes when they author
 * their attacker missions (per spec Phase 3).
 */
import type { FactionId } from './Factions';

export interface AttackerPaletteEntry {
  /** Creep type id (matches CreepTypes.ts) */
  creepType: string;
  /** Display name shown on the pick card */
  label: string;
  /** Essence cost per single creep. Multi-spawn creeps (swarm) charge
   *  for the whole burst, not per-unit. */
  cost: number;
  /** One-line description shown on hover */
  description: string;
  /** Mission idx where this entry first becomes pickable. Lets a
   *  campaign tease creep variety across multiple attacker missions
   *  without dumping the full palette on first contact. Default 0
   *  (always available). */
  unlockedAtMission?: number;
}

export interface AttackerPalette {
  factionId: FactionId | 'coalition';
  entries: AttackerPaletteEntry[];
}

/** Arcane / Coalition raider palette for M8 (Breach the Relay).
 *  Player is the Coalition's strike force; the creeps are mundane
 *  raider archetypes (no magic — that's what they're attacking).
 *  Costs tuned so a 100-essence wave produces ~10-20 creeps. */
const ARCANE_PALETTE: AttackerPalette = {
  factionId: 'coalition',
  entries: [
    {
      creepType: 'standard', label: 'Raider',
      cost: 5,
      description: 'Standard infantry. Decent HP, plain speed. The bulk of any breach attempt.',
    },
    {
      creepType: 'fast', label: 'Skirmisher',
      cost: 4,
      description: 'Sprinter. Low HP but slips past slow towers if you flood the line.',
    },
    {
      creepType: 'swarm', label: 'Wolfpack',
      cost: 12,
      description: 'Spawns as a 3-unit pack. Flood damage; defender has to hit them all.',
    },
    {
      creepType: 'armored', label: 'Bulwark',
      cost: 20,
      description: 'Heavy armor, slow. Tanks splash so your skirmishers can leak.',
    },
    {
      creepType: 'regenerator', label: 'Healer',
      cost: 25,
      description: 'Self-heals between hits. Survives single-target snipers.',
    },
    {
      creepType: 'evasive', label: 'Smoker',
      cost: 14,
      description: 'Dodges hits 25% of the time. Throws off precision turrets.',
    },
    {
      creepType: 'flying', label: 'Glider',
      cost: 8,
      description: 'Bypasses ground defenses on a straight-line path. Cheap to spam — useful when the defender mazes.',
    },
    {
      creepType: 'boss', label: 'Battering Ram',
      cost: 100,
      description: 'Single high-HP push. Expensive; one-shot leak.',
    },
  ],
};

const PALETTES: Partial<Record<FactionId | 'coalition', AttackerPalette>> = {
  coalition: ARCANE_PALETTE,
};

/** Get the attacker palette for a player faction. Returns null when
 *  no palette is registered yet (later campaigns will add their own). */
export function getAttackerPalette(factionId: FactionId | 'coalition' | null): AttackerPalette | null {
  if (!factionId) return null;
  return PALETTES[factionId] ?? null;
}

/** Filter palette entries by mission idx. Entries with
 *  unlockedAtMission > missionIdx are hidden. */
export function visibleEntries(palette: AttackerPalette, missionIdx: number): AttackerPaletteEntry[] {
  return palette.entries.filter(e => (e.unlockedAtMission ?? 0) <= missionIdx);
}
