/**
 * AttackerAbilityDefs — declarative ability catalog for attacker
 * missions (Plan 12 v2 Phase 2).
 *
 * Each AbilityDef pairs a UI-rendering record (label, description,
 * cost, cooldown) with an effect id that resolves through the
 * AttackerAbilities registry at cast time. The composer reads the
 * available abilities for the mission's faction palette and renders
 * a button per entry.
 *
 * v1 ships 3 generic abilities reused across all attacker missions.
 * Future per-faction polish (Phase 3) can swap them for thematic
 * variants — same engine.
 */

export interface AttackerAbilityDef {
  id: string;
  label: string;
  description: string;
  /** Effect id resolved through AttackerAbilities.dispatch. */
  effectId: string;
  /** Wave-cooldown — N waves after a cast before this can fire again.
   *  Tracked on the AttackerComposer (decremented on wave clear). */
  cooldown: number;
  /** Free-form per-ability config passed to the effect. */
  meta?: Record<string, unknown>;
}

/** Default 3-ability set used across all v2 attacker missions until
 *  per-faction polish lands in Phase 3. */
export const DEFAULT_ATTACKER_ABILITIES: AttackerAbilityDef[] = [
  {
    id: 'frenzy',
    label: 'Frenzy',
    description: 'Next wave creeps move 2x speed for the whole wave.',
    effectId: 'frenzy',
    cooldown: 3,
    meta: { factor: 2.0 },
  },
  {
    id: 'smoke_screen',
    label: 'Smoke Screen',
    description: 'Defender towers blinded for 5 seconds at wave start.',
    effectId: 'smoke_screen',
    cooldown: 4,
    meta: { duration: 5 },
  },
  {
    id: 'power_surge',
    label: 'Power Surge',
    description: 'Next wave creeps gain +50% HP.',
    effectId: 'power_surge',
    cooldown: 3,
    meta: { factor: 1.5 },
  },
];
