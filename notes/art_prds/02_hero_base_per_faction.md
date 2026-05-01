# Art PRD — Hero Defense Base, Per Faction (pixel-art spritesheet)

## Context
Match the existing in-game pixel-art style — see the structures under `public/assets/terrain/structures/` (e.g. `struct_arcane_crystal_nexus.png`, `struct_alien_queen_chamber.png`). 28 × 28 tile-aligned, NEAREST filter, 1 px outlines, faction palette discipline. Programmatic / hand-pixeled, NOT hand-painted illustration.

## Slot
The right-edge base structure that creeps attack in Hero Defense mode. Currently rendered as a procedural square + HP bar. Replace with a 5-frame damage-state spritesheet per faction.

## Where it lives
- Path on disk: `public/assets/arena/base_<faction>.png` — one spritesheet per faction.
- Engine consumer: `ArenaManager` reads `baseHp / baseMaxHp` and selects the frame index. Frame swap is a discrete state change, not a tween.

## Sheet layout
- **Tile size**: 28 × 28 px (matches TILE_SIZE).
- **Per-frame size**: **112 × 140 px** (4 cols × 5 rows of 28 px tiles). Roughly the same footprint as a small multi-tile structure like `struct_arcane_crystal_nexus.png` at the smaller scale.
- **Frame count**: 5 (one per HP threshold).
- **Sheet dimensions**: **112 × 700 px** — 5 frames stacked VERTICALLY (matching the existing structure-sheet convention; e.g. `struct_arcane_crystal_nexus.png` is 140 × 560 = 4 frames stacked).
- **Frame order** (top → bottom):
  - Frame 0 (rows 0–4): 100% HP — pristine
  - Frame 1 (rows 5–9): 75% HP — minor damage (small chips, no flames)
  - Frame 2 (rows 10–14): 50% HP — moderate (visible structural damage, smoke wisps if pixel-art-friendly)
  - Frame 3 (rows 15–19): 25% HP — heavy (tilted, large gaps, ember accents)
  - Frame 4 (rows 20–24): 0% HP / dying — collapse start (final visible state before destroy)
- **Anchor**: bottom-center. Floor of the sprite sits ON the arena floor; structure rises upward.
- **Transparency**: full alpha PNG. The structure silhouette is opaque; everything outside is clear.

## Faction count
**11 sheets total**, one per playable faction. Same layout — per-faction visual identity differs.

Priority shipping order:
1. arcane (Plan 14 mission 3 hits HD first)
2. mechanical (next campaign)
3. nature, void
4. military, cypherpunk, aliens, harmonic, psionic, infernal, celestial

## Per-faction visual brief
Lean directly on the existing `struct_<faction>_*.png` vocabulary so the base reads as an extension of that faction's structure language. Specifics:

- **arcane** — crystal arch + spire silhouette. Embedded violet shards, soft rune glow on rows 1–2. Damage: chips → cracks → spire fracture → falling shards.
- **mechanical** — riveted iron block with central furnace pixel cluster. Damage: panels detach → glowing furnace exposed → tilted → smoldering wreck.
- **nature** — gnarled tree-shrine, twisted timber + glowing leaf cluster. Damage: leaves brown → bark splits → tree tilts → trunk splits.
- **void** — floating obsidian shard with violet rift cracks. Damage: rift widens → shard fractures → energy bleed → disintegration.
- **military** — bunker with sandbag stack + radio antenna pixel. Damage: sandbags spill → antenna bends → wall crater → roof gone.
- **aliens** — chitin hive with pulsing pustule cluster. Damage: pustules burst → wall peels → hive deflates → husk.
- **cypherpunk** — neon arcade-tower / server stack. Damage: monitor cracks → neon dies → arc flash → tilted dead.
- **infernal** — obsidian altar with eternal flame pixel. Damage: flame sputters → altar cracks → lava breach → ruin.
- **celestial** — gold-and-marble pillar topped with halo. Damage: halo dims → marble chips → pillar fractures → halo broken.
- **psionic** — levitating glass orb encasing brain-shape. Damage: glass cracks → tendrils retract → orb implodes → empty cradle.
- **harmonic** — geometric tuning fork / resonator stack. Damage: lines fragment → light dims → stack tilts → shattered.

## Color palette
Per faction, pull from `src/data/Factions.ts`:
- `primaryColor` for accent / glow / highlights.
- `secondaryColor` for structural / shadow.
- Outline: 1 px, secondaryColor (or pure-black if it preserves silhouette better at 28 px scale).
- Match the corresponding `struct_<faction>_*.png` palette EXACTLY — same dye-pool as the in-world structures so the base reads as "same world".

## Pixel art rules
Match existing structure discipline:
- 1 px outline, no AA.
- 3-color palette per detail blob (base / shadow / highlight).
- Subtle dithering allowed in transition between accent and base; never noisy.
- Damage states reuse the silhouette — DON'T redraw from scratch each frame. Frame 1 is frame 0 with chip pixels added. Frame 4 is frame 0 with most of the upper silhouette gone. Reads as "this thing is breaking" not "this is now a different thing".

## What NOT to draw
- No HP bar / numbers (engine renders separately).
- No banners / flags / mission-context decoration.
- No hero or creeps interacting.
- No ground beneath the base (arena floor PRD covers that).
- No animated frames within a state — just the 5 discrete damage states.

## Frame transitions
Each frame is a clear visual escalation:
- 0 → 1: cosmetic chips, structure intact.
- 1 → 2: visible holes / gashes, smoke wisps appropriate.
- 2 → 3: clearly leaning or fragmented, fire/embers if appropriate.
- 3 → 4: pre-collapse, "one more hit and this is gone".

## Reference / mood
- Look at `struct_arcane_crystal_nexus.png` — that 4-frame nexus animation is the closest existing analog to the per-frame fidelity we want here.
- Look at `struct_alien_queen_chamber.png` for the "biological hive" vocabulary that the aliens base should echo.
- Game references: Stardew Valley building damage states, Don't Starve structure decay, Terraria altar break.
