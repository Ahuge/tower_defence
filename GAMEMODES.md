# Game Modes

## Standard (15 / 30 / 100 waves)

The core tower defence experience. Pick your wave count from the overlay: Quick (15), Standard (30), or Extended (100).

- **Waves**: Configurable. Boss every 10th wave. Mages from wave 18, flying from wave 19. Regenerators from wave 25. Late waves (21+) have themed synergistic compositions.
- **Economy**: Standard gold. Kills + wave income + frontier. Kill gold decays by 1 per 10 waves (5g→4g→3g→2g floor).
- **Sends**: Available (Z/X/C/V). Income bonus compounds over time. Costs scale +10% per 5 waves. Tier 2 sends unlock at waves 10/15/20.
- **Frontier**: Faction-specific buildings with overcharge/dig/harvest actions.
- **Difficulty scaling**: HP scales quadratically — waves 1-10 feel familiar, but wave 20+ creeps are significantly tougher.
- **Win condition**: Survive all waves.

### Strategy Tips
- First 3 waves are just standard creeps — get your economy started.
- Invest in frontier buildings early for compound income.
- Build a maze before bosses at waves 10, 20, 30.
- Waves 25-26 bring regenerators — you need sustained DPS, not burst.

---

## Endless (Infinite)

Infinite scaling. How far can you survive?

- **Waves**: Generated dynamically in batches, never runs out.
- **Scaling**: HP scales cubically beyond wave 50. Speed caps at 3x. Creep count increases up to 30 per wave.
- **Boss**: Every 10 waves.
- **Creep factions**: Random faction rotation every 10 waves — new visuals and variety as you progress.
- **Economy**: Standard gold. Same as Standard but the income window is unlimited.
- **Win condition**: None — play until you lose. Game over shows "Survived X waves".

### Strategy Tips
- Long-term income investment pays off massively.
- Ultimates (600-900g) become essential beyond wave 50.
- The cubic HP scaling means even perfect mazes eventually fall — it's about how far you get.
- Faction rotation is cosmetic — creep types/stats don't change with faction.

---

## Battle (Dual Economy)

Two-resource system with a compound growth loop. More strategic depth than Standard.

- **Waves**: 30. Same creep progression as Standard.
- **Resources**: Gold (towers, generators) + Essence (real-time ticking resource for sends).
- **Generators**: Buy with gold. Produce essence per second.
  - Tap (30g, +1/s), Well (80g, +3/s), Conduit (200g, +8/s), Nexus (500g, +20/s)
- **Sends cost Essence**: Standard 10e, Fast 15e, Armored 30e, Swarm 8e. Each gives gold income per wave.
- **Growth loop**: Gold → Generators → Essence/sec → Sends → Gold income/wave → more Generators → ...
- **Win condition**: Survive all 30 waves.

### Strategy Tips
- Rush a Tap generator on wave 1 for early essence income.
- Balance tower spending vs generator investment.
- Essence sends compound: each one adds permanent gold income per wave.
- Late game, a Nexus (500g) pays for itself quickly through send income.

---

## Hero Defense (30 waves)

Split-screen mode: your hero fights leaked creeps in an arena while you build towers on a smaller grid below.

- **Layout**: Hero arena (top, 400px) + 12-row TD grid (bottom).
- **Map**: Hero Plains (auto-selected). One entry left, one exit right.
- **Base HP**: 10,000. Replaces lives. Creeps that reach the base park there and attack it repeatedly.
- **Creep count**: 10x normal — massive waves flood the grid, ensuring plenty leak into the arena.
- **Spawn rate**: 40% faster than standard intervals (min 80ms).
- **Tower assists**: Leaked TD creeps enter the arena with their current HP (tower damage carries over), not full HP.
- **Arena creeps**: Leaked TD creeps spawn at the left edge of the arena.
  - **Aggro**: Creeps detect the hero at 240px (bosses 360px) and chase.
  - **Attack**: Melee range (35px, bosses 50px). Damage scales with creep HP (4%, bosses 8%). Attack every 1.5s (bosses 1.2s).
  - **At base**: Creeps that reach the right edge park and repeatedly attack the base until killed.
