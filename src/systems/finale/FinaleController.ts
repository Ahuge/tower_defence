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
import { Damageable } from './Damageable';
import { dispatchFinaleEffect } from './FinaleEffects';

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
        if (now - t._lastSendHitAt < ATTACKING_WINDOW_MS) {
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
        if (!target && hero && hero.alive && now - t._lastHeroHitAt < ATTACKING_WINDOW_MS) {
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

    // PRD 06 — Sends attack adjacent CPU destructibles (walls, towers,
    // and the throne structure) at a discrete 1s cadence. Each send
    // ticks an internal cooldown via `_lastAttackAt` (scene time ms).
    // When the cooldown expires AND the send is within touch radius
    // of any alive CPU-owned destructible, it picks the closest one
    // and deals `floor(creep.maxHp * scale / 100)` (min 1) damage.
    // Sends keep walking — opportunistic stop-and-attack would strand
    // them; per the user spec they path normally.
    //
    // Gating: this loop runs as soon as ANY send creep exists. Earlier
    // versions gated on `firstSpawnDone || hero` which prevented sends
    // from chipping CPU towers BEFORE the first hero summon — that
    // robbed the player's pre-summon window of any agency.
    const cadenceMs = this.rules.sendAttackCadenceMs ?? 1000;
    const dmgScale = this.rules.sendAttackDamageScale ?? 1.0;
    {
      const now = this.scene.time.now;
      const fd = (this.scene as { floatingDamage?: { spawn: (x: number, y: number, text: string, color?: string) => void } }).floatingDamage;
      for (const c of creeps as Creep[]) {
        if (!c.alive || !c.isSend || !c.isFriendly) continue;
        const sref = c as Creep & { _lastAttackAt?: number };
        if (now - (sref._lastAttackAt ?? 0) < cadenceMs) continue;
        // Find the closest CPU destructible within touch radius. Both
        // Tower and DestructibleStructure expose .x/.y as their pixel
        // center, so a single pixel-distance check suffices for both.
        let best: Tower | DestructibleStructure | null = null;
        let bestDistSq = 40 * 40;
        for (const t of this.cpuTowers) {
          if ((t as { _expired?: boolean })._expired) continue;
          if (!t.destructible) continue;
          const dx = c.x - t.x, dy = c.y - t.y;
          const ds = dx * dx + dy * dy;
          if (ds < bestDistSq) { bestDistSq = ds; best = t; }
        }
        for (const s of this.cpuStructures) {
          if (!s.alive) continue;
          // Adjacent check via pixel distance from send to structure
          // perimeter. Approximate: if send center is within
          // (footprint half-extent + tile_size) of structure center.
          const halfW = (s.widthCells * TILE_SIZE) / 2;
          const halfH = (s.heightCells * TILE_SIZE) / 2;
          const dx = Math.max(0, Math.abs(c.x - s.x) - halfW);
          const dy = Math.max(0, Math.abs(c.y - s.y) - halfH);
          const ds = dx * dx + dy * dy;
          if (ds < bestDistSq) { bestDistSq = ds; best = s; }
        }
        if (best) {
          const damage = Math.max(1, Math.floor((c.maxHp * dmgScale) / 100));
          best.takeDamage(damage);
          sref._lastAttackAt = now;
          // Visual feedback so the player can see sends chipping the
          // CPU lattice. Without this the damage was silent and looked
          // like nothing happened.
          fd?.spawn?.(best.x, best.y - 18, String(damage), '#ffaa44');
          // Mark the target as "recently attacked by sends" — drives
          // the new tower target priority (creeps_attacking_it ranks
          // first). Also marks the send as "recently engaging this
          // tower" for hero priority lookups.
          (best as { _lastSendHitAt?: number })._lastSendHitAt = now;
        }
      }

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
        if (!(t as { _expired?: boolean })._expired && (t.hp ?? 0) > 0) aliveTowers++;
      }
      let aliveWinTargets = 0;
      for (const s of this.cpuStructures) {
        if (s.isMissionWinTarget && s.alive) aliveWinTargets++;
      }
      if (aliveTowers === 0 && aliveWinTargets === 0) {
        this.winFired = true;
        this.onWin?.();
      }
    }
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

  /** Path the hero to the closest walkable cell adjacent to a 3×3
   *  (or NxM) destructible structure. Picks among the perimeter cells
   *  the one that's both walkable AND closest to the hero in Manhattan
   *  distance, so the hero stops just outside the structure footprint
   *  with a clear line of sight to fire. */
  private repathHeroToStructure(s: DestructibleStructure): void {
    if (!this.hero) return;
    const fromCol = pixelToCol(this.hero.x);
    const fromRow = Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE);
    // Build candidate perimeter cells — every cell directly adjacent
    // to the WxH footprint (not corners, just orthogonal neighbours).
    const candidates: PathPoint[] = [];
    for (let dr = 0; dr < s.heightCells; dr++) {
      candidates.push({ col: s.col - 1, row: s.row + dr });
      candidates.push({ col: s.col + s.widthCells, row: s.row + dr });
    }
    for (let dc = 0; dc < s.widthCells; dc++) {
      candidates.push({ col: s.col + dc, row: s.row - 1 });
      candidates.push({ col: s.col + dc, row: s.row + s.heightCells });
    }
    let dest: PathPoint | null = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      if (c.col < 0 || c.col >= this.grid.cells[0].length) continue;
      if (c.row < 0 || c.row >= this.grid.cells.length) continue;
      if (this.grid.cells[c.row][c.col] === CellType.Blocked) continue;
      const d = Math.abs(c.col - fromCol) + Math.abs(c.row - fromRow);
      if (d < bestDist) { bestDist = d; dest = c; }
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
    // Finale-specific +40% HP buff. Arcanist's 280 base HP felt too
    // squishy under the cabal lattice's combined fire — bump via
    // tomeBonusHp (the natural additive max-HP slot, also persists
    // through respawn since getEffectiveMaxHp reads it).
    hero.tomeBonusHp += Math.round(hero.typeDef.hp * 0.4);
    hero.maxHp = hero.getEffectiveMaxHp();
    hero.hp = hero.maxHp;
    this.hero = hero;
    this.onHeroSpawned?.();
  }
}
