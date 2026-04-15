# Monetization Systems

## Overview

Four interlocking monetization channels:
1. **Shards** — premium currency earned through play or purchased
2. **Cosmetic Store** — skins, terrain themes, skin rolls
3. **Faction Gating** — 6 free factions, 5 premium
4. **Battle Pass** — seasonal free/premium track with challenges

All systems live in `src/systems/monetization/` and persist via `localStorage`.

## Premium Currency: Shards

### Earning (Free)
| Activity | Shards |
|---|---|
| Complete a game | 15 |
| Win bonus | +10 |
| Gauntlet stage | 5 each (up to 50/run) |
| Daily challenge (3/day) | 30 each |
| Weekly challenge (3/week) | 100 each |
| Battle pass free track | ~400/season |

### Spending
| Item | Cost |
|---|---|
| Skin Roll (random) | 150 |
| Specific tower skin | 200-500 |
| Hero skin | 400-500 |
| Terrain theme | 400 |
| Faction unlock | 5,000 |
| Battle pass premium | 2,500 |

## Faction Gating

**Free:** Arcane, Mechanical, Nature, Void, Military, Celestial
**Premium (5,000 shards each):** Infernal, Psionic, Aliens, Cypherpunk, Harmonic

## Battle Pass

- 30 levels, 1,000 XP/level, 6-8 week seasons
- Free track: shards + common skins + terrain
- Premium (2,500 shards): rare/epic skins + perks
- **Perks:** free draft modifiers, free continue, all game speeds, weekly skin roll

## Hybrid UI Architecture

Menu, Store, Battle Pass, Faction Select, Draft, and Game Over screens are rendered as **Preact DOM components** with CSS. The Phaser canvas handles only gameplay. See `src/ui/` for the DOM layer.

## File Structure
```
src/systems/monetization/
  StorePersistence.ts    — localStorage read/write
  StoreDefinitions.ts    — item catalog, pricing, rarity
  ShardWallet.ts         — currency balance, earn/spend
  PlayerInventory.ts     — owned items, equipped skins
  SkinManager.ts         — skin → texture key resolution
  BattlePass.ts          — seasons, XP, challenges, perks
  index.ts               — barrel export

src/ui/
  UIBridge.tsx           — Phaser ↔ DOM bridge
  App.tsx                — Root Preact component
  navigation.ts          — goToMenu() helpers for Phaser scenes
  styles/ui.css          — Dark game theme CSS
  components/ShardBadge.tsx
  screens/
    MenuScreen.tsx
    StoreScreen.tsx
    BattlePassScreen.tsx
    FactionSelectScreen.tsx
    DraftScreen.tsx
    GameOverScreen.tsx
```
