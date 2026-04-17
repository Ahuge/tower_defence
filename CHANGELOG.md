# Changelog

## 2026-04-16

### Phaser 4 upgrade
Bumped the engine from **Phaser 3.90 → Phaser 4.0 ("Caladan")**. Two behavioural changes in v4's ESM bundle required code adjustments:

- **Default export removed.** All 21 files that did `import Phaser from 'phaser'` now use `import * as Phaser from 'phaser'`.
- **No more `window.Phaser` global.** v3's UMD wrapper installed Phaser as a side-effect when the module loaded; v4's ESM bundle doesn't. 36 files referenced `Phaser.Math.Clamp`, `Phaser.Textures.FilterMode.NEAREST`, `Phaser.Geom.Rectangle` etc. at runtime via ambient types without importing phaser. Each now imports the namespace explicitly — no load-order dependencies, no magic global.

Everything else was transparent: no custom pipelines, shaders, preFX/postFX, `Phaser.Geom.Point`, `Phaser.Structs.*`, `Math.PI2`, `DynamicTexture`/`RenderTexture`, TileSprite cropping, or removed plugins in the codebase. End-to-end smoke test (Menu → faction select → enemy select → Draft → GameScene) is clean.

### Bug fix: Infernal fiend mobile sprite
The Infernal "Fiend" (`infernal_bomber`) mobile spritesheet had been 404ing for a while — the filename derivation stripped the `infernal_` prefix from the towerId to get `bomber`, but the asset on disk is `fiend_mobile.png` (matching the display name). `SpriteManager` now derives the filename from the sheetKey, which already encodes the correct asset name for every mobile unit.

## 2026-04-15

### UI/UX Rework — Pixel-Indie Clean
Major visual refresh across the entire DOM UI layer. Warm dark plum palette replaces the old pure-black look, with three typefaces (Silkscreen for titles, DM Sans for body, VT323 for stats/data) and a consistent design token system.

- **PWA support** — installable as a standalone app on mobile and desktop. Service worker caches assets for offline play after first load. Tower icon on plum background.
- **Design token system** — new `tokens.css` with full palette (backgrounds, borders, text, jewel-tone accents, faction colors, rarity tiers), spacing scale, and type scale. All shared classes (`.btn`, `.card`, `.ui-section`) auto-updated.
- **Phone gameplay fixes** — floating tower info card above dock instead of full-width sidebar takeover. Status bar wraps on narrow screens. Tower dock scrolls horizontally with snap inertia. 44px minimum tap targets on all interactive elements. Fixed mobile touch passthrough (scrollable overflow no longer blocks Phaser canvas). Canvas now resizes on every viewport change, not just breakpoint crossings.
- **Menu screens refreshed** — GameOverScreen with big VT323 hero numerals for shards/score/level. HeroSelectScreen and DraftScreen cards responsive with `min(260px, 100%)`. Wave count modal capped to viewport. Leaderboard with right-aligned VT323 columns.
- **Contrast pass** — 75% of hardcoded hex colors migrated to semantic tokens. VT323 data font applied to all game panels (waves, economy, sends, essence, hero items). Tablet CSS (601-1200px) fleshed out.
- **BAR_HEIGHT extracted** to config.ts — ResponsiveManager no longer imports Phaser UI files. EventLog stripped to DOM-only facade.
- **4K/ultra-wide** — `.ui-screen` max-width 1800px centered, padding scales with clamp(). Font bumps at 2000px+ and 2800px+.
- **Store roll animation** — strip padding scales with viewport (50vw), reveal synced to CSS `transitionend` instead of drifty setTimeout.
- **Utility CSS classes** — `.row-wrap`, `.row-center`, `.stack`, `.stat-value-lg/md/sm`, `.font-pixel`, `.font-data` for inline-style reduction.
- **Noise/film-grain overlay** on all screen backgrounds for texture.

## 2026-04-14