- **Wave creeps**: Each TD wave also spawns 3-6 arena creeps matching the wave's composition (independent of leaks). Count scales: `3 + floor(wave/10)`. Arena HP = 60% of TD HP.
- **Kill gold**: Arena kills award 10% of normal kill gold (balanced for 10x creep count). Soul Harvester accessory adds +2g/kill.
- **Kill XP**: Normal kills = 1 XP, bosses = 5 XP, elites = 10 XP.
- **Wave clear**: Hero heals 20% HP on wave clear.
- **Floating damage numbers**: All hits, heals, crits, ability damage, and level-ups show floating text that fades upward. Color-coded: white=normal, yellow=crit, purple=ability, red=hero damage, green=heal, orange=level up.

### Heroes (11 total, 3 offered per game)

Each game randomly offers 3 heroes to choose from. You can reroll for a different set.

| Hero | Faction | HP | Armor | Damage | AS | Range | Speed | Style |
|------|---------|-----|-------|--------|----|-------|-------|-------|
| **Warden** | Military | 650 | 8 | 25 | 1.0/s | Melee | 140 | Heavy tank. Stun, buff, AoE slow. |
| **Mage** | Arcane | 280 | - | 40 | 0.8/s | 200px | 120 | Ranged caster. Fireball, frost, blink. |
| **Shadow** | Void | 420 | 3 | 55 | 1.5/s | Melee | 180 | Fast assassin. Dash, dodge, execute. |
| **Paladin** | Celestial | 600 | 6 | 30 | 0.9/s | Melee | 130 | Holy tank. Stun, dodge, AoE slow. |
| **Ranger** | Harmonic | 250 | - | 45 | 1.2/s | 240px | 150 | Sharpshooter. Skillshot, frost, disengage. |
| **Berserker** | Infernal | 550 | 2 | 45 | 1.3/s | Melee | 160 | Glass cannon. Cleave, rage, leap. |
| **Necromancer** | Aliens | 260 | - | 35 | 0.9/s | 180px | 110 | Dark caster. Drain, curse, execute. |
| **Monk** | Psionic | 480 | 4 | 40 | 1.8/s | Melee | 190 | Combo fighter. Fast stun, dodge, dash. |
| **Engineer** | Mechanical | 300 | - | 50 | 0.7/s | 220px | 115 | Tactician. Grenade, tar, grapple. |
| **Duelist** | Cypherpunk | 440 | 5 | 50 | 1.6/s | Melee | 170 | Fencer. Riposte, parry, lunge. |
| **Druid** | Nature | 380 | - | 30 | 1.0/s | 160px | 135 | Nature mage. Root, thorns, wild shift. |

### Hero Leveling

Heroes gain XP from arena kills and level up to 15. Each level-up queues an upgrade choice — pick one:

- **+30 Max HP** (and heal 30)
- **+5 Damage**
- **+0.05 Attack Speed**
- **-10% Ability Cooldowns** (all Q/W/E)

XP to next level = `current_level * 15`. (L2=15, L3=30, L4=45...). Normal kills give 1 XP, bosses 5, elites 10.

**Ultimate unlock**: The R ability is locked until **level 6**. Reaching level 6 shows "[R] UNLOCKED!" floating text.

### Abilities (Q/W/E) & Ultimates (R)

Each hero has 3 basic abilities (Q/W/E) and 1 ultimate (R) with a long cooldown.

**Warden** — Q: Shield Bash (stun 1.5s + 40 dmg, 8s) | W: War Cry (+40% AS 6s, 20s) | E: Ground Slam (AoE 15 + slow, 30s) | R: Fortress (invuln 5s + taunt, 90s)

**Mage** — Q: Fireball (100 dmg + splash, 6s) | W: Frost Nova (AoE 30 + 60% slow, 15s) | E: Blink (teleport 300px, 25s) | R: Meteor Storm (3×150 AoE, 120s)

**Shadow** — Q: Shadow Strike (dash + 60 dmg + amp, 5s) | W: Evasion (100% dodge 2s, 12s) | E: Execute (200/<30% or 50, 20s) | R: Death Mark (30% bonus after 3s, 100s)

**Paladin** — Q: Smite (stun 1s + 60 dmg, 7s) | W: Holy Shield (50% dodge 3s, 18s) | E: Consecration (AoE 40 + slow, 22s) | R: Divine Judgment (invuln 4s + taunt, 100s)

