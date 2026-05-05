/**
 * DestructibleStructure — multi-tile boss structure (PRD 06). M10's
 * Archmage Throne is the first instance; future campaigns reuse this
 * for siege engines / ancient trees / rift gates.
 *
 * Visual: WxH px sprite (where W = 28 * widthCells, H = 28 * heightCells)
 * picked from a vertical-strip spritesheet of N damage frames. Frame
 * index = `floor((1 - hp/maxHp) * damageFrames)`, clamped.
 *
 * Combat: when `def.embeddedTowerId` is set, the structure embeds a
 * Tower at its center cell to provide firing capability. Damage routes
 * through the embedded tower so we reuse its tested combat code (no
 * duplication). When standalone (no embedded tower), the structure is
 * passive — only the player's hero/sends can deal damage to it.
 *
 * Implements `Damageable` so the hero's targeting and the send-attack
 * adapter treat it identically to a Tower.
 */
import * as Phaser from 'phaser';
import { TILE_SIZE, gridX, gridY, gridLeftX } from '../config';
import { Tower } from './Tower';
import { DestructibleStructureDef, DestructibleStructurePlacement, getDestructibleStructureDef } from '../data/DestructibleStructures';
import { Damageable } from '../systems/finale/Damageable';
import { destructibleStructureFrame } from '../systems/ArenaFloorRenderer';

export class DestructibleStructure implements Damageable {
  // ── Damageable conformance (mostly delegated to embedded tower or
  // ── standalone state) ─────────────────────────────────────────
  readonly id: string;
  readonly col: number;
  readonly row: number;
  readonly widthCells: number;
  readonly heightCells: number;
  readonly factionId: string;
  readonly ownerIndex: number;
  readonly isMissionWinTarget: boolean;

  /** Pixel center of the WxH footprint (used for hero pathing target,
   *  damage-number anchor, sprite origin). */
  readonly x: number;
  readonly y: number;

  /** Maximum HP. For embedded-tower structures, this mirrors the
   *  embedded tower's maxHp. */
  readonly maxHp: number;

  // ── Configuration ────────────────────────────────────────────
  readonly def: DestructibleStructureDef;
  /** Optional embedded tower at the center cell — handles firing. */
  readonly embeddedTower: Tower | null;
  /** HP fraction → effect-id, e.g. { '0.50': 'arcane_throne_heal' }.
   *  Merges per-placement override over def-level hooks. */
  readonly phaseHooks: { [hpFraction: string]: string };

  // ── Runtime state ────────────────────────────────────────────
  /** Standalone HP — used when embeddedTower is null. */
  private standaloneHp: number;
  /** Set of phase-hook ids that have already fired (one-shot). */
  private _firedPhaseHooks: Set<string> = new Set();
  /** Last frame index drawn — used to skip redundant setFrame calls. */
  private lastFrame: number = -1;
  /** True once HP hits 0 and the entity has been marked for removal. */
  _expired: boolean = false;

  // ── Sprite / fallback graphics ───────────────────────────────
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private hpBarBg: Phaser.GameObjects.Graphics | null = null;
  private hpBarFg: Phaser.GameObjects.Graphics | null = null;

