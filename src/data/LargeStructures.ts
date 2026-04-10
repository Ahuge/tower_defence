/**
 * Large Structure definitions — multi-tile sprites rendered over blocked cells.
 * Each structure has a unique ID, grid dimensions, and texture key.
 */

export interface LargeStructureDef {
  id: string;
  widthCells: number;
  heightCells: number;
  textureKey: string;
}

/** All registered large structures, keyed by theme ID */
export const LARGE_STRUCTURES: Record<string, LargeStructureDef[]> = {
  neural: [
    { id: 'psionic_brain_vat', widthCells: 3, heightCells: 5, textureKey: 'struct_psionic_brain_vat' },
    { id: 'psionic_memory_bank', widthCells: 3, heightCells: 3, textureKey: 'struct_psionic_memory_bank' },
    { id: 'psionic_thought_amp', widthCells: 2, heightCells: 3, textureKey: 'struct_psionic_thought_amp' },
  ],
  urban: [
    { id: 'military_hq', widthCells: 5, heightCells: 4, textureKey: 'struct_military_hq' },
    { id: 'military_barracks', widthCells: 5, heightCells: 3, textureKey: 'struct_military_barracks' },
    { id: 'military_motor_pool', widthCells: 5, heightCells: 4, textureKey: 'struct_military_motor_pool' },
    { id: 'military_supply_depot', widthCells: 5, heightCells: 3, textureKey: 'struct_military_supply_depot' },
    { id: 'military_comms_tower', widthCells: 2, heightCells: 5, textureKey: 'struct_military_comms_tower' },
  ],
  marble: [
    { id: 'celestial_sanctum', widthCells: 12, heightCells: 2, textureKey: 'struct_celestial_sanctum' },
    { id: 'celestial_gate_pillar', widthCells: 2, heightCells: 3, textureKey: 'struct_celestial_gate_pillar' },
  ],
  hellscape: [
    { id: 'infernal_throne', widthCells: 7, heightCells: 4, textureKey: 'struct_infernal_throne' },
    { id: 'infernal_spire', widthCells: 2, heightCells: 5, textureKey: 'struct_infernal_spire' },
    { id: 'infernal_altar', widthCells: 5, heightCells: 3, textureKey: 'struct_infernal_altar' },
  ],
  factory: [
    { id: 'mech_furnace', widthCells: 6, heightCells: 6, textureKey: 'struct_mech_furnace' },
    { id: 'mech_press', widthCells: 8, heightCells: 5, textureKey: 'struct_mech_press' },
  ],
  circuit: [
    { id: 'cyber_mainframe', widthCells: 3, heightCells: 6, textureKey: 'struct_cyber_mainframe' },
  ],
  arcane_crystal: [
    { id: 'arcane_wizard_tower', widthCells: 3, heightCells: 5, textureKey: 'struct_arcane_wizard_tower' },
  ],
  hive: [
    { id: 'alien_queen_chamber', widthCells: 7, heightCells: 7, textureKey: 'struct_alien_queen_chamber' },
  ],
  ancient_grove: [
    { id: 'nature_ancient_tree', widthCells: 7, heightCells: 7, textureKey: 'struct_nature_ancient_tree' },
  ],
  void_rift: [
    { id: 'void_slot_machine', widthCells: 3, heightCells: 4, textureKey: 'struct_void_slot_machine' },
  ],
  concert: [
    { id: 'harmonic_grand_piano', widthCells: 3, heightCells: 3, textureKey: 'struct_harmonic_grand_piano' },
    { id: 'harmonic_drum_kit', widthCells: 3, heightCells: 3, textureKey: 'struct_harmonic_drum_kit' },
  ],
};

/** Look up a structure definition by ID */
export function getStructureDef(structureId: string): LargeStructureDef | undefined {
  for (const defs of Object.values(LARGE_STRUCTURES)) {
    const found = defs.find(d => d.id === structureId);
    if (found) return found;
  }
  return undefined;
}
