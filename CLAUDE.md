# CLAUDE.md — Project Instructions

## Build & Run
- `npm run dev` — Start Vite dev server (hot reload)
- `npx tsc --noEmit` — Type check (must pass before committing)
- `npm run build` — Production build (tsc + vite build)

## Project Structure
```
src/
  config.ts           — Constants, grid helpers, sidebar dimensions
  main.ts             — Phaser game init, scene registration, trait handler imports
  data/               — Static game data (towers, creeps, factions, maps, difficulty)
  entities/           — Game objects (Tower, Creep, Fighter)
  scenes/             — Phaser scenes (Menu, FactionSelect, Draft, Game, GameOver)
  systems/            — Game logic (Grid, Pathfinding, EventBus, Economy, Spawn, etc.)
  systems/traits/     — Trait system (core registry + tower/creep handlers)
  ui/                 — UI components (panels, bars, displays)
```

## Architecture
- **Trait system**: Behaviors are composable traits on towers/creeps, not hardcoded if/else. See `systems/traits/Trait.ts` for the registry and pipeline. Add new behaviors by registering handlers.
- **Event bus**: Typed EventBus for decoupled communication between systems.
- **Data-driven**: Tower/creep definitions in `data/` with traits arrays. Add content by editing data files.
- **Grid offset**: Game grid is offset by SIDEBAR_WIDTH (300px). Use `gridX()`, `gridY()`, `pixelToCol()` helpers from config.ts.

## Conventions
- Compile check (`npx tsc --noEmit`) after every change
- Commit messages: descriptive, multi-line, explain the "why"
- Always update CHANGELOG.md when making changes
- Tower traits are registered as side-effect imports in main.ts
- Interactive Phaser objects: call `setInteractive()` AFTER `container.add()`
- Location-based projectiles (splash/pierce/aura) continue to destination if target dies

## Key Design Decisions
- Factions have asymmetric tower counts: Mechanical 8, Arcane 7, Nature 6, Void 5
- Each faction has 1 Ultimate tower (600-900g, no upgrades)
- Difficulty modifiers are per-creep-type interpreted (armored scales toughness differently than swarm)
- Random faction: 6 towers rotate each wave from all faction pools
- NoBuild terrain: walkable but unbuildable cells for map design
- Flying creeps bypass maze (straight-line path)