  /**
   * Construct a DestructibleStructure. The embedded tower (if any)
   * must be placed via TowerManager BEFORE constructing this — pass
   * the placed Tower instance in `embeddedTower`. The structure binds
   * to it for HP delegation; the structure does NOT own the tower's
   * lifecycle (TowerManager.cleanupExpired handles that).
   */
  constructor(args: {
    scene: Phaser.Scene;
    placement: DestructibleStructurePlacement;
    embeddedTower: Tower | null;
    factionId: string;
    ownerIndex: number;
  }) {
    const def = getDestructibleStructureDef(args.placement.id);
    this.def = def;
    this.id = def.id;
    this.col = args.placement.col;
    this.row = args.placement.row;
    this.widthCells = def.widthCells;
    this.heightCells = def.heightCells;
    this.factionId = args.factionId;
    this.ownerIndex = args.ownerIndex;
    this.isMissionWinTarget = args.placement.isMissionWinTarget ?? false;

    // Pixel center of the footprint. gridX/gridY return cell CENTER
    // (not the left edge), so we use gridLeftX + half-footprint width
    // for x; for y we mirror the formula manually since there's no
    // gridTopY helper (gridY = row*TILE + TILE/2 + offset, so row top
    // = gridY - TILE/2). Earlier (gridX(col) + gridX(col+widthCells))/2
    // was off by half a tile in both directions because gridX returns
    // the cell CENTER, not the left edge.
    this.x = gridLeftX(this.col) + (this.widthCells * TILE_SIZE) / 2;
    this.y = (gridY(this.row) - TILE_SIZE / 2) + (this.heightCells * TILE_SIZE) / 2;

    this.embeddedTower = args.embeddedTower;
    this.maxHp = args.placement.hp ?? def.defaultHp;
    this.standaloneHp = this.maxHp;

    // If we have an embedded tower, mirror our HP onto it so all the
    // existing hp/maxHp/destructible code paths Just Work.
    if (this.embeddedTower) {
      this.embeddedTower.destructible = true;
      this.embeddedTower.ownerIndex = args.ownerIndex;
      this.embeddedTower.maxHp = this.maxHp;
      this.embeddedTower.hp = this.maxHp;
      // Mark the tower as a structure-attached attacker so other
      // systems can recognise the relationship if needed.
      (this.embeddedTower as { _structureRef?: DestructibleStructure })._structureRef = this;
    }

    // Merge phase hooks: per-placement overrides def-level.
    this.phaseHooks = { ...(def.phaseHooks ?? {}), ...(args.placement.phaseHooks ?? {}) };

    // ── Sprite (preferred) or Graphics fallback ──────────────────
    const textures = (args.scene as { textures?: { exists: (k: string) => boolean } }).textures;
    const addSprite = (args.scene as { add?: { sprite?: (...a: unknown[]) => Phaser.GameObjects.Sprite } }).add?.sprite;
    if (textures?.exists(def.textureKey) && typeof addSprite === 'function') {
      this.sprite = addSprite.call(args.scene.add, this.x, this.y, def.textureKey, 0);
      this.sprite.setDepth?.(2); // above floor, below towers/creeps
      this.sprite.setOrigin?.(0.5, 0.5);
    } else if (typeof (args.scene.add as { graphics?: () => Phaser.GameObjects.Graphics }).graphics === 'function') {
      this.graphics = args.scene.add.graphics();
      this.graphics.setDepth?.(2);
    }

    // HP bar (above the structure)
    if (typeof (args.scene.add as { graphics?: () => Phaser.GameObjects.Graphics }).graphics === 'function') {
      this.hpBarBg = args.scene.add.graphics();
      this.hpBarFg = args.scene.add.graphics();
      this.hpBarBg.setDepth?.(10);
      this.hpBarFg.setDepth?.(11);
    }

    this.draw();
  }

  // ── Damageable conformance ────────────────────────────────────

  get hp(): number {
    if (this.embeddedTower) return this.embeddedTower.hp ?? 0;
    return this.standaloneHp;
  }
  set hp(v: number) {
    if (this.embeddedTower) this.embeddedTower.hp = v;
    else this.standaloneHp = v;
  }

  get alive(): boolean {
    if (this._expired) return false;
    if (this.embeddedTower) {
      const exp = (this.embeddedTower as { _expired?: boolean })._expired;
      return !exp && (this.embeddedTower.hp ?? 0) > 0;
    }
    return this.standaloneHp > 0;
  }

  takeDamage(amount: number): boolean {
    if (this._expired) return false;
    let killing = false;
    if (this.embeddedTower) {
      // Delegate to tower — its takeDamage handles _expired marking.
      killing = this.embeddedTower.takeDamage(amount);
    } else {
      if (this.standaloneHp <= 0) return false;
      this.standaloneHp -= amount;
      if (this.standaloneHp <= 0) {
        this.standaloneHp = 0;
        killing = true;
      }
    }
    if (killing) this._expired = true;
    return killing;
  }

