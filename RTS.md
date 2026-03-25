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
