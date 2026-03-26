# Base Defence — RTS Game Mode

## Overview
Base Defence is a full RTS experience within the tower defence game. Players build bases, mine resources, train armies, and destroy the CPU opponent's base.

**Win condition:** Destroy all enemy bases.
**Lose condition:** All your bases are destroyed.

---

## Resources

| Resource | Source | Notes |
|----------|--------|-------|
| **Gold** | Mine raw gold deposits (no building needed) or from Refineries | Builders walk to deposit, mine 4s, walk back to nearest base, deposit 8g per trip |
| **Gas (Vespene)** | Extractor building on geyser tile, or Mana Well (Arcane only) | Requires building on geyser. Builders mine same trip loop for 4g/trip. Mana Wells generate 1g/s passively |

## Supply
- Base building provides 10 supply
- Supply Depot provides 8 supply
- Each builder costs 1 supply
- Combat units cost 1-3 supply depending on tier
- Towers do NOT cost supply

## Mining Mechanics
- Max 2 builders actively mining per gold patch at a time
- Additional builders assigned to a full patch auto-redirect to nearest available patch on arrival
- Builders deposit at the nearest base building (expansion bases act as drop-off points)
- Mining trip: walk to patch → mine 4s → walk to nearest base → deposit 1s → repeat

---

## Factions

### Military — "Hold the Line"
*Disciplined, balanced, fortification-focused. The standard benchmark faction.*

**Identity:** Wins through solid macro, strong defenses, and well-rounded armies. No gimmicks — just reliable, tough units and excellent defensive tools.

**Unique Mechanics:**
- **Fast Construction** — Builders construct 20% faster
- **Radar** — Command Centers reveal 20-tile radius through fog of war
- **Fortifications** — Can build Sandbag Walls and Bunkers

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Command Center | 400g | 2000 | 20s | Base | +10 supply, drop-off, radar (20-tile vision) |
| Refinery | 75g | 400 | 8s | Miner | Place on gold deposit for mining |
| Gas Pump | 100g | 350 | 10s | Extractor | Place on geyser for gas mining |
| Supply Depot | 50g | 300 | 6s | Supply | +8 supply |
| Barracks | 150g | 600 | 12s | Barracks | Trains infantry and vehicles |
| Sandbag Wall | 15g | 150 | 3s | Wall | Blocks unit pathing. Cheap barrier. |
| Bunker | 100g | 500 | 10s | Bunker | Garrison 4 units, +50% damage bonus |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Trooper | 30g | 1 | 3s | 100 | 12 | Melee | 75 | Tanky frontline |
| Marine | 50g | 1 | 5s | 80 | 8 | 3 tiles | 80 | Consistent ranged DPS |
| Heavy Tank | 120g+50v | 3 | 12s | 350 | 35 | 4 tiles | 50 | Long range, slow powerhouse |

---

### Mechanical — "Steel Endures"
*Industrial efficiency, late-game powerhouse, automated war machines.*

**Identity:** Tougher buildings, slightly better income, but everything costs more and takes longer. Survives early game to become unstoppable late. Burst production via Overclock.

**Unique Mechanics:**
- **Overclock** [O key] — Any Mechanical building: 2x production speed for 15s, costs 50 HP. 30s cooldown.
- **Repair Bay** — Heals nearby units and buildings passively
- **Fast Scouts** — Attack Drones are the fastest unit in the game

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Core Nexus | 400g | 2200 | 22s | Base | +10 supply, drop-off. Toughest base. |
| Auto-Drill | 80g | 500 | 10s | Miner | +10% mining yield (tougher than avg) |
| Vapor Condenser | 110g | 450 | 12s | Extractor | Gas mining |
| Power Pylon | 55g | 250 | 5s | Supply | +8 supply |
| Factory | 160g | 700 | 14s | Barracks | Trains mech units. Toughest barracks. |
| Repair Bay | 120g+30v | 400 | 12s | Special | Heals 5 HP/sec in 8-tile radius |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Mech Walker | 55g | 1 | 5s | 140 | 15 | Melee | 65 | Sturdy melee |
| Attack Drone | 35g | 1 | 3s | 60 | 10 | 3 tiles | 100 | Fastest unit, fragile scout/harasser |
| Siege Engine | 150g+75v | 3 | 15s | 400 | 50 | 6 tiles | 40 | Extreme range, very slow |

---

### Arcane — "Knowledge is Power"
*Glass cannon mages. High skill ceiling. Cheap and fast but fragile.*