  // ── Phase hook polling ────────────────────────────────────────
  /**
   * Returns the list of phase-hook ids that should fire THIS frame
   * (HP just crossed the fraction threshold, hook hasn't fired yet),
   * and marks them fired so subsequent calls don't re-emit. Caller
   * dispatches each through `FinaleEffects.dispatch(id, this)`.
   */
  collectPhaseHooks(): string[] {
    if (!this.alive || this.maxHp <= 0) return [];
    const fired: string[] = [];
    const hpFrac = this.hp / this.maxHp;
    for (const [fracStr, hookId] of Object.entries(this.phaseHooks)) {
      if (this._firedPhaseHooks.has(hookId)) continue;
      const frac = parseFloat(fracStr);
      if (Number.isFinite(frac) && hpFrac <= frac) {
        this._firedPhaseHooks.add(hookId);
        fired.push(hookId);
      }
    }
    return fired;
  }

  // ── Rendering ─────────────────────────────────────────────────
  draw(): void {
    const hpFrac = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    const frameIdx = destructibleStructureFrame(hpFrac, this.def.damageFrames);

    if (this.sprite) {
      if (frameIdx !== this.lastFrame) {
        this.sprite.setFrame(frameIdx);
        this.lastFrame = frameIdx;
      }
    } else if (this.graphics) {
      // Headless / asset-missing fallback — draw a violet-tinted block
      // outline so the structure is still visible during scene tests.
      const g = this.graphics;
      g.clear();
      const w = this.widthCells * TILE_SIZE;
      const h = this.heightCells * TILE_SIZE;
      const left = this.x - w / 2;
      const top = this.y - h / 2;
      const dim = 1 - hpFrac;
      const fill = Phaser.Display.Color.GetColor(
        Math.round(60 + dim * 40),
        Math.round(40 + dim * 20),
        Math.round(120 - dim * 60),
      );
      g.fillStyle(fill, 0.85);
      g.fillRect(left, top, w, h);
      g.lineStyle(2, 0x6644ff, 1);
      g.strokeRect(left, top, w, h);
    }

    this.drawHpBar();
  }

  private drawHpBar(): void {
    if (!this.hpBarBg || !this.hpBarFg) return;
    if (!this.alive || this.hp >= this.maxHp) {
      this.hpBarBg.clear();
      this.hpBarFg.clear();
      return;
    }
    const w = this.widthCells * TILE_SIZE - 6;
    const h = 4;
    const top = this.y - (this.heightCells * TILE_SIZE) / 2 - 8;
    const left = this.x - w / 2;
    const frac = Math.max(0, Math.min(1, this.hp / this.maxHp));
    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x110022, 0.85);
    this.hpBarBg.fillRect(left - 1, top - 1, w + 2, h + 2);
    this.hpBarBg.lineStyle(1, 0xffd060, 1);
    this.hpBarBg.strokeRect(left - 1, top - 1, w + 2, h + 2);
    this.hpBarFg.clear();
    const fillCol = frac > 0.5 ? 0xffe8a0 : frac > 0.2 ? 0xffaa44 : 0xff4422;
    this.hpBarFg.fillStyle(fillCol, 1);
    this.hpBarFg.fillRect(left, top, w * frac, h);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.graphics?.destroy();
    this.hpBarBg?.destroy();
    this.hpBarFg?.destroy();
    this.sprite = null;
    this.graphics = null;
    this.hpBarBg = null;
    this.hpBarFg = null;
  }

  /** All grid cells the structure occupies (for blocking + adjacency
   *  checks). Used by the send-attack adapter to detect "is this send
   *  adjacent to the structure?". */
  getOccupiedCells(): { col: number; row: number }[] {
    const cells: { col: number; row: number }[] = [];
    for (let dr = 0; dr < this.heightCells; dr++) {
      for (let dc = 0; dc < this.widthCells; dc++) {
        cells.push({ col: this.col + dc, row: this.row + dr });
      }
    }
    return cells;
  }
}
