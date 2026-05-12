/**
 * Raider — the player-trained mobile unit for the Mech finale (M10).
 *
 * Trained at the Workshop, walks the grid, auto-attacks the nearest
 * hostile in range, can be redirected with a click target. No special
 * abilities — these are grunts, not heroes. Stats are stamped at spawn
 * time from the Workshop's current upgrade tier and never change.
 *
 * Pure logic: position, HP, attack, target selection, movement.
 * Phaser sprite + GameScene wiring live in SabotageController. This
 * file is headless-testable.
 */

/** Minimal contract a Raider can target. Deliberately narrower than
 *  the existing `Damageable` interface — Tower's `takeDamage` returns
 *  boolean (killing-blow signal) while Creep's returns void, and
 *  Raiders need to hit both. The `boolean | void` return is the
 *  superset that lets a single targeting list cover creeps + CPU
 *  towers without wrapping. */
export interface RaiderTarget {
  x: number;
  y: number;
  alive: boolean;
  takeDamage(amount: number): boolean | void;
}

export interface RaiderConfig {
  /** Stable id. The controller assigns sequentially so tests + UIs
   *  can address individual raiders without holding object refs. */
  id: number;
  /** Spawn pixel. */
  x: number;
  y: number;
  /** Stat block stamped from the Workshop at spawn time. */
  hp: number;
  attack: number;
  /** Pixels per second. */
  speed: number;
  /** Pixel range within which the raider can hit a target (and stops
   *  walking toward it to fire). Default 32px = ~1 tile. */
  range?: number;
  /** Time between shots in ms. Default 800ms. */
  fireRateMs?: number;
}

const DEFAULT_RANGE = 32;
const DEFAULT_FIRE_RATE_MS = 800;

export class Raider {
  readonly id: number;
  x: number;
  y: number;

  readonly maxHp: number;
  hp: number;
  readonly attack: number;
  readonly speed: number;
  readonly range: number;
  readonly fireRateMs: number;

  alive: boolean = true;
  /** Player-set target. While non-null, the raider walks toward this
   *  target and attacks it preferentially. Cleared automatically when
   *  the target dies. */
  manualTarget: RaiderTarget | null = null;

  /** Last `now` (ms) the raider fired. -Infinity = never. */
  private _lastFiredAt: number = -Infinity;

  constructor(cfg: RaiderConfig) {
    this.id = cfg.id;
    this.x = cfg.x;
    this.y = cfg.y;
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.attack = cfg.attack;
    this.speed = cfg.speed;
    this.range = cfg.range ?? DEFAULT_RANGE;
    this.fireRateMs = cfg.fireRateMs ?? DEFAULT_FIRE_RATE_MS;
  }

  /** Apply damage. Returns true on the killing blow. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  /** Set the player-clicked target. Pass null to clear and revert to
   *  auto-target behavior. The raider will continue any in-flight
   *  attack on the previous target — no instant cancel. */
  setManualTarget(target: RaiderTarget | null): void {
    this.manualTarget = target;
  }

  /** Per-frame tick. Picks a target (manual override > nearest in
   *  `targets`), walks toward it if out of range, fires at it if in
   *  range and the cooldown has elapsed. Returns the raider's current
   *  effective target (for VFX hooks); null when nothing in sight. */
  update(now: number, deltaMs: number, targets: RaiderTarget[]): RaiderTarget | null {
    if (!this.alive) return null;

    const target = this._resolveTarget(targets);
    if (!target) return null;

    const d = distance(this.x, this.y, target.x, target.y);
    if (d > this.range) {
      this._walkToward(target, deltaMs);
      return target;
    }

    if (now - this._lastFiredAt >= this.fireRateMs) {
      this._lastFiredAt = now;
      const killed = target.takeDamage(this.attack);
      // If the killing blow felled our manual target, clear it so the
      // raider falls back to auto-target on the next tick instead of
      // walking back to a corpse. Thread the returned `killed` signal
      // so we don't depend on the alive-flag update racing the
      // takeDamage call.
      if (this.manualTarget && (!this.manualTarget.alive || killed)) this.manualTarget = null;
    }
    return target;
  }

  /** Manual > auto. Manual cleared if dead. */
  private _resolveTarget(targets: RaiderTarget[]): RaiderTarget | null {
    if (this.manualTarget && !this.manualTarget.alive) {
      this.manualTarget = null;
    }
    if (this.manualTarget) return this.manualTarget;
    return this._nearestAlive(targets);
  }

  private _nearestAlive(targets: RaiderTarget[]): RaiderTarget | null {
    let best: RaiderTarget | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = distance(this.x, this.y, t.x, t.y);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  private _walkToward(target: RaiderTarget, deltaMs: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d === 0) return;
    const step = (this.speed * deltaMs) / 1000;
    const move = Math.min(step, d);
    this.x += (dx / d) * move;
    this.y += (dy / d) * move;
  }
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
