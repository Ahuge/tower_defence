# Art PRD — Hero Defense Arena Floor (pixel-art tileset)

## Context
Match the existing in-game pixel-art style — see `public/assets/terrain/<faction>_terrain_tileset.png` for reference. **Programmatic pixel art**, NOT hand-painted illustration. Tile-based, auto-tiled, faction-themed.

## Slot
A small per-faction tileset that the engine tiles across the Hero Defense arena footprint. Replaces the current flat-color procedural arena background.

## Where it lives
- Path on disk: `public/assets/arena/<faction>_arena_tileset.png` — one sheet per faction.
- Engine consumer: a new `ArenaFloorRenderer` in `src/systems/` that mirrors `TerrainManager`'s tile-painting approach, but anchored to the arena rect (right of the Hero Defense playfield) instead of the main grid.

## Sheet layout
- **Tile size**: 28 × 28 px (same as the main TILE_SIZE constant — keeps the visual scale consistent with creeps + towers).
- **Sheet dimensions**: **448 × 56 px** (16 cols × 2 rows × 28 px).
- **Row 0 — Ground variants** (16 frames). The base arena floor. Frames 0–11 are subtle variations of the dominant ground pattern (grass tufts, stone cracks, etc.); frames 12–15 are accent tiles with small thematic detail (a rune, a cog, a sigil — picked sparsely, ~5% of cells).
- **Row 1 — Edge / structural** (16 frames). Frames 0–7 are vertical column / pillar / banner motifs that anchor the LEFT side of the arena (where creeps enter). Frames 8–15 are clutter (a barrel, a broken weapon, a piece of armor, a faction-themed doodad) randomly scattered ~3% of cells. Reads as "this is a real fighting pit, not just a tinted rectangle."

The renderer picks Row 0 frame for every floor cell using a deterministic seed (hash of col×row) so the layout is stable across replays. Row 1 frames are layered on top sparsely.

## Faction count
**11 sheets total** (one per playable faction). Each sheet is the same layout — only the visual differs per faction.

For shipping order (so we can roll it out without all 11 ready at once), priority list:
1. arcane (the campaign player most often hits HD with — Plan 14 mission 3 is HD)
2. mechanical (next campaign)
3. nature, void (the other tier-1 archetypes)
4. military, cypherpunk, aliens, harmonic, psionic, infernal, celestial (rest)

## Per-faction visual brief
Lean on the EXISTING `<faction>_terrain_tileset.png` palette and detail vocabulary so the arena reads as the same world. Specifics:

- **arcane** — purple stone with embedded crystal shards. Faint rune chalk in row 0 frames 12–15. Row 1 props: a fallen staff, a cracked crystal pillar, a glowing rune marker.
- **mechanical** — riveted iron plate with oil stains. Faint hex-bolt pattern. Row 1 props: a cog wheel, a busted pipe, a dropped wrench.
- **nature** — packed earth with moss patches and small stones. Row 1 props: a wooden post, a tangle of roots, a dropped horn.
- **void** — dark obsidian with violet rift cracks. Row 1 props: a broken altar, a rift fissure, a dropped sigil-stone.
- **military** — sandy gravel with tire tracks. Row 1 props: sandbags, an ammo crate, a helmet.
- **aliens** — chitinous bio-flooring with pulsing veins. Row 1 props: a hatched egg, an organic spike, a glowing pustule.
- **cypherpunk** — circuit-board flooring with neon traces. Row 1 props: a broken monitor, a power conduit, a server rack.
- **infernal** — cracked obsidian with lava seams. Row 1 props: a burning skull, a smoldering brand, a cooled lava chunk.
- **celestial** — gold-veined marble. Row 1 props: a fallen feather, a halo fragment, a dropped scroll.
- **psionic** — pulsing membrane / brain-tissue floor. Row 1 props: a floating orb, a discarded probe, a brain-coral nub.
- **harmonic** — geometric crystalline tiling. Row 1 props: a tuning fork, a resonance crystal, a sound-prism shard.

## Color palette
For each faction's sheet, pull the dominant + secondary colors from `src/data/Factions.ts`:
- `primaryColor` is the dominant accent (rune glow, prop highlight).
- `secondaryColor` is the structural / shadow tone.
- Ground base should be a desaturated, ~30% darker version of secondaryColor — the floor anchors visual contrast for creeps and the hero on top of it. Don't use the bright primary for large flat areas.

Reference: the existing `<faction>_terrain_tileset.png` already nails this contrast. Match its palette exactly.

## Constraints
- **No transparency in row 0** — ground tiles are opaque; the arena rect should never show the canvas color through.
- **Transparency in row 1** — props sit on top of ground, so frames 0–15 are alpha-PNG.
- **No animation** — these are static frames. No animated water/lava rows like the main tileset has. Animated VFX in the arena (particles, fire) come from the engine's particle system, not the floor.
- **No characters / creeps / hero** — never bake combatants into the floor.
- **No HUD elements** — no HP bar, no UI chrome.
- **No outer-edge dimming or vignette** — engine will render a separate overlay for that. Tiles are flat.

## Pixel art rules
Match the existing tileset's discipline:
- 1 px outline per detail blob (use the secondary color, not pure black).
- 3-color palette per detail (base / shadow / highlight); 1-color palette for flat ground.
- Dithering allowed for transition between accent + base, but keep it sparse — not noisy.
- No anti-aliasing (this is the existing house style — Phaser renders these with NEAREST filter).

## What programmatic generation could cover
If hand-pixeling 11 sheets is too much, the existing `TerrainTheme` palette + detail-blob system could generate these procedurally given a per-faction config. If the artist would rather express the design as "color × prop list" for a generator script to render, this is a viable v1 — same file output, same engine consumer.

## Reference / mood
- Look at `arcane_terrain_tileset.png` and `mechanical_terrain_tileset.png` directly. The arena floor is the SAME vocabulary, the SAME pixel scale, the SAME palette discipline — just oriented as a flat horizontal floor instead of a top-down map terrain.
- Game references: Castle Crashers arena floors, Streets of Rage backdrop streets, late-90s pixel-art beat-em-up arenas.
