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
import { DestructibleStructure } from '../../entities/DestructibleStructure';
import { getDestructibleStructureDef, DestructibleStructurePlacement } from '../../data/DestructibleStructures';
import { TowerManager } from '../TowerManager';
import { getTowerType } from '../../data/TowerTypes';
import { HERO_TYPES, HeroId } from '../../data/HeroTypes';
import type { ArenaCreep } from '../../entities/ArenaCreep';
import type { Creep } from '../../entities/Creep';
import { gridX, gridY, GRID_COLS, GRID_ROWS, TILE_SIZE, getGridOffsetX, pixelToCol } from '../../config';
import { Grid, CellType } from '../Grid';
import { findPath, PathPoint } from '../Pathfinding';
import { createProjectileSprite, hasProjectileSprite } from '../SpriteManager';
import { Damageable } from '../../entities/Damageable';
import { placeCpuTowers } from './cpuPlacement';
import { dispatchFinaleEffect } from './FinaleEffects';
import { applyHeroPendingEffects, PendingHittable } from './applyHeroPendingEffects';
import { rng } from '../Rng';
import { HeroEconomyController } from '../hero/HeroEconomyController';
import type { EconomyManager } from '../EconomyManager';
import type { EventLog } from '../../ui/EventLog';

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
  /** PRD 06 — sends deal damage to adjacent CPU destructibles (walls,
   *  towers, throne) each `sendAttackCadenceMs` (default 1000ms).
   *  Damage scales with creep maxHp: `floor(maxHp * sendAttackDamageScale / 100)`,
   *  clamped to ≥ 1. Default scale = 1.0 — a 500-hp creep deals 5
   *  per attack, a 5000-hp boss deals 50. */
  sendAttackDamageScale?: number;
  /** Cadence of send attacks against adjacent CPU destructibles, in ms.
   *  Default 1000. Lower = more send DPS. */
  sendAttackCadenceMs?: number;
}

export interface FinaleSetupArgs {
  scene: Phaser.Scene;
  rules: FinaleRules;
  destructibleTowers: { col: number; row: number; towerId: string; hp: number; isUlt?: boolean }[];
  /** PRD 06: multi-tile boss structures the player must destroy.
   *  Empty array means no structures (existing missions); M10 ships
   *  with the Archmage Throne. */
  destructibleStructures: DestructibleStructurePlacement[];
  summoningCircles: { col: number; row: number; chargeRatePerDrain?: number }[];
  towerMgr: TowerManager;
  /** Grid used for hero collision against blocked cells. */
  grid: Grid;
  /** Match-level economy. Threaded through to HeroEconomyController so
   *  the player can spend gold on hero items / tomes / accessories
   *  during the finale. */
  economy: import('../EconomyManager').EconomyManager;
  /** Match event log. */
  eventLog: import('../../ui/EventLog').EventLog;
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
  /** PRD 06: destructible boss structures (e.g. M10 throne). Tracked
   *  separately from `cpuTowers` because they have multi-cell footprints
   *  and the win condition counts them via `isMissionWinTarget`. */
  private cpuStructures: DestructibleStructure[] = [];
  private hero: Hero | null = null;
  /** Hero economy + shop wiring. Lazily constructed when the hero is
   *  first summoned (we don't know hero refs until then). Persists
   *  across hero re-summons since Hero.respawn() preserves the same
   *  instance. */
  private econController: HeroEconomyController | null = null;
  private economy: EconomyManager;
  private eventLog: EventLog;
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
    this.economy = args.economy;
    this.eventLog = args.eventLog;
    this.onHeroSpawned = args.onHeroSpawned;
    this.onWin = args.onWin;

    // Place destructible CPU towers via the shared helper. Caller
    // here just stamps the Arcane-specific isUlt flag.
    const ownerIndex = this.rules.cpuTowerOwnerIndex ?? CPU_INDEX;
    const defaultHp = this.rules.cpuTowerHpDefault ?? 600;
    for (const { spec, tower } of placeCpuTowers(this.towerMgr, args.destructibleTowers, ownerIndex, defaultHp)) {
      if (spec.isUlt) tower.isUlt = true;
      this.cpuTowers.push(tower);
    }

