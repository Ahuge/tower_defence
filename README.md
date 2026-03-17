# Tower Defence

A grid-based maze-building tower defence game with 12 factions, P2P multiplayer, and deep economic strategy. Built with Phaser 3 + TypeScript + Vite.

**[Play Online](https://ahuge.github.io/tower_defence/)** | [Faction Guide](FACTIONS.md) | [Changelog](CHANGELOG.md)

## Quick Start
```bash
npm install
npm run dev
```

## Game Overview

Build towers to create mazes, defend against 14 creep types across 30+ waves, manage your economy across three channels (towers, sends, frontier), and leverage your faction's unique strengths. Play solo or versus a friend via peer-to-peer WebRTC.

### Match Flow
1. **Menu** — Choose map (8 options), difficulty (Easy/Normal/Hard), match mode (Sprint/Standard/Marathon/Battle)
2. **Faction Select** — Pick from 12 factions with unique tower rosters
3. **Draft** — Choose 1 of 3 random modifiers (Gold Rush, Glass Cannon, etc.)
4. **Game** — Build, defend, invest. Press SPACE to start waves. TAB to change speed.
5. **Score Screen** — Tower DPS tables, economy breakdown, gold efficiency, MVP awards

### Controls
| Key | Action |
|-----|--------|
| 1-8 | Select tower type |
| Click tower button | Select/deselect tower type |
| Left click (grid) | Build / Inspect tower / Inspect creep |
| Right click | Sell tower |
| Z/X/C/V | Buy sends (Standard/Fast/Armored/Swarm) |
| SPACE | Start next wave / Vote ready (versus) |
| TAB | Cycle game speed (0x/0.5x/1x/1.5x/2x/3x) |
| P | Pause menu |
| ENTER | Chat (versus mode) |
| L | Link mode (Conduit tower) |
| ESC | Deselect / cancel link mode |

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

### Match Modes
- **Sprint** (15 waves) — Quick game
- **Standard** (30 waves) — Full experience
- **Marathon** (Endless) — Infinite scaling
- **Battle** (Dual Economy) — Gold + Essence. Buy generators with gold to produce essence in real-time. Spend essence on sends for gold income. Compound growth loop.

### Trait System
All behaviors are composable traits — data objects with registered handler functions:
```
Tesla: [chain_damage(count:2, range:96, falloff:0.7)]
Fiend: [mobile_unit(speed:180, engageRange:0.5, selfDestruct:true)]
Absolution: [splash_damage(72), life_on_kill(0.10), mute_mage_aura, bonus_vs_boss(0.3)]
```

### Creep Types (14)
Standard, Fast, Armored, Swarm, Healer, Boss, Group, Splitter, Shielded, Evasive, Flying, Iron/Haste/Mist/Heal Mage.

### Economy Triangle
- **Towers** — Direct defence
- **Sends** — Spend gold to add creeps to your wave for permanent income bonus (in versus: sends go to opponent)
- **Frontier** — Invest in passive income buildings with faction-flavored mechanics

### Difficulty System
Easy/Normal/Hard. Each creep type interprets difficulty individually — armored gets tankier, swarms multiply, fast creeps get faster.

### Multiplayer (P2P WebRTC)
- No server required — manual SDP exchange via clipboard
- Host picks map + difficulty, both pick factions
- Sends go to opponent as extra creeps
- 30s wave countdown (60s for first wave), vote ready with SPACE
- Opponent minimap with click-to-swap full view
- In-game chat via ENTER
- Mirrored waves (shared seed)

### Maps (8)
Plains, Crossroads, Fortress, Serpentine, Islands, Gauntlet, Spiral, Siege.

## Tech Stack
- **Phaser 3.90** — WebGL rendering, scene management, input
- **TypeScript 5.9** — Type safety
- **Vite 8** — Build + HMR
- **WebRTC** — P2P multiplayer (no server)

## Deploy
```bash
npm run build
# Upload dist/ to any static host
```
Auto-deploys to GitHub Pages on push to `develop`.
