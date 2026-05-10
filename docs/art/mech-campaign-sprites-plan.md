# Mech Campaign — Procedural Sprite Plan

Plan for the 5 procedural sprites authored via `mechanical_campaign_sprites.tsx`, modelled on `arcane_campaign_sprites.tsx`. Each piece replaces a placeholder currently drawn via Phaser primitives in `SabotageRender.ts` / `SuppressionRender.ts`.

## Pipeline conventions (lifted from `arcane_campaign_sprites.tsx`)

- One `.tsx` file at the repo root: `mechanical_campaign_sprites.tsx`.
- `// @ts-nocheck` header (matches every other sprite tsx).
- Imports `C_base`, `C_tower` palette objects from `./mechanical_sprites`.
- Local `// ===== HELPERS =====` block (px, rect, fillPoly, withAlpha, lerpHex) — copy from arcane_campaign_sprites.tsx; they're the standard.
- One `draw<Entity>Sheet(ctx)` function per sprite — lays out all frames vertically in a single column (matches existing convention).
- Sheet dimensions: `W` × `H × FRAMES`.
- Default-export React component renders all sheets + a 4× preview pane per sprite + a `Download PNG` button per sprite (matches `arcane_campaign_sprites.tsx:845-998`).
- Author opens the tsx in the existing sprite-preview tool (Vite dev server route), clicks Download on each, drops PNG into `public/assets/arena/`.

## Sprite #1 — Workshop

**Purpose:** the player's barracks on M10. Trains Raiders. Pre-placed on the map at one cell.

**Specs:**
- Sheet dimensions: 32×32, 1 frame (single static).
- Output: `public/assets/arena/struct_workshop.png`.
- Replaces: the placeholder colored-box-with-X-cross drawn in `SabotageRender.drawWorkshop`.

**Composition:**
- Anvil + forge silhouette. Bronze-base palette (`C_base.BRONZE`, `C_tower.DKBRZ`).
- Rivets on the corners (use the existing `lvlRivets` motif).
- A hint of glowing forge-fire visible through a slot (`C_tower.FORG` / `LFORG`), single-cell glow — visual cue that it's a place that *makes* things.
- Two crossed sledgehammers in front, suggesting the raider build motif.
- Optional cog above (decorative).

**LOC estimate:** ~150 lines of canvas-draw code.

**Render-layer change:** in `SabotageRender.drawWorkshop`, replace the manual rectangle + cross drawing with `this.gfx`-based image draw — or better, switch to using a Phaser image game object that auto-uses the preloaded texture. The simplest delta: keep `SabotageRender` as a graphics-clear-and-redraw layer, BUT in GameScene setup, create a single `scene.add.image(workshopPx.x, workshopPx.y, 'struct_workshop')` and let `SabotageRender` draw only the dynamic overlays (selection rings on raiders, HP bars). Workshop is static.

## Sprite #2 — Raider

**Purpose:** the player-trained mobile unit. Walks the grid, attacks, dies.

**Specs:**
- Sheet dimensions: 24×24, 5 frames (1 idle + 4 walk).
- Output: `public/assets/arena/raider.png`.
- Replaces: the placeholder filled-orange-circle in `SabotageRender.drawRaider`.

