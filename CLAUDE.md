# CLAUDE.md — Project Instructions

## Build & Run
- `npm run dev` — Start Vite dev server (hot reload)
- `npx tsc --noEmit` — Type check (must pass before committing)
- `npm run build` — Production build (tsc + vite build)
- `npm run preview` — Preview production build locally

## Deploy
- GitHub Pages auto-deploys on push to `develop` via `.github/workflows/deploy.yml`
- Base path configured in `vite.config.ts` — must match repo name
- Manual: `npm run build` then upload `dist/` to any static host

## Documentation Rules — ALWAYS FOLLOW
After every commit, check and update these files:
1. **CHANGELOG.md** — Add entry for every feature, fix, or change. Write in the same conversational summary style used in chat. Group by date.
2. **README.md** — Update if systems, controls, file structure, or tech changes.
3. **FACTIONS.md** — Update if any faction's towers, costs, traits, or identity changes. Include ALL factions.

## Project Structure
```
src/
  config.ts           — Constants (TILE_SIZE=28, GRID=36x26, SIDEBAR=360), grid helpers
  main.ts             — Phaser WEBGL init, scene registration, trait handler imports
  data/               — Static game data (towers, creeps, factions, maps, difficulty)
  entities/           — Game objects (Tower, Creep, Fighter)
  scenes/             — Phaser scenes (Menu, FactionSelect, Draft, Game, GameOver, Lobby)
  systems/            — Game logic (Grid, Pathfinding, EventBus, Economy, Spawn, etc.)
  systems/traits/     — Trait system (core registry + tower/creep handlers)
  systems/multiplayer/ — WebRTC P2P (PeerConnection, VersusManager, MessageProtocol)
  ui/                 — UI components (panels, bars, displays, minimap)
```

## Architecture
- **Trait system**: All behaviors are composable traits. See `systems/traits/Trait.ts` for registry and pipeline. Add new behaviors by registering handlers in TowerTraitHandlers.ts or CreepTraitHandlers.ts.
- **Event bus**: Typed EventBus for decoupled communication.
- **Data-driven**: Tower/creep/faction definitions in `data/`. Add content by editing data files.
- **Grid offset**: Game grid offset by SIDEBAR_WIDTH (360px). Use `gridX()`, `gridY()`, `pixelToCol()` helpers.
- **Multiplayer**: P2P WebRTC via manual SDP exchange. VersusManager handles state sync. Host controls speed, map, difficulty. Shared seed for mirrored waves.

## Conventions
- Compile check (`npx tsc --noEmit`) after every change
- Commit messages: descriptive, multi-line, explain the "why"
- Tower traits are registered as side-effect imports in main.ts
- Interactive Phaser objects: call `setInteractive()` AFTER `container.add()`
- Location-based projectiles (splash/pierce/aura) continue to destination if target dies
- Mobile unit towers: don't block grid, use `isMobile` flag, skip `grid.placeTower()`
- Expired towers: set `_expired = true`, cleaned up each frame in GameScene

## Key Design Decisions
- 11 factions with asymmetric tower counts (5-8 towers each)
- Each faction has 1 Ultimate tower (600-900g)
- Difficulty modifiers are per-creep-type interpreted
- Random faction: 6 towers + 2 frontier buildings rotate each wave
- NoBuild terrain: walkable but unbuildable cells
- Flying creeps bypass maze (straight-line path)
- Confused creeps walk backward along their path
- Muted creeps have all trait effects suppressed
- Infernal towers can expire (after N waves) or decay (lose damage per wave)
- Celestial towers can gain lives and absorb leaks
- Boss leak costs 5 lives
- Mobile units: non-blocking, stackable, full map awareness
- Kamikaze units (Infernal Fiend): self-destruct after first attack
- Multi-spawn: creeps distribute round-robin across all map entry points
- 8 maps with varied layouts and strategic constraints
