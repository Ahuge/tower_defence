import * as Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridX, gridY, gridLeftX, pixelToCol } from '../config';
import { Grid, CellType } from './Grid';
import { findPath, PathPoint } from './Pathfinding';
import { EventBus } from './EventBus';
import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventLog } from '../ui/EventLog';
import { getTowerType, TowerType } from '../data/TowerTypes';
import { DraftModifier } from '../data/DraftModifiers';
import { UpdateContext, removeTrait } from './traits/Trait';
import { Tower } from '../entities/Tower';
import { Creep } from '../entities/Creep';

/**
 * Manages tower lifecycle: placement, selling, upgrades, trait updates,
 * expired/decayed tower cleanup, and wave-end tower processing.
 */
export class TowerManager {
  towers: Tower[] = [];
  private scene: Phaser.Scene;
  grid: Grid;
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventLog: EventLog;
  private eventBus: EventBus;
  private modifier: DraftModifier | null;
  totalTowersBuilt: number = 0;
  /** Circle Co-op gold router: called with per-hit gold earned by a
   *  bot-owned tower (gold_on_hit / jackpot / etc.) so it flows into
   *  the bot's private EconomyManager instead of the human's shared
   *  pool. Null outside co-op — TowerManager falls back to the
   *  shared economy for every tower. */
  botGoldRouter: ((ownerIndex: number, amount: number) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    grid: Grid,
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventLog: EventLog,
    eventBus: EventBus,
    modifier: DraftModifier | null,
  ) {
    this.scene = scene;
    this.grid = grid;
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventLog = eventLog;
    this.eventBus = eventBus;
    this.modifier = modifier;
  }

  /** Place a tower. Returns the tower if successful, null if blocked. */
  /**
   * Place a tower on the grid. If `free` is true, skip economy checks
   * (used for remote tower placements in circle co-op).
   */
  placeTower(col: number, row: number, towerType: TowerType, allPaths: (PathPoint[] | null)[], recalcPaths: () => (PathPoint[] | null)[], free: boolean = false): { tower: Tower; pathsChanged: boolean } | null {
    const isMobile = towerType.traits.some(t => t.id === 'mobile_unit');
    const cost = this.getEffectiveCost(towerType.cost);

    if (!free && !this.economy.canAfford(cost)) return null;

    if (isMobile) {
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
      const cell = this.grid.cells[row][col];
      if (cell === CellType.Blocked) return null;

      if (!free) {
        this.economy.spend(cost);
        this.statsTracker.recordGoldSpent(cost);
      }
      const tower = new Tower(this.scene, col, row, towerType);
      tower.isMobile = true;
      this.applyModifierTraits(tower);
      this.towers.push(tower);
      this.totalTowersBuilt++;
      this.eventLog.towerBuilt(towerType.name, cost);
      this.statsTracker.recordTowerBuilt(towerType.id);
      return { tower, pathsChanged: false };
    }

    // Normal tower
    if (!this.grid.canPlaceTower(col, row)) return null;

    this.grid.placeTower(col, row);
    const newPaths = recalcPaths();
    const anyBlocked = newPaths.some(p => p === null);

    if (anyBlocked) {
      // Rollback: restore the grid AND rerun recalc so the scene's
      // cached allPaths / currentPath aren't left pointing at the
      // "would-have-been-blocked" state. Without this second recalc,
      // a rejected bot placement would poison currentPath = null and
      // permanently break the Next Wave button even though the grid
      // was successfully restored.
      this.grid.removeTower(col, row);
      recalcPaths();
      return null;
    }

    if (!free) {
      this.economy.spend(cost);
      this.statsTracker.recordGoldSpent(cost);
    }
    const tower = new Tower(this.scene, col, row, towerType);
    this.applyModifierTraits(tower);
    this.towers.push(tower);
    this.totalTowersBuilt++;
    this.eventLog.towerBuilt(towerType.name, cost);
    this.statsTracker.recordTowerBuilt(towerType.id);
    this.eventBus.emit('towerPlaced', col, row, towerType.id);
    return { tower, pathsChanged: true };
  }

