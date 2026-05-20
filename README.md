# Factions

[![Tests](https://github.com/Ahuge/tower_defence/actions/workflows/test.yml/badge.svg)](https://github.com/Ahuge/tower_defence/actions/workflows/test.yml)

A grid-based maze-building tower defence game with 12 factions, P2P multiplayer (1v1 and 2-4 player co-op), and deep economic strategy. Built with Phaser 4 + TypeScript + Vite.

**[Play Online](https://ahuge.github.io/tower_defence/)** | [Faction Guide](FACTIONS.md) | [Game Modes](GAMEMODES.md) | [Changelog](CHANGELOG.md)

## Quick Start
```bash
npm install
npm run dev
```

## Game Overview

Build towers to create mazes, defend against 15 creep types across 30+ waves, manage your economy across three channels (towers, sends, frontier), and leverage your faction's unique strengths. Play solo or versus a friend via peer-to-peer WebRTC.

### Match Flow
1. **Menu** — Choose map, difficulty, match mode, or multiplayer (Versus 1v1 / Circle Co-op)
2. **Faction Select** — Pick from 12 factions with unique tower rosters
3. **Hero Select** (Hero Defense only) — Choose from 3 heroes: Warden, Mage, Shadow (+ 8 more unlockable)
4. **Draft** — Choose 1 of 3 random modifiers (Gold Rush, Glass Cannon, etc.)
5. **Game** — Build, defend, invest. Press SPACE to start waves. TAB to change speed.
6. **Score Screen** — Tower DPS tables, economy breakdown, gold efficiency, MVP awards, hero stats

### Controls
| Key | Action |
|-----|--------|
| 1-8 | Select tower type |
| Click tower button | Select/deselect tower type |
| Left click (grid) | Build / Inspect tower / Inspect creep |
| Right click / Long-press | Sell tower |
| Z/X/C/V | Buy sends (Standard/Fast/Armored/Swarm) |
| 1/2/3/4 | Buy tier 2 sends (Healer/Shielded/Flying/Regen — unlock mid-game) |
| SPACE / Start Wave btn | Start next wave / Vote ready (versus) |
| TAB / Speed btn | Cycle game speed (0x/0.5x/1x/1.5x/2x/3x) |
| P | Pause menu |
| ENTER | Chat (versus mode) |
| L | Link mode (Conduit tower) |
| Q/W/E | Hero abilities (Hero Defense mode) |
| R | Ultimate ability (Hero Defense mode) |
| T | Use active accessory (Hero Defense mode) |
| ESC | Deselect / cancel link mode / cancel ability targeting |

**Tablet/Touch:** Sidebar is a collapsible overlay (hamburger menu). Upgrade/Sell buttons appear on tower info panel. Long-press (500ms) = right-click.

## Factions (12)

| Faction | Towers | Identity |
|---------|--------|----------|
| Arcane | 7 | Crits, AoE, spell amplification |
| Mechanical | 8 | Burn, pierce, ramp-up, engineering |
| Nature | 6 | Poison, growth, adjacency synergy |
| Void | 5 | Gambling, gold gen, teleportation |
| Military | 6 | Mobile units that move to engage |
| Spawn Aliens | 7 | Extreme fire rates, swarm tactics |
| Cypherpunk | 7 | Firewall beams, viruses, hacking |
| Infernal | 6 | Expiring towers, decay, kamikaze sacrifice |
| Celestial | 5 | Life gain, leak absorption, mage silencing |
| Psionic | 5 | True damage (ignores armor), confusion |
| Harmonic | 7 | Stacking aura network, Conduit linking |
| Random | 6/wave | Rotating pool from all factions |

See [FACTIONS.md](FACTIONS.md) for detailed tower lists and strategies.

## Major Systems

### Match Modes (8)
- **Standard** (15/30/100 waves) — Classic tower defence with wave count picker
- **Endless** (Infinite) — Scaling HP/speed, random creep faction every 10 waves, play until you fall
- **Battle** (Dual Economy) — Gold + Essence compound growth loop
- **Hero Defense** (30 waves) — Control a hero in an arena. 10x creeps, 11 heroes (3 offered per game), leveling (1-15), ultimate abilities (R), item shop, accessory shop (rotating), elite enemies at wave 10/20/30, floating damage numbers.
- **Faction Gauntlet** (100 waves) — Fight all 10 enemy factions in 10-wave stages on unique themed homeworld maps with 90 animated large structures. Towers reset between stages, frontier persists. Stage scaling ramps difficulty. Maps stored as JSON in `src/data/maps/`.
- **Versus 1v1** — P2P multiplayer. Sends go to opponent.
- **Circle Co-op** (2-4 players) — Shared map, zone building, shared lives.

See [GAMEMODES.md](GAMEMODES.md) for detailed rules, strategies, and controls per mode.

### Trait System
All behaviors are composable traits — data objects with registered handler functions:
```
Tesla: [chain_damage(count:2, range:96, falloff:0.7)]
Fiend: [mobile_unit(speed:180, engageRange:0.5, selfDestruct:true)]
Absolution: [splash_damage(72), life_on_kill(0.10), mute_mage_aura, bonus_vs_boss(0.3)]
```

### Campaign Architecture
Each shipped campaign (Arcane / Mechanical / Greenward / Snake Eyes) is a `CampaignExtension` — a module exposing its mission list + optional aspects that the engine consumes:

```
src/data/campaigns/<faction>.ts        — extension definition + missions
src/systems/<faction>/<name>Runtime.ts — per-aspect runtime code
src/systems/campaign/                  — generic infrastructure
  types.ts                             — CampaignExtension, MissionEntry, 6 aspects
  CampaignRegistry.ts                  — register/lookup by factionId
  WorldMutator.ts                      — host-method dispatch
  EventBusBridge.ts                    — Gameplay aspect ↔ EventBus
```

Six aspects (each optional, each consumed by one engine subsystem):
- **Setup** — one-shot world mutation at scene init (pre-placed towers, suppression pylons, sabotage M10, …)
- **Lifecycle** — per-frame `update()` + `shutdown()`
- **Gameplay** — auto-subscribed event handlers (wave/creep/tower)
- **Intercept** — consume player input before defaults (e.g. Mech pylon channel)
- **MissionState** — cross-mission state read/write/tick (Greenward Wildwood Reserves)
- **UISurface** — campaign-specific UI panels + story + epilogue

See `docs/campaign-aspects-refactor-prd.md` and `docs/adr/0001-campaigns-as-aspect-modules.md` for the decision history; `CONTEXT.md` is the glossary.

### Creep Types (14)
Standard, Fast, Armored, Swarm, Healer, Boss, Group, Splitter, Shielded, Evasive, Flying, Iron/Haste/Mist/Heal Mage.

### Economy Triangle
- **Towers** — Direct defence
- **Sends** — Spend gold to add creeps to your wave for permanent income bonus (in versus: sends go to opponent). Tier 1 always available (Z/X/C/V), tier 2 unlocks at waves 10/15/20 (1/2/3/4). Costs scale with wave progression.
- **Frontier** — Invest in passive income buildings with faction-flavored mechanics

### Difficulty System
Easy/Normal/Hard/Insane. Each creep type interprets difficulty individually — armored gets tankier, swarms multiply, fast creeps get faster. Insane mode adds extra traits (boss damage-cap shields, armored regen, 45% evasion) and is probably not winnable.

### In-game Tutorials
Joyride-style overlay that teaches the game in context — triggered on first encounter, not up-front. Tracks: basics (first launch), income primers (first game per mode), faction primers (first time each faction is picked), mode primers (first time each mode is chosen), multiplayer (first lobby open). Each track fires at most once; completion persisted in `localStorage`. The `?` button in the menu header replays any track. Custom Preact overlay (Spotlight + Popover), no third-party library. See `src/systems/Tutorial/` and `src/ui/tutorial/`.

### Multiplayer (P2P WebRTC)
- No server required — manual SDP exchange via clipboard

**Versus 1v1:**
- Host picks map + difficulty, both pick factions
- Sends go to opponent as extra creeps
- 30s wave countdown, opponent minimap, in-game chat
- Mirrored waves (shared seed)

**Circle Co-op (2-4 players):**
- All players share one map with zone-restricted building
- Creeps loop through all zones; completing the circle costs shared lives
- Individual gold — kill gold goes to tower owner
- Star topology: host relays tower ops to all players
- 3 dedicated circle maps (2P, 3P, 4P)

### Maps (8 + Random + 3 circle)
**Standard:** Plains, Crossroads, Fortress, Serpentine, Islands, Gauntlet, Spiral, Siege.
**Random:** Procedurally generated map from a seed. 6 layout templates × terrain features scaled by difficulty. Daily seed toggle locks the same map for all players that day. Versus uses shared seed for identical maps.
**Circle Co-op:** Circle 2P, Circle 3P, Circle 4P.

## Custom Maps
Create and play custom maps:
- **In-game**: Menu → Custom Maps → browse saved maps, import from clipboard, play
- **Editor**: `/editor.html` — visual map painter with terrain tiles, structures, import/export JSON
- **Storage**: Custom maps saved in browser localStorage. Built-in maps in `src/data/maps/`.
- **Multiplayer**: Host's custom map auto-synced to all players via WebRTC.

## Tech Stack
- **Phaser 4.0** (Caladan) — WebGL rendering, scene management, input
- **TypeScript 5.9** — Type safety
- **Vite 8** — Build + HMR
- **WebRTC** — P2P multiplayer (no server)
- **Responsive layout** — Desktop (sidebar inline) + tablet (collapsible sidebar overlay, touch controls)

## Testing

### Unit + component tests (Vitest)
```bash
npm test                # run the full Vitest suite (pure logic + component + regressions)
npm run test:watch      # re-run affected specs on save
npm run test:ui         # Vitest's web UI
npm run test:coverage   # text + HTML coverage report under ./coverage/
```
Test suite covers:
- Tutorial state machine + persistence + content schema
- Dynamic maze-hint path-bulge math
- Pathfinding A* (valid routes, null for unreachable, optimality, 4-dir)
- EconomyManager + EventBus wiring
- Grid math round-trip (pixel ↔ col/row)
- Preact overlay components with **overlap / viewport assertions** so a popover tweak can't silently cover the spotlight or leak off-screen
- Regression pack under `src/__regressions__/` with one test per past bug

### End-to-end tests (Playwright)
```bash
npm run test:e2e        # run all e2e specs (desktop + mobile Chromium)
npm run test:e2e:ui     # interactive UI mode
npm run test:e2e:report # open the last HTML report
```
E2E tests run against `npm run preview` (the production bundle) and cover:
- App boots, splash dismisses, menu mounts
- First-launch basics tour + skip-hint follow-up
- Help (`?`) modal open / close / track routing
- Full tutorial match walkthrough — every step transition, completion CTA, and quit path
- Mobile-specific: popover viewport containment, modal portal full-cover, spotlight alignment at 2.4x zoom

Tests opt into a `?test=1` debug hook (`src/testHook.ts`, zero cost in production builds) that exposes:
- `clickCell(col, row)` / `getCellClientPos(col, row)` — synthesise canvas clicks at grid cells
- `selectDockTower(index)` — pick a tower bypassing DOM click-propagation quirks
- `emitGameEvent(name, ...args)` — fire EventBus events directly (for event-gated tutorial advances)
- `getActiveTutorialStep/Track()` — probe tutorial state for deterministic waits

### CI
`.github/workflows/test.yml` runs:
- Fast `test` job (`tsc --noEmit` + Vitest + production build) on every push and PR.
- `e2e` job (Playwright) on PRs only — gated on the fast job passing. Browser binaries cached; HTML reports + failure videos uploaded as artifacts.

## Deploy
```bash
npm run build
# Upload dist/ to any static host
```
Auto-deploys to GitHub Pages on push to `develop`.

## Native builds

The same web bundle wraps into native apps via two toolchains:

### Desktop (Electron — Windows / macOS / Linux, Steam-ready)
```bash
npm run electron:dev                  # launch dev mode against `npm run dev` server
npm run electron:build                # package for the current host OS
npm run electron:build:win|mac|linux  # explicit per-OS builds (needs toolchains)
```
Output lands under `release/`. `electron-builder.yml` controls installer formats (NSIS + portable zip on Windows, DMG on macOS, AppImage on Linux). Steam integration (`steamworks.js`) is a future add — the `electron/preload.cjs` preload already exposes a `window.__td_electron` surface for the PlatformBridge to detect.

### Mobile (Capacitor — Android + iOS)
```bash
npm run cap:sync                  # build web bundle + copy into both native projects
npm run cap:sync:android          # just Android
npm run cap:sync:ios              # just iOS (macOS host required)
npm run cap:open:android          # open in Android Studio
npm run cap:open:ios              # open in Xcode (macOS host required)
npm run cap:run:android           # build + run on connected device / emulator
npm run cap:run:ios               # build + run (macOS host required)
```
Native Android project lives under `android/`; iOS under `ios/`. Both are committed; build artefacts and the synced web bundle copies are gitignored — `cap:sync` regenerates them.

**Prerequisites:**
- Android: JDK 17+, Android Studio with SDK 34+.
- iOS: macOS + Xcode 15+, Ruby + CocoaPods.

### Platform abstraction
All native surfaces (ads, IAP, user profile, cloud save) go through `src/systems/platform/PlatformBridge.ts`. Web builds get a no-op + localStorage fallback; Capacitor / Electron builds slot in implementations that route to AdMob, Play Games Services, Steamworks, etc.
