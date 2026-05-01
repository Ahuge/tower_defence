/**
 * MissionArchetypes — catalog of mission archetypes available to
 * `MissionDef.archetype`. Each archetype is a typed config that
 * resolves to a base `MatchMode` plus a default override block.
 *
 * Plan 10 v1 ships the archetypes that reuse existing MatchModes
 * (standard / endless / hero_defense / battle / circle_coop). Plans
 * 11/12/13 add `base_defense`, `attacker`, `heist`. Those entries
 * exist as placeholders here so the schema is forward-compatible —
 * the build flag `__archetypeStub` keeps any caller from
 * accidentally booting an unimplemented mission until the matching
 * plan lands.
 */

import type { MatchMode } from '../WaveDefinitions';
import type { MissionArchetypeId, MissionOverrides } from './CampaignDef';

export interface MissionArchetype {
  id: MissionArchetypeId;
  /** Display label for UI (badges, mission cards). */
  label: string;
  /** One-line description for mission cards. */
  blurb: string;
  /** Base MatchMode this archetype runs on top of. */
  baseMode: MatchMode;
  /** Defaults applied to every mission of this archetype. Per-mission
   *  overrides take precedence. */
  defaults: Partial<MissionOverrides>;
  /** True if the archetype is stubbed (Plans 11/12/13 not yet
   *  shipped). MissionRunner refuses to launch these and surfaces a
   *  "Coming Soon" state in the lobby. */
  __archetypeStub?: boolean;
}

const ARCHETYPES: Record<MissionArchetypeId, MissionArchetype> = {
  // ─── Existing-mode archetypes (Plan 10 v1) ──────────────────────
  standard: {
    id: 'standard',
    label: 'Standard',
    blurb: 'Hold the line — classic tower defence.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
  },
  boss_rush: {
    id: 'boss_rush',
    label: 'Boss Rush',
    blurb: 'Boss-only waves. Pure DPS test.',
    baseMode: 'standard',
    // Boss rush is a wave-config thing — for v1 we ship as Standard
    // with a custom wave-count and the campaign's wave script
    // generator (later plan) substitutes boss creeps. For Plan 10 we
    // wrap it as a 10-wave standard with a creep-mix override
    // applied by the runner; the visible difference is the campaign
    // map + objective.
    defaults: { waveCount: 10, difficulty: 'hard' },
  },
  speedrun: {
    id: 'speedrun',
    label: 'Speedrun',
    blurb: 'Clear fast. Time-attack scoring.',
    baseMode: 'standard',
    defaults: { waveCount: 20, difficulty: 'normal' },
  },
  frugal: {
    id: 'frugal',
    label: 'Frugal',
    blurb: 'Half resources. Half tower slots. Twice the thinking.',
    baseMode: 'standard',
    defaults: {
      waveCount: 15, difficulty: 'normal', goldStartMult: 0.5,
      restrictions: { maxTowers: 6 },
    },
  },
  hero_vs_boss: {
    id: 'hero_vs_boss',
    label: 'Hero Duel',
    blurb: 'Your hero vs a faction\'s flagship boss.',
    baseMode: 'hero_defense',
    defaults: { waveCount: 5, difficulty: 'normal' },
  },
  coop_with_bot: {
    id: 'coop_with_bot',
    label: 'Bot Ally',
    blurb: 'Coop practice with a CPU partner.',
    baseMode: 'circle_coop',
    defaults: { waveCount: 15, difficulty: 'normal' },
  },
  final_showdown: {
    id: 'final_showdown',
    label: 'Final Showdown',
    blurb: 'Their flagship. Their map. End it.',
    baseMode: 'standard',
    defaults: { waveCount: 30, difficulty: 'hard' },
  },
  restriction: {
    id: 'restriction',
    label: 'Restriction',
    blurb: 'Win with a constrained loadout.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
  },

  // ─── Stubs (Plans 11/12/13 land these) ──────────────────────────
  base_defense: {
    id: 'base_defense',
    label: 'Base Defense',
    blurb: '360° spawns toward a central base. (Coming soon.)',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
    __archetypeStub: true,
  },
  attacker: {
    id: 'attacker',
    label: 'Attacker',
    blurb: 'You command the creeps. (Coming soon.)',
    baseMode: 'standard',
    defaults: { waveCount: 10, difficulty: 'normal' },
    __archetypeStub: true,
  },
  heist: {
    id: 'heist',
    label: 'Heist',
    blurb: 'Reverse path — stop the loot from escaping. (Coming soon.)',
    baseMode: 'standard',
    defaults: { waveCount: 10, difficulty: 'normal' },
    __archetypeStub: true,
  },
};

export function getArchetype(id: MissionArchetypeId): MissionArchetype {
  const a = ARCHETYPES[id];
  if (!a) throw new Error(`Unknown mission archetype: ${id}`);
  return a;
}

export function isArchetypeStub(id: MissionArchetypeId): boolean {
  return !!ARCHETYPES[id]?.__archetypeStub;
}

export function listArchetypes(): MissionArchetype[] {
  return Object.values(ARCHETYPES);
}