**Identity:** Cheapest units, fastest build times, lowest HP. Highest damage per gold. Rewards micro — blink in, burst, blink out. Mana Wells solve the gas problem creatively.

**Unique Mechanics:**
- **Blink** [B key] — Arcane combat units teleport up to 8 tiles instantly. 30s cooldown per unit.
- **Mana Well** — Generates gas passively (no geyser required)
- **Glass Cannon** — Everything is cheap/fast but fragile

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Arcanum Spire | 400g | 1800 | 18s | Base | +10 supply, drop-off. Fastest base build. |
| Gold Sigil | 70g | 300 | 6s | Miner | Fastest miner build. Fragile. |
| Ether Well | 90g | 280 | 8s | Extractor | Gas mining |
| Mana Crystal | 45g | 200 | 4s | Supply | +8 supply. Cheapest supply. |
| Summoning Circle | 140g | 500 | 10s | Barracks | Conjures arcane units |
| Mana Well | 80g | 200 | 8s | Special | Generates 1 gas/sec passively. No geyser! |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Spell Blade | 45g | 1 | 4s | 90 | 18 | Melee | 90 | Fast melee, glass cannon |
| Apprentice | 40g | 1 | 4s | 50 | 14 | 4 tiles | 85 | High DPS ranged, very fragile |
| Arcane Golem | 100g+60v | 3 | 10s | 500 | 25 | Melee | 45 | Tanky exception. Slow but nearly indestructible. |

---

### Nature — "The Hive Grows"
*Swarm economy. Weak units in overwhelming numbers. Attrition warfare.*

**Identity:** Macro monster. Cheapest units, unique passive economy via Bloom Nodes with adjacency bonuses. Wins by flooding the map and out-resourcing opponents. Fragile individually but relentless collectively.

**Unique Mechanics:**
- **Bloom Nodes** [30g] — passive 0.5g/sec income, +0.3g/sec per adjacent Bloom Node. No gold deposit needed. Fragile (100 HP).
- **Spawn on Death** — Brood Mothers spawn 2 Thorn Crawlers when killed.
- **Creep Spread** — Nature buildings spread decorative creep tiles in a small radius.

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Hive Core | 400g | 1600 | 16s | Base | +10 supply, drop-off. Lowest HP base. |
| Root Tap | 60g | 250 | 5s | Miner | Gold mining. Cheap and fast. |
| Spore Extractor | 80g | 200 | 7s | Extractor | Gas mining |
| Growth Pod | 40g | 180 | 3s | Supply | +8 supply. Cheapest. |
| Hatchery | 120g | 400 | 8s | Barracks | Spawns units in PAIRS (2 per queue slot for Thorn Crawlers) |
| Bloom Node | 30g | 100 | 4s | Special | 0.5g/sec passive + adjacency bonus |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Thorn Crawler | 20g | 1 | 2s | 45 | 8 | Melee | 95 | Cheapest unit. Swarm fodder. |
| Spore Walker | 35g | 1 | 3s | 40 | 6+poison | 3 tiles | 80 | Ranged. Poison: 3 DPS for 4s |
| Brood Mother | 90g+40v | 3 | 8s | 280 | 20 | Melee | 55 | Spawns 2 Thorn Crawlers on death |

---

### Infernal — "Burn Bright, Burn Fast"
*Sacrifice and aggression. Buildings decay. Units self-destruct. Power at a price.*

**Identity:** Ultimate aggressor — cannot turtle. Buildings decay at 1 HP/sec. Must constantly attack and expand. Unique blood economy via Soul Pyre. Doom Guards get stronger as they die.

**Unique Mechanics:**
- **Building Decay** — All non-base buildings lose 1 HP/sec. Forces aggressive tempo.
- **Soul Pyre** [60g] — Drains 3 HP/sec from nearby units, generates 2g/sec. Blood economy.
- **Doom Scaling** — Doom Guards deal up to 2× damage at low HP.
- **Fiend Detonation** — Fiends explode on death for 40 AoE damage.

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Hellgate | 400g | 2000 | 20s | Base | +10 supply, drop-off. Does NOT decay. |
| Flame Drill | 65g | 350 | 7s | Miner | Gold mining. Decays. |
| Brimstone Tap | 85g | 300 | 9s | Extractor | Gas mining. Decays. |
| Obelisk | 45g | 250 | 5s | Supply | +8 supply. Decays. |
| Demon Pit | 130g | 550 | 10s | Barracks | Trains demons. Decays. |
| Soul Pyre | 60g | 300 | 6s | Special | Drains 3 HP/sec from nearby units → 2g/sec income |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Fiend | 25g | 1 | 2s | 60 | 0 (explodes) | Melee | 100 | Suicide. 40 AoE on death. No regular attack. |
| Hellfire Caster | 45g | 1 | 4s | 55 | 16 | 4 tiles | 75 | Ranged. Self-damage: -5 HP per shot. |
| Doom Guard | 130g+60v | 3 | 12s | 320 | 22-44 | Melee | 60 | Damage scales 1×-2× as HP drops |

