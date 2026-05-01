# Art PRD — Hero Ability VFX Atlas

## Slot
Per-hero ability visual effects (Q / W / E / R). Today abilities use procedural Phaser shapes (filled circles, lines, rough particle bursts). Replace with hand-authored VFX spritesheets.

## Where it lives
- Path on disk: `public/assets/heroes/vfx/<heroId>_<abilityKey>.png` — one spritesheet per ability per hero.
- Engine consumer: each `AbilityDef` gains an optional `vfxKey` field. When set, the ability's existing visual procedure is replaced with `scene.add.sprite(x, y, vfxKey).play(animKey)`.

## Per-hero ability inventory
11 heroes × 4 abilities = **44 VFX spritesheets** total. Heroes:
warden, mage, shadow, paladin, ranger, berserker, necromancer, monk, engineer, duelist, druid.

For v1, prioritize the **3 heroes the player encounters most** in campaign + tutorial:
1. mage — Q/W/E/R
2. ranger — Q/W/E/R
3. paladin — Q/W/E/R

Ship 12 sheets. Other heroes get a follow-up batch.

## Per-ability spritesheet spec
- **Layout**: horizontal strip, 8 frames × 256 × 256 px → spritesheet **2048 × 256**.
- **Animation**: 8 frames at 24 fps = 0.33s play once (`repeat: 0`), no loop.
- **Anchor**: center of frame is the ability impact / origin point.

## Per-ability visual brief
Provide one hero example so the artist understands the cadence. Abilities by hero are defined in `src/data/HeroTypes.ts` — read the `AbilityDef.name` + ability `description` from there as the brief.

### Mage (example breakdown)
- **Q — Frostbolt**: 8-frame projectile burst. Frames 1-3 = ice shards forming, 4-6 = full bolt with trailing crystals, 7-8 = impact frost-ring fade.
- **W — Blizzard**: 8-frame area cone. Frames 1-3 = swirling AoE forming, 4-6 = peak storm with hailstones, 7-8 = dissipation.
- **E — Mirror Image**: 8-frame self-cast shimmer. Frames 1-3 = body shimmer, 4-6 = glowing copies splitting, 7-8 = dissipate.
- **R (Ultimate) — Meteor**: 8-frame impact. Frames 1-3 = shadow + glow grows, 4 = peak white flash, 5-8 = expanding shockwave + smoke.

### Ranger
- Q = Power Shot: 8-frame piercing arrow with trailing motion blur.
- W = Multi-Shot: 8-frame fan of 3 arrows fanning out.
- E = Trap: 8-frame ground-trap deploy + arming + sparking idle.
- R = Hunter's Mark: 8-frame target-lock crosshair + glowing trail.

### Paladin
- Q = Hammer Slam: 8-frame heavy melee impact with light burst.
- W = Holy Light: 8-frame radial heal-cone.
- E = Divine Shield: 8-frame self-aura golden barrier forming.
- R = Judgment: 8-frame downward holy beam + radial flare.

## Color palette
Match each hero's faction primary color from `src/data/Factions.ts`. Mage = arcane purple, Ranger = nature green, Paladin = celestial gold, etc.

For impact effects: use a 2-color palette per ability (primary hue + complementary highlight). Avoid full-spectrum rainbows.

## What NOT to draw
- No background — fully transparent PNG-32, alpha-over-darkness.
- No hero silhouette — the hero sprite is rendered separately by the engine.
- No UI elements (cooldown rings, key labels).
- No baked-in motion blur trails along the WHOLE direction of travel — the engine spawns the VFX at impact location, not as a flying projectile (for projectiles, just frame 0 = origin spark, frame 4 = impact, frames in between empty or trail). Engine handles projectile motion separately.

## Reference / mood
- Read like League of Legends ability VFX or Hollow Knight charm bursts: bold silhouette, 2-3 frame readability, clear "ability fires here, ability lands here".
- High-contrast core, soft outer glow.
- 24 fps × 8 frames is deliberately tight; player should see the start + end of the ability snappily.

## Future: ability upgrade tints
Each ability can be upgraded once or twice. v1 ships ONE VFX per ability and the engine tints it for the upgraded variant. Don't author multiple variants — that comes in a later content drop.
