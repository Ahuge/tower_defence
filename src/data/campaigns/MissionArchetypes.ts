/**
 * MissionArchetypes — catalog of mission archetypes available to
 * `MissionDef.archetype`. Each archetype is a typed config that
 * resolves to a base `MatchMode` plus a default override block.
 *
 * Live archetypes live in `ARCHETYPES`; forward-compat placeholders
 * with no real implementation live in `STUB_ARCHETYPES`. Splitting
 * the registries lets the type union (`MissionArchetypeId`) stay
 * stable across plan boundaries while `MissionRunner` refuses to
 * launch a stub. `getArchetype` looks in both; `isArchetypeStub`
 * does a key-presence check on the stub registry, no runtime flag.
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
}

const ARCHETYPES: Record<string, MissionArchetype> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    blurb: 'Hold the line — classic tower defence.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
  },
  /** Boss Rush is a wave-config-only twist on Standard: same
   *  match-mode, fewer waves, harder difficulty. The boss-only creep
   *  mix is applied by the mission's `waveScript` rather than the
   *  archetype itself, so any standard-mode tooling (hero defense,
   *  versus, etc.) keeps working unchanged. */
  boss_rush: {
    id: 'boss_rush',
    label: 'Boss Rush',
    blurb: 'Boss-only waves. Pure DPS test.',
    baseMode: 'standard',
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
  base_defense: {
    id: 'base_defense',
    label: 'Base Defense',
    blurb: 'Hold a central base against spawns from every side.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal', mapId: 'base_arena' as const },
  },
  attacker: {
    id: 'attacker',
    label: 'Attacker',
    blurb: 'You command the creeps. Break through their defense.',
    baseMode: 'attacker',
    defaults: { waveCount: 10, difficulty: 'normal', mapId: 'attacker_assault' as const },
  },
  heist: {
    id: 'heist',
    label: 'Heist',
    blurb: 'Reverse path — stop the loot from escaping the vault.',
    baseMode: 'standard',
    defaults: { waveCount: 10, difficulty: 'normal', mapId: 'heist_vault' as const },
  },
  interrupt: {
    id: 'interrupt',
    label: 'Interrupt',
    blurb: 'Disrupt enemy channels before they cast.',
    baseMode: 'standard',
    defaults: { waveCount: 12, difficulty: 'normal' },
  },
  /** M10 finale — hybrid mode: standard wave creeps + a hero summoned
   *  from the player's mana drains + destructible CPU towers the hero
   *  attacks. Win = destroy every CPU tower. Endless waves until
   *  win/loss. */
  final_arcane: {
    id: 'final_arcane',
    label: 'The Reckoning',
    blurb: 'Charge your circles, summon the mage, raze the spire.',
    baseMode: 'standard',
    defaults: { waveCount: 999, difficulty: 'hard' },
  },
  /** Mech M10 finale — Workshop trains Raiders, Raiders sabotage
   *  generators + the throne. Endless waves; win = throne destroyed,
   *  loss = lives at 0. Distinct controller from final_arcane (no
   *  summoning circles, no charge meter, squad instead of single hero). */
  final_sabotage: {
    id: 'final_sabotage',
    label: 'The Overthrow',
    blurb: 'Train raiders, drop the generators, end the tyrant.',
    baseMode: 'standard',
    defaults: { waveCount: 999, difficulty: 'hard' },
  },
};

/** Forward-compat placeholders — registered so the `MissionArchetypeId`
 *  union covers them, but `MissionRunner` refuses to launch missions
 *  pointing at one. Move an entry into `ARCHETYPES` once its plan
 *  ships real config. */
const STUB_ARCHETYPES: Record<string, MissionArchetype> = {
  interrupt_combo: {
    id: 'interrupt_combo',
    label: 'Dispel Chain',
    blurb: 'Chain interrupts — one stun ripples to adjacent casters.',
    baseMode: 'standard',
    defaults: { waveCount: 12, difficulty: 'normal' },
  },
  interrupt_cascade: {
    id: 'interrupt_cascade',
    label: 'Counter-Cascade',
    blurb: 'Each completed cast permanently weakens your towers.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
  },
  attacker_role_reversal: {
    id: 'attacker_role_reversal',
    label: 'Role Reversal',
    blurb: 'Command the assault. Defender layouts shift with the supply.',
    baseMode: 'attacker',
    defaults: { waveCount: 10, difficulty: 'normal' },
  },
  boss_rush_visible_assembly: {
    id: 'boss_rush_visible_assembly',
    label: 'Cascade Strike',
    blurb: 'Walker bosses arrive missing parts you stole.',
    baseMode: 'standard',
    defaults: { waveCount: 5, difficulty: 'hard' },
  },
};

export function getArchetype(id: MissionArchetypeId): MissionArchetype {
  const a = ARCHETYPES[id] ?? STUB_ARCHETYPES[id];
  if (!a) throw new Error(`Unknown mission archetype: ${id}`);
  return a;
}

export function isArchetypeStub(id: MissionArchetypeId): boolean {
  return id in STUB_ARCHETYPES;
}

export function listArchetypes(): MissionArchetype[] {
  return [...Object.values(ARCHETYPES), ...Object.values(STUB_ARCHETYPES)];
}