### Gauntlet Map Updates
- **All 11 gauntlet maps re-imported** from the map editor with expanded structure placements.
- **Iron Foundry (Mechanical)**: 5 → 32 structures — full factory floor build-out.
- **Ancient Grove (Nature)**: 10 → 22 structures.
- **Data Grid (Cypherpunk)**: 11 → 20 structures.
- **Warzone Outpost (Military)**: 11 → 16 structures.
- **Hellscape (Infernal)**: 11 → 15 structures.
- **Hive Tunnels (Aliens)**: 6 → 10 structures.
- **Rift Dimension (Void)**, **Concert Hall (Harmonic)**, **Mind Palace (Psionic)** also expanded.
- Descriptions preserved across the re-import (editor doesn't export them).

### Hero Skins (20 new)
- **Runtime palette-swap system** in `src/systems/PaletteSwap.ts` — generates skinned hero spritesheets on demand from the base hero PNG using HSL transforms (and/or exact hex swaps). Editor-output-compatible for when the skin editor gains hero support.
- **One hero skin per existing tower-skin theme** (20 total): Corrupted/Sandstone/Moonstone/Blood Magic Arcanist · Gilded/Factory Fresh Engineer · Autumn Druid · Whiteout Shadow · Desert Storm/Arctic Warden · Albino Necromancer · Cyber Sakura/Redline/Offline Duelist · Frostfire Berserker · Fallen Paladin · Emerald Monk · Heavy Metal/Neon Rave/Synthwave Ranger.
- **Cost tiering**: common 200 / rare 400 / epic 600 shards (half the tower-pack price since one character vs full faction).
- **Hero skin equipping**: Inventory + Store screens already supported `target: 'hero'` — the new defs slot in automatically.
- **Bug fix**: `Hero.ts` was importing `getHeroSheetKey` from SpriteManager (skin-unaware) instead of resolving the equipped skin. Now uses `ensureHeroSkinTexture()` which lazily generates the palette-swapped spritesheet on first use.

### Test button
- **+5000 Shards (test)** button on main menu for development.

### Bug fixes
- **Mobile unit skins now apply correctly when placed.** Anim frames in `createSpriteAnimations` were always bound to the BASE sheet key, so playing any animation on a skinned mobile unit would reset its texture to the base. Affected every mobile unit skin (rifleman/brawler/heavy/commander Arctic+Desert Storm, alien_swarmling, infernal_bomber). Fix: parallel anim sets per loaded skin variant + per-sprite suffix lookup.
- **Creep sprites no longer linger when killed by DoT effects** (burn, poison). The DoT death branch in `Creep.update()` was destroying graphics but skipping the sprite cleanup that the regular `takeDamage()` path runs.
- **Selecting a tower in Hero Defense no longer throws** `ReferenceError: require is not defined`. Replaced two CommonJS `require()` calls in `GameScene.towerToStats` with proper ESM imports.

### Hero skin pack bundles + rolls
- **Tower-faction packs now bundle the matching hero skin.** Buying e.g. `Gilded Mechanical Pack` also grants `Gilded Engineer`. Pack prices bumped ~50% (common 400→600, rare 800→1200, epic 1200→1800).
- **Hero skins added to the roll pool** at one rarity tier above their tower-pack equivalent (common→rare, rare→epic, epic→legendary). Direct-purchase prices match the bumped tier.
- New `SkinDef.bundles` field in StoreDefinitions; `PlayerInventory.purchaseSkin` grants bundled IDs alongside the main purchase.

### Tower dock skin labels
- **Dock card tooltips now prefix the tower name with the equipped skin theme** — e.g. "Gilded Flame ($100g)" instead of just "Flame ($100g)". New `getThemeLabelFromSuffix(faction, suffix)` helper looks up the human-readable theme label.

### Selected tower range stays visible
- **The range circle now persists for the entire duration a tower is selected** (inspect mode), instead of being wiped any time the pointer moved. `handleHover()` no longer clears `rangeGraphics` when in inspect mode, and the range is redrawn each frame so it tracks moving mobile units.

### Sprite previews on store/inventory/roll cards
- **Store skin cards now show sprite previews.** Tower-faction packs render all of the faction's towers in a row (so you see the whole pack at a glance), per-tower skins show the single tower icon, and hero skins show a hero portrait — all rendered with the skin's palette applied.
- **Roll strip + result reveal show sprites too.** The casino strip cards each preview the skin they represent, and the "NEW SKIN!" reveal card shows a larger preview of what you won.
- **Inventory cards show the same previews.**
- New `SkinPreview` Preact component (`src/ui/components/SkinPreview.tsx`). `getTowerIconUrl` extended with an `overrideSuffix` arg; new `getHeroIconUrl` companion. Hero skin textures are generated lazily via `ensureHeroSkinTextureBySuffix` so previews work even for unowned skins.

## 2026-04-11

### Endless Mode + Streamlined Menu
- **NEW MODE: Endless** — infinite wave scaling, play until you lose. Random creep faction every 10 waves, boss every 10 waves. HP scales cubically beyond wave 50, speed caps at 3x.
- **Merged Sprint/Standard/Marathon** into a single "Standard" mode with wave count picker overlay (Quick 15 / Standard 30 / Extended 100).
- **Menu streamlined** from 8 mode cards to 7. Endless card in orange.
- GameOver shows "Survived X waves" for Endless instead of "Wave X/Y".
- Endless skips creep faction select (auto-random since factions rotate).

### Custom Maps
- **Custom Maps menu**: browse, import, and play user-created maps from the main menu.
- **Map editor integration**: "Open Map Editor" button opens `/editor.html` in a new tab for visual map design.
- **Import from clipboard**: paste a Full Map JSON from the editor to save a custom map.
- **localStorage persistence**: custom maps saved in browser storage, persist between sessions.
- **Multiplayer sync**: host's custom map auto-sent to all peers via WebRTC — works in Versus 1v1 and Circle Co-op.
- **Scene data flow**: `customMapDef` threaded through FactionSelect → Draft → HeroSelect → GameScene.

### Structure Art Rework
- **93 structures** (up from 90) with detailed pixel art across all 11 factions.
- Resized: mushroom ring, tank hangar, landing pad, server farm, speaker stack, music stand, colossus, altar of light, steam boiler, smokestack.
- Replaced: motor pool → military tents, lava font → pentagram, DJ booth → conductor podium.
- Added: infernal skull small (1×1), cyber cable H/V runs.
- All alien structures repainted from purple to green/organic palette.
- 36 structures fully redrawn with 2-4x more detail (batch 3).
- Automated sprite export via Puppeteer (`node scripts/export-sprites.mjs`).

### Terrain Tile Fixes
- Void terrain brightness toned down ~30-40% across all palettes.
- Infernal terrain intensity reduced ~25%, lava pool center tiles merge seamlessly.
- Celestial holy water center tiles merge seamlessly.
- Psionic thought pool center tiles merge seamlessly.
- Harmonic stage block redesigned as 3/4 angle orchestra chairs.
- Harmonic sound pool redesigned as concentric bass wave ripples.

### Map Editor & JSON Maps
- Standalone map editor at `/editor.html` — deployed alongside the game.
- Maps stored as JSON files in `src/data/maps/` (replaced procedural builder functions).
- Editor features: terrain painting with real tileset tiles, structure placement with textures, drag to move, import/export JSON, save to file.
- Structure sprites bake faction ground tiles as background.

## 2026-04-10

### Animated Large Structures
- **90 large multi-tile structures** across all 11 factions (up from 22). Each faction now has 8-10 structures ranging from 2x2 to 12x2 cells.
- **3-4 frame animation** on every structure: brazier flames flicker, radar dishes rotate, neural threads pulse, lava overflows, crystal nexuses refract light, pipe organs play, roulette wheels spin, and dozens more.
- **TerrainManager animation support**: Structures load as spritesheets when animated, with per-structure Phaser animation keys (`struct_anim_{id}`) at 1.5 fps.
- **108 structure placements** across gauntlet maps — every faction homeworld now features 6-11 animated structures woven into the terrain.
- **New structures by faction**: Military (guard tower, ammo bunker, radar dish, tank hangar, landing pad), Psionic (neural loom, stasis pod, synapse hub, psychic beacon, dream chamber), Infernal (bone cage, lava font, demon gate, skull pile, torture rack), Arcane (crystal nexus, rune circle, scrying pool, spell forge, crystal cluster, enchanting table, mana well), Mechanical (gear assembly, steam boiler, conveyor terminal, crane arm, scrap heap, smokestack), Nature (sacred pond, mushroom ring, hollow log, berry bush, stone shrine, waterfall, bee hive), Cypherpunk (server farm, hologram table, cable nest, crypto miner, neon sign, hacker station, firewall node), Celestial (oracle fountain, marble colossus, cloud throne, sun dial, altar of light, angelic statue), Aliens (egg cluster, acid pool, chitin wall, spore vent, cocoon cluster, feeding pit, tunnel mouth), Harmonic (pipe organ, DJ booth, speaker stack, harp, music stand, spotlight rig), Void (rift portal, chaos obelisk, dice altar, roulette wheel, void crystal, card table, fortune teller).

## 2026-04-09

### Faction Gauntlet Mode
- **NEW GAME MODE**: Faction Gauntlet — fight all 10 enemy factions in 10-wave stages across unique homeworld maps. 100 waves total.
- **10 faction homeworld maps**: Crystal Caverns (Arcane), Iron Foundry (Mechanical), Ancient Grove (Nature), Rift Dimension (Void), Warzone Outpost (Military), Hive Tunnels (Aliens), Data Grid (Cypherpunk), Hellscape (Infernal), Sky Citadel (Celestial), Mind Palace (Psionic), Concert Hall (Harmonic).
- **10 custom terrain sprite generators**: Every faction homeworld has unique pixel art terrain with auto-tiled edges (16 NESW variants), animated blocked tiles (lava flow, acid bubbles, scan lines, rune swirls, thought ripples, sound waves, steam vents, enchanted sparkles, burning rubble, void rift energy), and 8 faction-specific ground doodads.
- **Preview screen**: Shows full randomized stage order with faction names, map names, and wave ranges before starting.
- **Stage transitions**: Fade to black → "Stage N: [Faction Name]" banner → fade in new map. Towers destroyed, lives reset to 10, gold reset, frontier persists.
- **Stage scaling**: HP 1x-4x, speed 1x-1.5x, extra count ramp across 10 stages.
- **HUD**: Shows "Stage N/10: [Faction Name]" during gauntlet gameplay.

### Creep Sprites
- **176 unique creature sprites** across all 11 factions — each creep type gets a faction-specific creature design with 4-frame walk cycle + 3-frame death animation.
- **Creep Faction Select**: New screen after faction select lets you choose which enemy faction's creatures you face.
- **Art feedback applied**: Non-directional designs (spiders, embers), gambling motifs (void dice), blood priest, speaker bass drop, brain-dome mages, angel wings, floating musical pips, and more.
- **Hero Defense**: Arena creeps now use faction sprites too.

### Terrain System
- **Themed terrain**: 6 terrain themes (forest, mountain, water, stone, volcanic, generic) with auto-tiled sprites.
- **10 faction terrain themes** for gauntlet maps (circuit, hellscape, arcane_crystal, void_rift, urban, hive, marble, neural, concert).
- **Ground doodads**: ~13% of walkable tiles get scattered decorations (bushes, flowers, pebbles, mushrooms).
- **Animated water + lava**: 3-frame ripple/flow animations.

### Tower Targeting Priority
- **5 targeting modes**: first (closest to exit), closest (to tower), strongest (highest HP), weakest (lowest HP), fastest.
- **17 towers** assigned thematic targeting: snipers → strongest, frost → fastest, chain → closest, gamblers → weakest.
- Targeting mode shown in tower dock tooltip.

### Desktop Zoom + Pan
- **Scroll wheel zoom** toward cursor position, **+/-/⊙ buttons**, max 8x zoom.
- **Middle-click drag** or **left-click drag** (no tower selected) to pan.
- **Dual camera**: UI stays at 1x while game zooms.

### Mobile Improvements
- **Responsive tower bar**: Buttons size to fill available width.
- **Camera fixes**: Viewport clipped above UI bars, elastic bounds, bottom safe margin.
- **Larger tooltips**, encyclopedia text ~25% bigger, gold/lives visible.

### Multiplayer
- **Signaling server** (Cloudflare Workers): Room codes replace clipboard SDP exchange. Host creates room → 4-letter code → joiner types code → auto-connects.
- **Analytics dashboard** at signal.streamingsplats.com: Line charts, faction popularity, world map, game mode tracking.
- **Versus fixes**: Sends go to opponent (not self), wave sync, minimap fades during build, opponent tower sprites.

### Code Quality
- **UILayer**: Centralized UI object factory, eliminated per-frame camera filter hack.
- **PanelBase**: Reusable sidebar panel class with dynamic item management.
- **BaseFrontierMode**: Shared frontier logic, eliminated ~120 lines of duplication.
- **Proper shutdown**: destroy() on all modes/panels, event bus cleared, camera removed.
- **UIScale**: 11 new centralized properties replacing scattered isPhone ternaries.

## 2026-04-07

### Sprite Art System
- **Hybrid sprite rendering**: Factions with pixel art use Phaser Sprites; others use Graphics primitives. Clean migration path per faction.
- **All 11 factions** have complete spritesheets: towers (with per-level upgrade art), projectiles (travel + impact animations), and heroes (directional walk/attack/ability frames).
- **6 mobile unit walk-cycle sheets**: Rifleman, Brawler, Tank, Commander, Swarmling, Fiend — each with 4-direction walk + attack animations.
- **Tower picker icons**: Tower select bar shows sprite icons instead of truncated text labels.
- **Hero select portraits**: Hero picker shows sprite idle frame instead of colored diamond (desktop + phone).
- **Encyclopedia icons**: Tower and hero detail pages display sprite art.
- **Per-level tower art**: Towers visually progress as they upgrade (more detail, glow, particles per level). Extended tower sheets with 4 rows × maxLevels per faction.
- **Sprite preview tool**: `sprites.html` page renders all generators with "Download All (ZIP)" button for batch export.

### Gameplay Balance
- **Heavy Gunner → Tank**: Renamed, rethemed as armored vehicle. Slower (moveSpeed 45), longer range (4.5-6 tiles), fires AoE explosive shells.
- **Brood Mother**: New `commander_aura` — +20% damage, +15% attack speed to Swarmlings within 6 tiles.
- **Firewall buff**: DPS increased to 35, adds 65% slow to creeps crossing the beam.
- **Hero Defense Tomes**: Three new purchasable tomes in the item shop:
  - XP Tome (100g): Grants 50 + level×5 XP
  - Stat Tome (250g+): +5 DMG, +30 HP, +0.1 AS (cost scales +50g per purchase)
  - Interest Tome (200/400/800g): Upgrades interest rate from 2% → 3% → 4% → 5%

### Visual Polish
- **Meteor ground-targeting**: Splash projectiles lock destination at fire time (don't track moving targets). No rotation on splash projectiles.
- **AoE impact scaling**: Splash impacts scale to match AoE radius with NEAREST filtering for crisp pixel art.
- **Flamethrower**: Larger projectile sprite (38px) for visible flame burst.
- **Tower rotation disabled**: Whole-tower rotation looked bad; will revisit with directional sprite art.
- **Mobile unit attack effects**: Melee impact bursts, bullet trails, AoE flash rings for military units.

### UI Fixes
- **Mobile zoom/pan**: Elastic bounds scale properly with zoom level. Pinch anchors to touch midpoint via getWorldPoint().
- **Pause menu**: Centers on screen (not world) — works at any zoom level.
- **Tower tooltip**: Positioned relative to actual bar Y on mobile (not hardcoded desktop value).
- **Send panel**: Expanded to 190px on desktop for T2 sends. Sizing moved to UIScale.
- **Event log**: Text bottom-anchored so newest entries always visible.
- **Creep info panel**: Height now accounts for all stat lines + effects (shield/slow no longer clipped).
- **Scene cleanup**: GameScene shutdown handler destroys towers/creeps/listeners on exit.

## 2026-03-21

### Mobile Phone Support
- **Phone breakpoint** (<600px): New `phone` layout mode in ResponsiveManager. Full 36-col grid preserved (maps require it), Phaser Scale.FIT handles scaling.
- **Pinch-to-zoom**: Two-finger gesture zooms the camera 1x–3x. Phone starts at 1.8x zoom so grid details and text are readable.
- **Drag to pan**: Single-finger drag pans the camera when zoomed. 8px threshold distinguishes taps from pans — no accidental tower placements.
- **Touch input rework**: Clicks deferred to pointerup on touch (after pan detection). Uses `pointer.worldX/worldY` for accurate grid coords at any zoom level.
- **GameControlBar**: Touch buttons for wave start, speed, pause + hero ability buttons (Q/W/E/R/T) with cooldown overlays. Placed below the tower bar.
- **SidebarOverlay full-screen on phone**: Full canvas overlay instead of side panel, larger close button, darker scrim.
- **TowerSelectBar phone sizing**: Smaller buttons (42px vs 52px), tighter padding, no hotkey numbers on phone.
- **HeroSelectScene carousel**: Single-card view on phone with prev/next navigation and dot indicators instead of 3-across.
- **MenuScene responsive**: Map buttons in multi-row grid, 2-column mode cards, smaller difficulty buttons, dynamic Y offsets.
- **FactionSelectScene responsive**: 3-column layout (vs 6), smaller cards (90px vs 140px), condensed text, tower list hidden on phone.
- **Dynamic grid**: Grid, Pathfinding, and InputManager use dynamic `grid.cols` for bounds checking.

### Hero Defense Polish
- **2% interest** on gold at end of each wave — rewards saving for bigger purchases.
- **Stat accessories**: War Gauntlet (+15 dmg, 800g), Heart of Iron (+200 HP, 900g), Rapid Quiver (+25% AS, 1000g), Hawk Eye (+60px range, 1100g).
- **Removed Phase Boots** accessory.
- **Sidebar shows attack speed** (AS: X.XX/s) instead of move speed.
- **In-game changelog** updated to v21 with all Hero Defense changes.

## 2026-03-20

### Hero Defense Enhancement — 8 Features

Major overhaul of Hero Defense mode. Combat is deeper, more responsive, and has real progression now.

**Foundation:**
- **Tower Assists**: Leaked creeps now enter the arena with their current HP instead of full HP. Tower damage finally matters — a half-dead creep is a half-dead arena creep.
- **Floating Damage Numbers**: Pool of 30 text objects that float up and fade. Every hit, heal, crit, ability, and level-up shows colored text (white=normal, yellow=crit, purple=ability, red=hero damage, green=heal, orange=level up). Dodge shows "DODGE" text.

**Progression:**
- **Hero Leveling (1-15)**: Arena kills grant XP (10 normal, 50 boss, 100 elite). Each level gives +15 maxHP, +3 damage, +0.02 attack speed. Milestones: Level 5 = Q cooldown -20%, Level 10 = W effect +30%, Level 15 = E damage +50%. XP bar shown in sidebar.

**Combat Depth:**
- **Ultimate Abilities (R key)**: Warden gets Fortress (invuln 5s + taunt all creeps, 90s CD), Mage gets Meteor Storm (3 meteors × 150 dmg AoE, 120s CD), Shadow gets Death Mark (mark all → 30% bonus damage after 3s, 100s CD). Cooldowns shown in sidebar.
- **Visual Indicators**: Ground-targeted abilities (Blink) enter targeting mode with preview circles. Range ring around hero, crosshair at cursor. Click to cast, same key or ESC to cancel. Death Mark shows purple rings on marked targets. Fortress shows golden invulnerability ring.
- **Arena Creep Waves**: Each TD wave now also spawns 3-6 arena creeps matching the wave composition, independent of leaks. The arena always has action. Count scales with wave number.

**Content & Economy:**
- **Elite Arena Events**: Special enemies at wave milestones. Shield Guardian (wave 10, 8x HP, shields nearby creeps every 8s), Base Charger (wave 20, 12x HP, ignores hero and rushes base), Necromancer (wave 30, 6x HP, resurrects dead creeps every 5s). Orange indicator, 100 XP each.
- **Accessories with Rotating Shop**: 1 accessory slot, 12 accessories total. 3 random offers rotate every 5 waves. Actives use T key (Healing Potion, Phase Boots, Battle Horn). Passives include lifesteal, frost slow, chain lightning, berserker scaling, guardian angel revive, thorns reflect, bonus gold per kill. Buying replaces current accessory.

### Faction Heroes & Melee Balance
- **Each hero belongs to a faction**: Warden=Military, Mage=Arcane, Shadow=Void, Paladin=Celestial, Ranger=Harmonic, Berserker=Infernal, Necromancer=Aliens, Monk=Psionic, Engineer=Mechanical, Duelist=Cypherpunk, Druid=Nature.
- **Faction hero guaranteed**: If you pick a non-random faction, your faction's hero is always one of the 3 offered. Faction name shown on hero cards (highlighted gold for your faction's hero).
- **Melee heroes buffed**: All 6 melee heroes got significant HP increases (+100-150) and innate base armor (2-8). Warden is the tankiest (650 HP, 8 armor), Shadow the lightest melee (420 HP, 3 armor).
- **Hero descriptions updated** to reflect faction identity (e.g. "Void assassin", "Celestial champion", "Psionic adept").

### Hero Level Cap Removed & AoE Accessories
- **No max hero level**: Heroes can now level indefinitely past 15. Each level still queues an upgrade point.
- **3 new splash accessories**: Cleave Axe (900g, 40% splash in 50px), Inferno Blade (1400g, 60% in 70px), Tempest Hammer (2000g, 80% in 90px). Attacks deal % of damage as AoE around the target with an expanding ring VFX.
- **Arena kill gold**: All arena kills now give 0.33x base kill gold (unified for leaked and wave-spawned creeps).

### Ability Visual Effects
- **Full VFX system** for hero abilities: expanding rings for AoE, dash trails, teleport flashes, stun impacts, meteor impacts with shockwaves, chain lightning bolts, execute flashes, buff rings, and death mark detonation effects.
- New `ArenaEffects.ts` module with 7 effect types (circle_expand, circle_pulse, flash, dash_trail, ring, lightning, shockwave), each with proper fade-out and animation.
- Meteor Storm now shows fiery impact circles and shockwaves at each landing zone.
- Chain lightning shows jagged lightning bolts between targets.

### Ability Upgrades via [+] Buttons
- Each level-up point can now be spent on upgrading a specific ability instead of just stats.
- `[+]` buttons appear inline next to each ability (Q/W/E/R) when upgrade points are available.
- Each ability upgrade: +20% damage/effects, -5% cooldown, +10% AoE radius. Upgrade count shown as `+N`.
- Ultimate (R) can be upgraded once unlocked at level 6.

### Healer Creep Balancing
- **Diminishing returns on heal stacking**: Each additional heal source on the same creep per tick is halved (1st=100%, 2nd=50%, 3rd=25%...). 5 stacked healers now give ~194% instead of 500%.
- **Healers receive only 10% healing**: Creeps with heal_aura or flat_heal_aura traits get 90% reduced incoming heals, preventing healer balls from being unkillable.

### Hero Defense Economy Nerf
- TD kill gold reduced to 30% (was 100%) — 10x creep count was generating too much income.
- Wave income halved.
- Arena kill gold reduced to 5% of base (was 10%).
- Boss waves spawn half as many arena creeps.

### Heroes Encyclopedia Page
- New "Heroes" tab in the Encyclopedia with a carousel browser for all 11 heroes.
- Shows hero icon, stats, all abilities (Q/W/E), ultimate (R), cooldowns, and playstyle tags (Melee/Ranged, Fast/Slow, Tanky/Squishy).

### Accessory & Leveling Rework
- **3 accessory slots** (up from 1). No duplicates. Costs increased ~10x (600-2000g) to make them meaningful investments.
- **Skill upgrades on level-up**: Instead of auto-applying stats, each level queues an upgrade choice: +30 HP, +5 damage, +0.05 attack speed, or -10% ability cooldowns. Multiple pending upgrades stack.
- **Ultimate locked until level 6**: R ability grayed out in sidebar until hero reaches level 6, then shows "[R] UNLOCKED!".
- **XP rebalance**: 1 XP per normal kill, 5 per boss, 10 per elite. XP curve = level × 15.

### 8 New Heroes + Random Draft
- **11 heroes total** (up from 3): Warden, Mage, Shadow, Paladin, Ranger, Berserker, Necromancer, Monk, Engineer, Duelist, Druid.
- **Random draft**: Each game offers 3 random heroes to choose from. Reroll button available.
- Hero cards now show ultimate ability (R) in purple alongside Q/W/E abilities.
- New heroes cover all playstyles: tanks (Paladin, Berserker), ranged (Ranger, Engineer), melee DPS (Monk, Duelist), casters (Necromancer, Druid).

### Procedural Random Map Generator
- **New "Random" map option** in the map picker (menu, lobby, versus). Generates a unique map from a seed using chunk-based terrain features.
- **6 layout templates** (classic, dual_entry, siege, gauntlet, diagonal, corridor) define entry/exit positions. The generator picks one randomly and fills terrain procedurally.
- **Terrain feature library**: Lakes (circles), ridges (vertical walls with gaps), pillars (clusters), walls (horizontal with gaps), islands (blocked core + NoBuild ring), and boulder clusters. Features are randomly placed and validated via A* to guarantee all paths remain passable.
- **Difficulty-linked terrain**: Easy maps are open (8-10% blocked), Insane maps are cramped (18-22% blocked) with more NoBuild zones and longer minimum paths. Each difficulty level feels structurally different.
- **Daily seed toggle**: When Random is selected, a "Daily" toggle appears. ON = everyone gets the same map that day (seed = YYYYMMDD). OFF = fresh random seed each game.
- **Versus integration**: Random maps in 1v1 use the existing shared seed mechanism — both players generate identical maps from the same seed.
- **Seed display**: The active seed is shown in the top-right corner during gameplay so players can share/compare maps.
- **Seeded PRNG**: Uses mulberry32 for fast, deterministic generation. Same seed + same difficulty = identical map every time.

## 2026-03-18

### Send Scaling & Tier 2 Sends
- **Send cost scaling**: Send costs now increase +10% per 5 waves (rounded to nearest 5g). Income rewards also scale slightly (+0.5 per 10 waves) to compensate.
- **Tier 2 sends**: 4 new send types that unlock as the game progresses:
  - **Healer Pack** (70g, wave 10+): +2 healers that sustain nearby creeps
  - **Shielded Pack** (80g, wave 10+): +2 shielded creeps (1 dmg/hit cap)
  - **Flying Squad** (90g, wave 15+): +3 flying creeps that bypass the maze
  - **Regen Pack** (100g, wave 20+): +2 regenerators with 2% HP/s regen
- Send panel now shows locked tier 2 sends with unlock wave, and updates costs/availability each wave.
- Hotkeys 1-4 mapped to tier 2 sends (Z/X/C/V remain for tier 1).

### Difficulty Scaling Overhaul
- **Quadratic HP scaling**: Creep HP now scales as `20 + wave*8 + wave²*0.4`. Waves 1-10 feel nearly the same, but wave 20+ creeps have roughly double the old HP (340 vs 180 at wave 20, 620 vs 260 at wave 30). Late game is no longer trivially won.
- **Late-wave themed compositions**: Waves 21+ now have synergistic themes instead of "everything at once" — healer+armored packs (21-22), speed+swarm rushes (23-24), shielded+regen DPS checks (25-26), flying+evasion maze bypasses (27-28), and full mixed chaos (29+).
- **Kill gold decay**: Kill gold decreases by 1 per 10 waves (5g→4g→3g→2g floor). Prevents infinite income snowball in late waves.
- **Hard difficulty tuned up**: Toughness 1.5→2.0, count 1.4→1.6, speed 1.15→1.2, gold mult 0.75→0.6. Hard mode wave 25+ is now genuinely punishing.
- **New Insane difficulty**: Toughness 3.5×, count 2.0×, speed 1.35×, gold 0.4×. Probably not winnable. Bosses get damage-cap shields (40 hits). Armored creeps regenerate. Evasive creeps dodge 45%. Shielded creeps have 40-hit shields. Regenerators heal 5%/s. Good luck.
- **Faster late spawns**: Spawn interval floor lowered from 200ms to 150ms, scaling steeper (wave 30: 240ms vs old 300ms).

### New Creep Type: Regenerator
- **Regenerator**: Heavy armor, 1.8× HP, 0.85× speed, regenerates 2% max HP/s. Appears in waves 25+. On hard mode (toughness ≥ 2.0), regen increases to 3%. Forces sustained DPS rather than burst.
- **Boss regen on hard**: Hard-mode bosses gain 1% HP/s regeneration, making them much more threatening.
- New `regeneration` creep trait with green pulse visual effect when healing.

### Bug Fix: DoT/Beam Rounding
- **Fixed zero-damage DoTs**: At 60fps, per-frame DoT damage (e.g. Virus 10 DPS × 0.016s = 0.16) was rounded to 0 by `Math.round()`. Added accumulator pattern — fractional damage carries between frames, only applied when ≥1 HP. Virus, burn, and poison effects now deal correct damage.
- **Fixed Firewall beam zero damage**: Same rounding bug caused `Math.round(20 * 0.016) = 0`. Removed rounding — beam now applies raw float damage. HP checks (`<= 0`) work fine with floats.

### Responsive Scaling & Tablet Support
- **Dynamic grid offset**: `GRID_OFFSET_X` and `CANVAS_WIDTH` are now dynamic functions (`getGridOffsetX()`, `getCanvasWidth()`) that read from `ResponsiveManager`. On desktop (window >= 1200px), layout is unchanged. On tablet, grid offset is 0 and canvas shrinks to game area only.
- **ResponsiveManager** (`src/systems/ResponsiveManager.ts`): Singleton that detects layout mode from `window.innerWidth`, fires resize events, exposes `isTablet()`, `canvasWidth()`, `gridOffsetX()`.
- **Collapsible sidebar overlay** (`src/ui/SidebarOverlay.ts`): On tablet, sidebar panels (UpcomingWaves, SendPanel, FrontierPanel, EssencePanel, EventLog) slide in/out from the left via a hamburger toggle button. Desktop layout unchanged.
- **Touch input**: Long-press (500ms) triggers right-click callback (sell/upgrade). Added tappable Sell/Upgrade buttons to TowerInfoPanel, tappable Start Wave and Speed buttons to UIOverlay. Works on both desktop and tablet.
- **All scene centering** now uses `getCanvasWidth()` so menus fill the correct canvas size on any layout.
- **GameMode.reparentSidebarPanels()**: Optional method on game modes to move their sidebar panels into the overlay on tablet. All 4 modes (Standard, Battle, HeroDefense, CircleCoop) implement it.
- Added `getContainer()` to UpcomingWaves, EventLog, SendPanel, FrontierPanel, EssencePanel, ItemShopPanel for sidebar reparenting.

### Circle Co-op Fixes
- **Individual gold**: kill credit now tracks which tower dealt the killing blow (`Creep.lastHitCol/Row`). Only the tower owner gets kill gold via `CircleDeathHandler`.
- **Lobby sync fixes**: joiners now correctly receive their player index via targeted messages. Existing joiners are notified when new players connect (P2 knows about P3/P4).
- **3P zone fix**: bottom-half zones now follow Y-shaped diagonal walls correctly instead of dumping all bottom cells into P2's zone.
- **Tower relay fix**: remote tower placements skip economy checks (`TowerManager.placeTower` `free` param) — was silently failing because the host couldn't afford other players' towers.
- **Periodic tower sync**: every 5s each player broadcasts their tower state; other players reconcile any missed placements.
- **Registry cleanup**: stale `circle`/`versus` entries are cleaned from the Phaser registry when switching modes or exiting to menu. Prevents hero defense from thinking it's in co-op.

### Harmonic Conduit Re-emit
- **Conduit-linked aura towers now re-emit inherited buffs to their neighbors.** Previously, if a Quickener's rate aura was shared to an Amplifier via conduit, the Amplifier received the buff but didn't pass it on. Now inherited harmonic buffs re-emit at 50% of received value (35% of original). Linked towers and conduits excluded from re-emit to prevent loops.

## 2026-03-17

### Circle Co-op Mode
- **New multiplayer mode: Circle Co-op** — 2-4 players share one map. Creeps loop through all player zones in a circle. If a creep completes the full loop, shared lives decrease.
- **Zone system**: each player has a colored quadrant/sector where they can build towers. Other zones are visible but not buildable.
- **Shared lives**: all players share a life pool (20). When creeps leak (complete the circle), everyone loses together. Win by surviving all 30 waves.
- **Individual gold**: kill gold goes to the tower owner regardless of which zone the creep was in. Standard frontier buildings available.
- **3 new circle maps**: Circle 2P (left/right halves), Circle 3P (Y-shaped 3 sectors), Circle 4P (4 quadrants with central island).
- **Star topology networking**: host maintains N-1 PeerConnections. All tower operations (place/sell/upgrade) go through host relay to keep all players in sync.
- **Wave sync**: all players must be ready (SPACE) or timer expires before next wave starts. Host is authoritative for shared lives.
- **Player roster UI**: top-right panel shows all players with zone color indicators and ready status.
- **Zone overlay**: your buildable zone is highlighted with a color tint on the grid. Zone colors match player roster.
- **No sends** in co-op (may be added later).
- **New files**: CircleManager, CircleLobbyScene, CircleLeakHandler, CircleCoopMode, CirclePlayerRoster, CircleDeathHandler.
- **Modified files**: Maps (3 circle maps + zone data), WaveDefinitions (circle_coop mode), MessageProtocol (circle messages), GameScene (zone restriction, tower ownership, shared lives sync), MenuScene (co-op button), main.ts (scene registration).

### Hero Defense Mode
- **New game mode: Hero Defense** — split-screen layout with hero arena (top, 400px) and smaller TD grid (bottom, 36×12).
- **3 heroes**: Warden (tank, 500 HP, melee), Mage (mage, 280 HP, ranged), Shadow (assassin, 320 HP, fast melee).
- **Click-to-move hero micro**: click arena to move, click creeps to focus. Q/W/E ability keys with cooldowns.
- **Warden abilities**: Shield Bash (stun 1.5s), War Cry (+40% AS), Ground Slam (AoE 15 dmg + slow).
- **Mage abilities**: Fireball (100+60 splash), Frost Nova (AoE slow), Blink (teleport).
- **Shadow abilities**: Shadow Strike (dash+mark +25% amp), Evasion (100% dodge 2s), Execute (200 dmg if <30% HP).
- **Hero item shop**: 3 slots (Weapon, Armor, Boots) × 3 tiers each. Weapon gives damage/crit, Armor gives flat armor + HP, Boots give speed/dodge.
- **Arena system**: leaked TD creeps spawn at left edge of arena with full HP, walk right toward the Base (10k HP). Hero fights them.
- **Arena creeps fight back**: creeps aggro on the hero (240px range, bosses 360px), chase, and attack in melee. Creeps that reach the base park there and repeatedly attack it.
- **Ranged heroes fire projectiles**: Mage auto-attacks launch visible projectiles that fly to target.
- **10x creep waves**: hero defense spawns 10x the normal creep count with faster spawn intervals for intense arena pressure.
- **Death/Respawn**: hero dies → 10s respawn timer → full HP at arena center. Creeps walk to base unimpeded while dead.
- **Economy**: arena kills award 10% gold (balanced for 10x creep count). Hero heals 20% on wave clear.
- **Hero Select scene**: 3 hero cards with stat breakdowns and ability descriptions. Routes through draft to game.
- **Hero Plains map**: designed for 12-row grid with entry left, exit right. Auto-selected for hero defense mode.
- **Layout system**: `LayoutConfig.ts` returns grid dimensions per mode. Mutable `_gridOffsetY` in config offsets all grid rendering.
- **HeroLeakHandler**: intercepts TD leaks, spawns ArenaCreep with full HP at arena left edge. Returns 0 damage (no life loss).
- **HeroDefenseMode**: GameMode implementation with ItemShopPanel and ArenaManager integration.
- **AbilitySystem**: manages visual effects for hero abilities.
- **Game over screen**: shows hero kills, deaths, K/D ratio, damage dealt, abilities used.
- **Menu**: "Hero Defense" button added to match mode list.
- **Changelog scene**: v16 entry added.
- **11 new files**: LayoutConfig, HeroTypes, HeroItems, Hero, ArenaCreep, ArenaManager, HeroSelectScene, HeroLeakHandler, HeroDefenseMode, ItemShopPanel, AbilitySystem.

### GameMode Interface System
- **Pluggable GameMode interface**: each match mode (Standard, Battle) is a self-contained class implementing `createUI()`, `update()`, `onWaveCleared()`, `canStartWave()`, `handleSend()`.
- **StandardMode**: owns SendPanel, FrontierManager, FrontierPanel, and all frontier actions (overcharge, dig, harvest — both individual and batch).
- **BattleMode**: owns EssencePanel, essence resource registration, generator purchases, and essence sends.
- GameScene delegates to `this.gameMode` instead of inline if/else checks per mode.
- Fixed: `eventLog` was passed to game mode context before being created (was null).
- Fixed: `versus` reference now properly wired into `GameModeContext` after versus initialization.
- Random faction frontier rotation goes through `StandardMode.rotateRandomFrontier()`.
- Removed ~130 lines of mode-specific code from GameScene (now ~1070 lines).

### Dual Economy (Battle) Game Mode
- **New match mode: Battle** — two resources: Gold (towers) + Essence (sends).
- **Essence generators**: buy with gold (Tap 30g/+1/s, Well 80g/+3/s, Conduit 200g/+8/s, Nexus 500g/+20/s). Essence ticks in real-time.
- **Sends cost Essence**: Standard 10e, Fast 15e, Armored 30e, Swarm 8e. Each gives gold income per wave.
- **Compound growth loop**: Gold → Generators → Essence/sec → Sends → Gold income/wave → more Generators or towers.
- EssencePanel replaces Send+Frontier in Battle mode. Shows essence counter, rate, generators, sends.
- Z/X/C/V hotkeys work for essence sends.

### Architecture Decomposition
- **TowerManager** (282 lines): tower placement, selling, upgrades, trait updates, expired cleanup, wave-end processing, brood mother spawning.
- **CreepManager** (120 lines): creep movement, leak/death handling via pluggable interfaces, cleanup, proximity search.
- **WaveController** (88 lines): wave start/clear detection, spawning delegation, callback-driven side effects.
- **Leak/Death handlers**: `LeakHandler` and `DeathHandler` interfaces with `StandardLeakHandler` and `StandardDeathHandler` implementations. Future Hero Defense mode swaps these.
- **ResourceManager** (120 lines): N-resource system with real-time ticking. Gold is default. Battle mode adds Essence.
- GameScene reduced from 1376 to ~1200 lines via extraction.

### Manual Conduit Linking + Encyclopedia + Changelog Viewer
- **Manual Conduit linking**: Conduit no longer auto-links. Click Conduit → press L → click aura towers to link/unlink. Only links different aura types. Max 2-3 links based on level. Visual: colored lines per aura type (red=damage, green=rate, blue=range, magenta=crit). Linked towers show gold outline.
- **Encyclopedia scene**: browse all towers (grouped by faction with traits), creeps (HP/speed/armor/abilities), and frontier buildings. Mouse wheel scrolling, tab switching.
- **In-app Changelog**: scrollable history from v1 to latest on the menu screen.
- **Harmonic aura info**: TowerInfoPanel shows all active Harmonic buffs (+X% DMG, -X% SPD, +X RNG, X% crit) when inspecting a buffed tower.
- **Distinct aura colors**: Amplifier red, Quickener green, Reach blue, Critical Mass magenta. Tower colors and aura circles match.
- **Version SHA** on menu screen (bottom-right, gray).
- Menu has [ Encyclopedia ] and [ Changelog ] buttons.

### Documentation Overhaul
- Updated CLAUDE.md with documentation rules, multiplayer architecture, all current design decisions.
- Updated README.md with 11 factions, 8 maps, multiplayer, all controls.
- Updated FACTIONS.md with all 11 factions including lore quotes, tower tables, and frontier buildings.

### Initial Speed Sync
- Host sends current game speed to joiner on game start (was only synced on TAB press).

### Lobby Faction Grid
- Faction picker in multiplayer lobby now uses a 2-row grid (6 columns) instead of overflowing single row.

### Firewall Beam Visual + Faction Aura Fix
- Firewall towers now draw a cyan beam between linked pairs (redraws each frame).
- Faction speed aura (_faction_rate_buff) shows pink glow on buffed towers.

### 5 New Maps (8 total)
- **Serpentine**: Pre-built snake maze with S-curves. Limited build space.
- **Islands**: 4 build zones separated by no-build rivers.
- **Gauntlet**: 4 entries (all sides), center exit. Hardest map.
- **Spiral**: Concentric walls, entry at corner, exit at center. Long path.
- **Siege**: Mirrored top/bottom halves. Designed for versus.

### Multi-Spawn, Scoreboard Fix, Frontier Rework, Mobile Units, Kamikaze
- Creeps now spawn from ALL entry points (round-robin distribution).
- Scoreboard economy section is now a proper table, positioned dynamically.
- Unique frontier buildings per new faction (Breeding Pool, Crypto Mine, Soul Well, etc.).
- **Alien Swarmling** (15g): cheap mobile melee unit, stackable.
- **Infernal Fiend** (20g): kamikaze — sprints to creep, explodes for 80 AoE, self-destructs.
- Tower lifecycle: expires_after_waves, decay_per_wave, life_on_kill, leak_absorb all wired.

### 5 New Factions (11 total)
- **Spawn Aliens** (7): Spitter, Stinger, Swarm Node, Acid Sprayer, Hive Spire, Swarmling, Overmind. Extreme fire rates, faction speed aura.
- **Cypherpunk** (7): Ping, Firewall (linked beams), Virus (spreading DoT), Backdoor (hack reverse), DDoS (AoE root), Rootkit (mute + shred), Zero Day. Digital warfare.
- **Infernal** (6): Imp (expires), Hellfire (decays), Soul Drain (gold/kill), Fiend (kamikaze), Immolate, Apocalypse. Sacrifice and decay.
- **Celestial** (5): Acolyte (life on kill), Ward (mute mages), Smite (+50% vs boss), Sanctuary (absorb leaks), Absolution. Holy protection.
- **Psionic** (5): Probe (true damage), Mesmer (confusion), Terror (fear aura), Mind Spike (+50% vs mages), Overmind. True damage ignoring armor.
- New traits: true_damage, confuse_on_hit, life_on_kill, mute_mage_aura, leak_absorb, bonus_vs_boss/mage, firewall_link, virus_spread, hack_reverse, expires_after_waves, decay_per_wave, gold_per_kill_range, faction_speed_aura, damage_cap_shield.
- Creep confusion (walk backward), muted (suppress abilities), virus DoT.

### Score Screen Economy Fix
- totalGoldEarned now properly tracked (kill gold, wave income, frontier, tower gold-on-hit).
- totalGoldSpent tracks tower, send, and frontier purchases.

### Resolution + UI Improvements
- 28px tiles, 36x26 grid (1368x808 canvas). Denser playfield.
- Tower bar: 68px tall, 52px buttons. Font sizes +2px across all UI.
- Income display moved to tower bar top-right.

## 2026-03-16

### Multiplayer Polish: Settings, Speed Sync, Chat, Ping, Disconnect, Mirrored Waves
- **Host map/difficulty picker**: host selects map and difficulty in the lobby before faction pick. Joiner sees host's choices via game_start message.
- **Speed sync**: when host changes speed (TAB), a `speed_change` message syncs to joiner. Joiner sees "Host set speed: 2x" in event log.
- **Tower upgrade sync**: `tower_upgraded` message sent when upgrading towers, with new level. Opponent minimap reflects upgrade levels.
- **Opponent wave counter**: `wave_cleared` now includes wave number. Opponent minimap shows accurate wave count.
- **In-game chat**: press ENTER to open a prompt. Messages appear in event log as `[YOU]` and `[OPP]`. Uses `chat` message type.
- **Ping display**: automatic ping/pong every 3 seconds. Latency tracked in VersusManager.
- **Disconnect detection**: if WebRTC connection fails, event log shows "Opponent disconnected!" and game continues as solo. Versus manager detached cleanly.
- **Mirrored waves**: shared seed from host sent via game_start. SpawnManager uses seeded PRNG for deterministic wave shuffle. Both players face identical spawn order.
- Rematch: returns to menu (reconnection via new lobby session).

### Gameplay Fixes: Blossom, Random Frontier, Shielded Creeps, Multiplayer UX
- **Blossom tower** reworked: no damage, no attack. Pure adjacency buff aura. Range 1.5 tiles = adjacent only. Description clarified.
- **Random faction frontier**: 2 random frontier buildings from all faction pools each wave. Rotates on wave clear alongside tower pool. FrontierPanel rebuilds purchase list dynamically.
- **Shielded creep** type: energy shield caps damage to 1 per hit until shield breaks (15 hits, 25 on hard). Mana Drain's strip_shield instantly depletes both HP shields and damage-cap shields. Appears from wave 13+.
- **Meteor** confirmed location-targeted (splash_damage is already location-based — projectile continues to destination if target dies).
- **Multiplayer lobby** reworked: host picks map + difficulty, both players see faction picker after connection. Factions sent via game_start message.
- **Versus wave timer**: 30s countdown auto-starts on game begin and after each wave clear. Status bar shows `[SPACE] Ready (25s)`. Wave starts when both ready OR timer expires.
- **Boss leak** costs 5 lives instead of 1. Event log shows "BOSS leaked! -5 lives".

### Versus Multiplayer (P2P WebRTC)
- **Peer-to-peer multiplayer** — no server required. Uses WebRTC data channels with manual SDP exchange (copy-paste offer/answer codes).
- **Lobby scene**: Host generates offer code (copied to clipboard), Joiner pastes it and generates answer code. Connection established directly between browsers.
- **Sends go to opponent**: in versus mode, your send purchases spawn extra creeps in the opponent's game, not yours. Opponent's sends come to you.
- **30s wave timer**: between waves, both players have 30 seconds to build/send. Press SPACE to vote ready — wave starts when both ready OR timer expires.
- **Opponent minimap**: top-right of game area shows opponent's tower placements, lives, wave count, and ready status with countdown timer.
- **State sync**: tower placed/sold/upgraded, sends purchased, lives updates, wave ready votes. Creep movement is deterministic and simulated locally.
- **VersusManager**: handles connection, message routing, opponent state tracking, wave timing, incoming send queuing.
- Menu has "VERSUS MULTIPLAYER" button leading to the lobby.

### Game Speed Control
- **TAB** cycles through speed: 0x (frozen), 0.5x, **1.0x** (default), 1.5x, 2.0x, 3.0x.
- Speed indicator in bottom-right of HUD: `[TAB] 1.0x`. Red at 0x, yellow at fast speeds.
- Multiplies delta time — all game systems (towers, creeps, spawning, DoTs, traits) scale uniformly.
- Speed 0x acts as a soft pause (UI still responsive, can build/sell).
- Speed logged in event log on change.

### Military Faction, Mobile Unit Towers, Fighter System Removed
- **Military faction** (6 towers): Sandbag (8g wall), Barbed Wire (adjacent slow), Rifleman (mobile ranged), Brawler (mobile melee), Tank (mobile AoE, long range), Commander (750g ultimate, mobile + buff aura).
- **Mobile unit tower trait** (`mobile_unit`): towers that physically move to engage nearby creeps, deal melee/short-range damage, then return to their placement position. Renders as diamond shape with home-position marker when away. Each unit has moveSpeed, engageRange, leashRange, attackCooldown, optional attackSplash.
- **Barbed Wire trait** (`barbed_wire`): passively slows all creeps within 1.5 tiles of the tower.
- **Removed old Fighter system** from all factions. FighterPanel, FighterManager no longer wired in GameScene. Mobile combat is now handled through the tower trait system, giving better UI integration (tooltips, upgrades, stats tracking all work automatically).
- Updated FACTIONS.md with Military faction guide.

### Upcoming Waves, Spore Rework, Score Screen, Heal Mage
- **Upcoming Waves panel** at top of sidebar showing next 3 waves with creep types, counts, and boss markers. Updates on wave start/clear.
- **Spore tower rework**: new `tower_aura_damage` delivery trait — damages all creeps within radius of the tower itself, not the projectile target. True area denial.
- **Score screen** replaces basic game over. Tower performance table (total damage, avg DPS, gold earned, shots, count), economy section (frontier ROI%, send investment, kill efficiency), fun stats (MVP tower, best earner), high scores.
- **Heal Mage** creep: periodic flat heal aura (15 HP/0.8s). Heal scales with difficulty toughness. Rotates into mage pool wave 18+.
- **Difficulty hints in event log**: logs modifier values at game start.
- **StatsTracker** system records per-tower-type damage/gold/shots/time throughout the game.

### Difficulty System, NoBuild Terrain, 7 New Creep Types
- **Difficulty selection** (Easy/Normal/Hard) on menu. Each creep type interprets difficulty individually — armored gets tankier not more numerous, swarms multiply aggressively, bosses get bigger shields on hard.
- **NoBuild terrain**: new cell type — creeps walk through, towers can't build. Visual X pattern. Added to all 3 maps for strategic constraint.
- **7 new creep types** (14 total): Group (burst spawn), Splitter (splits into children on death), Iron Mage (armor aura), Haste Mage (speed aura), Mist Mage (evasion aura), Evasive (25% dodge), Flying (ignores maze).
- New traits: evasion, split_on_death, armor_aura, speed_aura, evasion_aura, flat_heal_aura.
- Flying creeps use direct-line path from entry to exit, bypassing all maze walls.
- SpawnManager handles group burst spawning, flying paths, and split-on-death child spawning.

### Location-Based Projectiles, Ability Scaling, Percentage Modifiers
- **Location-based projectiles**: splash/pierce/aura towers fire at a location, not a unit. If target dies mid-flight, projectile continues to destination and still explodes. Direct damage towers still track.
- **Abilities scale with tower level**: slow duration +15%/lvl, burn DPS +20%/lvl, crit chance +3%/lvl, splash radius +10%/lvl, root chance +3%/lvl, and more.
- **Percentage-based speed modifiers**: adjacency buff and overclock use percentages instead of flat ms values.
- Faction select: removed ultimate markers (gold text, asterisks).

### Major Tower Roster Redesign, Random Faction, Creep Inspection
- **Asymmetric faction sizes**: Mechanical 8, Arcane 7, Nature 6, Void 5 towers. Trimmed towers that didn't fit faction identity.
- **Cost scaling**: 2-3 cheap starters per faction, mid-game towers, 1-2 Ultimates (600-900g). Wide cost variance instead of everything compressed in 20-70g.
- **Per-tower upgrade design**: Thorn has 5 levels, Frost has 0, Gambler has 1. Each path is unique.
- **4 Ultimate towers**: Titan Cannon (800g), Arcane Nova (700g), Elder Treant (600g), Oblivion (900g).
- **Random faction**: replaces Generic. 6 random towers from all factions each wave. Pool rotates on wave clear. Bought towers persist.
- **Creep inspection**: click any creep to see HP, armor, speed, active status effects with durations.
- **Tower tooltips**: hover over tower bar buttons for full stat breakdown.
- Hotkeys expanded to 1-8.

### Tower Expansion (28 Towers), 13 New Traits, Event Log
- Expanded all factions to 7 towers each (later rebalanced to asymmetric).
- 13 new trait handlers: crit_chance, jackpot, pierce_delivery, burn_dot, poison_dot, strip_shield, armor_shred_on_hit, damage_amp_on_hit, root_on_hit, spell_amp, overclock_buff, slow_aura, growth_scaling.
- Extended StatusEffects: burn (flat DPS), poison (% HP DPS), root (full stop), armor_shred (tier reduction), damage_amp (incoming multiplier).
- **Event log** in sidebar: wave starts, clears, tower builds/sells, sends, frontier actions, creep leaks.

### Pause Menu
- Press P for centered pause overlay with Resume and Exit to Menu buttons.

### Tower Inspect Fix, Hover Tooltips
- Fixed tower inspect mode: `enterInspectMode` calling `towerBar.deselect()` no longer triggers `enterNoneMode()`.
- Hover tooltips on tower bar buttons showing name, cost, stats, traits, upgrade count.

### Send System Improvements
- Z/X/C/V hotkeys for send types.
- Adaptive batching: 40 sends clear in ~2.5s instead of 16s.

### Frontier Grouped View
- `[v] Group` toggle: groups same-type buildings with batch action buttons.
- Fixed owned buildings visibility (container rendering order).

### Left Sidebar Layout, Selection Modes, Frontier Fixes
- 300px left sidebar: Sends on top, Frontier below, Event Log at bottom.
- 3-mode selection: Build / Inspect / None. Clicking tower bar toggles selection.
- Frontier: fixed income double-counting, wired overcharge/dig/harvest actions.
- Click-through fix: sidebar clicks don't reach the grid.

### Trait System Refactor
- Core trait architecture: composable behaviors with handler registry and resolution pipeline.
- 5-phase resolution: damage modifiers → delivery → hit effects → fire rate → updates.
- Migrated all tower/creep data to trait arrays.
- Removed all hardcoded `if (ability === ...)` chains from Tower.ts.

### Initial MVP Implementation (Phases 0-7)
- **Phase 0**: Architecture foundation — EventBus, EconomyManager, SpawnManager, InputManager, UIOverlay.
- **Phase 1**: 4 tower types (Arrow/Cannon/Sniper/Slow), 3-level upgrades, status effects, tower selection bar.
- **Phase 2**: 6 creep types, armor/damage type system, data-driven waves, 3 match modes, MenuScene.
- **Phase 3**: 4 factions with unique towers, faction abilities, FactionSelectScene.
- **Phase 4**: Fighter system — autonomous combat units per faction.
- **Phase 5**: Income system, send system, income breakdown display.
- **Phase 6**: Frontier economic side-game with faction-flavored mechanics.
- **Phase 7**: 3 maps, draft modifiers, game over screen, score tracking, pause.
