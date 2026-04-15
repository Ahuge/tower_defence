# Skin source palettes

JSON exports from the skin editor (`/skin-editor.html`) that produced the tower
skin PNGs in `public/assets/<faction>/`. These are the source-of-truth palette
mappings — kept so we can regenerate or iterate on a skin without re-deriving
the colors from scratch.

These files are **not loaded at runtime**. The runtime uses the baked PNG
spritesheets. Editing a JSON here only affects the next regeneration through
the editor.

## Format

```json
{
  "factionId": "arcane",
  "skinName": "Corrupted Arcane",
  "suffix": "corrupted_arcane",
  "towerPalettes": {
    "-1": { "#hex_old": "#hex_new", ... },   // global swaps (apply to all towers)
    "0":  { "#hex_old": "#hex_new", ... },   // tower at column 0
    "1":  { "#hex_old": "#hex_new", ... },   // tower at column 1
    ...
  },
  "dockStyle": {
    "borderColor": "#22aa44",
    "glowColor":   "#22aa4466",
    "bgTint":      "#0a1a0a"
  }
}
```

Column indices match the `towerIds` order on the faction (see
`src/data/Factions.ts`). The `dockStyle` block matches `SkinDef.dockStyle` in
`src/systems/monetization/StoreDefinitions.ts`.

## Inventory

One source per shipped skin theme. The shipped suffix (PNG filename) doesn't
always match the JSON's internal `suffix` field — some sources use a redundant
`<theme>_<faction>` form internally but were exported / renamed to the bare
form on disk.

| Faction    | Shipped suffix | Source file                                  |
|------------|----------------|----------------------------------------------|
| arcane     | corrupted      | `arcane_skin_corrupted_arcane_v2.json`       |
| arcane     | sandstone      | `arcane_skin_sandstone.json`                 |
| arcane     | moonstone      | `arcane_skin_moonstone.json`                 |
| arcane     | blood_magic    | `arcane_skin_blood_magic.json`               |
| mechanical | gilded         | `mechanical_skin_gilded_mechanical.json`     |
| mechanical | factory_fresh  | `mechanical_skin_factory_fresh.json`         |
| nature     | autumn         | `nature_skin_autumn_nature.json`             |
| void       | whiteout       | `void_skin_whiteout.json`                    |
| military   | desert_storm   | `military_skin_desert_storm.json`            |
| military   | arctic         | `military_skin_arctic_military.json`         |
| aliens     | albino         | `aliens_skin_albino_aliens.json`             |
| cypherpunk | cyber_sakura   | `cypherpunk_skin_cyber_sakura.json`          |
| cypherpunk | redline        | `cypherpunk_skin_redline.json`               |
| cypherpunk | offline        | `cypherpunk_skin_offline.json`               |
| infernal   | frostfire      | `infernal_skin_frostfire_infernal.json`      |
| celestial  | fallen         | `celestial_skin_fallen.json`                 |
| psionic    | emerald        | `psionic_skin_emerald.json`                  |
| harmonic   | heavy_metal    | `harmonic_skin_heavy_metal.json`             |
| harmonic   | neon_rave      | `harmonic_skin_neon_rave.json`               |
| harmonic   | synthwave      | `harmonic_skin_synthwave.json`               |

## Adding a new theme

1. Open `/skin-editor.html`, pick the faction, recolor.
2. Click **Export** → drop the JSON in this folder using the convention
   `<faction>_skin_<suffix>.json`.
3. Drop the generated PNGs in `public/assets/<faction>/` as
   `<faction>_towers_<suffix>.png` and `<faction>_projectiles_<suffix>.png`.
4. Register the suffix in `src/systems/SpriteManager.ts` (`SKIN_ASSETS`) and
   add a `SkinDef` in `src/systems/monetization/StoreDefinitions.ts`.
5. If hero generation should also run for this theme, add an entry to
   `src/data/HeroSkinPalettes.ts`.