  /** Sell tower at grid position. Returns refund amount or 0.
   *  `free=true` skips the shared-economy refund (and the event-log
   *  line) — used when a CPU bot is paying itself from its own
   *  EconomyManager, same pattern as `placeTower(free=true)`. */
  sellTower(col: number, row: number, free: boolean = false): { tower: Tower; refund: number } | null {
    const idx = this.towers.findIndex(t => t.col === col && t.row === row);
    if (idx === -1) return null;

    const tower = this.towers[idx];
    const refund = tower.getSellValue();
    if (!free) {
      this.economy.addGold(refund);
      this.eventLog.towerSold(tower.typeDef.name, refund);
    }
    tower.destroy();
    this.towers.splice(idx, 1);

    if (!tower.isMobile) {
      this.grid.removeTower(col, row);
      this.eventBus.emit('towerSold', col, row);
    }

    return { tower, refund };
  }

  /** Find tower at grid position */
  getTowerAt(col: number, row: number): Tower | undefined {
    return this.towers.find(t => t.col === col && t.row === row);
  }

  /** Per-frame tower updates: reset auras, run traits, collect gold/damage, fire */
  updateTowers(time: number, delta: number, creeps: Creep[], justDiedCreeps: Creep[] = []): void {
    const traitCtx: UpdateContext = {
      allTowers: this.towers,
      allCreeps: creeps,
      justDiedCreeps,
      time,
      delta,
    };

    // Reset harmonic aura accumulators + conduit link flags. Reset
    // range to the tower's *current-level* base — using typeDef.range
    // here would silently downgrade linear-upgraded towers back to L1
    // range every frame they're under a Reach.
    for (const tower of this.towers) {
      // Strip the previous frame's conduit-linked trait — the
      // conduit_link handler below re-stamps it on towers that are
      // still in range. The trait carries srcX/srcY for the overlay
      // line back to the conduit source.
      removeTrait(tower.traits, 'conduit_linked');
      for (const trait of tower.traits) {
        if (trait.id === '_harmonic_damage' || trait.id === '_harmonic_rate' || trait.id === '_harmonic_range') {
          // multiplicative identity — every aura source compounds onto
          // this fresh 1.0 each frame (damage/rate/range buffs are now
          // value multipliers, not additive bonuses)
          trait.bonus = 1;
          if (trait.id === '_harmonic_range') {
            tower.range = tower._basePxRange;
          }
        } else if (trait.id === '_harmonic_crit') {
          // chance asymptotes via 1 - (1-c)*(1-s); identity for that
          // recurrence is c=0, not 1
          trait.chance = 0;
        }
      }
    }

    // Run trait updates (auras, buffs, TTL)
    for (const tower of this.towers) {
      tower.runTraitUpdates(traitCtx);
    }

    // Second pass: apply accumulated _harmonic_range bonuses to
    // tower.range. Done here, not in the trait handler, because aura
    // sources contribute their bonus during pass 1 — if a target tower
    // ran its update before its source contributed (build-order
    // dependent), it would apply bonus=0 and skip the buff for the
    // whole frame. Doing it after pass 1 guarantees every contribution
    // is in before we read it.
    for (const tower of this.towers) {
      for (const trait of tower.traits) {
        if (trait.id === '_harmonic_range') {
          tower.range = tower._basePxRange * (trait.bonus ?? 1);
        }
      }
    }

    // Collect gold and damage stats
    for (const tower of this.towers) {
      if (tower.goldEarned > 0) {
        // Circle Co-op: bot-owned towers route their per-hit gold
        // (gold_on_hit / jackpot) to the bot's private economy
        // instead of the human's shared pool. Stats still track
        // the tower-level totals for the end-of-match screen.
        if (tower.ownerIndex !== undefined && this.botGoldRouter) {
          this.botGoldRouter(tower.ownerIndex, tower.goldEarned);
        } else {
          this.economy.addGold(tower.goldEarned);
          this.statsTracker.recordGoldEarned(tower.goldEarned);
        }
        this.statsTracker.recordTowerGold(tower.typeId, tower.goldEarned);
        tower.goldEarned = 0;
      }
      if (tower.damageDealt > 0) {
        this.statsTracker.recordDamage(tower.typeId, tower.damageDealt);
        this.statsTracker.recordHitStats(tower.typeId, tower.hitStatsAccum);
        tower.damageDealt = 0;
        for (const key of Object.keys(tower.hitStatsAccum)) {
          tower.hitStatsAccum[key] = 0;
        }
      }
    }

    // Fire and update projectiles
    for (const tower of this.towers) {
      tower.update(time, delta, creeps);
    }

    // Track alive time for DPS calc
    for (const tower of this.towers) {
      const ts = this.statsTracker.stats.towerStats[tower.typeId];
      if (ts) ts.timeAlive += delta;
    }
  }

