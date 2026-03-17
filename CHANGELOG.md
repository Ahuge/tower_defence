# Changelog

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
- **Military faction** (6 towers): Sandbag (8g wall), Barbed Wire (adjacent slow), Rifleman (mobile ranged), Brawler (mobile melee), Heavy Gunner (mobile AoE), Commander (750g ultimate, mobile + buff aura).
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
