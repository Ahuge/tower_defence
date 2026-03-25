import { TILE_SIZE } from '../../config';
import { Grid, CellType } from '../Grid';
import { EventBus } from '../EventBus';
import { ResourceManager } from '../ResourceManager';
import { RtsUnit } from '../../entities/RtsUnit';
import { TowerType, TOWER_TYPES } from '../../data/TowerTypes';
import { FactionId, FACTIONS } from '../../data/Factions';
import { BuilderUnit } from '../../entities/BuilderUnit';

export type TowerOwner = 'player' | 'cpu';

/** Simplified tower for Base Defence mode */
export interface RtsTower {
  id: string;
  def: TowerType;
  owner: TowerOwner;
  col: number;
  row: number;
  x: number; // pixel center
  y: number;
  hp: number;
  maxHp: number;
  lastFired: number;
  buildProgress: number; // 0→1
  isBuilt: boolean;
  destroyed: boolean;
}

const TOWER_HP_BASE = 300;
/** Cost multiplier for towers in Base Defence (economy is different) */
const COST_MULTIPLIER = 2;
const BUILD_TIME = 8; // seconds

/**
 * Manages towers (static defenses) in Base Defence mode.
 * Simplified version — no trait system, just damage + range + fire rate.
 */
export class TowerDefence {
  readonly towers: RtsTower[] = [];
  private grid: Grid;
  private resources: ResourceManager;
  private events: EventBus;

  constructor(grid: Grid, resources: ResourceManager, events: EventBus) {
    this.grid = grid;
    this.resources = resources;
    this.events = events;
  }

  /** Get tower IDs available for a faction */
  getTowerIds(faction: FactionId): string[] {
    const f = FACTIONS[faction];
    if (!f) return [];
    // Filter out mobile unit towers
    return f.towerIds.filter(id => {
      const t = TOWER_TYPES[id];
      return t && !t.traits.some(tr => tr.id === 'mobile_unit');
    });
  }

  /** Get cost of a tower in Base Defence mode */
  getTowerCost(towerId: string): number {
    const def = TOWER_TYPES[towerId];
    return def ? Math.ceil(def.cost * COST_MULTIPLIER) : 0;
  }

  /** Check if a tower can be placed */
  canPlace(col: number, row: number): boolean {
    return this.grid.canPlaceTower(col, row);
  }

  /**
   * Place a tower (via builder). Spends resources, marks grid.
   * Returns the tower or null if failed.
   */
  placeTower(towerId: string, owner: TowerOwner, col: number, row: number, skipCost: boolean = false): RtsTower | null {
    const def = TOWER_TYPES[towerId];
    if (!def) return null;
    if (!this.canPlace(col, row)) return null;

    const cost = this.getTowerCost(towerId);
    if (!skipCost && owner === 'player') {
      if (!this.resources.canAfford('gold', cost)) return null;
      this.resources.spend('gold', cost);
    }

    this.grid.placeTower(col, row);

    const tower: RtsTower = {
      id: towerId,
      def,
      owner,
      col, row,
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
      hp: Math.floor(TOWER_HP_BASE * 0.1),
      maxHp: TOWER_HP_BASE,
      lastFired: 0,
      buildProgress: 0,
      isBuilt: false,
      destroyed: false,
    };

    this.towers.push(tower);
    this.events.emit('towerPlaced', col, row, towerId);
    return tower;
  }

  /**
   * Update all towers — construction tick + attack enemies in range.
   * Pass separate enemy lists so towers only attack the opposing side.
   */
  update(deltaSec: number, time: number, playerEnemies: RtsUnit[], cpuEnemies: RtsUnit[]): void {
    for (const t of this.towers) {
      if (t.destroyed) continue;

      // Construction
      if (!t.isBuilt) {
        const rate = 1 / BUILD_TIME;
        t.buildProgress = Math.min(1, t.buildProgress + rate * deltaSec);
        t.hp = Math.floor(t.maxHp * (0.1 + 0.9 * t.buildProgress));
        if (t.buildProgress >= 1) {
          t.isBuilt = true;
          t.hp = t.maxHp;
        }
        continue;
      }

      // Player towers attack CPU units, CPU towers attack player units
      const enemies = t.owner === 'player' ? cpuEnemies : playerEnemies;

      const range = t.def.range * TILE_SIZE;
      if (time - t.lastFired < t.def.fireRate) continue;

      let bestTarget: RtsUnit | null = null;
      let bestDist = range;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - t.x;
        const dy = enemy.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestTarget = enemy;
          bestDist = dist;
        }
      }

      if (bestTarget) {
        t.lastFired = time;
        bestTarget.takeDamage(t.def.damage);
      }
    }

    // Clean up destroyed towers
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const t = this.towers[i];
      if (t.destroyed) {
        this.grid.removeTower(t.col, t.row);
        this.towers.splice(i, 1);
      }
    }
  }

  /** Damage a tower. Returns true if destroyed. */
  damageTower(tower: RtsTower, amount: number): boolean {
    tower.hp -= amount;
    if (tower.hp <= 0) {
      tower.hp = 0;
      tower.destroyed = true;
      return true;
    }
    return false;
  }

  /** Get tower at a tile */
  getTowerAt(col: number, row: number): RtsTower | undefined {
    return this.towers.find(t => !t.destroyed && t.col === col && t.row === row);
  }
}
