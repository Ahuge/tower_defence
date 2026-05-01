# Art PRD — Hero Defense Arena Floor

## Slot
Single piece. Replaces the current procedural arena background in Hero Defense mode.

## Where it lives
- Path on disk: `public/assets/arena/arena_floor_hero_plains.png` (initial), `public/assets/arena/arena_floor_<theme>.png` for future themes.
- Engine consumer: a new background `Phaser.GameObjects.TileSprite` rendered behind `ArenaManager`'s creeps + hero. Sits at depth -10.

## Dimensions
- **2160 × 720** (3:1 aspect).
- The arena footprint at runtime is `getGameWidth() × this.layout.arenaHeight`. Today that's roughly **1008 × 280–340** depending on viewport; scaled at 2× source-to-render keeps Phaser bilinear sampling clean.
- Render mode: `cover`. Tiles will edge-bleed; do NOT put critical detail in the outer 64 px.

## Visual brief
- A side-view arena floor — left/right is the playfield, vertical slice. Hero patrols horizontally, creeps walk in from the left and march toward the right edge (the base).
- The art reads from the side: foreground ground, mid-ground textures, distant skyline at top edge.
- "Hero Plains" theme is the default — grassy ground, slightly windswept, with a stone-flagged combat strip down the center horizontal axis (where the hero walks). Distant treeline + warm sky on the upper edge.

## Required structure (top → bottom of canvas)
1. **Top 100 px**: Soft skyline / distance vignette. Will be partially covered by the HUD bar, so don't put icon-able detail here.
2. **Middle 480 px**: The combat zone. Most visually busy. Stone-flagged ground with grass tufts to either side. A subtle horizontal "ribbon" effect (banners, runes, embers) drawing the eye left→right reinforces creep travel direction.
3. **Bottom 140 px**: Anchor/foreground — slightly darker, slight perspective tilt, suggests "ground continues toward viewer". Will be partially covered by the per-faction base (separate PRD).

## Color palette
- Ground: warm earthy `#3a2b1f` ↔ `#6b5040` ↔ `#8b6f4a`
- Grass tufts: muted greens `#5a6b34` ↔ `#7a8b44`
- Sky strip: `#7a8ba6` ↔ `#a6b5c4` (cool, NOT vivid — UI text needs to read against it)
- Stone: `#5a5a5a` ↔ `#7a7a7a` with occasional warm highlight rune `#caa666`

## What NOT to draw
- No characters, hero, base, creeps, or projectile FX.
- No text overlays.
- No gradient banding — keep noise/texture in shadow regions.
- No fully-saturated reds or bright pure whites — those need to belong to gameplay FX, not the floor.

## Variants requested
v1: just `arena_floor_hero_plains.png`. Single shared theme is fine for shipping. Future themes (`arena_floor_industrial`, `arena_floor_void`, etc.) come later as we add HD maps.

## Reference / mood
- Think the side-view arenas in late-90s SNES "battle" games (Final Fantasy combat backdrops, Live A Live's chapters): clear horizontal staging, painterly, NOT pixel-art.
- The `parallax_<faction>_far` style we already have nails the painterly tone — apply that vocabulary at a 3:1 horizontal aspect for arena floor specifically.
