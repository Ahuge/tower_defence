/**
 * SabotageController — owns the Mechanical M10 finale state.
 *
 * v1 scope (this file):
 *   - Place destructible CPU towers, generators, and the throne from
 *     the map's `destructibleTowers` field. Generators own a list of
 *     linked CPU tower cells; the throne starts invulnerable.
 *   - Watch generator deaths each frame; on a generator's killing blow,
 *     expire every tower at one of its `linkedTowers` cells (no gold
 *     or XP reward — they're powered down, not killed).
 *   - Watch "all generators dead": flip throne._invulnerable = false so
 *     the player's units can finish him.
 *   - Watch the throne's death: fire onWin exactly once.
 *
 * v2 (follow-up commits): Workshop building, Raider squad, hero
 * spawn/respawn, hero economy.
 *
 * Design parallels FinaleController (Arcane M10) but drops the
 * Arcane-specific summoning-circle + charge-meter machinery. Tower
 * destructibility, _expired cleanup, and ownerIndex stamping are the
 * shared PRD-06 bedrock both controllers ride on.
 */

import type { Tower } from '../../entities/Tower';
import type { TowerManager } from '../TowerManager';
import { getTowerType } from '../../data/TowerTypes';
import { Raider, type RaiderTarget } from '../../entities/Raider';
import { Workshop } from './Workshop';
import type { UpgradeKind } from './WorkshopUpgrades';

export const CPU_INDEX_SABOTAGE = 99;

export interface SabotageRules {
  /** Default HP applied to a destructible CPU tower whose spec omits hp. */
  cpuTowerHpDefault?: number;
  /** ownerIndex stamped on every CPU tower placed by this controller.
   *  Defaults to 99 (matches FinaleController's CPU_INDEX). */
  cpuTowerOwnerIndex?: number;
}

export interface SabotageSetupArgs {
  rules: SabotageRules;
  destructibleTowers: {
    col: number;
    row: number;
    towerId: string;
    hp: number;
    isGenerator?: boolean;
    linkedTowers?: { col: number; row: number }[];
    isThrone?: boolean;
  }[];
  /** Workshop placement. The Workshop is the player's barracks — it
   *  trains Raiders and owns the global upgrade tiers. Optional only
   *  for tests; production callers always supply one. */
  workshop?: { col: number; row: number; pixelX: number; pixelY: number };
  towerMgr: TowerManager;
  /** Fired exactly once when the throne's HP reaches 0. */
  onWin?: () => void;
  /** Fired the first time every generator on the map is dead, just
   *  before the throne becomes vulnerable. The HUD/event log can use
   *  this to telegraph the phase shift. */
  onThroneVulnerable?: () => void;
  /** Fired each time a Raider is successfully trained. The host
   *  scene uses this to attach a sprite + register input handlers.
   *  Pure-logic tests can ignore it. */
  onRaiderSpawned?: (raider: Raider) => void;
  /** Fired each time a Raider dies (alive flag flips false). */
  onRaiderDied?: (raider: Raider) => void;
}

export class SabotageController {
  private rules: SabotageRules;
  private towerMgr: TowerManager;
  private cpuTowers: Tower[] = [];
  private generators: Tower[] = [];
  /** Generators whose linked-tower kill cascade has already been
   *  processed. Prevents the cascade firing twice if update() runs
   *  multiple times after death. */
  private drainedGenerators = new WeakSet<Tower>();
  private throne: Tower | null = null;
  private throneVulnerableFired = false;
  private winFired = false;
  private onWin?: () => void;
  private onThroneVulnerable?: () => void;
  private onRaiderSpawned?: (raider: Raider) => void;
  private onRaiderDied?: (raider: Raider) => void;

  /** Workshop instance — null when no workshop spec was supplied (tests
   *  for the win condition only). */
  private workshop: Workshop | null = null;
  private workshopPixel: { x: number; y: number } | null = null;

  /** Live raiders. Order is spawn order. Includes recently-dead so
   *  the host scene can read the squad after-the-fact; pruned each
   *  update tick. */
  private raiders: Raider[] = [];
  private nextRaiderId = 1;

  constructor(args: SabotageSetupArgs) {
    this.rules = args.rules;
    this.towerMgr = args.towerMgr;
    this.onWin = args.onWin;
    this.onThroneVulnerable = args.onThroneVulnerable;
    this.onRaiderSpawned = args.onRaiderSpawned;
    this.onRaiderDied = args.onRaiderDied;

    if (args.workshop) {
      this.workshop = new Workshop({ col: args.workshop.col, row: args.workshop.row });
      this.workshopPixel = { x: args.workshop.pixelX, y: args.workshop.pixelY };
    }

    const ownerIndex = this.rules.cpuTowerOwnerIndex ?? CPU_INDEX_SABOTAGE;
    const defaultHp = this.rules.cpuTowerHpDefault ?? 600;

    for (const spec of args.destructibleTowers) {
      try {
        const towerType = getTowerType(spec.towerId);
        const result = this.towerMgr.placeTower(
          spec.col, spec.row, towerType,
          [], () => [],
          true,
        );
        if (!result) continue;
        const t = result.tower;
        t.destructible = true;
        t.ownerIndex = ownerIndex;
        t.maxHp = spec.hp ?? defaultHp;
        t.hp = t.maxHp;
        if (spec.isGenerator) {
          t.isGenerator = true;
          t.generatorLinkedCells = spec.linkedTowers ?? [];
          this.generators.push(t);
        }
        if (spec.isThrone) {
          t.isThrone = true;
          t._invulnerable = true;
          this.throne = t;
        }
        this.cpuTowers.push(t);
      } catch (err) {
        console.warn(`[SabotageController] failed to place ${spec.towerId} at ${spec.col},${spec.row}:`, err);
      }
    }
  }