  /** Clean up expired towers (kamikaze, expired Imps, etc.) */
  cleanupExpired(): void {
    let destructibleDied = false;
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const tower = this.towers[i];
      if ((tower as any)._expired) {
        // M10 finale: track if a destructible (CPU) tower died so the
        // caller can recalc paths once after the loop. Creeps in flight
        // need to re-route through cleared cells (feedback-loop design).
        if (tower.destructible && !tower.isMobile) destructibleDied = true;
        tower.destroy();
        if (!tower.isMobile) {
          this.grid.removeTower(tower.col, tower.row);
        }
        this.towers.splice(i, 1);
      }
    }
    if (destructibleDied) this._lastDestructibleDeathFlag = true;
  }

  /** M10 finale: read-and-clear flag set by cleanupExpired when a
   *  destructible tower dies this frame. GameScene polls this and
   *  recalcs paths + reroutes alive creeps. */
  private _lastDestructibleDeathFlag: boolean = false;
  consumeDestructibleDeathFlag(): boolean {
    if (this._lastDestructibleDeathFlag) {
      this._lastDestructibleDeathFlag = false;
      return true;
    }
    return false;
  }

  /** Process wave-end tower effects: mobile reset, expiry, decay, life gain, leak absorb */
  onWaveEnd(): number {
    let livesGained = 0;

    for (const tower of this.towers) {
      // Snap mobile units home
      if (tower.isMobile) {
        tower.x = tower.homeX;
        tower.y = tower.homeY;
        tower.drawTower();
      }

      for (const trait of tower.traits) {
        // Infernal: expires_after_waves
        if (trait.id === 'expires_after_waves') {
          if (trait._wavesRemaining === undefined) trait._wavesRemaining = trait.waves ?? 4;
          trait._wavesRemaining--;
          if (trait._wavesRemaining <= 0) {
            (tower as any)._expired = true;
            this.eventLog.gameMessage(`${tower.typeDef.name} expired!`);
          }
        }
        // Infernal: decay_per_wave
        if (trait.id === 'decay_per_wave') {
          const decayPercent = trait.decayPercent ?? 0.15;
          tower.damage = Math.max(1, Math.round(tower.damage * (1 - decayPercent)));
          tower.drawTower();
        }
        // Celestial: leak_absorb recharge — refills both the Standard binary
        // charge and (if HD set it up) the damage-shield pool.
        if (trait.id === 'leak_absorb') {
          if (trait._rechargeCounter === undefined) trait._rechargeCounter = 0;
          trait._rechargeCounter++;
          if (trait._rechargeCounter >= (trait.rechargeWaves ?? 10)) {
            trait._charges = Math.min((trait._charges ?? 0) + 1, trait.maxCharges ?? 1);
            if (trait._shieldHpMax !== undefined) {
              trait._shieldHp = trait._shieldHpMax;
            }
            trait._rechargeCounter = 0;
          }
        }
      }

      // Celestial: life_on_kill
      if ((tower as any)._livesEarned > 0) {
        livesGained += (tower as any)._livesEarned;
        this.eventLog.gameMessage(`+${(tower as any)._livesEarned} life from ${tower.typeDef.name}!`);
        (tower as any)._livesEarned = 0;
      }
    }

    return livesGained;
  }

  /** Brood Mother: spawn temporary swarmlings */
  spawnBroodMotherSwarmlings(): void {
    const swarmlingType = getTowerType('alien_swarmling');
    for (const tower of this.towers) {
      const trait = tower.traits.find(t => t.id === 'spawn_swarmlings_per_wave');
      if (!trait) continue;
      const count = trait.count ?? 2;
      const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
      let spawned = 0;
      for (const [dc, dr] of offsets) {
        if (spawned >= count) break;
        const sc = tower.col + dc;
        const sr = tower.row + dr;
        if (sc < 0 || sc >= GRID_COLS || sr < 0 || sr >= GRID_ROWS) continue;
        const swarmling = new Tower(this.scene, sc, sr, swarmlingType);
        swarmling.isMobile = true;
        swarmling.traits.push({ id: 'expires_after_waves', waves: 1, _wavesRemaining: 1 });
        this.towers.push(swarmling);
        spawned++;
      }
      if (spawned > 0) {
        this.eventLog.gameMessage(`Brood Mother spawned ${spawned} Swarmlings!`);
      }
    }
  }

  getEffectiveCost(baseCost: number): number {
    return Math.round(baseCost * (this.modifier?.costMult ?? 1));
  }

  private applyModifierTraits(tower: Tower): void {
    if (this.modifier) {
      for (const t of this.modifier.towerTraits) {
        tower.traits.push({ ...t });
      }
    }
  }
}