**Ranger** — Q: Power Shot (120 dmg + splash, 5s) | W: Frost Arrow (AoE 20 + 50% slow, 12s) | E: Disengage (teleport 200px, 15s) | R: Arrow Storm (5×80 AoE, 90s)

**Berserker** — Q: Cleave (AoE 50 dmg, 5s) | W: Blood Rage (+60% AS 5s, 16s) | E: Leap (dash + 80 dmg, 10s) | R: Rampage (invuln 3s + taunt, 80s)

**Necromancer** — Q: Soul Siphon (90 dmg + splash, 6s) | W: Curse (AoE 25 + 40% slow, 14s) | E: Drain Life (150/<40% or 40, 18s) | R: Soul Harvest (35% bonus after 3s, 95s)

**Monk** — Q: Palm Strike (stun 0.8s + 50 dmg, 4s) | W: Inner Focus (100% dodge 1.5s, 10s) | E: Flying Kick (dash + 70 dmg + amp, 7s) | R: Thousand Fists (4×100 AoE, 75s)

**Engineer** — Q: Frag Grenade (110 dmg + wide splash, 7s) | W: Tar Bomb (AoE 15 + 70% slow 4s, 18s) | E: Grapple (teleport 250px, 20s) | R: Carpet Bomb (6×90 AoE, 110s)

**Duelist** — Q: Riposte (stun 1.2s + 55 dmg, 6s) | W: Parry (100% dodge 1.5s + 30% AS, 14s) | E: Lunge (dash + 90 dmg + 30% amp, 8s) | R: Perfect Storm (40% bonus after 3s, 85s)

**Druid** — Q: Entangle (stun 2s + 30 dmg, 9s) | W: Thornburst (AoE 45 + slow, 13s) | E: Wild Shift (+80% AS 6s, 24s) | R: Wrath of Nature (3×130 AoE, 100s)

### Visual Indicators

- Ground-targeted abilities (Blink) enter targeting mode: press key → preview circle at cursor + range ring around hero → click to cast, press same key or ESC to cancel.
- Death Mark shows purple rings around marked creeps.
- Fortress shows golden invulnerability ring.
- Taunted creeps have forced aggro on the hero.

### Elite Arena Events

Special elite enemies spawn at wave milestones with unique mechanics:

| Elite | Wave | HP | Mechanic |
|-------|------|-----|----------|
| **Shield Guardian** | 10 | 8x base | Every 8s: shields nearby creeps (damage capped at 1) for 3s |
| **Base Charger** | 20 | 12x base | Ignores hero, charges straight to base at 2x speed, 25 base damage/hit |
| **Necromancer** | 30 | 6x base | Every 5s: resurrects a dead arena creep at 50% HP |

Elites have an orange indicator ring and grant 100 XP on kill.

### Item Shop

Buy items in the left sidebar. Each slot has 3 upgrade tiers.

| Slot | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Weapon** | Iron Blade (50g, +15 dmg) | Steel Sword (120g, +35 dmg) | Runic Edge (250g, +60 dmg, +10% crit) |
| **Armor** | Chain Mail (40g, +2 armor, +50 HP) | Plate Armor (100g, +5 armor, +120 HP) | Guardian Plate (220g, +10 armor, +200 HP) |
| **Boots** | Leather Boots (30g, +20% speed) | Swift Greaves (80g, +40% speed) | Windrunners (180g, +60% speed, +10% dodge) |

### Accessory Shop

Up to 3 accessory slots with a rotating shop. 3 random accessories offered, rotating every 5 waves (wave 1, 6, 11, 16...). No duplicates allowed.

**Active accessories (T key to use):**
| Accessory | Cost | Cooldown | Effect |
|-----------|------|----------|--------|
| Healing Potion | 800g | 45s | Heal 30% max HP |
| Phase Boots | 800g | 30s | Phase through creeps 3s + 50% speed |
| Battle Horn | 900g | 40s | Stun all creeps in 150px for 1s |

