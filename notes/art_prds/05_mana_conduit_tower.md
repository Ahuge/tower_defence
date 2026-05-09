# Art PRD — Mana Conduit Tower (M10 finale, arcane sprite extension)

## Context
Match the existing arcane tower spritesheet — see `public/assets/arcane/arcane_towers.png` (and the procedural generator `scripts/generate_coalition_tower_sprites.py` for layout discipline). 64 × 64 px frames, sprite sheet with Idle / Fire / Death animation rows, and per-tower-level columns. Programmatic / hand-pixeled, matching the existing 7 arcane towers' style precisely (it's a kit extension, not a new aesthetic).

## Slot
The `arcane_conduit` tower — the dedicated summoning feeder for the M10 Arcane finale. 0 damage, 0 range, fixed cost 40g. Built adjacent to a Summoning Circle to charge it. Currently renders as a Phaser Graphics-fallback color block (no sprite registered). Replace with a real sprite that visually reads as "magical conduit channel pillar" — clearly a power-feeding structure, not a weapon.

## Where it lives
- **Path on disk**: extend the existing `public/assets/arcane/arcane_towers.png` spritesheet by ONE column. Current sheet is 7 columns (bolt / frost / storm / focus / drain / meteor / nova) × 24 rows. New sheet: **8 columns × 24 rows** (=  512 × 1536 px, was 448 × 1536). Conduit takes column 7 (0-indexed).
  - Alternative: separate `arcane_conduit.png` 64 × N. Less consistent with the existing pipeline. Prefer the column-extension.
- **Engine consumer**: add `arcane_conduit` to `TOWER_SPRITE_CONFIGS` in `src/systems/SpriteManager.ts`:
  ```ts
  ...factionTowers('arcane_towers', [..., 'arcane_conduit'], [..., 1]),
  ```
  Single-level tower (no upgrades) — only one row of frames in the column.

## Sheet layout (column 7)
Same row layout as the existing arcane towers (which use the standard 24-row arcane sprite scheme):

- **Rows 0–3**: Idle animation — 4 frames of subtle animation (humming pillar, faint particle drift). Loop at ~6 fps.
- **Rows 4–7**: Fire / cast animation — irrelevant for the conduit (it doesn't fire), but include 4 frames of "channel pulse" so when the engine does try to play a fire state nothing breaks. Visually: ring of light brightens once + dims back to idle. Same loop length as the existing towers.
- **Rows 8–11**: Hit / damaged — flash white. Matches the existing tower convention even though conduits aren't currently destructible.
- **Rows 12–23**: Reserved / idle echo — fill with idle frames (the engine will only play rows 0–7). NOT empty pixels, just repeats so artists don't have to draw new frames.

## Visual identity
- **Silhouette**: a low arcane pillar / obelisk with a glowing crystal head. ~36 px tall on a 64 × 64 frame, anchored bottom-center. NOT a turret, NOT a barreled tower — clearly a passive channel structure.
- **Body**: dark violet-grey stone (matches arcane structure tileset palette), 3 stacked stone segments, 1-px gap suggesting carved seams. Top of pillar has a hovering crystal shard (~12 px tall).
- **Crystal head**: violet crystal floating ~2 px above the top of the pillar, gently bobbing (one of the idle-loop animations). 4-cornered diamond/octahedron silhouette.
- **Light**: violet glow from inside the crystal + faint vertical light beam connecting crystal to pillar. The beam is the "channel" cue — visually obvious that energy is flowing UP from the pillar into the crystal.
- **Particle drift**: 1–2 violet pixels drifting upward each frame around the crystal. Subtle; not a fountain.

## Color palette
Pull from `src/data/Factions.ts` arcane palette:
- `primaryColor: 0x6644ff` (violet) — crystal core, beam, particles.
- `secondaryColor: 0x9988ff` (light violet) — crystal highlights, pillar accent.
- Pillar stone: `#3a2d52` shadow → `#5a4880` body → `#7e6ba8` highlight (matches the Summoning Circle PRD's stone ramp — same world).
- Crystal core: `#aa88ff` light, `#6644ff` mid, `#3a1f80` shadow, `#ffffff` 1-pixel sparkle highlight.
- Outline: 1 px near-black `#1a1226`.

## Pixel art rules
- 1 px outline, no AA.
- 3-color palette per detail blob (base / shadow / highlight).
- Idle loop is 4 frames at 6 fps — keep the per-frame delta SMALL (one bobbed pixel, one drifted particle). Not a violent animation.
- Match the existing arcane tower's "magical" vibe — soft glow, no harsh edges. Compare against `arcane_bolt` and `arcane_focus` columns.

## What NOT to draw
- No turret head / barrel / projectile launcher.
- No range circle / aura indicator (engine renders separately if needed).
- No connecting beam to a Summoning Circle — the engine could overlay an aura line later via Graphics; sheet stays clean.
- No level-2/3 upgrade frames — conduit is a single-level tower.

## Reference / mood
- Look at the existing `arcane_focus` and `arcane_drain` columns of `arcane_towers.png` for the "magical structure, not a turret" vocabulary.
- Game references: Magicka conduit pillars, Bastion runic obelisks, Diablo waypoints.

## Sprite gen / hand-author tradeoff
Best authored by extending `scripts/generate_coalition_tower_sprites.py` style — programmatic gen of pillar + crystal silhouette + bobbing-frame idle loop, then hand-polish the crystal sparkle. ~half a day for a baseline + polish pass.

---

# Engine integration sketch

```ts
// src/systems/SpriteManager.ts
// Extend the existing factionTowers call:
...factionTowers('arcane_towers',
  ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova', 'arcane_conduit'],
  [4, 3, 5, 4, 4, 3, 1, 1]),
```

Tower visual swap is automatic once `hasTowerSprite('arcane_conduit')` returns true — current Graphics fallback in `Tower.drawTower` short-circuits when sprite present.