    // PRD 06: Place destructible boss structures. For each placement:
    //   1. If the structure def has an embedded tower, place it via
    //      towerMgr first at the structure's CENTER cell.
    //   2. Construct the DestructibleStructure with the embedded tower
    //      reference. The structure delegates HP and rendering and
    //      occupies its full WxH grid footprint.
    //   3. Block the additional 8 cells in the grid (the embedded tower
    //      already blocks its center cell). Without this, creeps could
    //      walk through 8/9 of the throne footprint.
    for (const placement of args.destructibleStructures) {
      try {
        const def = getDestructibleStructureDef(placement.id);
        const centerCol = placement.col + Math.floor(def.widthCells / 2);
        const centerRow = placement.row + Math.floor(def.heightCells / 2);
        let embeddedTower: Tower | null = null;
        if (def.embeddedTowerId) {
          const towerType = getTowerType(def.embeddedTowerId);
          // The map's noBuild list includes the throne's footprint
          // (so the player can't build on top of the structure). But
          // that same noBuild flag prevents `placeTower` from accepting
          // the embedded tower — its `canPlaceTower` check requires
          // CellType.Empty. Briefly clear the center cell to Empty,
          // then let placeTower run; it'll set the cell to Tower and
          // the structure's downstream Blocked-cells loop secures the
          // surrounding 8.
          this.grid.cells[centerRow][centerCol] = CellType.Empty;
          const result = this.towerMgr.placeTower(
            centerCol, centerRow, towerType,
            [], () => [],
            true,  // free
          );
          if (result) embeddedTower = result.tower;
        }
        const structure = new DestructibleStructure({
          scene: args.scene,
          placement,
          embeddedTower,
          factionId: 'arcane',
          ownerIndex,
        });
        this.cpuStructures.push(structure);
        // Block the non-center cells of the WxH footprint in the grid.
        for (const cell of structure.getOccupiedCells()) {
          if (cell.col === centerCol && cell.row === centerRow) continue;
          if (cell.row < 0 || cell.row >= this.grid.cells.length) continue;
          if (cell.col < 0 || cell.col >= this.grid.cells[0].length) continue;
          this.grid.cells[cell.row][cell.col] = CellType.Blocked;
        }
      } catch (err) {
        console.warn(`[FinaleController] failed to place structure ${placement.id} at ${placement.col},${placement.row}:`, err);
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
        // Pillar-of-light flash at the anchor — fires on first summon
        // AND every re-summon. Plan 1.18 polish item: "summoning-pillar
        // VFX at 100% charge".
        this.drawHeroSummonPillar();
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

    // M10 v2 — hero auto-retaliate priority. If a CPU tower has been
    // shooting the hero in the last 2s and it's within hero attack
    // range, set it as the hero's autoTarget so the hero retaliates
    // automatically. Cleared each tick: when no tower is currently
    // attacking, autoTarget falls back to null and the hero resumes
    // creep auto-attack via findTarget. Player's clicked target
    // always wins over autoTarget.
    if (this.hero && this.hero.alive) {
      const HERO_AGGRO_WINDOW_MS = 2000;
      const heroNow = (this.scene as { time?: { now: number } }).time?.now ?? 0;
      const heroRange = this.hero.getEffectiveRange();
      let bestAttacker: Tower | null = null;
      let bestAttackerDist = Infinity;
      for (const t of this.cpuTowers) {
        if ((t as { _expired?: boolean })._expired) continue;
        if (heroNow - t._lastAttackedHeroAt > HERO_AGGRO_WINDOW_MS) continue;
        const dx = t.x - this.hero.x, dy = t.y - this.hero.y;
        const d = dx * dx + dy * dy;
        if (d > heroRange * heroRange) continue;
        if (d < bestAttackerDist) { bestAttackerDist = d; bestAttacker = t; }
      }
      this.hero.autoTarget = bestAttacker;
    } else if (this.hero) {
      this.hero.autoTarget = null;
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

    // Drain the hero's per-frame ability queues (Meteor / Splash /
    // Chain Lightning). ArenaManager owns this drain in HD mode; M10
    // is on the main grid so the controller does it. Without this the
    // first cast of Meteor Storm would jam — `Hero.update` only fires
    // the next meteor when `pendingMeteor` is null. Targets: alive
    // wave creeps + alive CPU towers + alive boss structures.
    if (this.hero && this.hero.alive) {
      const heroX = this.hero.x;
      const heroY = this.hero.y;
      const targets: PendingHittable[] = [];
      for (const c of creeps as Creep[]) {
        if (c.alive && !c.reached) targets.push(c as unknown as PendingHittable);
      }
      for (const t of this.cpuTowers) {
        if (!(t as { _expired?: boolean })._expired) {
          targets.push(t as unknown as PendingHittable);
        }
      }
      for (const s of this.cpuStructures) {
        if (s.alive) targets.push(s);
      }
      applyHeroPendingEffects({
        hero: this.hero,
        targets,
        // Meteor lands near the hero with up-to-2× radius jitter.
        // Seeded RNG keeps headless / capture replays deterministic.
        pickMeteorPosition: (radius) => ({
          x: heroX + (rng() - 0.5) * radius * 4,
          y: heroY + (rng() - 0.5) * radius * 4,
        }),
        onMeteorVfx: (x, y, radius) => this.drawAoeRing(x, y, radius, 0xff4400, 0xffaa44, 1100),
        onSplashVfx: (x, y, radius) => this.drawAoeRing(x, y, radius, 0xff8844, 0xffcc88, 600),
        onChainHitVfx: (sx, sy, hx, hy) => this.drawLightningArc(sx, sy, hx, hy),
      });
    }

    // Drain hero damage-number queue (Arena uses FloatingDamage; we
    // render via inline Phaser text tweens so the numbers appear in
    // M10 too — without this drain the queue would grow unbounded.
    if (this.hero && this.hero.pendingDamageNumbers.length > 0) {
      for (const entry of this.hero.pendingDamageNumbers) {
        this.spawnFloatingNumber(entry.x, entry.y, entry.text, entry.color, entry.duration);
      }
      this.hero.pendingDamageNumbers.length = 0;
    }

    // Push fresh hero-shop snapshot to the DOM (level / cooldowns /
    // costs / etc). Cheap pure-object construction — same cadence HD
    // uses inside HeroDefenseMode.update().
    this.econController?.syncToDOM();

    // CPU tower target priority (M10 v2):
    //   1. creeps_attacking_it — sends that have damaged this tower
    //      within ATTACKING_WINDOW_MS. (Sends adjacent + dealing damage.)
    //   2. hero_attacking_it — hero who's been shooting this tower
    //      within the same window.
    //   3. creeps_in_range — any send within range, closest first.
    //   4. hero_in_range — hero within range.
    // The tower fires at the FIRST tier that has at least one valid
    // target. This replaces the old "send-closer-than-hero" decoy rule.
    const ATTACKING_WINDOW_MS = 2000;
    if ((this.hero && this.hero.alive) || (creeps as Creep[]).some(c => c.alive && c.isSend)) {
      const now = (this.scene as { time?: { now: number } }).time?.now ?? 0;
      const hero = this.hero;
      const heroX = hero?.x ?? 0;
      const heroY = hero?.y ?? 0;
      for (const t of this.cpuTowers) {
        if ((t as { _expired?: boolean })._expired) continue;
        if (now - t.lastFired < t.fireRate) continue;
        const rangeSq = t.range * t.range;
        // ─── Tier 1: creeps_attacking_it (sends that recently hit it) ───
        let target: { x: number; y: number; isHero?: boolean; creep?: Creep } | null = null;
        if (now - t.assailants.lastBy('send') < ATTACKING_WINDOW_MS) {
          let bestDist = Infinity;
          for (const c of creeps as Creep[]) {
            if (!c.alive || c.reached || !c.isSend) continue;
            const sdx = c.x - t.x, sdy = c.y - t.y;
            const sd = sdx * sdx + sdy * sdy;
            if (sd > rangeSq) continue;
            if (sd < bestDist) { bestDist = sd; target = { x: c.x, y: c.y, creep: c }; }
          }
        }
        // ─── Tier 2: hero_attacking_it (hero recently hit it) ───
        if (!target && hero && hero.alive && now - t.assailants.lastBy('hero') < ATTACKING_WINDOW_MS) {
          const dx = heroX - t.x, dy = heroY - t.y;
          if (dx * dx + dy * dy <= rangeSq) {
            target = { x: heroX, y: heroY, isHero: true };
          }
        }
        // ─── Tier 3: creeps_in_range (closest send) ───
        if (!target) {
          let bestDist = Infinity;
          for (const c of creeps as Creep[]) {
            if (!c.alive || c.reached || !c.isSend) continue;
            const sdx = c.x - t.x, sdy = c.y - t.y;
            const sd = sdx * sdx + sdy * sdy;
            if (sd > rangeSq) continue;
            if (sd < bestDist) { bestDist = sd; target = { x: c.x, y: c.y, creep: c }; }
          }
        }
        // ─── Tier 4: hero_in_range ───
        if (!target && hero && hero.alive) {
          const dx = heroX - t.x, dy = heroY - t.y;
          if (dx * dx + dy * dy <= rangeSq) {
            target = { x: heroX, y: heroY, isHero: true };
          }
        }
        if (!target) continue;
        // Track "I picked a send" so the send-priority indicator can
        // float a chevron above this tower for ~1s. Helps the player
        // read at a glance which towers their decoy sends are pulling.
        if (target.creep && target.creep.isSend) {
          (t as { _targetingSendAt?: number })._targetingSendAt = now;
        }
        // Send creeps go through the standard tower fire pipeline (so
        // splash / chain / etc work). The standard updateTowers tick
        // already targets sends, so we only need to fire here for hero
        // targets (which the standard pipeline doesn't know about).
        if (!target.isHero || !hero) continue;
        // Apply hero damage + spawn a brief visual projectile so the
        // player can see what hit them. Tower color → hero in ~250ms,
        // then fade out.
        const dmg = t.damage;
        hero.hp = Math.max(0, hero.hp - dmg);
        (hero as unknown as { pendingDamageNumbers: { x: number; y: number; text: string; color: string; duration: number }[] })
          .pendingDamageNumbers.push({ x: heroX, y: heroY - 24, text: String(dmg), color: '#ff6644', duration: 0.6 });
        this.spawnHeroProjectile(t, hero.x, hero.y);
        t.lastFired = now;
        // Track "this tower is currently shooting the hero" for the
        // hero's auto-attack priority cascade. The hero retaliates
        // against attackers before considering range-based picks.
        t._lastAttackedHeroAt = now;
        if (hero.hp <= 0) hero.die();
      }
    }

    // Render send-priority indicator above CPU towers currently
    // targeting a send. ~1s decay from `_targetingSendAt` so the
    // chevron lingers between frames; clears naturally when the tower
    // switches back to the hero or finds no target.
    this.drawSendPriorityIndicators();

    // M10 finale: grant gold + xp for each newly-killed CPU tower this
    // frame (poll _expired flag which the hero's attackTarget set on
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

    // PRD post-M10-v4 — Attacking Goal wiring for player sends. Each
    // send creep gets a `getAttackTarget` callback that returns the
    // closest alive CPU-owned destructible (walls, towers, throne).
    // Creep.update consumes this — walks straight-line toward the
    // target, attacks at 1s cadence when in attackRange, falls back
    // to Pathing Goal when no targets remain. Sets the callback once
    // per send (idempotent — same closure-shape every frame).
    const cadenceMs = this.rules.sendAttackCadenceMs ?? 1000;
    const dmgScale = this.rules.sendAttackDamageScale ?? 1.0;
    const fd = (this.scene as { floatingDamage?: { spawn: (x: number, y: number, text: string, color?: string) => void } }).floatingDamage;
    const cpuTowers = this.cpuTowers;
    const cpuStructures = this.cpuStructures;
    for (const c of creeps as Creep[]) {
      if (!c.alive || c.goalMode !== 'attacking') continue;
      if (c.getAttackTarget) continue; // already wired
      c.attackCadenceMs = cadenceMs;
      // Damage scales with creep maxHp like the prior opportunistic mechanic.
      c.attackDamage = Math.max(1, Math.floor((c.maxHp * dmgScale) / 100));
      const grid = this.grid;
      c.getAttackTarget = (creep: Creep) => {
        // Closest alive CPU-owned destructible to the creep's current pos.
        let best: Tower | DestructibleStructure | null = null;
        let bestSq = Infinity;
        for (const t of cpuTowers) {
          if (!t.destructible) continue;
          if ((t as { _expired?: boolean })._expired) continue;
          const dx = creep.x - t.x, dy = creep.y - t.y;
          const ds = dx * dx + dy * dy;
          if (ds < bestSq) { bestSq = ds; best = t; }
        }
        for (const s of cpuStructures) {
          if (!s.alive) continue;
          if (s.invulnerable) continue;
          const dx = creep.x - s.x, dy = creep.y - s.y;
          const ds = dx * dx + dy * dy;
          if (ds < bestSq) { bestSq = ds; best = s; }
        }
        if (!best) return null;
        const target = best;
        // Grid-pathfind from creep's current cell to a cell adjacent to
        // the target. Targets are blocked cells themselves; we step out
        // by 1 to find a walkable approach. Use Manhattan-closest.
        const fromCol = pixelToCol(creep.x);
        const fromRow = Math.round((creep.y - TILE_SIZE / 2) / TILE_SIZE);
        const tCol = target.col;
        const tRow = target.row;
        const tW = 'widthCells' in target ? (target as DestructibleStructure).widthCells : 1;
        const tH = 'heightCells' in target ? (target as DestructibleStructure).heightCells : 1;
        const candidates: { col: number; row: number; d: number }[] = [];
        for (let dr = -1; dr <= tH; dr++) {
          for (let dc = -1; dc <= tW; dc++) {
            // Skip footprint interior — only pick cells adjacent to the
            // perimeter (Chebyshev distance 1 from the bounding box).
            if (dc >= 0 && dc < tW && dr >= 0 && dr < tH) continue;
            const cc = tCol + dc, rr = tRow + dr;
            if (cc < 0 || cc >= grid.cells[0].length) continue;
            if (rr < 0 || rr >= grid.cells.length) continue;
            if (grid.cells[rr][cc] === CellType.Blocked) continue;
            candidates.push({ col: cc, row: rr, d: Math.abs(cc - fromCol) + Math.abs(rr - fromRow) });
          }
        }
        candidates.sort((a, b) => a.d - b.d);
        let pathPx: { x: number; y: number }[] | undefined = undefined;
        for (const cand of candidates) {
          const path = findPath(grid, { col: fromCol, row: fromRow }, { col: cand.col, row: cand.row });
          if (path && path.length > 0) {
            pathPx = path.slice(1).map(p => ({ x: gridX(p.col), y: gridY(p.row) }));
            break;
          }
        }
        return {
          x: target.x,
          y: target.y,
          alive: target.alive,
          path: pathPx,
          takeDamage: (amount: number) => {
            const killed = target.takeDamage(amount, 'send');
            fd?.spawn?.(target.x, target.y - 18, String(amount), '#ffaa44');
            return killed;
          },
        };
      };
    }

    // (Legacy opportunistic send-attack loop removed — sends now use
    //  Creep.update's Attacking Goal branch via the callback above.)

    // M10 PRD post-v4 (a) — Throne invulnerability gate. The mission
    // win-target structure (the throne) stays untouchable until every
    // other CPU defender tower is dead. Forces the player to clear the
    // 22-tower lattice before they can finish the boss; otherwise sends
    // could chip the throne while the player ignores the surrounding
    // defenders. Re-evaluated each frame so the moment the last regular
    // tower falls, the shield drops.
    let aliveTowerCount = 0;
    for (const t of this.cpuTowers) {
      if (!(t as { _expired?: boolean })._expired && (t.destructible?.hp ?? 0) > 0) aliveTowerCount++;
    }
    for (const s of this.cpuStructures) {
      s.invulnerable = s.isMissionWinTarget && aliveTowerCount > 0;
    }

    // PRD 06 — destructible boss structure update.
    //   - Redraw each structure (HP changed → frame swap if a damage
    //     threshold was crossed; HP bar updates).
    //   - Collect any phase hooks that crossed their HP threshold this
    //     frame and dispatch them through FinaleEffects.
    for (const s of this.cpuStructures) {
      s.draw();
      if (!s.alive) continue;
      const fired = s.collectPhaseHooks();
      for (const hookId of fired) {
        dispatchFinaleEffect(hookId, s, {
          scene: this.scene,
          controller: this,
          hero: this.hero,
        });
      }
    }

    // Win condition (PRD 06) — fires when:
    //   1. The hero has been summoned at least once (firstSpawnDone), AND
    //   2. Zero alive destructible CPU towers, AND
    //   3. Zero alive `isMissionWinTarget` structures.
    //
    // Non-win-target structures (decorative future destructibles) don't
    // gate victory. Tower-class destructibles always do (kill-all rule).
    if (!this.winFired && this.firstSpawnDone) {
      let aliveTowers = 0;
      for (const t of this.cpuTowers) {
        if (!(t as { _expired?: boolean })._expired && (t.destructible?.hp ?? 0) > 0) aliveTowers++;
      }
      let aliveWinTargets = 0;
      for (const s of this.cpuStructures) {
        if (s.isMissionWinTarget && s.alive) aliveWinTargets++;
      }
      if (aliveTowers === 0 && aliveWinTargets === 0) {
        this.winFired = true;
        this.fireVictoryFlash();
        this.onWin?.();
      }
    }
  }

  /** Brief victory flash + slow-mo on the killing blow. The throne's
   *  death is the single most important moment in the campaign — at
   *  full speed it ticks past in 100ms. Slow Phaser's time scale to
   *  0.3 for ~700ms (≈2.3s real-time) and overlay a bright white→fade
   *  rectangle so the player has time to register "I did it." Time
   *  scale auto-restores via delayedCall so a Phaser-side update
   *  doesn't strand the slow-mo if onWin's GameOver scene swap is
   *  somehow delayed. */
  private fireVictoryFlash(): void {
    const sceneAny = this.scene as {
      add?: { graphics?: () => Phaser.GameObjects.Graphics };
      tweens?: { add?: (cfg: object) => void };
      time?: { delayedCall?: (delay: number, fn: () => void) => void };
      cameras?: { main?: { width?: number; height?: number; shake?: (d: number, i: number) => void } };
    };
    // Slow time. Affects creep movement, projectile flight, tween
    // duration — feels like a freeze-frame. Phaser scales `delta` for
    // its own time events; gameplay code consumes `delta` directly so
    // it slows in lockstep.
    const sceneTime = (this.scene as { time?: { timeScale?: number; delayedCall?: (d: number, f: () => void) => void } }).time;
    if (sceneTime && typeof sceneTime.timeScale === 'number') {
      sceneTime.timeScale = 0.3;
      sceneTime.delayedCall?.(700, () => { sceneTime.timeScale = 1.0; });
    }
    // Camera punch.
    sceneAny.cameras?.main?.shake?.(500, 0.014);
    // White flash overlay across the camera viewport.
    const camW = sceneAny.cameras?.main?.width ?? 1920;
    const camH = sceneAny.cameras?.main?.height ?? 1080;
    const g = sceneAny.add?.graphics?.();
    if (!g) return;
    g.setDepth(200);
    g.setScrollFactor?.(0);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(-camW, -camH, camW * 3, camH * 3);
    sceneAny.tweens?.add?.({
      targets: g, alpha: 0, duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Set the player's clicked CPU target — Tower or DestructibleStructure.
   *  Computes a pathfinder route to a cell adjacent to the target so
   *  the hero can walk through the maze instead of straight-line
   *  phasing into walls. For multi-cell structures, the path
   *  destination is one of the cells adjacent to the structure's
   *  bounding box. */
  setHeroTarget(target: Tower | DestructibleStructure | null): void {
    if (!this.hero) return;
    if (target === null) {
      this.hero.clickedTarget = null;
      return;
    }
    // Validate alive
    if ('alive' in target) {
      if (!target.alive) {
        this.hero.clickedTarget = null;
        return;
      }
    } else {
      const tw = target as Tower;
      if (!tw.destructible || (tw as { _expired?: boolean })._expired) {
        this.hero.clickedTarget = null;
        return;
      }
    }
    this.hero.clickedTarget = target;
    // Path to an adjacent walkable cell. For structures, target the
    // closest perimeter cell. For towers, target the tower's own cell.
    if ('widthCells' in target && (target as DestructibleStructure).widthCells > 1) {
      const s = target as DestructibleStructure;
      this.repathHeroToStructure(s);
    } else {
      this.repathHeroTo(target.col, target.row, /*adjacent=*/true);
    }
  }

  /** Backwards-compat alias for the old method name. Kept so any
   *  external callers continue to work; new call sites should use
   *  `setHeroTarget` directly. */
  setHeroTowerTarget(tower: Tower | null): void {
    this.setHeroTarget(tower);
  }

  /** Player commanded the hero to move to a specific cell. Compute a
   *  walk path around blocked terrain. */
  moveHeroTo(col: number, row: number): void {
    if (!this.hero) return;
    this.hero.clickedTarget = null;
    this.repathHeroTo(col, row, /*adjacent=*/false);
  }

  /** Path the hero to the closest walkable cell that's within the
   *  hero's attack range of a multi-cell destructible structure.
   *  Replaces the old "stop adjacent" behaviour — the hero now uses
   *  its full range, so a long-range mage doesn't waddle right up to
   *  the throne when it could fire from 4 tiles back. */
  private repathHeroToStructure(s: DestructibleStructure): void {
    if (!this.hero) return;
    const fromCol = pixelToCol(this.hero.x);
    const fromRow = Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE);
    // Candidate cells: any cell whose Chebyshev distance to ANY footprint
    // cell is ≤ rangeCells. We pick the cell closest to the hero's
    // current position so the path is as short as possible.
    const rangeCells = Math.max(1, Math.floor(this.hero.getEffectiveRange() / TILE_SIZE));
    let dest: PathPoint | null = null;
    let bestDist = Infinity;
    const cols = this.grid.cells[0].length;
    const rows = this.grid.cells.length;
    for (let r = Math.max(0, s.row - rangeCells); r < Math.min(rows, s.row + s.heightCells + rangeCells); r++) {
      for (let c = Math.max(0, s.col - rangeCells); c < Math.min(cols, s.col + s.widthCells + rangeCells); c++) {
        if (this.grid.cells[r][c] === CellType.Blocked) continue;
        // Chebyshev distance from (c,r) to footprint
        const dxF = Math.max(0, Math.max(s.col - c, c - (s.col + s.widthCells - 1)));
        const dyF = Math.max(0, Math.max(s.row - r, r - (s.row + s.heightCells - 1)));
        if (Math.max(dxF, dyF) > rangeCells) continue;
        const d = Math.abs(c - fromCol) + Math.abs(r - fromRow);
        if (d < bestDist) { bestDist = d; dest = { col: c, row: r }; }
      }
    }
    if (!dest) {
      this.hero.pathWaypoints = null;
      return;
    }
    const path = findPath(this.grid, { col: fromCol, row: fromRow }, dest);
    if (!path || path.length === 0) {
      this.hero.pathWaypoints = null;
      return;
    }
    const px = path.slice(1).map(p => ({ x: gridX(p.col), y: gridY(p.row) }));
    this.hero.pathWaypoints = px;
  }

  /** Compute a pixel-waypoint path from the hero's current cell to
   *  the target. When `adjacent` is true the path stops at the closest
   *  walkable cell within the hero's attack range of the target —
   *  used for tower targets so the hero stops at max range and fires
   *  from there instead of waddling up to the tower. */
  private repathHeroTo(col: number, row: number, adjacent: boolean): void {
    if (!this.hero) return;
    const fromCol = pixelToCol(this.hero.x);
    const fromRow = Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE);
    let dest: PathPoint = { col, row };
    if (adjacent) {
      // Stop within hero attack range, not just adjacent. Iterate the
      // bounding box of cells within Chebyshev rangeCells of the target,
      // pick the closest walkable to the hero's current position.
      const rangeCells = Math.max(1, Math.floor(this.hero.getEffectiveRange() / TILE_SIZE));
      const cols = this.grid.cells[0].length;
      const rows = this.grid.cells.length;
      let bestDist = Infinity;
      let found: PathPoint | null = null;
      for (let r = Math.max(0, row - rangeCells); r <= Math.min(rows - 1, row + rangeCells); r++) {
        for (let c = Math.max(0, col - rangeCells); c <= Math.min(cols - 1, col + rangeCells); c++) {
          if (this.grid.cells[r][c] === CellType.Blocked) continue;
          if (c === col && r === row) continue; // tower's own cell — not pathfindable
          if (Math.max(Math.abs(c - col), Math.abs(r - row)) > rangeCells) continue;
          const d = Math.abs(c - fromCol) + Math.abs(r - fromRow);
          if (d < bestDist) { bestDist = d; found = { col: c, row: r }; }
        }
      }
      if (found) dest = found;
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
   *  CPU tower OR multi-cell structure? Used by the click-handler in
   *  GameScene. Structures are checked first (3×3 footprint can
   *  overlap with the cell of an embedded tower at the center; the
   *  player should target the structure-as-a-whole, not the embedded
   *  tower individually). */
  findCpuTargetAt(col: number, row: number): Tower | DestructibleStructure | null {
    // Structure first (covers the embedded tower's cell + 8 others)
    for (const s of this.cpuStructures) {
      if (!s.alive) continue;
      if (col >= s.col && col < s.col + s.widthCells &&
          row >= s.row && row < s.row + s.heightCells) {
        return s;
      }
    }
    // Then standalone CPU towers (walls + non-throne defenders)
    for (const t of this.cpuTowers) {
      if (t.col === col && t.row === row && !(t as { _expired?: boolean })._expired) return t;
    }
    return null;
  }

  /** Backwards-compat alias. New callers should use `findCpuTargetAt`. */
  findCpuTowerAt(col: number, row: number): Tower | null {
    const t = this.findCpuTargetAt(col, row);
    if (!t) return null;
    if ('widthCells' in t && (t as DestructibleStructure).widthCells > 1) {
      // It's a structure — return its embedded tower if it has one,
      // otherwise null (legacy callers expect Tower).
      const s = t as DestructibleStructure;
      return s.embeddedTower ?? null;
    }
    return t as Tower;
  }

  /** Snapshot of all alive CPU towers. Used by win-check + UI. */
  getCpuTowers(): Tower[] {
    return this.cpuTowers.filter(t => !(t as { _expired?: boolean })._expired && (t.destructible?.hp ?? 1) > 0);
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

  /** Render a two-ring AOE pulse with camera shake. Used for meteor
   *  and splash hits. Headless-safe: bails on missing scene.add. */
  private drawAoeRing(x: number, y: number, radius: number, outerColor: number, innerColor: number, durationMs: number): void {
    const sceneAny = this.scene as {
      add?: { graphics?: () => Phaser.GameObjects.Graphics };
      tweens?: { add?: (cfg: object) => void };
      cameras?: { main?: { shake?: (d: number, i: number) => void } };
    };
    const g = sceneAny.add?.graphics?.();
    if (g) {
      g.setDepth(40);
      g.fillStyle(outerColor, 0.55);
      g.fillCircle(x, y, radius);
      g.fillStyle(innerColor, 0.4);
      g.fillCircle(x, y, radius * 0.55);
      g.lineStyle(4, outerColor, 1);
      g.strokeCircle(x, y, radius);
      sceneAny.tweens?.add?.({
        targets: g, alpha: 0, duration: durationMs,
        onComplete: () => g.destroy(),
      });
    }
    sceneAny.cameras?.main?.shake?.(Math.min(420, durationMs * 0.35), 0.008);
  }

  /** Render a phase-shift shockwave at the structure's center.
   *  Triggered from FinaleEffects phase-hook handlers when the throne
   *  crosses 50% / 25% / 10%. Two-color expanding ring + camera shake
   *  scaled to the structure's footprint. */
  drawPhaseShockwave(structure: DestructibleStructure, primary: number, secondary: number): void {
    const radius = Math.max(structure.widthCells, structure.heightCells) * TILE_SIZE * 1.2;
    this.drawAoeRing(structure.x, structure.y, radius, primary, secondary, 1400);
  }

  /** Per-frame send-priority chevron above any CPU tower whose
   *  priority cascade resolved to a send creep in the last 1000ms.
   *  Tells the player "your decoys are working" — without this, the
   *  cascade is invisible and feels like a black-box rule. Re-uses a
   *  shared graphics layer so no per-tower allocations. */
  private _sendIndicatorGfx: Phaser.GameObjects.Graphics | null = null;
  private drawSendPriorityIndicators(): void {
    const sceneAny = this.scene as { add?: { graphics?: () => Phaser.GameObjects.Graphics }; time?: { now: number } };
    const now = sceneAny.time?.now ?? 0;
    const FADE_MS = 1000;
    if (!this._sendIndicatorGfx && sceneAny.add?.graphics) {
      this._sendIndicatorGfx = sceneAny.add.graphics();
      this._sendIndicatorGfx.setDepth(46);
    }
    const g = this._sendIndicatorGfx;
    if (!g) return;
    g.clear();
    for (const t of this.cpuTowers) {
      if ((t as { _expired?: boolean })._expired) continue;
      const last = (t as { _targetingSendAt?: number })._targetingSendAt ?? 0;
      const age = now - last;
      if (age >= FADE_MS) continue;
      const alpha = 1 - age / FADE_MS;
      // Tiny double-chevron pointing down (toward the tower) in
      // amber. 8px wide × 6px tall. Visually distinct from the
      // channel-bar magenta + the hero retaliate cue.
      const cx = t.x;
      const cy = t.y - TILE_SIZE * 0.55;
      g.lineStyle(2, 0xffaa44, alpha);
      g.lineBetween(cx - 5, cy - 3, cx, cy + 1);
      g.lineBetween(cx, cy + 1, cx + 5, cy - 3);
      g.lineStyle(2, 0xffcc88, alpha * 0.7);
      g.lineBetween(cx - 5, cy, cx, cy + 4);
      g.lineBetween(cx, cy + 4, cx + 5, cy);
    }
  }

  /** Pillar-of-light VFX for hero summon. A vertical column flashing
   *  at the anchor point — sells the climactic "the Forge mage answers
   *  the call!" moment. Headless-safe: bails on missing scene.add. */
  private drawHeroSummonPillar(): void {
    const sceneAny = this.scene as {
      add?: { graphics?: () => Phaser.GameObjects.Graphics };
      tweens?: { add?: (cfg: object) => void };
      cameras?: { main?: { shake?: (d: number, i: number) => void } };
    };
    const x = this.heroAnchor.x;
    const y = this.heroAnchor.y;
    const g = sceneAny.add?.graphics?.();
    if (g) {
      g.setDepth(45);
      // Tall vertical pillar tapering inward, plus a fat ground pulse.
      const pillarH = 240;
      const pillarW = 56;
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(x - pillarW / 2, y - pillarH, pillarW, pillarH);
      g.fillStyle(0xcc88ff, 0.5);
      g.fillRect(x - pillarW * 0.7 / 2, y - pillarH, pillarW * 0.7, pillarH);
      g.fillStyle(0xffe066, 0.45);
      g.fillCircle(x, y, 70);
      g.lineStyle(3, 0xffffff, 1);
      g.strokeCircle(x, y, 70);
      g.lineStyle(2, 0xcc88ff, 0.85);
      g.strokeCircle(x, y, 110);
      sceneAny.tweens?.add?.({
        targets: g, alpha: 0, duration: 1500,
        ease: 'Sine.easeOut',
        onComplete: () => g.destroy(),
      });
    }
    sceneAny.cameras?.main?.shake?.(420, 0.010);
  }

  /** Spawn a floating damage number that rises and fades. M10's
   *  Phaser-text equivalent of HD's FloatingDamage system. */
  private spawnFloatingNumber(x: number, y: number, text: string, color: string, durationSec: number): void {
    const sceneAny = this.scene as {
      add?: { text?: (x: number, y: number, t: string, s: object) => Phaser.GameObjects.Text };
      tweens?: { add?: (cfg: object) => void };
    };
    const node = sceneAny.add?.text?.(x, y, text, {
      fontSize: '12px', color, fontFamily: 'monospace',
    });
    if (!node) return;
    node.setOrigin?.(0.5);
    node.setDepth?.(45);
    sceneAny.tweens?.add?.({
      targets: node,
      y: y - 24,
      alpha: 0,
      duration: durationSec * 1000,
      ease: 'Sine.easeOut',
      onComplete: () => node.destroy(),
    });
  }

  /** Render a two-segment lightning bolt for chain-lightning hits.
   *  Mid-jitter via seeded rng() so headless / capture stays repeatable. */
  private drawLightningArc(sx: number, sy: number, hx: number, hy: number): void {
    const sceneAny = this.scene as {
      add?: { graphics?: () => Phaser.GameObjects.Graphics };
      tweens?: { add?: (cfg: object) => void };
    };
    const g = sceneAny.add?.graphics?.();
    if (!g) return;
    g.setDepth(40);
    g.lineStyle(3, 0x44aaff, 0.9);
    const mx = (sx + hx) / 2 + (rng() - 0.5) * 30;
    const my = (sy + hy) / 2 + (rng() - 0.5) * 30;
    g.lineBetween(sx, sy, mx, my);
    g.lineBetween(mx, my, hx, hy);
    sceneAny.tweens?.add?.({
      targets: g, alpha: 0, duration: 500,
      onComplete: () => g.destroy(),
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
    // Finale-specific +40% HP buff. Arcanist's 280 base HP felt too
    // squishy under the cabal lattice's combined fire — bump via
    // tomeBonusHp (the natural additive max-HP slot, also persists
    // through respawn since getEffectiveMaxHp reads it).
    hero.tomeBonusHp += Math.round(hero.typeDef.hp * 0.4);
    hero.maxHp = hero.getEffectiveMaxHp();
    hero.hp = hero.maxHp;
    this.hero = hero;

    // Wire the hero economy panel. Rotation cadence 4 (vs HD's 5) so
    // a ~30-min match still produces fresh accessory offers every few
    // minutes. `initialRotationWave: 1` means offers are present from
    // first summon. Items / tomes / accessories all flow through the
    // same DOM panel HD uses — `EconomyPanelDOM`'s "Items" tab auto-
    // shows when `heroShop` becomes non-null.
    this.econController = new HeroEconomyController(
      hero, this.economy, this.eventLog,
      { rotationCadence: 4, initialRotationWave: 1 },
    );
    this.econController.registerCallbacks();
    this.econController.syncToDOM();

    this.onHeroSpawned?.();
  }

  /** Surface the controller for outside coordination (e.g. GameScene
   *  per-frame sync, mode wave-cleared hooks). Null until the hero is
   *  first summoned. */
  getEconController(): HeroEconomyController | null {
    return this.econController;
  }

  /** Per-wave heal + interest + accessory rotation. Called from
   *  GameScene.onWaveCleared after the active mode's wave-cleared
   *  hook runs. Idempotent before hero summon (no-op while
   *  controller is null). */
  onWaveCleared(waveNum: number): void {
    if (!this.econController) return;
    const interestRate = this.hero?.interestRate ?? 0;
    this.econController.onWaveCleared(waveNum, {
      // Hero gets 15% per-wave heal in finale (HD is 20%, but M10 is
      // longer + tower kills already drop XP/gold so the heal can be
      // a touch lighter). Tune in playtest.
      healPercent: 0.15,
      interestRate,
      onInterestPaid: (amt) => {
        this.eventLog.gameMessage(`+${amt}g interest (${Math.round(interestRate * 100)}%)`);
      },
    });
  }
}
