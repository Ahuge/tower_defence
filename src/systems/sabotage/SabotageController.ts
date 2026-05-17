/**
 * SabotageController — owns the Mechanical M10 finale state.
 *
 * Places destructible CPU towers, generators, and the throne from the
 * map's `destructibleTowers` field. Generators own a list of linked
 * CPU tower cells (death cascades + powers them down); the throne
 * starts invulnerable and only flips mortal once every generator is
 * dead.
 *
 * Owns the Workshop + the Raider squad. Workshop trains Raiders on a
 * gold + cooldown gate, with three global upgrade tiers stamped at
 * spawn time. Per-frame `update()` walks each Raider against the
 * current hostile list (alive CPU creeps + alive CPU towers), prunes
 * dead raiders, and fires win callback when the throne dies.
 *
 * Parallels FinaleController (Arcane M10) but drops the Arcane-
 * specific summoning-circle + charge-meter machinery — the player
 * trains a squad here rather than charging a hero. Tower
 * destructibility, _expired cleanup, and ownerIndex stamping are the
 * shared PRD-06 bedrock both controllers ride on.
 */

import type { Tower } from '../../entities/Tower';
import type { TowerManager } from '../TowerManager';
import { Raider, type RaiderTarget } from '../../entities/Raider';
import { Workshop, type GoldSpender, type EnqueueResult } from './Workshop';
import type { UpgradeKind } from './WorkshopUpgrades';
import { placeCpuTowers, type BaseCpuTowerSpec } from '../finale/cpuPlacement';
import { DestructibleStructure } from '../../entities/DestructibleStructure';
import {
  getDestructibleStructureDef,
  type DestructibleStructurePlacement,
} from '../../data/DestructibleStructures';
import { Grid, CellType } from '../Grid';
import {
  GENERATOR_TEXTURE,
  generatorFrameForHp,
} from './SabotageAssets';
import type * as Phaser from 'phaser';

export const CPU_INDEX_SABOTAGE = 99;

