# Game Modes

## Sprint (15 waves)

Quick game with fewer creep types. Good for learning tower synergies and testing new factions.

- **Waves**: 15 (early-game creep types only — no mages, no flying)
- **Economy**: Standard gold. Kills + wave income + frontier.
- **Sends**: Available (Z/X/C/V). Adds extra creeps to your own wave for permanent income bonus.
- **Win condition**: Survive all 15 waves.

---

## Standard (30 waves)

The core experience. All creep types appear progressively. Full economic depth.

- **Waves**: 30. Boss every 10th wave. Mages from wave 18, flying from wave 19.
- **Economy**: Standard gold. Kills + wave income + frontier.
- **Sends**: Available. Income bonus compounds over 30 waves.
- **Frontier**: Faction-specific buildings with overcharge/dig/harvest actions.
- **Win condition**: Survive all 30 waves.

### Strategy Tips
- First 3 waves are just standard creeps — get your economy started.
- Invest in frontier buildings early for compound income.
- Save sends for after wave 10 when income matters most.
- Build a maze before bosses at waves 10, 20, 30.

---

## Marathon (Endless)

Infinite scaling. How far can you go?

- **Waves**: 100+ (generated). All creep types from wave 20+. HP and speed scale continuously.
- **Economy**: Standard gold. Same as Standard but the income window is much longer.
- **Win condition**: None — play until you lose. Score based on wave reached.

### Strategy Tips
- Long-term income investment pays off massively.
- Ultimates (600-900g) become essential in late waves.
- Flying creeps and mages will eventually overwhelm even perfect mazes.

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
- **Arena creeps**: Leaked TD creeps spawn at the left edge of the arena with full HP.
  - **Aggro**: Creeps detect the hero at 240px (bosses 360px) and chase.
  - **Attack**: Melee range (35px, bosses 50px). Damage scales with creep HP (4%, bosses 8%). Attack every 1.5s (bosses 1.2s).
  - **At base**: Creeps that reach the right edge park and repeatedly attack the base until killed.
- **Kill gold**: Arena kills award 10% of normal kill gold (balanced for 10x creep count).
- **Wave clear**: Hero heals 20% HP on wave clear.

### Heroes

| Hero | HP | Damage | Attack Speed | Range | Speed | Style |
|------|----|--------|-------------|-------|-------|-------|
| **Warden** | 500 | 25 | 1.0/s | Melee | 140 | Tank. Stun, buff, AoE slow. |
| **Arcanist** | 280 | 40 | 0.8/s | 200px | 120 | Ranged caster. Fireball, frost, blink. Fires projectiles. |
| **Shadow** | 320 | 55 | 1.5/s | Melee | 180 | Fast assassin. Dash, dodge, execute. |

### Abilities

**Warden (Q/W/E):**
- **Shield Bash** (Q, 8s cd) — Stun target 1.5s + 40 damage.
- **War Cry** (W, 20s cd) — +40% attack speed for 6s.
- **Ground Slam** (E, 30s cd) — AoE 15 damage + 30% slow for 1.5s in 70px radius.

**Arcanist (Q/W/E):**
- **Fireball** (Q, 6s cd) — 100 damage to target + 60% splash in 80px radius.
- **Frost Nova** (W, 15s cd) — 30 AoE damage + 60% slow for 4s in 120px radius.
- **Blink** (E, 25s cd) — Teleport to target location (300px range).

**Shadow (Q/W/E):**
- **Shadow Strike** (Q, 5s cd) — Dash to target (200px range), 60 damage, mark for +25% amp for 5s.
- **Evasion** (W, 12s cd) — 100% dodge for 2s.
- **Execute** (E, 20s cd) — 200 damage if target <30% HP, else 50 damage.

### Item Shop

Buy items in the left sidebar. Each slot has 3 upgrade tiers.

| Slot | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Weapon** | Iron Blade (50g, +15 dmg) | Steel Sword (120g, +35 dmg) | Runic Edge (250g, +60 dmg, +10% crit) |
| **Armor** | Chain Mail (40g, +2 armor, +50 HP) | Plate Armor (100g, +5 armor, +120 HP) | Guardian Plate (220g, +10 armor, +200 HP) |
| **Boots** | Leather Boots (30g, +20% speed) | Swift Greaves (80g, +40% speed) | Windrunners (180g, +60% speed, +10% dodge) |

### Strategy Tips
- Build a tight maze to slow creeps, but expect most to leak — that's by design.
- Position your hero near the base to intercept creeps before they park.
- Warden is safest for beginners — high HP and stun keep you alive.
- Shadow excels at killing high-HP targets fast with dash + amp mark + execute combo.
- Arcanist can kite from range but is fragile — buy armor early.
- Dead hero = 10s of uncontested base damage. Buy armor to survive.

---

## Versus 1v1 (Multiplayer)

Peer-to-peer competitive mode. No server required — uses WebRTC with manual SDP exchange.

- **Connection**: Host creates offer code (clipboard) → send to opponent → opponent pastes, gets answer code → host pastes answer → connected.
- **Setup**: Host picks map + difficulty. Both pick factions. Then draft modifiers.
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
- **Individual gold**: Kill credit tracks which tower dealt the killing blow. Only the tower owner gets gold. Wave income and frontier remain individual per player.
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
