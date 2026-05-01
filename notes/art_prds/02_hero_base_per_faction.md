# Art PRD — Hero Defense Base, Per Faction (×11)

## Slot
The right-edge base structure that creeps attack in Hero Defense mode. Currently rendered as a procedural square + HP bar. **One sprite per faction × 5 damage states = 55 frames total**, but the visual identity is the same per-faction-base, just damaged versions.

## Where it lives
- Path on disk: `public/assets/arena/base_<faction>.png` — ONE 5-frame spritesheet per faction.
- Layout: 5 frames horizontal at 320 × 320 each → spritesheet is **1600 × 320**.
- Frames in order:
  - Frame 0: 100% HP — pristine
  - Frame 1: 75% HP — minor damage (small chips, cracks, no flames)
  - Frame 2: 50% HP — moderate (visible structural damage, smoke wisps)
  - Frame 3: 25% HP — heavy (tilted, large gaps, burning embers)
  - Frame 4: 0% HP / dying — collapse start (use as the death frame; the base entity is destroyed visually after this is shown)
- Engine consumer: `ArenaManager` reads `baseHp / baseMaxHp` and selects the frame index. Frame swap is a discrete state change, not a tween.

## Dimensions
- **320 × 320 per frame** (5 frames = 1600 × 320 sheet).
- Renders at base position (right edge of arena), centered vertically. Phaser will scale this to fit `~280 px tall` runtime; source 320 keeps headroom for retina/HD displays.
- Anchor: bottom-center. Floor of the sprite sits ON the arena floor; the structure rises upward.

## Visual brief — per faction
Each faction has a distinct base identity. Use the existing `_keyart.webp` art (where delivered) as the visual reference for what THEIR home structures look like.

### Arcane
A crystal arch + spire, deep purple + crystal-pink. Etched runes glow softly. Damaged frames: cracks become visible, runes flicker, finally the arch breaks and the spire falls.

### Mechanical
A heavy industrial smelter / machine block. Iron plate + rivets + glowing furnace at center. Damaged: panels blow off, flames + smoke escape from joints, finally the structure half-collapses with embers.

### Nature
A rooted ancient tree-shrine, twisted timber + glowing leaves. Damaged: leaves brown + fall, bark splits, finally the tree splits and tilts.

### Void
A floating obsidian shard with violet rifts. Damaged: rifts widen and bleed energy, the shard cracks, finally it disintegrates inward.

### Military
A bunker / pillbox with sandbags + radio antenna. Damaged: sandbags spill, antenna bends, finally a direct-hit crater opens the bunker.

### Aliens
A bio-organic hive structure, chitin + glowing pustules. Damaged: pustules burst with glowing ichor, hive walls peel, finally the hive deflates.

### Cypherpunk
A neon arcade-tower / server stack. Damaged: monitors crack, neon strips fail, finally the stack arc-flashes and tilts.

### Infernal
An obsidian altar with eternal flame. Damaged: flame sputters, altar cracks, finally lava breaches the base.

### Celestial
A floating gold-and-marble pillar topped with a halo. Damaged: halo dims, marble chips, finally the pillar fractures and the halo breaks.

### Psionic
A levitating brain-orb encased in glass with bio-tendrils. Damaged: glass cracks, tendrils retract, finally the orb implodes.

### Harmonic
A geometric tuning fork / resonator stack, crystalline and luminous. Damaged: resonance lines fragment, light dims, finally the stack shatters.

## Color palette
- Match the faction's `primaryColor` from `src/data/Factions.ts` for the dominant hue.
- HP bar overlay is rendered separately by the engine — DO NOT include an HP bar in the art.

## What NOT to draw
- No HP bar / numbers.
- No banners / flags.
- No hero or creeps interacting.
- No ground beneath the base — the arena floor (separate PRD) carries that.

## Frame transitions
Each frame should look like a clear progression of the previous. The intent is that a player flicking between frames sees a clear "this is more damaged" reading. A 4-frame mid-tween animation between states could be added later but v1 is just discrete swap.

## Reference / mood
- Side-view, painterly, ~12-15 px effective detail at runtime.
- Same visual vocabulary as `parallax_<faction>_big_no_text.webp`.
- Damaged states should escalate dramatically — frame 4 (death) should look like the structure is about to fall apart, not just "scratched".