**Passive accessories:**
| Accessory | Cost | Effect |
|-----------|------|--------|
| Ward Stone | 600g | +20% aggro range |
| Vampiric Fang | 1200g | 8% lifesteal |
| Frost Amulet | 1000g | Attacks slow 20% for 1s |
| Thunder Cloak | 900g | 15% chance: chain lightning 30 dmg in 80px |
| Berserker Band | 1100g | +1% damage per 1% missing HP |
| Guardian Angel | 2000g | Revive once at 50% HP (consumed on use) |
| Scout Lens | 700g | +30% crit damage |
| Thorns Mail | 1000g | Reflect 15% damage taken to attackers |
| Soul Harvester | 1500g | +2 gold per arena kill |
| Cleave Axe | 900g | Attacks splash 40% dmg in 50px |
| Inferno Blade | 1400g | Attacks splash 60% dmg in 70px |
| Tempest Hammer | 2000g | Attacks splash 80% dmg in 90px |

### Strategy Tips
- Build a tight maze to slow creeps — tower damage now carries into the arena, so towers matter more.
- Position your hero near the base to intercept creeps before they park.
- Level up early by clearing wave creeps — stat growth compounds significantly by mid-game.
- Warden is safest for beginners — Fortress ultimate makes you invincible for clutch saves.
- Shadow excels at killing high-HP targets fast with dash + amp mark + execute + Death Mark combo.
- Mage can kite from range but is fragile — Meteor Storm clears groups, buy armor early.
- Save gold for Guardian Angel before wave 20 — Base Charger can end runs fast.
- Dead hero = 10s of uncontested base damage. Buy armor and use accessories to survive.

---

## Versus 1v1 (Multiplayer)

Peer-to-peer competitive mode. No server required — uses WebRTC with manual SDP exchange.

- **Connection**: Host creates offer code (clipboard) → send to opponent → opponent pastes, gets answer code → host pastes answer → connected.
- **Setup**: Host picks map + difficulty (including Random). Both pick factions. Then draft modifiers.
- **Random maps in versus**: When host selects Random, both players generate the identical map from the shared seed.
- **Waves**: 30. Mirrored via shared seed — both players face identical spawn patterns.
- **Sends go to opponent**: Your send purchases (Z/X/C/V) spawn extra creeps in the opponent's game. Their sends come to you.
- **Wave timer**: 60s for first wave, 30s between subsequent waves. Press SPACE to vote ready — wave starts when both ready OR timer expires.
- **Speed**: Host controls game speed (TAB). Synced to opponent.
- **Opponent minimap**: Top-right shows opponent's tower placements, lives, wave, ready status. Click to swap to full opponent board view.
- **Chat**: Press ENTER to send messages.
- **Win condition**: Opponent's lives reach 0. Or survive all 30 waves with more lives.
- **Disconnect**: If opponent disconnects, game continues as solo.

### Controls (Versus-specific)
| Key | Action |
|-----|--------|
| SPACE | Vote ready for next wave |
| Z/X/C/V | Buy sends (go to opponent!) |
| ENTER | Open chat |
| TAB | Change speed (host only) |
| Click minimap | Toggle opponent board view |

### Strategy Tips
- Early sends give permanent income — invest early.
- Watch the opponent minimap to see their tower setup.
- Sending during a wave means creeps arrive while they're already fighting.
- Boss waves (10, 20, 30) are natural pressure points — time your sends.

---

## Circle Co-op (2-4 Players, Multiplayer)

Cooperative mode on a shared map. All players build towers together to survive.

- **Connection**: Same SDP exchange as Versus. Host adds players one at a time (up to 4).
- **Map**: Auto-selected based on player count — Circle 2P, 3P, or 4P.
- **Zones**: Each player has a colored zone (quadrant/sector) where they can build. Other zones are visible but not buildable.
- **Creeps**: Loop through all player zones in a circle. A creep that completes the full loop exits and costs shared lives.
- **Shared lives**: All players share 20 lives. Everyone wins or loses together.
- **Shared economy (50/50 split)**: Every kill pays out 50% to whichever tower scored the killing blow and 50% to whoever's zone or bought-send spawned the creep. Kill gold is additionally multiplied by 0.7 in coop so team total stays below solo, and creeps have a per-wave HP ramp (+3.5%/wave on top of difficulty + natural scaling) so the late game doesn't collapse under stacked team DPS.
- **Frontier income +50%**: Coop multiplies frontier `baseIncome`, per-wave bonuses, overcharge bursts, and grow harvests by 1.5× to keep meta investment compelling against the kill-gold nerf.
- **Tower sync**: All tower placements are relayed through the host. A periodic sync every 5s reconciles any missed messages.
- **No sends**: Co-op mode has no send system (may be added later).
- **Wave timer**: 60s first wave, 30s between waves. All players must be ready (SPACE) or timer expires.
- **Speed**: Host controls game speed.
- **Win condition**: Survive all 30 waves together.

