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

  // ─── Plan 11 — Base Defense (omni-directional spawn) ───────────
  // v1 implementation: reuses Standard mode + the new `base_arena`
  // map (4 edge spawners → central exit). The "base" is the single
  // central exit cell; leaks there cost lives just like Standard.
  // Future v2: bespoke Base entity with HP bar, hit-flash, damage
  // states (Plan 8-style polish). Map-level support is sufficient
  // for the campaign-mission use case today.
  base_defense: {
    id: 'base_defense',
    label: 'Base Defense',
    blurb: 'Hold a central base against spawns from every side.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal', mapId: 'base_arena' as const },
  },

  // ─── Plan 12 — Attacker (v1 — pre-placed defender towers) ──────
  // v1 implementation: new `attacker` MatchMode + the `attacker_assault`
  // map with pre-placed defender towers. Player can't build; their
  // creep waves spawn from the standard wave script and the win
  // condition is inverted at game-end (leak count >= threshold =
  // victory).
  //
  // v2: dynamic AI defender via BotAI on this.grid (instead of
  // fixed pre-placements), plus an essence-bought creep-buff palette
  // for the player. Both are tracked separately.
  attacker: {
    id: 'attacker',
    label: 'Attacker',
    blurb: 'You command the creeps. Break through their defense.',
    baseMode: 'attacker',
    defaults: { waveCount: 10, difficulty: 'normal', mapId: 'attacker_assault' as const },
  },

  // ─── Plan 13 — Heist (v1 — reverse path only) ──────────────────
  // v1 implementation: reuses Standard mode + the new `heist_vault`
  // map (vault on the east, escape route to the west — creeps spawn
  // from the vault carrying loot and try to escape). The signature
  // gold-on-ground mechanic (killed creeps drop pickups, surviving
  // creeps absorb them) is deferred to Plan 13 v2 — needs a new
  // GoldDrop entity and per-creep `carriedGold` plumbing on the
  // creep base class.
  heist: {
    id: 'heist',
    label: 'Heist',
    blurb: 'Reverse path — stop the loot from escaping the vault.',
    baseMode: 'standard',
    defaults: { waveCount: 10, difficulty: 'normal', mapId: 'heist_vault' as const },
  },

  // ─── Phase 0 — v2 archetype slots (stubbed) ────────────────────
  // Registered so CampaignDef + MissionRunner type-check against them.
  // `__archetypeStub` keeps MissionRunner from launching them until
  // Plan A / Plan B replaces the stub with real config.

  // Plan A v1: real archetype. Wraps standard mode; the mission's
  // own waveScript drops Sigil / Scribe casters into specific waves.
  // Win condition is still "survive all waves"; star objectives can
  // read result.custom.channelsInterrupted / channelsCompleted.
  interrupt: {
    id: 'interrupt',
    label: 'Interrupt',
    blurb: 'Disrupt enemy channels before they cast.',
    baseMode: 'standard',
    defaults: { waveCount: 12, difficulty: 'normal' },
  },
  interrupt_combo: {
    id: 'interrupt_combo',
    label: 'Dispel Chain',
    blurb: 'Chain interrupts — one stun ripples to adjacent casters.',
    baseMode: 'standard',
    defaults: { waveCount: 12, difficulty: 'normal' },
    __archetypeStub: true,
  },
  interrupt_cascade: {
    id: 'interrupt_cascade',
    label: 'Counter-Cascade',
    blurb: 'Each completed cast permanently weakens your towers.',
    baseMode: 'standard',
    defaults: { waveCount: 15, difficulty: 'normal' },
    __archetypeStub: true,
  },
  attacker_role_reversal: {
    id: 'attacker_role_reversal',
    label: 'Role Reversal',
    blurb: 'Command the assault. Defender layouts shift with the supply.',
    baseMode: 'attacker',
    defaults: { waveCount: 10, difficulty: 'normal' },
    __archetypeStub: true,
  },
  boss_rush_visible_assembly: {
    id: 'boss_rush_visible_assembly',
    label: 'Cascade Strike',
    blurb: 'Walker bosses arrive missing parts you stole.',
    baseMode: 'standard',
    defaults: { waveCount: 5, difficulty: 'hard' },
    __archetypeStub: true,
  },

  // ─── M10 finale — Arcane siege ────────────────────────────────
  // Hybrid mode: standard wave creeps + a hero summoned from the
  // player's mana drains + destructible CPU towers the hero attacks.
  // Win = destroy every CPU tower (incl. the Ult Throne). Endless
  // waves until win/loss.
  final_arcane: {
    id: 'final_arcane',
    label: 'The Reckoning',
    blurb: 'Charge your circles, summon the mage, raze the spire.',
    baseMode: 'standard',
    defaults: { waveCount: 999, difficulty: 'hard' },
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