  /** Per-frame tick.
   *
   *  - `now` / `deltaMs` — Phaser scene clock + frame time.
   *  - `creeps` / `cpuTowers` — current alive hostiles each raider may
   *    auto-target. The controller filters internally; callers can
   *    pass the full lists.
   *
   *  Both args are optional for win-condition-only tests. */
  update(now = 0, deltaMs = 0, creeps: RaiderTarget[] = [], cpuTargets: RaiderTarget[] = []): void {
    // Drain any newly-dead generators we haven't processed yet. Death
    // is detected by hp<=0 (Tower.takeDamage drives it to 0 and sets
    // _expired); the WeakSet prevents double-firing the cascade.
    for (const gen of this.generators) {
      if ((gen.hp ?? 1) > 0) continue;
      if (this.drainedGenerators.has(gen)) continue;
      this.drainedGenerators.add(gen);
      for (const cell of gen.generatorLinkedCells ?? []) {
        const target = this.cpuTowers.find(t => t.col === cell.col && t.row === cell.row && !(t as { _expired?: boolean })._expired);
        if (!target) continue;
        (target as { _expired?: boolean })._expired = true;
      }
    }

    // Throne becomes mortal once every generator is gone.
    if (!this.throneVulnerableFired && this.throne && this._allGeneratorsDead()) {
      this.throneVulnerableFired = true;
      this.throne._invulnerable = false;
      this.onThroneVulnerable?.();
    }

    // Tick the raider squad. Hostiles list = alive wave creeps + alive
    // CPU defender towers. Cleanup dead raiders + fire the death
    // callback once each.
    if (this.raiders.length > 0) {
      const liveTargets: RaiderTarget[] = [];
      for (const t of cpuTargets) if (t.alive) liveTargets.push(t);
      for (const c of creeps) if (c.alive) liveTargets.push(c);
      const survivors: Raider[] = [];
      for (const r of this.raiders) {
        if (!r.alive) {
          this.onRaiderDied?.(r);
          continue;
        }
        r.update(now, deltaMs, liveTargets);
        if (!r.alive) this.onRaiderDied?.(r);
        else survivors.push(r);
      }
      this.raiders = survivors;
    }

    // Win = throne destroyed.
    if (!this.winFired && this.throne && ((this.throne as { _expired?: boolean })._expired || (this.throne.hp ?? 1) <= 0)) {
      this.winFired = true;
      this.onWin?.();
    }
  }

  // ─── Workshop / Raider API ─────────────────────────────────────

  getWorkshop(): Workshop | null { return this.workshop; }
  getRaiders(): Raider[] { return this.raiders; }

  /** Train a Raider via the Workshop. Returns true on success.
   *  `debit(amount)` is the player's gold debit callback; the
   *  Workshop internally enforces cooldown + cost. */
  trainRaider(now: number, debit: (amount: number) => boolean): boolean {
    if (!this.workshop || !this.workshopPixel) return false;
    return this.workshop.tryTrain(now, debit, (stats) => {
      const raider = new Raider({
        id: this.nextRaiderId++,
        x: this.workshopPixel!.x,
        y: this.workshopPixel!.y,
        hp: stats.hp,
        attack: stats.attack,
        speed: stats.speed,
      });
      this.raiders.push(raider);
      this.onRaiderSpawned?.(raider);
    });
  }

  /** Buy the next tier in `kind`. Returns true on success. */
  buyUpgrade(kind: UpgradeKind, debit: (amount: number) => boolean): boolean {
    if (!this.workshop) return false;
    return this.workshop.tryUpgrade(kind, debit);
  }

  /** Set the manual target for a single raider. The controller
   *  surface lets GameScene route a click on a CPU tower / creep
   *  through here without exposing the Raider list directly. */
  setRaiderTarget(raider: Raider, target: RaiderTarget | null): void {
    if (!this.raiders.includes(raider)) return;
    raider.setManualTarget(target);
  }

  /** Find a raider by id (UI / click hit testing). */
  findRaiderById(id: number): Raider | null {
    return this.raiders.find(r => r.id === id) ?? null;
  }

  /** True iff every generator placed at scene init is dead. Used by
   *  the throne-vulnerability gate; exposed so HUD code can render
   *  "X / N generators down" without poking internals. */
  getAliveGeneratorCount(): number {
    return this.generators.filter(g => !(g as { _expired?: boolean })._expired && (g.hp ?? 0) > 0).length;
  }

  getTotalGeneratorCount(): number {
    return this.generators.length;
  }

  getThrone(): Tower | null {
    return this.throne;
  }

  private _allGeneratorsDead(): boolean {
    return this.getAliveGeneratorCount() === 0;
  }
}