export interface SabotageRules {
  /** Default HP applied to a destructible CPU tower whose spec omits hp. */
  cpuTowerHpDefault?: number;
  /** ownerIndex stamped on every CPU tower placed by this controller.
   *  Defaults to 99 (matches FinaleController's CPU_INDEX). */
  cpuTowerOwnerIndex?: number;
  /** Workshop train cost (gold). Default 150g. */
  workshopTrainCost?: number;
  /** Workshop cooldown between trains (ms). Default 5000. */
  workshopTrainCooldownMs?: number;
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
    /** Pre-PRD06 placeholder — kept for back-compat with tests that
     *  still place the throne as a destructibleTowers entry. New
     *  missions go through `destructibleStructures` instead. */
    isThrone?: boolean;
  }[];
  /** PRD-06 destructibleStructures — the throne goes here for Mech
   *  M10. Empty / undefined when no boss structure is placed via
   *  the 3×3 footprint path. */
  destructibleStructures?: DestructibleStructurePlacement[];
  /** Scene reference — needed when destructibleStructures is non-empty
   *  so the DestructibleStructure constructor can attach its sprite. */
  scene?: Phaser.Scene;
  /** Grid reference — needed for structure-placement noBuild/Blocked
   *  bookkeeping (mirrors FinaleController). */
  grid?: Grid;
  /** Workshop placement. The Workshop trains Raiders and owns the
   *  global upgrade tiers. Required — every production mission has
   *  one and the controller is meaningless without it. */
  workshop: { col: number; row: number; pixelX: number; pixelY: number };
  /** Gold-spending hook. EconomyManager satisfies the interface
   *  directly; tests can pass a 3-line stub. */
  economy: GoldSpender;
  towerMgr: TowerManager;
  /** Fired exactly once when the throne's HP reaches 0. */
  onWin?: () => void;
  /** Fired exactly once just before `onWin`, on the same frame the
   *  throne dies. Separate callback so subscribers wanting the lower-
   *  level signal can run before the win handler swaps scenes. */
  onThroneKilled?: () => void;
  /** Fired the first time every generator on the map is dead, just
   *  before the throne becomes vulnerable. The HUD/event log can use
   *  this to telegraph the phase shift. */
  onThroneVulnerable?: () => void;
  /** Fired each time a generator's HP reaches 0 (drain detected),
   *  before the linked-tower cascade runs. `idx` is the generator's
   *  position in the controller's init-order list. */
  onGeneratorKilled?: (idx: number) => void;
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
  private throne: Tower | null = null;
  /** PRD-06 throne — when the map places Voss via destructibleStructures,
   *  the throne lives here as a 3×3 DestructibleStructure instead of
   *  the legacy single-cell Tower path. The two are mutually
   *  exclusive; whichever the map uses, that one is non-null. */
  private throneStructure: DestructibleStructure | null = null;
  private cpuStructures: DestructibleStructure[] = [];
  private throneVulnerableFired = false;
  private winFired = false;
  private onWin?: () => void;
  private onThroneKilled?: () => void;
  private onThroneVulnerable?: () => void;
  private onGeneratorKilled?: (idx: number) => void;
  private onRaiderSpawned?: (raider: Raider) => void;
  private onRaiderDied?: (raider: Raider) => void;

  private readonly workshop: Workshop;
  private readonly workshopPixel: { x: number; y: number };

  /** Live raiders. Order is spawn order. Includes recently-dead so
   *  the host scene can read the squad after-the-fact; pruned each
   *  update tick. */
  private raiders: Raider[] = [];
  private nextRaiderId = 1;
  /** ownerIndex used for "is this creep CPU-side hostile?" filter.
   *  Cached at construction so the per-frame raider tick doesn't
   *  re-resolve from rules. */
  private readonly cpuOwnerIndex: number;
  /** Scratch array reused each frame for the raider targeting list,
   *  to avoid the GC cost of allocating a fresh array per tick when
   *  raiders are alive. */
  private readonly _liveTargetScratch: RaiderTarget[] = [];

  constructor(args: SabotageSetupArgs) {
    this.rules = args.rules;
    this.towerMgr = args.towerMgr;
    this.onWin = args.onWin;
    this.onThroneKilled = args.onThroneKilled;
    this.onThroneVulnerable = args.onThroneVulnerable;
    this.onGeneratorKilled = args.onGeneratorKilled;
    this.onRaiderSpawned = args.onRaiderSpawned;
    this.onRaiderDied = args.onRaiderDied;
    this.cpuOwnerIndex = this.rules.cpuTowerOwnerIndex ?? CPU_INDEX_SABOTAGE;

    this.workshop = new Workshop({
      col: args.workshop.col,
      row: args.workshop.row,
      economy: args.economy,
      trainCost: this.rules.workshopTrainCost,
      trainCooldownMs: this.rules.workshopTrainCooldownMs,
    });
    this.workshopPixel = { x: args.workshop.pixelX, y: args.workshop.pixelY };

    const ownerIndex = this.rules.cpuTowerOwnerIndex ?? CPU_INDEX_SABOTAGE;
    const defaultHp = this.rules.cpuTowerHpDefault ?? 600;
    for (const { spec, tower } of placeCpuTowers(this.towerMgr, args.destructibleTowers, ownerIndex, defaultHp)) {
      if (spec.isGenerator) {
        tower.isGenerator = true;
        tower.generatorLinkedCells = spec.linkedTowers ?? [];
        // Generators are inert HP bags — never fire. Block the
        // standard updateTowers pipeline from picking them via the
        // existing _disabledRemaining channel (Infinity stays Infinity
        // through the per-frame `Math.max(0, x - delta/1000)` decay).
        tower._disabledRemaining = Infinity;
        // Swap the tower's mech_mortar placeholder sprite to the
        // bespoke generator sheet. Frame 0 = full HP; SabotageRender
        // advances the frame as the generator takes damage.
        tower.sprite?.setTexture(GENERATOR_TEXTURE, generatorFrameForHp(1));
        this.generators.push(tower);
      }
      if (spec.isThrone) {
        tower.isThrone = true;
        tower._invulnerable = true;
        this.throne = tower;
      }
      this.cpuTowers.push(tower);
    }

    // Place destructibleStructures (PRD-06 path). The throne for Mech
    // M10 lives here as a 3×3 boss structure with proper damage
    // frames + HP-bar handling delegated to DestructibleStructure.
    if (args.destructibleStructures && args.scene && args.grid) {
      for (const placement of args.destructibleStructures) {
        try {
          const def = getDestructibleStructureDef(placement.id);
          const structure = new DestructibleStructure({
            scene: args.scene,
            placement,
            embeddedTower: null,
            factionId: 'mechanical',
            ownerIndex,
          });
          this.cpuStructures.push(structure);
          // Block every cell in the WxH footprint. Without this,
          // creeps would pathfind THROUGH the throne.
          for (const cell of structure.getOccupiedCells()) {
            if (cell.row < 0 || cell.row >= args.grid.cells.length) continue;
            if (cell.col < 0 || cell.col >= args.grid.cells[0].length) continue;
            args.grid.cells[cell.row][cell.col] = CellType.Blocked;
          }
          // The throne starts invulnerable while any generator is
          // alive — flipped to false in update() once the cascade
          // brings them all down. This mirrors the destructibleTowers
          // throne path that the structures path is replacing.
          if (placement.isMissionWinTarget) {
            structure.invulnerable = true;
            this.throneStructure = structure;
          }
        } catch (err) {
          console.warn(`[SabotageController] failed to place structure ${placement.id}:`, err);
        }
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
    // Workshop queue tick — dequeue at most one Raider per frame when
    // the cooldown elapses. Stats are stamped at SPAWN time from the
    // current upgrade levels, not enqueue time, so a queue placed
    // before an upgrade benefits from the upgrade once it lands.
    this.workshop.tickQueue(now, (stats) => this._spawnRaider(stats));

    // Drain any newly-dead generators we haven't processed yet. Death
    // is detected by hp<=0 (Tower.takeDamage drives it to 0 and sets
    // _expired); the per-tower _generatorDrained flag prevents double-
    // firing the cascade across multiple updates after death.
    for (let i = 0; i < this.generators.length; i++) {
      const gen = this.generators[i];
      if ((gen.hp ?? 1) > 0) continue;
      if (gen._generatorDrained) continue;
      gen._generatorDrained = true;
      this.onGeneratorKilled?.(i);
      for (const cell of gen.generatorLinkedCells ?? []) {
        const target = this.cpuTowers.find(t => t.col === cell.col && t.row === cell.row && !t._expired);
        if (!target) continue;
        target._expired = true;
      }
    }

    // Throne becomes mortal once every generator is gone. Handles both
    // the legacy single-cell Tower path AND the PRD-06 structure path
    // — whichever the map uses, the controller flips its invulnerable
    // flag in lockstep.
    if (!this.throneVulnerableFired && this._allGeneratorsDead()) {
      const hasThrone = this.throne !== null || this.throneStructure !== null;
      if (hasThrone) {
        this.throneVulnerableFired = true;
        if (this.throne) this.throne._invulnerable = false;
        if (this.throneStructure) this.throneStructure.invulnerable = false;
        this.onThroneVulnerable?.();
      }
    }

    // Tick destructible structures (damage-frame swap + HP-bar
    // redraw). Win-condition check below scans both Tower-based and
    // Structure-based throne.
    for (const s of this.cpuStructures) {
      s.draw();
    }

    // CPU defender towers attack raiders. Standard tower update runs
    // first and handles CPU-vs-creep sends (via ownership-based
    // findTarget); raiders aren't in the creeps list, so we apply
    // damage in a parallel pass here. Only fires if the tower hasn't
    // already shot this tick — if it just hit a send, skip.
    this._cpuTowersAttackRaiders(now);

    // Tick the raider squad. Hostiles list = alive wave creeps
    // (CPU-team only — player sends should be safe) + alive CPU
    // defender towers. Reuse the scratch array to avoid per-frame
    // GC pressure at 60Hz × N raiders.
    if (this.raiders.length > 0) {
      this._liveTargetScratch.length = 0;
      const liveTargets = this._liveTargetScratch;
      for (const t of cpuTargets) if (t.alive) liveTargets.push(t);
      for (const c of creeps) {
        if (!c.alive) continue;
        // Skip player-sent creeps. CPU-team default is 99; player sends
        // carry the spawning player slot (0+). Treat 'no ownerIndex' as
        // hostile so test mocks don't have to set it.
        const owner = (c as { ownerIndex?: number }).ownerIndex;
        if (owner !== undefined && owner !== this.cpuOwnerIndex) continue;
        liveTargets.push(c);
      }
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

    // Win = throne destroyed. Handles both paths — Tower throne dies
    // when _expired or hp<=0; Structure throne dies when !alive.
    if (!this.winFired) {
      const throneDeadTower = this.throne && (this.throne._expired || (this.throne.hp ?? 1) <= 0);
      const throneDeadStructure = this.throneStructure && !this.throneStructure.alive;
      if (throneDeadTower || throneDeadStructure) {
        this.winFired = true;
        this.onThroneKilled?.();
        this.onWin?.();
      }
    }
  }

  // ─── Workshop / Raider API ─────────────────────────────────────

  getWorkshop(): Workshop { return this.workshop; }
  getRaiders(): Raider[] { return this.raiders; }
  /** Live generator list (includes recently-dead — SabotageRender
   *  needs them for damage-frame indexing until the next cleanup). */
  getGenerators(): Tower[] { return this.generators; }

  /** Spawn one Raider via the Workshop's stats. Pure helper — no
   *  cooldown / gold check, the caller (`trainRaider`, `tickQueue`)
   *  is responsible for gating. */
  private _spawnRaider(stats: import('./WorkshopUpgrades').RaiderStats): void {
    const raider = new Raider({
      id: this.nextRaiderId++,
      x: this.workshopPixel.x,
      y: this.workshopPixel.y,
      hp: stats.hp,
      attack: stats.attack,
      speed: stats.speed,
    });
    this.raiders.push(raider);
    this.onRaiderSpawned?.(raider);
  }

  /** Train a Raider via the Workshop. Returns true on success. The
   *  Workshop internally enforces cooldown + gold cost via the
   *  injected EconomyManager.
   *
   *  Kept for tests that exercise the immediate-train path. The
   *  HUD-driven training path goes through enqueueRaider + tickQueue. */
  trainRaider(now: number): boolean {
    return this.workshop.tryTrain(now, (stats) => this._spawnRaider(stats));
  }

  /** Pay gold up front and queue a Raider build. Returns the outcome
   *  so the HUD can render "queued" / "queue full" / "broke" feedback
   *  distinctly. The actual Raider spawn happens later inside the
   *  per-frame queue tick when the cooldown elapses. */
  enqueueRaider(): EnqueueResult {
    return this.workshop.tryEnqueue();
  }

  /** Buy the next tier in `kind`. Returns true on success. */
  buyUpgrade(kind: UpgradeKind): boolean {
    return this.workshop.tryUpgrade(kind);
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

  /** Find a live CPU defender tower at the given cell. Scans the
   *  controller's own list instead of letting GameScene walk the
   *  global tower pool. */
  findCpuTowerAt(col: number, row: number): Tower | null {
    return this.cpuTowers.find(t => t.col === col && t.row === row && !t._expired) ?? null;
  }

  /** True iff every generator placed at scene init is dead. Used by
   *  the throne-vulnerability gate; exposed so HUD code can render
   *  "X / N generators down" without poking internals. */
  getAliveGeneratorCount(): number {
    return this.generators.filter(g => !g._expired && (g.hp ?? 0) > 0).length;
  }

  getTotalGeneratorCount(): number {
    return this.generators.length;
  }

  getThrone(): Tower | null {
    return this.throne;
  }

  /** PRD-06 throne (Voss as a 3×3 destructibleStructure). Either this
   *  OR `getThrone()` is set per mission, never both. */
  getThroneStructure(): DestructibleStructure | null {
    return this.throneStructure;
  }

  /** All destructible structures owned by the controller. */
  getStructures(): DestructibleStructure[] {
    return this.cpuStructures;
  }

  /** Plain-object snapshot for the e2e test hook. Stable shape that
   *  tests assert against without poking private fields or routing
   *  through `as any`. Index order matches scene-init order, so a
   *  generator's index here is the same idx emitted by
   *  `mech_generator_killed`. */
  getSnapshot(): {
    generators: { idx: number; alive: boolean; hp: number; maxHp: number }[];
    throne: { alive: boolean; invulnerable: boolean; hp: number; maxHp: number } | null;
  } {
    const generators = this.generators.map((g, idx) => ({
      idx,
      alive: !g._expired && (g.hp ?? 0) > 0,
      hp: g.hp ?? 0,
      maxHp: g.maxHp ?? 0,
    }));
    let throne: { alive: boolean; invulnerable: boolean; hp: number; maxHp: number } | null = null;
    if (this.throne) {
      throne = {
        alive: !this.throne._expired && (this.throne.hp ?? 0) > 0,
        invulnerable: this.throne._invulnerable,
        hp: this.throne.hp ?? 0,
        maxHp: this.throne.maxHp ?? 0,
      };
    } else if (this.throneStructure) {
      throne = {
        alive: this.throneStructure.alive,
        invulnerable: this.throneStructure.invulnerable,
        hp: this.throneStructure.hp,
        maxHp: this.throneStructure.maxHp,
      };
    }
    return { generators, throne };
  }

  /** E2E-only: drive a sabotage target's hp to zero through the real
   *  Damageable.takeDamage path. Returns false on bad target / bad
   *  index — the spec asserts on this return value to catch off-by-one
   *  bugs in `getSnapshot`. Does NOT bypass invulnerability gates; a
   *  throne kill before all generators are down is a no-op. */
  forceKillTarget(kind: 'generator', idx: number): boolean;
  forceKillTarget(kind: 'throne'): boolean;
  forceKillTarget(kind: 'generator' | 'throne', idx?: number): boolean {
    if (kind === 'generator') {
      if (idx === undefined || idx < 0 || idx >= this.generators.length) return false;
      const gen = this.generators[idx];
      if (gen._expired || (gen.hp ?? 0) <= 0) return false;
      gen.takeDamage(gen.maxHp ?? gen.hp ?? 1);
      return true;
    }
    if (this.throne) {
      if (this.throne._expired || (this.throne.hp ?? 0) <= 0) return false;
      return this.throne.takeDamage(this.throne.maxHp ?? this.throne.hp ?? 1);
    }
    if (this.throneStructure) {
      if (!this.throneStructure.alive) return false;
      return this.throneStructure.takeDamage(this.throneStructure.maxHp);
    }
    return false;
  }

  private _allGeneratorsDead(): boolean {
    return this.getAliveGeneratorCount() === 0;
  }

  /** Walk the alive CPU defender list. Each tower with cooldown
   *  available + a raider in range deals one tick of damage to the
   *  closest raider. Skipped silently when no raiders are alive. */
  private _cpuTowersAttackRaiders(now: number): void {
    if (this.raiders.length === 0) return;
    for (const tower of this.cpuTowers) {
      if (tower._expired) continue;
      if (tower.hp !== undefined && tower.hp <= 0) continue;
      // Generators are inert HP bags — they're strategic priority
      // targets (kill = linked-tower cascade) but don't shoot. Skipping
      // them here also avoids the placeholder mech_mortar visual
      // splash-killing the squad with each tick.
      if (tower.isGenerator) continue;
      // Tower fired this tick already (at a send via standard path).
      if (now - tower.lastFired < tower.fireRate) continue;
      const target = this._closestRaiderInRange(tower);
      if (!target) continue;
      target.takeDamage(tower.damage);
      tower.lastFired = now;
    }
  }

  private _closestRaiderInRange(tower: Tower): Raider | null {
    const rangeSq = tower.range * tower.range;
    let best: Raider | null = null;
    let bestDist = Infinity;
    for (const r of this.raiders) {
      if (!r.alive) continue;
      const dx = r.x - tower.x;
      const dy = r.y - tower.y;
      const d = dx * dx + dy * dy;
      if (d > rangeSq) continue;
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return best;
  }
}
