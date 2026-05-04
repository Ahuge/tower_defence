/**
 * FinaleController — owns the M10 Arcane finale gameplay layer
 * (siege of the archmage spire).
 *
 * Lifecycle:
 *   1. GameScene creates the controller in `create()` when the
 *      mission's `finaleRules` field is present.
 *   2. Controller places destructible CPU towers from
 *      `mapDef.destructibleTowers` at scene init (free placement,
 *      assigned `ownerIndex = CPU_INDEX`, `destructible = true`,
 *      hp/maxHp from spec, `isUlt` flag for the throne tower).
 *   3. Controller instantiates SummoningCircle entities from
 *      `mapDef.summoningCircles`. Two circles → one shared charge
 *      meter; both circles render the same charge value (visual
 *      symmetry per the M10 reference image).
 *   4. Each frame, GameScene calls `update(delta, towers)`:
 *      - Sum charge contributions across all circles (counted once).
 *      - Tick the shared charge meter forward at
 *        `chargeRatePerDrain × totalAdjacent` per second.
 *      - On first 100% charge, spawn the hero at the midpoint anchor.
 *      - Drive the hero's update loop with current creeps as targets.
 *      - On hero death + respawn timer expiry, respawn at anchor.
 *      - Check win condition (zero alive destructible CPU towers).
 *
 * Hero is held INSIDE the controller (not on GameScene) so existing
 * Hero Defense paths stay unchanged.
 */

import * as Phaser from 'phaser';
import { Hero } from '../../entities/Hero';
import { SummoningCircle } from '../../entities/SummoningCircle';
import { Tower } from '../../entities/Tower';
import { TowerManager } from '../TowerManager';
import { getTowerType } from '../../data/TowerTypes';
import { HERO_TYPES, HeroId } from '../../data/HeroTypes';
import type { ArenaCreep } from '../../entities/ArenaCreep';
import type { Creep } from '../../entities/Creep';
import { gridX, gridY, GRID_COLS, GRID_ROWS, TILE_SIZE, getGridOffsetX } from '../../config';

/** Sentinel ownerIndex for CPU defender towers. Distinct from any
 *  player slot (0-3 in circle co-op). Used by Tower.findFinaleTarget
 *  to know "this tower is the CPU defender" so target priority rules
 *  apply. */
export const CPU_INDEX = 99;

export interface FinaleRules {
  heroId: HeroId;
  heroStartingLevel?: number;
  heroRespawnSeconds?: number;
  /** Per-second charge added per adjacent mana drain. 0.00156 →
   *  8-drain cap reaches 100% in ~80s. */
  chargeRatePerDrain: number;
  cpuTowerHpDefault?: number;
  /** ownerIndex stamped on every destructible CPU tower. Default
   *  CPU_INDEX. Distinct from any player index. */
  cpuTowerOwnerIndex?: number;
  /** Reward for destroying a regular CPU tower. */
  towerKillReward?: { gold?: number; xp?: number; ultGold?: number; ultXp?: number };
}

export interface FinaleSetupArgs {
  scene: Phaser.Scene;
  rules: FinaleRules;
  destructibleTowers: { col: number; row: number; towerId: string; hp: number; isUlt?: boolean }[];
  summoningCircles: { col: number; row: number; chargeRatePerDrain?: number }[];
  towerMgr: TowerManager;
  /** Optional callback fired when the hero is summoned for the first
   *  time. GameScene uses this to log the event + dim the loading hint. */
  onHeroSpawned?: () => void;
  /** Callback fired exactly once when the finale's win condition is
   *  met (zero alive destructible CPU towers). */
  onWin?: () => void;
}

