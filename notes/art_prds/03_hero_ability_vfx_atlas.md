# Art PRD — Hero Ability VFX Atlas (pixel-art spritesheet)

## Context
Match the existing in-game pixel-art style — see `public/assets/creeps/<faction>_creeps.png` for the death-animation discipline. Same scale, same NEAREST filter, same 1 px outline rules. Programmatic / hand-pixeled, NOT hand-painted illustration.

## Slot
Per-hero ability visual effects (Q / W / E / R). Today abilities use procedural Phaser shapes (filled circles, lines, rough particle bursts). Replace with pixel-art VFX spritesheets that match the rest of the game's visual language.

## Where it lives
- Path on disk: `public/assets/heroes/vfx/<heroId>_<abilityKey>.png` — one spritesheet per ability per hero.
- Engine consumer: each `AbilityDef` gains an optional `vfxKey` field. When set, the existing procedural visual is replaced with `scene.add.sprite(x, y, vfxKey).play(animKey)`.

## Per-hero ability inventory
11 heroes × 4 abilities = **44 VFX spritesheets** total. Heroes:
warden, mage, shadow, paladin, ranger, berserker, necromancer, monk, engineer, duelist, druid.

For v1, prioritize the **3 heroes the player encounters most** in campaign + tutorial:
1. mage — Q/W/E/R
2. ranger — Q/W/E/R
3. paladin — Q/W/E/R

Ship 12 sheets. Other heroes get a follow-up batch.

## Sheet layout
- **Per-frame size**: **64 × 64 px** (matches creep frame size — same pixel scale as the rest of the world).
- **Frame count**: 6 frames per ability.
- **Sheet dimensions**: **384 × 64 px** — 6 frames horizontal strip.
- **Animation**: 6 frames at 18 fps = ~0.33s play once (`repeat: 0`), no loop.
- **Anchor**: center of frame is the ability impact / origin point.
- **Transparency**: full alpha PNG. Effects are silhouettes on transparent backgrounds.

## Per-ability animation cadence
6 frames maps to an "anticipation → peak → decay" rhythm — the same shape as a creep death animation (see the 3-row death section of `<faction>_creeps.png`):
- Frames 0–1: telegraph / anticipation (small spark, gathering energy, scope pixel)
- Frames 2–3: peak / impact (largest silhouette, brightest core)
- Frames 4–5: dissipate / fade (residue particles, dimming glow)

## Per-ability visual brief
Read the `AbilityDef.name` + `description` from `src/data/HeroTypes.ts`. Examples for the priority heroes:

### Mage
- **Q — Frostbolt**: 6 frames. 0–1 = ice shard forming pixels; 2–3 = full crystal burst with 4-direction sparkles; 4–5 = frost-ring fade.
- **W — Blizzard**: 6 frames. 0–1 = swirling indicator pixels; 2–3 = peak hailstones radiating outward; 4–5 = lingering frost dust.
- **E — Mirror Image**: 6 frames. 0–1 = self-shimmer, body-shape pixel echoes; 2–3 = 2 ghost copies splitting outward; 4–5 = dissipate.
- **R — Meteor**: 6 frames. 0–1 = shadow + warning marker; 2–3 = white-flash core + radial cracks; 4–5 = expanding shockwave + smoke.

### Ranger
- **Q — Power Shot**: 6 frames. 0–1 = bowstring-pull spark; 2–3 = arrow impact burst with motion lines; 4–5 = trail dust.
- **W — Multi-Shot**: 6 frames. 0–1 = 3 arrowhead pixels forming; 2–3 = fan-out impacts; 4–5 = three small dust puffs fading.
- **E — Trap**: 6 frames. 0–1 = trap deploy pixels; 2–3 = arming sparkle on the placed trap; 4–5 = idle glow that the trap continues at.
- **R — Hunter's Mark**: 6 frames. 0–1 = crosshair-forming pixels; 2–3 = locked target with 4-direction pulse; 4–5 = lingering aim aura.

### Paladin
- **Q — Hammer Slam**: 6 frames. 0–1 = downward swing motion lines; 2–3 = ground impact burst with light radiating; 4–5 = settling dust.
- **W — Holy Light**: 6 frames. 0–1 = upward glow gathering; 2–3 = radial heal ring at peak; 4–5 = soft fade.
- **E — Divine Shield**: 6 frames. 0–1 = self-aura forming pixels; 2–3 = full barrier ring; 4–5 = barrier slow-pulse fade (or hand off to a separate looping "active" sprite — TBD).
- **R — Judgment**: 6 frames. 0–1 = sky-light beam descending; 2–3 = full beam + radial ground flare; 4–5 = beam dissipates.

## Color palette
Match each hero's faction primary + secondary colors from `src/data/Factions.ts`:
- mage = arcane (purple primary, light-violet secondary)
- ranger = nature (green primary, leaf-yellow secondary)
- paladin = celestial (gold primary, white secondary)
- etc.

3-color palette per VFX (primary + secondary + bright highlight). No full-spectrum rainbows. Follows the same discipline as the existing creep death-animation palette.

## Pixel art rules
Match the creep-spritesheet discipline:
- 1 px outline (use the secondary color, not pure black — keeps the world consistent).
- 3-color palette per VFX (base / shadow / highlight).
- NEAREST filter on render — sprites are pixel-perfect.
- Sparkle / particle pixels can be 1 px individual pixels for crispness.
- No anti-aliasing.
- No baked-in motion blur trails — at 18 fps the eye reads the frames as motion.

## What NOT to draw
- No background — fully transparent PNG-32.
- No hero silhouette — the hero sprite is rendered separately.
- No UI elements (cooldown rings, key labels).
- No projectile flight path — engine spawns the VFX at the impact location, not as a flying projectile. Frame 0 = origin spark / anticipation, peak = impact. For projectile motion the engine handles a separate procedural line; the VFX sheet only handles origin and impact bursts.

## Future: ability upgrade tints
Each ability can be upgraded once or twice. v1 ships ONE VFX per ability and the engine tints it for the upgraded variant. Don't author multiple variants — that comes in a later content drop.

## Reference / mood
- Look at the death-animation rows of `arcane_creeps.png`, `mechanical_creeps.png`, `nature_creeps.png` — that's the existing pixel-art VFX vocabulary the abilities should land in.
- Game references: Hyper Light Drifter ability bursts, Risk of Rain pixel VFX, Vampire Survivors weapon impacts.
- 6 frames at 18 fps is deliberately tight; the player should read "ability fires here, ability lands here" snappily, no lingering frames.
