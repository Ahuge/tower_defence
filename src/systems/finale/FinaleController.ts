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
import { gridX, gridY, GRID_COLS, GRID_ROWS, TILE_SIZE, getGridOffsetX, pixelToCol } from '../../config';
import { Grid, CellType } from '../Grid';
import { findPath, PathPoint } from '../Pathfinding';
import { createProjectileSprite, hasProjectileSprite } from '../SpriteManager';

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
  /** Grid used for hero collision against blocked cells. */
  grid: Grid;
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
  private grid: Grid;
  /** Last valid pixel position for the hero — used to clamp hero
   *  movement so it doesn't no-clip through blocked cells. */
  private heroLastValid: { x: number; y: number } | null = null;
  /** Phaser text object for the "RESPAWNING IN Xs" overlay above the
   *  spawn anchor. Created lazily on first hero death. */
  private respawnText: Phaser.GameObjects.Text | null = null;

  constructor(args: FinaleSetupArgs) {
    this.scene = args.scene;
    this.rules = args.rules;
    this.towerMgr = args.towerMgr;
    this.grid = args.grid;
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
   *  (alive, x, y, takeDamage), so we duck-type cast at the boundary.
   *
   *  `waveActive` gates summoning-charge accumulation: charge only
   *  ticks while a wave is in flight. Between-wave time is for the
   *  player to plan / spend, not free progress toward the summon. */
  update(delta: number, allTowers: Tower[], creeps: Creep[] | ArenaCreep[], waveActive: boolean): void {
    const dt = delta / 1000;

    // Tick charge from adjacent mana drains across all circles —
    // ONLY while a wave is actively spawning/walking. The player has
    // to commit drains AND survive the wave for the summon to advance.
    //
    // Per user spec v5b: hero death does NOT trigger an auto-respawn
    // timer. Instead the charge meter resets to 0 and the player has
    // to charge it again via conduits. Hero retains XP/items/level
    // through the cycle (Hero.respawn() preserves all that). Hero's
    // own respawnSeconds is set to Infinity at construction so its
    // internal timer never fires.
    const heroNeedsSummon = !this.hero || !this.hero.alive;
    if (heroNeedsSummon && waveActive) {
      let totalAdjacent = 0;
      for (const c of this.circles) totalAdjacent += c.chargeContribution(allTowers);
      this.charge = Math.min(1, this.charge + totalAdjacent * this.rules.chargeRatePerDrain * dt);
      if (this.charge >= 1) {
        if (!this.hero) {
          this.spawnHero();
          this.firstSpawnDone = true;
        } else {
          // Re-summon: hero keeps its level / items / XP. Anchor + HP
          // reset via Hero.respawn() (already preserves stats).
          this.hero.respawn();
          const log = (this.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
          log?.gameMessage?.('The Forge mage answers the call again!');
        }
        this.charge = 0;
      }
    }
    // While the hero is alive, ensure charge stays at 0 between
    // summons (cosmetic — keeps the bar from showing partial fill
    // while the mage is on the field).
    if (this.hero && this.hero.alive) this.charge = 0;

    // Render circles.
    for (const c of this.circles) c.draw(this.charge);

    // Hero respawn overlay. In finale mode the respawnSeconds is
    // Infinity (re-summon via charge instead), so the old "RESPAWN Xs"
    // countdown rendered as "RESPAWN ∞s". Now shows "AWAITING SUMMON"
    // with a hint to build conduits. The DOM HUD shows the live
    // charge percentage so the player has the actual progress.
    if (this.hero && !this.hero.alive) {
      const txt = 'AWAITING SUMMON';
      if (!this.respawnText) {
        const addText = (this.scene as { add?: { text?: (x: number, y: number, t: string, s: object) => Phaser.GameObjects.Text } }).add?.text;
        if (typeof addText === 'function') {
          this.respawnText = addText.call(this.scene.add, this.heroAnchor.x, this.heroAnchor.y - 40, txt, {
            fontSize: '13px', color: '#cc88ff', fontFamily: 'monospace',
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
      // Collision: the hero should not no-clip through blocked cells.
      // Convert pixel pos → grid cell, check the cell type, restore
      // the last valid position when the new one is on a wall.
      if (this.hero.alive) {
        const c = pixelToCol(this.hero.x);
        const r = Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE);
        const inBounds = c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
        const cell = inBounds ? this.grid.cells[r]?.[c] : CellType.Blocked;
        if (cell === CellType.Blocked) {
          if (this.heroLastValid) {
            this.hero.x = this.heroLastValid.x;
            this.hero.y = this.heroLastValid.y;
          }
        } else {
          this.heroLastValid = { x: this.hero.x, y: this.hero.y };
        }
      }
    }

    // CPU towers shoot the hero (when no sends are in range to decoy).
    // Tower's normal creep-fire pass already handles sends — this pass
    // runs in parallel: for each alive destructible tower, if it has
    // no send in range AND its fire-rate has elapsed AND the hero is
    // in range, apply damage. Reuses the tower's lastFired cooldown
    // so a tower that just fired at a send won't double-fire on the hero.
    if (this.hero && this.hero.alive) {
      const now = (this.scene as { time?: { now: number } }).time?.now ?? 0;
      const heroX = this.hero.x;
      const heroY = this.hero.y;
      for (const t of this.cpuTowers) {
        if ((t as { _expired?: boolean })._expired) continue;
        const dx = heroX - t.x;
        const dy = heroY - t.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > t.range * t.range) continue;
        if (now - t.lastFired < t.fireRate) continue;
        // Sends in range get priority — skip hero attack this tick if
        // any send is closer than the hero (decoy effect).
        let sendCloserThanHero = false;
        const heroDistSq = distSq;
        for (const c of creeps as Creep[]) {
          if (!c.alive || c.reached || !c.isSend) continue;
          const sdx = c.x - t.x;
          const sdy = c.y - t.y;
          const sd = sdx * sdx + sdy * sdy;
          if (sd > t.range * t.range) continue;
          if (sd < heroDistSq) { sendCloserThanHero = true; break; }
        }
        if (sendCloserThanHero) continue;
        // Apply hero damage + spawn a brief visual projectile so the
        // player can see what hit them. Tower color → hero in ~250ms,
        // then fade out.
        const dmg = t.damage;
        this.hero.hp = Math.max(0, this.hero.hp - dmg);
        (this.hero as unknown as { pendingDamageNumbers: { x: number; y: number; text: string; color: string; duration: number }[] })
          .pendingDamageNumbers.push({ x: heroX, y: heroY - 24, text: String(dmg), color: '#ff6644', duration: 0.6 });
        this.spawnHeroProjectile(t, this.hero.x, this.hero.y);
        t.lastFired = now;
        if (this.hero.hp <= 0) this.hero.die();
      }
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

    // M10 v6 — sends trickle-damage adjacent CPU towers. 5 dps per
    // send per tower (Chebyshev distance ≤ 1 in pixel terms = ~28px
    // per cell, so ~40px touch radius). Debt accumulator on each
    // tower holds sub-1 damage between frames so 5 dps still lands.
    if (this.firstSpawnDone || this.hero) {
      for (const t of this.cpuTowers) {
        if ((t as { _expired?: boolean })._expired) continue;
        let sendCount = 0;
        for (const c of creeps as Creep[]) {
          if (!c.alive || !c.isSend || !c.isFriendly) continue;
          const dx = c.x - t.x;
          const dy = c.y - t.y;
          if (dx * dx + dy * dy <= 40 * 40) sendCount++;
        }
        if (sendCount > 0) {
          const debtRef = t as { _sendDmgDebt?: number };
          debtRef._sendDmgDebt = (debtRef._sendDmgDebt ?? 0) + sendCount * 5 * dt;
          const integer = Math.floor(debtRef._sendDmgDebt);
          if (integer > 0) {
            t.takeDamage(integer);
            debtRef._sendDmgDebt -= integer;
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

  /** Set the player's clicked CPU tower target. Computes a pathfinder
   *  route to a cell adjacent to the tower so the hero can walk
   *  through the maze instead of straight-line phasing into walls. */
  setHeroTowerTarget(tower: Tower | null): void {
    if (!this.hero) return;
    if (tower && (!tower.destructible || (tower as { _expired?: boolean })._expired)) {
      this.hero.clickedTowerTarget = null;
      return;
    }
    this.hero.clickedTowerTarget = tower;
    if (tower) this.repathHeroTo(tower.col, tower.row, /*adjacent=*/true);
  }

  /** Player commanded the hero to move to a specific cell. Compute a
   *  walk path around blocked terrain. */
  moveHeroTo(col: number, row: number): void {
    if (!this.hero) return;
    this.hero.clickedTowerTarget = null;
    this.repathHeroTo(col, row, /*adjacent=*/false);
  }

  /** Compute a pixel-waypoint path from the hero's current cell to
   *  the target. When `adjacent` is true the path stops at any cell
   *  adjacent to the target — used for tower targets so the hero
   *  stops outside the tower's footprint and shoots from there. */
  private repathHeroTo(col: number, row: number, adjacent: boolean): void {
    if (!this.hero) return;
    const fromCol = pixelToCol(this.hero.x);
    const fromRow = Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE);
    let dest: PathPoint = { col, row };
    if (adjacent) {
      // Pick an adjacent walkable cell to stop at — the tower's own
      // cell isn't pathfindable (it's blocked).
      const candidates = [
        { col: col - 1, row }, { col: col + 1, row },
        { col, row: row - 1 }, { col, row: row + 1 },
      ];
      let bestDist = Infinity;
      for (const c of candidates) {
        if (c.col < 0 || c.col >= this.grid.cells[0].length) continue;
        if (c.row < 0 || c.row >= this.grid.cells.length) continue;
        if (this.grid.cells[c.row][c.col] === CellType.Blocked) continue;
        const d = Math.abs(c.col - fromCol) + Math.abs(c.row - fromRow);
        if (d < bestDist) { bestDist = d; dest = c; }
      }
    }
    const path = findPath(this.grid, { col: fromCol, row: fromRow }, dest);
    if (!path || path.length === 0) {
      this.hero.pathWaypoints = null;
      return;
    }
    // Convert grid waypoints to pixel coords for the hero. Skip the
    // first node (current cell) so the hero doesn't backtrack.
    const px = path.slice(1).map(p => ({ x: gridX(p.col), y: gridY(p.row) }));
    this.hero.pathWaypoints = px;
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

  /** Sprite-based projectile from a tower to the hero. Uses the
   *  same projectile spritesheet the tower fires at creeps so the
   *  visual is identical. Tweens position over distance/projectile
   *  speed; on arrival applies damage + cleans up. Hero damage was
   *  already applied at fire-time by the caller (avoid double damage). */
  private spawnHeroProjectile(tower: Tower, hx: number, hy: number): void {
    const sceneAny = this.scene as {
      add?: { sprite?: (...a: unknown[]) => Phaser.GameObjects.Sprite; graphics?: () => Phaser.GameObjects.Graphics };
      tweens?: { add?: (cfg: object) => void };
    };
    // Try to make the actual projectile sprite. If the tower has no
    // projectile spritesheet (rare), fall back to a Phaser circle.
    const dx = hx - tower.x;
    const dy = hy - tower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = tower.typeDef.projectileSpeed || 320; // px/s
    const flightMs = Math.max(120, Math.round((dist / speed) * 1000));

    let target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics | null = null;
    if (hasProjectileSprite(tower.typeId)) {
      target = createProjectileSprite(this.scene, tower.typeId, tower.x, tower.y);
      if (target) {
        // Rotate to face the hero so directional projectile sprites
        // (arrows, bolts) point along the flight path.
        (target as Phaser.GameObjects.Sprite).setRotation?.(Math.atan2(dy, dx));
      }
    }
    if (!target && sceneAny.add?.graphics) {
      const g = sceneAny.add.graphics();
      g.setDepth(15);
      g.fillStyle(tower.color ?? 0xcc88ff, 1);
      g.fillCircle(0, 0, 4);
      g.x = tower.x;
      g.y = tower.y;
      target = g;
    }
    if (!target) return;

    sceneAny.tweens?.add?.({
      targets: target,
      x: hx,
      y: hy,
      duration: flightMs,
      ease: 'Linear',
      onComplete: () => {
        target?.destroy?.();
      },
    });
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
    // Block the hero's internal respawn timer — re-summons go through
    // the charge meter, not a wallclock. Setting respawnSeconds to
    // Infinity means die() sets respawnTimer to Infinity and the
    // tick-down in Hero.update never reaches 0.
    hero.respawnSeconds = Infinity;
    // Hero Defense's default sprite origin (0.5, 0.75) makes the hero
    // visually float above its position when placed on a tile-grid
    // (top of sprite extends into the cell above where the player
    // clicked). Center the origin so hero.x/y is the visual center
    // of the sprite, matching click-target expectations.
    if ((hero as { sprite?: { setOrigin?: (x: number, y: number) => void } }).sprite?.setOrigin) {
      (hero as unknown as { sprite: { setOrigin: (x: number, y: number) => void } }).sprite.setOrigin(0.5, 0.5);
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
