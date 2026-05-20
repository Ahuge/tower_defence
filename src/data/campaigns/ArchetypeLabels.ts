/**
 * Archetype labels — display-only lookup table used by
 * `CampaignLobbyScreen` for mission card subtitles + blurbs.
 *
 * Replaces the legacy `getArchetype()` / `isArchetypeStub()` runtime
 * (Phase F deleted `MissionArchetypes.ts`). The runtime info those
 * exports carried (baseMode, defaults, stub flag) is now expressed
 * via `MissionEntry.core.mode`, `MissionEntry.archetypeId`, and
 * `MissionEntry.unlaunchable`.
 *
 * Adding a new archetype id: append it here and set
 * `MissionEntry.archetypeId` on the relevant mission. The lookup is
 * lossy — unknown ids fall back to the `'standard'` label.
 */

export interface ArchetypeLabel {
  label: string;
  blurb: string;
}

export const ARCHETYPE_LABELS: Record<string, ArchetypeLabel> = {
  standard:        { label: 'Standard',       blurb: 'Hold the line — classic tower defence.' },
  restriction:     { label: 'Restriction',    blurb: 'Win with a constrained loadout.' },
  speedrun:        { label: 'Speedrun',       blurb: 'Clear fast. Time-attack scoring.' },
  boss_rush:       { label: 'Boss Rush',      blurb: 'Boss-only waves. Pure DPS test.' },
  frugal:          { label: 'Frugal',         blurb: 'Half resources. Half tower slots. Twice the thinking.' },
  heist:           { label: 'Heist',          blurb: 'Reverse path — stop the loot from escaping the vault.' },
  base_defense:    { label: 'Base Defense',   blurb: 'Hold a central base against spawns from every side.' },
  attacker:        { label: 'Attacker',       blurb: 'You command the creeps. Break through their defense.' },
  coop_with_bot:   { label: 'Bot Ally',       blurb: 'Coop practice with a CPU partner.' },
  hero_vs_boss:    { label: 'Hero Duel',      blurb: "Your hero vs a faction's flagship boss." },
  interrupt:       { label: 'Interrupt',      blurb: 'Disrupt enemy channels before they cast.' },
  final_showdown:  { label: 'Final Showdown', blurb: 'Their flagship. Their map. End it.' },
  final_arcane:    { label: 'The Reckoning',  blurb: 'Charge your circles, summon the mage, raze the spire.' },
  final_sabotage:  { label: 'The Overthrow',  blurb: 'Train raiders, drop the generators, end the tyrant.' },
  final_greenward: { label: 'The Sun-Cathedral', blurb: 'Three setpieces. One choice. The forest decides what it becomes.' },
  final_void:      { label: 'The Mirror',     blurb: "Three setpieces. One table. Ardax sits across from himself." },
};

/** Lookup with safe fallback to 'standard'. */
export function getArchetypeLabel(archetypeId: string): ArchetypeLabel {
  return ARCHETYPE_LABELS[archetypeId] ?? ARCHETYPE_LABELS.standard;
}
