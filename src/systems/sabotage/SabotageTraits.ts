/**
 * Mechanical-campaign trait registrations. Each Mech-specific tower
 * "tag" that lived on Tower.ts as a flag before the v2 refactor is now
 * a trait registered here:
 *
 *   - mech_generator (with linkedCells: Coord[] payload)
 *   - mech_throne (marker)
 *   - invulnerable (generic damage-veto; reusable for any future
 *                   campaign mechanic that wants "no damage right now")
 *
 * SabotageController adds these to a tower's traits[] at placement
 * time and removes the invulnerable trait when the generator cascade
 * lifts. The damage-veto handler returns true for any invulnerable
 * tower, so Tower.takeDamage's pipeline short-circuits silently.
 *
 * Import as a side-effect (`import './SabotageTraits'`) so the
 * registrations apply before any tower is constructed.
 */

import { registerDamageVeto } from '../traits/Trait';

export interface MechGeneratorTrait {
  id: 'mech_generator';
  /** Cells of CPU towers this generator powers. When the generator
   *  dies, SabotageController kills every linked tower (sets
   *  _expired = true, no rewards). Empty for "standalone" generators
   *  that don't cascade. */
  linkedCells: { col: number; row: number }[];
}

export interface MechThroneTrait {
  id: 'mech_throne';
}

/** Generic damage-veto trait. Present on a tower = takeDamage no-ops.
 *  Carried by the Mech throne while any generator is alive, but
 *  reusable for future mechanics (Cypherpunk shielded servers,
 *  boss-phase invuln windows, etc.). Cosmetics (shield ring, etc.)
 *  belong on a separate overlay-draw trait so the veto stays
 *  primitive. */
export interface InvulnerableTrait {
  id: 'invulnerable';
}

// The veto handler is intentionally trivial — the marker presence
// IS the contract. Future variants (mute_window with a TTL, hp-
// gated vulnerability, etc.) get their own ids.
registerDamageVeto('invulnerable', () => true);