export class FinaleController {
  private scene: Phaser.Scene;
  private rules: FinaleRules;
  private circles: SummoningCircle[] = [];
  private towerMgr: TowerManager;
  private cpuTowers: Tower[] = [];
  private hero: Hero | null = null;
  private heroAnchor: { x: number; y: number };
  private charge: number = 0;
  private firstSpawnDone: boolean = false;
  private winFired: boolean = false;
  private onHeroSpawned?: () => void;
  private onWin?: () => void;
  /** Phaser text object for the "RESPAWNING IN Xs" overlay above the
   *  spawn anchor. Created lazily on first hero death. */
  private respawnText: Phaser.GameObjects.Text | null = null;

  constructor(args: FinaleSetupArgs) {
    this.scene = args.scene;
    this.rules = args.rules;
    this.towerMgr = args.towerMgr;
    this.onHeroSpawned = args.onHeroSpawned;
    this.onWin = args.onWin;

    // Place destructible CPU towers. Free placement (no cost). Stamp
    // ownerIndex + destructible + hp on each.
    const ownerIndex = this.rules.cpuTowerOwnerIndex ?? CPU_INDEX;
    const defaultHp = this.rules.cpuTowerHpDefault ?? 600;
    for (const spec of args.destructibleTowers) {
      try {
        const towerType = getTowerType(spec.towerId);
        const result = this.towerMgr.placeTower(
          spec.col, spec.row, towerType,
          [], () => [],
          true,  // free
        );
        if (result) {
          const t = result.tower;
          t.destructible = true;
          t.ownerIndex = ownerIndex;
          t.maxHp = spec.hp ?? defaultHp;
          t.hp = t.maxHp;
          if (spec.isUlt) t.isUlt = true;
          this.cpuTowers.push(t);
        }
      } catch (err) {
        console.warn(`[FinaleController] failed to place CPU tower ${spec.towerId} at ${spec.col},${spec.row}:`, err);
      }
    }

    // Instantiate summoning circles + compute the hero anchor as the
    // midpoint between them (or scene centre when only one circle).
    this.circles = args.summoningCircles.map(c => new SummoningCircle(args.scene, c.col, c.row));
    if (this.circles.length > 0) {
      let sx = 0, sy = 0;
      for (const c of this.circles) { sx += c.cx; sy += c.cy; }
      this.heroAnchor = { x: sx / this.circles.length, y: sy / this.circles.length };
    } else {
      // Defensive fallback — shouldn't trigger for a properly authored
      // finale map, but avoid undefined anchor crashing constructor.
      this.heroAnchor = { x: gridX(GRID_COLS - 4), y: gridY(Math.floor(GRID_ROWS / 2)) };
    }
  }

  /** Returns the hero instance, or null if not yet summoned. */
  getHero(): Hero | null {
    return this.hero;
  }

  /** Current charge value in [0, 1]. UI renders this as the shared bar. */
  getCharge(): number {
    return this.charge;
  }