---

### Void — "Reality is Negotiable"
*Chaos and displacement. Random events. Global teleportation. Economy theft.*

**Identity:** Unpredictable and disruptive. Probability Engines create high-variance economy. Siphon miners steal enemy gold. Rift Walkers teleport anywhere. Phase Stalkers survive burst. Every game feels different.

**Unique Mechanics:**
- **Probability Engine** [100g] — Random event every 30s: double gold / lose 25% / free unit / 200 damage to enemy building.
- **Siphon Mining** — Void miners steal 1g from enemy per trip.
- **Rift Walk** — Rift Walkers teleport anywhere visible on the map (45s cooldown).
- **Phase Shift** — Phase Stalkers become invulnerable 2s after taking damage (30s cooldown).

| Building | Cost | HP | Build Time | Category | Notes |
|----------|------|----|------------|----------|-------|
| Void Nexus | 400g | 1900 | 19s | Base | +10 supply, drop-off |
| Siphon | 75g | 300 | 8s | Miner | Steals 1g from enemy per trip |
| Void Tap | 95g | 280 | 9s | Extractor | Gas mining |
| Rift Pylon | 50g | 220 | 5s | Supply | +8 supply |
| Warp Gate | 145g | 550 | 12s | Barracks | Trains void units |
| Probability Engine | 100g | 150 | 8s | Special | Random event every 30s |

| Unit | Cost | Supply | Train Time | HP | Damage | Range | Speed | Role |
|------|------|--------|------------|----|--------|-------|-------|------|
| Rift Walker | 50g | 1 | 5s | 70 | 10 | Melee | 85 | Teleport anywhere visible (45s CD) |
| Phase Stalker | 55g | 1 | 5s | 65 | 12 | 3 tiles | 75 | Invulnerable 2s after hit (30s CD) |
| Void Titan | 160g+80v | 4 | 15s | 450 | 45 | 8 tiles | 0 | Immobile. Massive range. Map-wide threat. |

---

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Scroll camera |
| Mouse Wheel | Zoom in/out |
| Middle Click Drag | Pan camera |
| LMB | Select unit/building |
| Shift+LMB | Add to selection |
| LMB Drag | Box select |
| RMB | Move / Mine (on gold) / Set rally (on building) |
| Shift+RMB | Attack-move |
| A + LMB | Attack-move |
| B + LMB | Blink (Arcane units only) |
| O | Overclock (Mechanical buildings only) |
| 1-5 | Build buildings (with builder selected) |
| 6-9 | Build towers (with builder selected) |
| Q/R/T | Train units (with barracks/base selected) |
| X | Cancel last queued unit |
| Ctrl+1-9 | Assign control group |
| 1-9 | Recall control group (no builder selected) |
| ESC | Cancel mode → Deselect → Menu |

## Difficulty Levels

| Difficulty | First Wave | CPU Income Bonus | CPU Decision Speed | CPU Max Barracks |
|------------|-----------|-----------------|-------------------|-----------------|
| Easy | 4 min | +3g/tick | 3s | 1 |
| Normal | 3 min | +5g/tick | 2s | 2 |
| Hard | 2 min | +8g/tick | 1.5s | 3 |
| Insane | 1 min | +12g/tick | 1s | 4 |

Reinforcement waves spawn every 90 seconds from the CPU base area and attack-move toward the player. Wave composition scales with wave number.

## Map Generation
- 24x24 tile chunks arranged in a 5x4 grid (120x96 tiles total)
- 4 base chunk templates with mountain chokepoints and resources
- 4 open chunk templates for contested areas
- 3 resource chunk templates with clustered gold/geysers
- Guaranteed L-shaped corridor carved between bases for connectivity
- Gold deposits clustered in groups of 3-5, scattered across the map