### Maps

**Circle 2P** — Left/right halves divided by a central wall with gaps. 2 spawn points on opposite edges.

**Circle 3P** — Y-shaped walls create 3 sectors: top-left, top-right, bottom. 3 spawn points at edges.

**Circle 4P** — 4 quadrants with a central island. Cross-shaped walls with gaps. 4 spawn points at corners. Creep path: P0 → P1 → P2 → P3 → P0.

### Strategy Tips
- Coordinate with teammates — one player's weak maze leaks creeps into everyone's zones.
- Frontier buildings still work individually — invest in your own economy.
- Zone edges are critical choke points. Build your strongest towers there.
- The central gaps are shared territory — consider which player defends each corridor.

---

## Faction Gauntlet (100 waves)

A 10-stage campaign across every faction's homeworld. Each stage is 10 waves on a unique themed map with custom terrain art.

- **Stages**: 10 stages, each representing a faction's homeworld. Order is randomized each run (excluding your chosen faction).
- **Waves per stage**: 10. Creep composition matches the stage's faction theme. Wave 10 of each stage is a boss wave.
- **Scaling**: HP scales from 1x (stage 1) to 4x (stage 10). Speed scales from 1x to 1.5x. Extra creep count increases +0-4 across stages.
- **Economy**: Gold resets to starting amount each stage. Frontier towers persist across all stages.
- **Lives**: 20 per stage. Reset each stage — you always start fresh.
- **Maps**: Each faction has a custom homeworld map with unique blocked cells, NoBuild zones, entry/exit points, and terrain theme:
  - **Arcane** — Crystal Caverns: glowing crystal clusters, arcane-infused ground
  - **Military** — Iron Foundry: factory floors, conveyor belts, molten metal
  - **Nature** — Ancient Grove: massive trees, moss-covered stones, forest canopy
  - **Void** — Rift Dimension: floating islands, reality tears, void energy
  - **Cypherpunk** — Warzone Outpost: urban rubble, sandbags, watchtowers
  - **Aliens** — Hive Tunnels: organic corridors, egg clusters, slime pools
  - **Mechanical** — Data Grid: circuit boards, server racks, holographic displays
  - **Infernal** — Hellscape: lava flows, obsidian spires, fire vents
  - **Celestial** — Sky Citadel: marble columns, cloud platforms, golden arches
  - **Psionic** — Mind Palace: neural pathways, thought bubbles, synaptic nodes
- **Terrain**: Each map uses a custom faction tileset with animated blocked tiles, themed NoBuild zones, and unique doodads. The terrain visually transforms between stages.
- **Preview screen**: Before starting, you see the randomized stage order with faction names, map names, wave ranges, and color-coded bars. First stage is highlighted.
- **HUD**: A persistent "Stage N/10: [Faction Name]" indicator shows your progress.
- **Stage transitions**: Completing a stage triggers a fade-out, map/terrain rebuild, and a banner announcing the next faction before play resumes.
- **Win condition**: Survive all 100 waves across 10 stages.
- **Sends**: Available. Same rules as Standard.
- **Frontier**: Buildings persist across stages — invest early for compound returns.

### Strategy Tips
- Frontier investment is critical — buildings carry over, gold doesn't.
- Each stage resets lives to 20, so you can afford to take hits on tough maps.
- Later stages have significantly tougher creeps (4x HP by stage 10) — plan your tower composition accordingly.
- Boss waves (every 10th wave) are the biggest threat. Build maze choke points before them.
- Some homeworld maps have unusual layouts — adapt your maze strategy to the terrain.
- The preview screen lets you plan ahead. Note which factions appear early vs. late.
