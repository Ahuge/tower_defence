# Faction Gauntlet — Design Spec

## Overview
Fight every other faction's creeps in 10-wave stages, each on a unique themed map representing that faction's homeworld. 10 stages × 10 waves = 100 waves total.

## Flow
1. Player picks tower faction + difficulty
2. 10 stages in random order (all factions except player's)
3. Each stage: 10 waves of that faction's creeps on that faction's themed map
4. Wave 10 of each stage = faction boss
5. Between stages: fade to black → "Stage N: [Faction Name]" banner → fade in new map
6. Win = survive all 100 waves

## Stage Mechanics
- **Lives**: 10 per stage, reset each stage
- **Gold**: Start each stage with initial gold (150g) + one wave's income bonus
- **Towers**: Destroyed between stages (no refund)
- **Frontier**: Carries over between stages (key investment)
- **Send income**: Carries over between stages (incentive to send)
- **Difficulty**: Selected at start, affects HP/speed/count scaling
- **Stage scaling**: Each subsequent stage is harder (multiplier ramp)

## Wave Composition
- Waves 1-3: Standard, Fast, Swarm (easy types)
- Waves 4-6: Armored, Group, Healer, Shielded (mid types)
- Waves 7-9: Evasive, Regenerator, Splitter, Flying, Mages (hard types)
- Wave 10: Boss + escort (the faction's boss creep + support)
- All creep types use the stage's faction sprites

## Stage Scaling
```
Stage 1: 1.0x base
Stage 2: 1.15x HP, 1.05x speed
Stage 3: 1.3x HP, 1.1x speed
Stage 4: 1.5x HP, 1.15x speed
Stage 5: 1.7x HP, 1.2x speed, +1 extra per group
Stage 6: 2.0x HP, 1.25x speed
Stage 7: 2.3x HP, 1.3x speed, +2 extra per group
Stage 8: 2.7x HP, 1.35x speed
Stage 9: 3.2x HP, 1.4x speed, +3 extra per group
Stage 10: 4.0x HP, 1.5x speed, +4 extra per group
```

## 10 Faction Homeworld Maps

Each map is unique to its faction with themed terrain, layout, and strategic identity.

### Arcane — Crystal Caverns
- **Terrain theme**: stone (crystal walls, arcane floor)
- **Layout**: Central crystal nexus (blocked), winding corridors radiating outward
- **Entry**: Left side. **Exit**: Center (into the nexus)
- **Special**: NoBuild arcane circles (glowing floor areas)
- **Strategy**: Long winding paths, good for slow/splash towers

### Mechanical — Iron Foundry
- **Terrain theme**: volcanic (steel floors, lava pits)
- **Layout**: Grid-like factory floor with conveyor belt paths (straight corridors)
- **Entry**: Top-left. **Exit**: Bottom-right
- **Special**: Blocked "machine" squares, NoBuild "conveyor" paths
- **Strategy**: Structured maze, parallel paths force prioritization

### Nature — Ancient Grove
- **Terrain theme**: forest (dense trees, clearings)
- **Layout**: Organic, irregular clearings connected by forest paths
- **Entry**: South. **Exit**: North (deep into the forest)
- **Special**: Large tree clusters (blocked), mushroom rings (NoBuild)
- **Strategy**: Multiple paths through clearings, positional variety

### Void — Rift Dimension
- **Terrain theme**: water (void pools) + custom void terrain
- **Layout**: Floating island platforms connected by narrow bridges
- **Entry**: Multiple (2-3 portals). **Exit**: Center void rift
- **Special**: Large void pools (blocked), narrow 2-wide bridges
- **Strategy**: Choke points on bridges, multiple entry defense

### Military — Warzone Outpost
- **Terrain theme**: mountain (bunkers, trenches)
- **Layout**: Urban grid — buildings (blocked), streets (paths), trenches (NoBuild)
- **Entry**: East (invading force). **Exit**: West (your base)
- **Special**: Building blocks create a city grid, alley ambush points
- **Strategy**: Urban warfare, short sight lines, lots of corners

### Aliens — Hive Tunnels
- **Terrain theme**: forest (organic walls, acid pools)
- **Layout**: Tunnel network — narrow winding passages through hive walls
- **Entry**: Multiple tunnel mouths (3). **Exit**: Queen chamber (center)
- **Special**: Thick organic walls, acid pools (NoBuild), tight corridors
- **Strategy**: Tight spaces, towers must cover narrow kill zones

### Cypherpunk — Data Grid
- **Terrain theme**: stone (circuit board floor, data pits)
- **Layout**: Symmetric grid with "processor" blocks and "data bus" paths
- **Entry**: Left. **Exit**: Right
- **Special**: Perfectly symmetric, processor blocks (large blocked squares)
- **Strategy**: Symmetric maze-building, mirrored strategies

### Infernal — Hellscape
- **Terrain theme**: volcanic (lava rivers, brimstone)
- **Layout**: Lava rivers dividing the map into islands with bridge crossings
- **Entry**: North. **Exit**: South (into the pit)
- **Special**: Lava rivers (blocked), narrow bridges, brimstone patches (NoBuild)
- **Strategy**: Bridge choke points, island defense zones

### Celestial — Sky Citadel
- **Terrain theme**: stone (marble floors, cloud gaps)
- **Layout**: Grand symmetrical fortress, wide open courtyards, pillared halls
- **Entry**: Grand gate (bottom). **Exit**: Inner sanctum (top center)
- **Special**: Pillar blocks, wide open spaces, cloud gaps (NoBuild)
- **Strategy**: Open field mazing with pillars as anchor points

### Psionic — Mind Palace
- **Terrain theme**: water (thought pools) + custom psionic terrain
- **Layout**: Spiral pattern converging to center (brain-like)
- **Entry**: Outer edge (multiple). **Exit**: Center (the core thought)
- **Special**: Thought pools (blocked), neural pathway (NoBuild corridors)
- **Strategy**: Spiral defense, forced long path, tight center

### Harmonic — Concert Hall
- **Terrain theme**: stone (stage floor, orchestra pit)
- **Layout**: Amphitheater shape — curved rows, central stage, side aisles
- **Entry**: Back of hall (top). **Exit**: Center stage
- **Special**: Curved seating rows (blocked), orchestra pit (NoBuild), stage area
- **Strategy**: Curved paths create interesting tower placement angles

## Implementation Components

### New files needed:
1. `src/data/GauntletMaps.ts` — 10 faction map definitions
2. `src/systems/modes/GauntletMode.ts` — game mode with stage logic
3. `src/data/GauntletWaves.ts` — wave generation per faction/stage

### Modified files:
1. `src/scenes/MenuScene.ts` — add Gauntlet mode option
2. `src/scenes/GameScene.ts` — support stage transitions, mid-game map swap
3. `src/data/Maps.ts` — register gauntlet maps
4. `src/scenes/FactionSelectScene.ts` — skip creep faction select for gauntlet

## Implementation Order
1. Map definitions (10 unique maps with faction themes)
2. Wave generation (faction-specific waves with scaling)
3. GauntletMode (stage logic, transitions, persistence)
4. Stage transition UI (fade, banner)
5. Menu integration
6. Testing + balance