  /** Called by GameScene each frame. The hero auto-attacks any
   *  passed creeps in range; M10 passes the live wave creeps so the
   *  hero swats them as they walk by. ArenaCreep is the type Hero
   *  expects — Creep is shape-compatible for the methods Hero calls
   *  (alive, x, y, takeDamage), so we duck-type cast at the boundary. */
  update(delta: number, allTowers: Tower[], creeps: Creep[] | ArenaCreep[]): void {
    const dt = delta / 1000;

    // Tick charge from adjacent mana drains across all circles.
    if (!this.firstSpawnDone) {
      let totalAdjacent = 0;
      for (const c of this.circles) totalAdjacent += c.chargeContribution(allTowers);
      this.charge = Math.min(1, this.charge + totalAdjacent * this.rules.chargeRatePerDrain * dt);
      if (this.charge >= 1) {
        this.spawnHero();
        this.firstSpawnDone = true;
      }
    }

    // Render circles.
    for (const c of this.circles) c.draw(this.charge);

    // Hero respawn countdown overlay. Shown above the anchor while
    // the hero is dead. Hides + clears when alive.
    if (this.hero && !this.hero.alive) {
      const seconds = Math.max(0, Math.ceil((this.hero as unknown as { respawnTimer: number }).respawnTimer));
      const txt = `RESPAWN ${seconds}s`;
      if (!this.respawnText) {
        const addText = (this.scene as { add?: { text?: (x: number, y: number, t: string, s: object) => Phaser.GameObjects.Text } }).add?.text;
        if (typeof addText === 'function') {
          this.respawnText = addText.call(this.scene.add, this.heroAnchor.x, this.heroAnchor.y - 40, txt, {
            fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
          });
          this.respawnText?.setOrigin?.(0.5);
          this.respawnText?.setDepth?.(20);
        }
      } else {
        this.respawnText.setText(txt);
        this.respawnText.setVisible(true);
      }
    } else if (this.respawnText) {
      this.respawnText.setVisible(false);
    }

    // Drive hero update + respawn. ArenaCreep[] cast — Hero only uses
    // alive/x/y/takeDamage off the creep, all of which Creep also has.
    if (this.hero) {
      this.hero.update(delta, creeps as ArenaCreep[]);
    }

    // M10 finale: grant gold + xp for each newly-killed CPU tower this
    // frame (poll _expired flag which the hero's attackTower set on
    // killing blow). Only fire once per tower via _killRewardGranted.
    if (this.hero) {
      const reward = this.rules.towerKillReward;
      if (reward) {
        for (const t of this.cpuTowers) {
          if ((t as { _expired?: boolean })._expired && !(t as { _killRewardGranted?: boolean })._killRewardGranted) {
            (t as { _killRewardGranted?: boolean })._killRewardGranted = true;
            const gold = t.isUlt ? (reward.ultGold ?? 500) : (reward.gold ?? 50);
            const xp = t.isUlt ? (reward.ultXp ?? 250) : (reward.xp ?? 50);
            const econ = (this.scene as { economy?: { addGold: (n: number) => void } }).economy;
            econ?.addGold?.(gold);
            this.hero.grantXP(xp);
            // Quick death VFX — sprite flash + tween on the tower
            // before it's destroyed by cleanupExpired next frame.
            const sprite = (t as { sprite?: { setTintFill?: (c: number) => void; setScale?: (n: number) => void } }).sprite;
            if (sprite?.setTintFill) sprite.setTintFill(0xffffff);
            const tweens = (this.scene as { tweens?: { add?: (cfg: object) => void } }).tweens;
            if (tweens?.add && t.sprite) {
              tweens.add({
                targets: t.sprite,
                scale: 1.4,
                alpha: 0,
                duration: 250,
                ease: 'Cubic.easeOut',
              });
            }
            const log = (this.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
            log?.gameMessage?.(t.isUlt
              ? `THE THRONE FALLS — ${gold}g, ${xp}xp.`
              : `Defender tower destroyed (+${gold}g, +${xp}xp).`);
          }
        }
      }
    }

    // Ult tower phase mechanics. As the throne loses HP it fires
    // staged callbacks: 50% heal, 25% reinforcements, 10% rage. Each
    // phase is one-shot via _ultPhaseNNFired flags on the tower.
    for (const t of this.cpuTowers) {
      if (!t.isUlt || (t as { _expired?: boolean })._expired) continue;
      if (t.maxHp === undefined || t.hp === undefined) continue;
      const ratio = t.hp / t.maxHp;
      if (!t._ultPhase50Fired && ratio <= 0.5) {
        t._ultPhase50Fired = true;
        // 10% heal over 5s — apply instantly here for simplicity (v2
        // polish: tween over 5s with VFX).
        t.hp = Math.min(t.maxHp, t.hp + Math.round(t.maxHp * 0.1));
        const log = (this.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
        log?.gameMessage?.('The Throne calls reinforcement spells — its wards mend!');
      }
      if (!t._ultPhase25Fired && ratio <= 0.25) {
        t._ultPhase25Fired = true;
        const log = (this.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
        log?.gameMessage?.('The Throne summons mage reinforcements!');
        // v2 polish: spawn N mage creeps at the entry. v1 ships the
        // narrative beat without the spawn — wave creeps already
        // ramp via the standard hpWaveBoost so the ramping pressure
        // is already there.
      }
      if (!t._ultPhase10Fired && ratio <= 0.10) {
        t._ultPhase10Fired = true;
        // Rage mode: halve fire rate ms (= 2x attack speed). Modify
        // typeDef.fireRate clone? No — fireRate is read each frame
        // from typeDef. Instead halve the live tower's fireRate
        // field (Tower.ts uses this.fireRate).
        t.fireRate = Math.max(200, Math.floor(t.fireRate / 2));
        const log = (this.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
        log?.gameMessage?.('THE THRONE RAGES! Attack speed doubled!');
      }
    }

    // Win condition — zero alive destructible CPU towers.
    if (!this.winFired && this.firstSpawnDone) {
      let aliveCount = 0;
      for (const t of this.cpuTowers) {
        if (!(t as { _expired?: boolean })._expired && (t.hp ?? 0) > 0) aliveCount++;
      }
      if (aliveCount === 0) {
        this.winFired = true;
        this.onWin?.();
      }
    }
  }

  /** Set the player's clicked CPU tower target. FinaleController
   *  forwards it to the hero's update loop. Pass null to clear. */
  setHeroTowerTarget(tower: Tower | null): void {
    if (!this.hero) return;
    if (tower && (!tower.destructible || (tower as { _expired?: boolean })._expired)) {
      this.hero.clickedTowerTarget = null;
      return;
    }
    this.hero.clickedTowerTarget = tower;
  }

  /** Lookup helper — does this position correspond to a destructible
   *  CPU tower? Used by the click-handler in GameScene. */
  findCpuTowerAt(col: number, row: number): Tower | null {
    for (const t of this.cpuTowers) {
      if (t.col === col && t.row === row && !(t as { _expired?: boolean })._expired) return t;
    }
    return null;
  }

  /** Snapshot of all alive CPU towers. Used by win-check + UI. */
  getCpuTowers(): Tower[] {
    return this.cpuTowers.filter(t => !(t as { _expired?: boolean })._expired && (t.hp ?? 1) > 0);
  }

  private spawnHero(): void {
    const heroDef = HERO_TYPES[this.rules.heroId];
    if (!heroDef) {
      console.warn(`[FinaleController] hero id "${this.rules.heroId}" not registered`);
      return;
    }
    // Construct the hero. arenaWidth/Height args are placeholders;
    // worldBounds below overrides clamp behaviour for the grid.
    const hero = new Hero(
      this.scene,
      this.heroAnchor.x,
      this.heroAnchor.y,
      heroDef,
      GRID_COLS * TILE_SIZE,
      GRID_ROWS * TILE_SIZE,
    );
    hero.spawnAnchor = { x: this.heroAnchor.x, y: this.heroAnchor.y };
    hero.worldBounds = {
      minX: getGridOffsetX(),
      minY: 0,
      maxX: getGridOffsetX() + GRID_COLS * TILE_SIZE,
      maxY: GRID_ROWS * TILE_SIZE,
    };
    if (this.rules.heroRespawnSeconds !== undefined) {
      hero.respawnSeconds = this.rules.heroRespawnSeconds;
    }
    if (this.rules.heroStartingLevel && this.rules.heroStartingLevel > 1) {
      // Pre-level the hero so they have abilities ready on first summon.
      // grantXP cumulative: sum from level 1 → N is `(N-1) * N / 2 * 15`.
      const targetLevel = this.rules.heroStartingLevel;
      const totalXp = ((targetLevel - 1) * targetLevel / 2) * 15;
      hero.grantXP(totalXp);
    }
    this.hero = hero;
    this.onHeroSpawned?.();
  }
}
