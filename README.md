# Tower Defence

A grid-based maze-building tower defence game built with Phaser 3 + TypeScript + Vite.

## Quick Start
```bash
npm install
npm run dev
```

## Game Overview

Build towers to create mazes, defend against waves of creeps, manage your economy across three investment channels (towers, sends, frontier), and leverage your faction's unique strengths.

### Match Flow
1. **Menu** — Choose map (Plains/Crossroads/Fortress), difficulty (Easy/Normal/Hard), and match mode (Sprint 15w / Standard 30w / Marathon endless)
2. **Faction Select** — Pick from 5 factions with unique tower rosters, or Random for a rotating pool
3. **Draft** — Choose 1 of 3 random modifiers (Gold Rush, Rapid Fire, Glass Cannon, etc.)
4. **Game** — Build, defend, invest. Press SPACE to start waves.
5. **Score Screen** — Detailed breakdown: tower DPS, gold efficiency, frontier ROI

### Controls
| Key | Action |
|-----|--------|
| 1-8 | Select tower type |
| Click tower button | Select/deselect tower type |
| Left click (grid) | Build tower / Inspect tower / Inspect creep |
| Right click | Sell tower |
| Z/X/C/V | Buy sends (Standard/Fast/Armored/Swarm) |
| SPACE | Start next wave |
| P | Pause menu (Resume / Exit to Menu) |
| ESC | Deselect |

## Major Systems

### Trait System
All tower and creep behaviors are composable **traits** — data objects with registered handler functions. Instead of `if (ability === 'chain') {...}`, you compose:
```
Tesla: [chain_damage(count:2, range:96, falloff:0.7)]
Frost: [direct_damage, slow_on_hit(duration:2500, factor:0.35)]
Titan: [splash_damage(96), burn_dot(dps:25), armor_shred(amount:2)]
```

Traits have lifecycle hooks: `onHit`, `modifyDamage`, `modifyFireRate`, `onFire`, `onUpdate`. Adding a new behavior = register a handler function + add the trait to tower data.

**Tower traits:** direct_damage, splash_damage, chain_damage, pierce_delivery, teleport_delivery, tower_aura_damage, slow_on_hit, burn_dot, poison_dot, gold_on_hit, strip_shield, armor_shred, damage_amp, root_on_hit, crit_chance, jackpot, damage_variance, ramp_up, adjacency_buff, spell_amp, overclock_buff, slow_aura, growth_scaling, fire_rate_mult, damage_mult

**Creep traits:** shield, evasion, heal_aura, flat_heal_aura, armor_aura, speed_aura, evasion_aura, split_on_death

### Difficulty System
Three levels (Easy/Normal/Hard) produce `DifficultyHints` with toughness, count, speed, and goldMult modifiers. Each creep type has `applyDifficulty()` that interprets hints according to its identity — armored creeps scale HP hard but don't multiply, swarms multiply aggressively, fast creeps get faster not tougher.

### Economy Triangle
Three ways to spend gold, creating strategic tension:
- **Towers** — Direct defence
- **Sends** — Spend gold to add extra creeps to your own wave for permanent income bonus
- **Frontier** — Invest in passive income buildings with faction-flavored mechanics (overcharge, dig, grow, gamble)

### Selection Modes
Three-mode system for clean interaction:
- **Build mode** — Tower bar active, click to place
- **Inspect mode** — Click placed tower for stats/upgrade, click creep for HP/effects
- **None mode** — Nothing selected, click tower/creep to inspect

### Pathfinding
A* pathfinding with 4-directional movement. Tower placement validates path isn't blocked. Creep paths update dynamically when towers are placed/sold. Flying creeps bypass pathfinding entirely.

### Maps
- **Plains** — Open field with scattered no-build tiles
- **Crossroads** — Two entries converge, no-build near intersection
- **Fortress** — Three entries, center exit, wall ring with no-build interior

### Stats & Scoring
Full game statistics tracked per tower type: total damage, average DPS, gold earned, shots fired. Economy stats: frontier ROI, send investment, kill efficiency. Score = waves * 100 + kills * 2 + gold + win bonus.

## Tech Stack
- **Phaser 3.90** — Game framework (WebGL rendering, scene management, input)
- **TypeScript 5.9** — Type safety
- **Vite 8** — Build tooling with HMR

## File Structure
```
src/
  config.ts              — Grid/sidebar constants, coordinate helpers
  main.ts                — Game init + trait handler registration
  data/
    TowerTypes.ts        — 30 tower definitions with traits, costs, upgrades
    CreepTypes.ts        — 14 creep types with difficulty scaling
    Factions.ts          — 5 factions (Arcane/Mechanical/Nature/Void/Random)
    Maps.ts              — 3 map layouts with blocked + no-build terrain
    Difficulty.ts        — Easy/Normal/Hard modifier definitions
    WaveDefinitions.ts   — Wave composition generator
    DraftModifiers.ts    — 8 draft modifier definitions
    FrontierBuildings.ts — Frontier buildings per faction
    SendCreepTypes.ts    — 4 send options
  entities/
    Tower.ts             — Tower entity with trait pipeline, projectile system
    Creep.ts             — Creep entity with status effects, trait hooks
    Fighter.ts           — Autonomous fighter units
  scenes/
    MenuScene.ts         — Map + difficulty + mode selection
    FactionSelectScene.ts — Faction cards with tower lists
    DraftScene.ts        — Modifier draft pick
    GameScene.ts         — Main gameplay orchestrator
    GameOverScene.ts     — Score screen with detailed stats
  systems/
    Grid.ts              — Cell types (Empty/Tower/Entry/Exit/Blocked/NoBuild)
    Pathfinding.ts       — A* algorithm
    EventBus.ts          — Typed event emitter
    EconomyManager.ts    — Gold tracking
    SpawnManager.ts      — Wave spawning with difficulty scaling
    SendManager.ts       — Send creep spawning with adaptive batching
    IncomeManager.ts     — Wave income tracking
    FrontierManager.ts   — Frontier buildings + faction mechanics
    FighterManager.ts    — Fighter unit management
    StatusEffects.ts     — Slow/burn/poison/root/shred/amp/evasion
    StatsTracker.ts      — Per-tower-type game statistics
    InputManager.ts      — Mouse/keyboard abstraction
    UIOverlay.ts         — HUD status bar
    traits/
      Trait.ts           — Core trait interface, registry, resolution pipeline
      TowerTraitHandlers.ts — All tower trait implementations
      CreepTraitHandlers.ts — All creep trait implementations
  ui/
    TowerSelectBar.ts    — Tower hotbar with click zones + tooltips
    TowerInfoPanel.ts    — Tower stats, upgrade preview, aura indicators
    CreepInfoPanel.ts    — Creep HP/armor/status inspection
    SendPanel.ts         — Send purchase panel with Z/X/C/V hotkeys
    FrontierPanel.ts     — Frontier buy/manage with grouped view
    FighterPanel.ts      — Fighter purchase panel
    UpcomingWaves.ts     — Next 3 waves preview
    IncomeDisplay.ts     — Income breakdown display
    EventLog.ts          — Scrolling event log
```