**Composition:**
- Saboteur / sapper silhouette — heavy boots, satchel, a small mech-cog tucked into the belt as a callback to the faction.
- Cloaked or hooded head — antagonist-color (warm bronze cloak vs the Mech-faction's grimdark grey/iron palette) so they read as PLAYER units distinct from the CPU defenders.
- Walk cycle: 4 frames, each with the lead-leg swap convention (lift, plant, lift, plant). 8-pixel max step amplitude.
- Idle frame: planted stance, slight breath bob.
- Forward-facing — the unit walks omnidirectionally but the sprite faces a fixed direction (the in-engine rotation handles facing the target). Same convention every faction's units use.

**LOC estimate:** ~250 lines.

**Render-layer change:** `SabotageRender.drawRaider` switches from `gfx.fillCircle` to per-raider `scene.add.sprite(...)` instances managed by SabotageController's `onRaiderSpawned` / `onRaiderDied` callbacks (those hooks already exist). HP bar overlay stays in `SabotageRender` since it's dynamic per-frame.

## Sprite #3 — Generator

**Purpose:** Static destructible CPU structure. Cluster of 4 on M10. When destroyed, cascades-kills linked towers and brings the throne shield down.

**Specs:**
- Sheet dimensions: 32×32, 4 frames (100% / 66% / 33% / 0% HP).
- Output: `public/assets/arena/struct_generator.png`.
- Replaces: the `mech_mortar` sprite reuse (placeholder per the existing TODO).

**Composition:**
- Coiled-power-cell tower. Three stacked vertical coils with arcing electricity (warm-orange forge-glow at full HP, decaying to dim grey at 0%).
- Industrial base ring with bolts/rivets — matches the mech faction.
- Single status light on the side: forge-orange at full, amber at 66, red at 33, black at 0.
- Smoke wisps off the top at full HP (one or two `mSteam`-style pixel puffs).
- At 0% HP frame, the central coil is collapsed — shows the device is OFF before the cascade fires.

**LOC estimate:** ~300 lines (4 frames, each with progressive damage).

**Render-layer change:** the placement code stays — destructible-tower sprite. The towerId stays `mech_mortar` for the *grid* placement (it's a real tower for hp/destructible/ownerIndex), but the displayed sprite swaps. Either:
(a) Register a new tower type `mech_generator_visual` with `damage: 0, fireRate: Infinity` (cleaner, doesn't lean on the inert hack), and update the map data to use it.
(b) Keep `mech_mortar` placement but override the rendered texture via Tower's sprite-key indirection.

**(a) is the cleaner long-term path.** Plan: add `mech_generator_visual` to `TowerTypes.ts` as a 0-damage tower, drop the `_disabledRemaining = Infinity` hack from SabotageController, swap the map data's generator towerId. Same commit as the generator sprite drops in.

## Sprite #4 — Suppression Pylon

**Purpose:** Voss's anti-arcane device. Pre-placed, indestructible, projects a stress field. Player channels to mute.

**Specs:**
- Sheet dimensions: 32×32, 8 frames (4 pulse-active + 2 channeling-mid + 2 muted/dim).
- Output: `public/assets/arena/struct_suppression_pylon.png`.
- Replaces: the placeholder violet-diamond drawn in `SuppressionRender.drawPylon`.

**Composition:**
- Tripod or four-leg brazier base in dark iron.
- Floating central crystal — a suppression-violet octahedron / cube that pulses (4 brightness frames at active state).
- Cabling running from the base to the floor — connects to Voss's industrial infrastructure.
- During channeling (mid-frames): cracks visible in the crystal, sparks at the base.
- During mute (last 2 frames): crystal dim grey, base coil cold, no field emission.

**Animation cadence:**
- Active: cycle frames 0-3 at ~250ms each (pulse breath).
- Channeling: frames 4-5 sync to the SuppressionPylon.channelProgress() value (lerp between them).
- Muted: frames 6-7 at slow 800ms cycle (subtle "dormant flicker").

**LOC estimate:** ~350 lines (8 frames).

**Render-layer change:** `SuppressionRender` swaps the diamond + radius-circle drawing for a Phaser image game object that picks its frame index from `(pylon.isActive(now), pylon.isChanneling(now), pylon.channelProgress(now))`. The radius outline stays as `gfx.strokeCircle` (cheap, helps the player see the threat zone). The clockwise channel-progress arc stays as the gfx overlay since it tracks `channelProgress` continuously.

## Sprite #5 — Voss's Throne

**Purpose:** the M10 win-condition target. Voss seated on his industrial throne. Invulnerable until generators down.

**Specs:**
- Sheet dimensions: 84×84 (3×3 tile structure, matching `TH_W` / `TH_H` from arcane_campaign_sprites.tsx), 5 frames (100/75/50/25/0% HP).
- Output: `public/assets/arena/struct_voss_throne.png`.
- Replaces: the `mech_titan` sprite reuse.

**Composition (mirror Archmage Throne's "Cathedral Canopy" pattern, swapped to industrial palette):**
- Two flanking iron obelisks supporting a riveted steel canopy spanning the top
- Voss seated on a tiered iron dais in the alcove, helmet visible, hands on armrest controls
- Pipes / cables running up the obelisks venting steam
- Suppression-violet glow from the canopy underside while invulnerable; glow goes out once generators are down (frame correlation: link visual state to `tower._invulnerable`)
- Damage states: progressive iron-buckling, rivets popping out, steam venting hard, final frame is a charred husk

**LOC estimate:** ~400 lines (largest sprite — 3×3 footprint, 5 frames).

**Render-layer change:** the existing destructibleTowers placement at `(3, midRow)` is single-cell. To get a 3×3 visual, this needs to migrate to `destructibleStructures` (the existing PRD-06 path used by the Arcane Archmage Throne). The map data swap: drop `{col, row, towerId: 'mech_titan', hp, isThrone}` and add `{id: 'mech_voss_throne', col, row, hp: 5000, isMissionWinTarget: true}` to a new `destructibleStructures` array on the map. Then register `mech_voss_throne` in `DestructibleStructures.ts` with the new sprite key. SabotageController needs to either learn about structures (mirror how FinaleController handles its M10 throne) or keep the throne as a regular tower with a 3-tile sprite drawn at offset.

**Cleaner path: keep as a single-tile tower for v1**, just with the new sprite. Saves the structure-migration scope. Throne footprint stays 1×1, sprite art is detailed enough to read as a throne even at 28×28. Defer the 3×3 migration to a follow-up if playtest says the throne reads too small.

## Implementation order

1. **Workshop** (smallest, validates the pipeline). One commit: tsc file added + asset baked + SabotageRender swap.
2. **Suppression Pylon** (highest visibility — appears on 4 missions and is the antagonist mechanic). One commit: tsc additions + asset baked + SuppressionRender swap.
3. **Generator** (also high visibility — 4 per M10 map). One commit, includes the `mech_generator_visual` tower-type swap + map-data update + the `_disabledRemaining = Infinity` hack removal.
4. **Raider** (one commit, includes the per-raider sprite lifecycle in SabotageController via onRaiderSpawned / onRaiderDied).
5. **Throne** (last — most code, smallest gameplay impact since the placeholder titan sprite already reads as "imposing tower"). Single-tile version first; defer the 3×3 migration.

Each commit:
- Adds the sprite draw function to `mechanical_campaign_sprites.tsx`
- Bakes the PNG to `public/assets/arena/`
- Updates the relevant render layer to consume the new texture
- Runs `npx tsc --noEmit` + `npx vitest run` clean
- Commits + pushes

Total estimate: 5 commits + ~1,500 LOC of canvas-drawing code + 5 PNG assets baked (~50-100KB each).

## Open question for the user

**Author bias on the visual styles** — anything you specifically want / want to avoid? E.g. "raiders should be cloaked, not armoured", "pylon brazier should look organic not industrial", "Voss should be seated, not standing." Easier to flag now than after I've written 400 lines of canvas code for the throne.
