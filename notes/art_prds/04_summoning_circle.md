# Art PRD — Summoning Circle (M10 Arcane Finale, 2×2 charge structure)

## Context
Match the existing in-game pixel-art style — see `public/assets/terrain/structures/struct_arcane_crystal_*.png` for the closest analogs (crystal cluster + nexus). 28 × 28 tile-aligned, NEAREST filter, 1 px outlines, faction palette discipline. Programmatic / hand-pixeled, NOT hand-painted illustration.

## Slot
The two lavender summoning circles in `arcane_throne_finale` (M10 mission, the campaign's climax). Each occupies a 2×2 footprint marked `noBuild`. The player builds Mana Conduit towers in the surrounding magenta zone; adjacent conduits feed a shared charge meter that summons the Forge mage hero at 100%. After hero death the meter resets and the circle re-charges. Currently rendered as a Phaser Graphics ring + clockwise-arc fill (`src/entities/SummoningCircle.ts`). Replace with a real charge-state spritesheet so the player gets a chunky visual cue.

## Where it lives
- **Path on disk**: `public/assets/arena/struct_summoning_circle.png` — single sheet shared by both circles on the map.
- **Engine consumer**: `SummoningCircle.draw(charge: number)` reads the shared `FinaleController.getCharge()` value and selects a frame index by `Math.floor(charge × 9)`, clamped to [0, 9]. Frame 0 = empty, frame 9 = fully charged. Both circles render the same frame each tick (the meter is shared).

## Sheet layout
- **Tile size**: 28 × 28 px (matches `TILE_SIZE`).
- **Per-frame size**: **56 × 56 px** (2 cols × 2 rows × 28 px).
- **Frame count**: **10 charge states** (0% → 100%, ~11% per frame).
- **Sheet dimensions**: **56 × 560 px** — 10 frames stacked VERTICALLY (matches `struct_arcane_crystal_nexus.png`'s 4-frame VERTICAL convention; just longer).
- **Frame order** (top → bottom):
  - Frame 0: 0% — dormant. Carved circle on stone, no light.
  - Frame 1: ~11% — first faint glyph lights flicker.
  - Frame 2: ~22% — outer rune ring partially lit.
  - Frame 3: ~33% — outer ring fully lit, inner ring dark.
  - Frame 4: ~44% — inner ring lights begin.
  - Frame 5: ~56% — inner ring fully lit, central glyph faint.
  - Frame 6: ~67% — central glyph lit, faint pillar of light starts.
  - Frame 7: ~78% — pillar of light visible, particles stronger.
  - Frame 8: ~89% — full pillar, beam pulsing, almost ready.
  - Frame 9: 100% — apex. Beam at full intensity, central glyph blazing white-hot, sparkles around perimeter. The summon-firing frame.
- **Anchor**: top-left of the 2×2 footprint (matches the existing `LargeStructure` rendering convention).
- **Transparency**: full alpha PNG. The carved-circle silhouette is opaque on the base frame; light/glow accents are alpha-blended additive looking pixels.

## Visual identity
- **Stone base** (all frames identical): lavender-purple stone slab carved with a circular runic pattern. Outer ring of 8 radial glyphs, inner ring of 4 glyphs, central sigil. Silhouette stays the same across all 10 frames — only light intensity changes.
- **Light progression** (the 10-state delta):
  - Frame 0: pure stone, no light. Cold dead carving.
  - Frames 1–3: outer-ring glyphs light one-by-one, soft violet glow.
  - Frames 4–5: inner-ring lights in.
  - Frames 6–7: center glyph lights + a 1–2 pixel-wide vertical "pillar of light" pixel column appears above the circle, faint at first.
  - Frame 8: pillar at 3-pixel width, particles around perimeter.
  - Frame 9: pillar at 4–5 pixel width with white-hot core, full halo + 4-direction sparkle bursts. Reads as "the spell is firing right now."
- **Pillar of light** in frames 6–9 extends ~28 pixels above the 2×2 footprint (one tile-height). NOT animated within a frame — just a static beam shape that grows from frame to frame.

## Color palette
Pull from `src/data/Factions.ts` for arcane:
- `primaryColor: 0x6644ff` (violet) — the active light/glow color.
- `secondaryColor: 0x9988ff` (lighter violet) — highlight on lit pixels.
- Stone base: `#3a2d52` (dark violet-grey) for shadow, `#5a4880` (mid violet-grey) for body, `#7e6ba8` (light) for highlights — ramp matches the existing arcane terrain tileset.
- Outline: 1 px, near-black `#1a1226` to preserve silhouette at 28 px.
- Pillar core: pure white `#ffffff` with `#dcc8ff` and `#aa88ff` falloff to match the violet light.

## Pixel art rules
- 1 px outline, no AA.
- 3-color palette per detail blob (base / shadow / highlight).
- Subtle dithering on the pillar gradient OK — never on the stone surface.
- Frame N+1 reuses frame N silhouette + adds light pixels. Don't redraw stone between frames. Reads as "something charging up", not "10 different sigils".
- Frame 9 is the only frame with white-hot core; all others stay within the violet ramp.

## What NOT to draw
- No HP bar / numbers (engine renders separately if ever needed).
- No banners / faction emblems (the carving is the identity).
- No hero or creeps near the circle.
- No connecting lines to adjacent conduits — the engine could overlay those later via Graphics if needed; the sheet stays clean.
- No animation within a single frame — frame swap is the visual.

## Frame transitions
- 0 → 1, 1 → 2, 2 → 3: outer ring glyph lighting up (one glyph per frame, eight glyphs spread evenly 0→3 means 2-3 per step).
- 3 → 4, 4 → 5: inner ring lighting up.
- 5 → 6: central glyph lights + first pillar pixels above.
- 6 → 7, 7 → 8: pillar grows in width and intensity.
- 8 → 9: pillar reaches max + perimeter sparkle bursts. Single-frame "ready to fire" state.

## Reference / mood
- `struct_arcane_crystal_nexus.png` — closest visual analog for the runic-circle + violet-glow vocabulary. The 4-frame nexus animation is the per-frame fidelity bar.
- Game references: Don't Starve summoning portals (rune intensity scaling), Hades cast circles, Magicka spell rings.

## Sprite gen / hand-author tradeoff
A Python procedural generator (similar to `generate_arena_floor_tileset.py`) is preferred for the v1 ship — predictable geometry (rings + glyphs + pillar) is well suited to programmatic gen. Hand-pixeled polish pass after the procedural baseline lands.

---

# Engine integration sketch

```ts
// src/entities/SummoningCircle.ts — replace Graphics-based draw
const FRAME_COUNT = 10;
draw(charge: number): void {
  const frame = Math.floor(Math.max(0, Math.min(0.9999, charge)) * FRAME_COUNT);
  if (this.sprite) {
    this.sprite.setFrame(frame);
  }
}
```

Spritesheet preload: same path as terrain structures; add to a new `preloadFinaleStructures(scene)` helper that boot scene calls.
