/**
 * applyHeroPendingEffects — shared drainer for the Hero's per-frame
 * ability queues (`pendingMeteor`, `pendingSplash`,
 * `pendingChainLightning`).
 *
 * The Hero produces these queues on a tick (`Hero.update`), but doesn't
 * apply them itself — the owner of the surrounding world decides what
 * counts as a target. ArenaManager (Hero Defense mode) damages
 * ArenaCreeps inside the arena rectangle. FinaleController (M10) damages
 * wave creeps + destructible CPU towers + boss structures across the
 * full grid.
 *
 * Without this helper, FinaleController shipped with no drain at all:
 * `pendingMeteor` would set on first cast and never clear, jamming
 * the meteor-storm tick (`Hero.ts` only fires the next meteor when
 * `!this.pendingMeteor`). Symptom: Meteor Storm visibly fires once and
 * then permanently silent.
 *
 * `pendingDamageNumbers` and `pendingEffects` are NOT drained here —
 * those are visual queues the caller renders on its own surface
 * (ArenaManager pushes ArenaEffect objects; FinaleController draws via
 * Phaser graphics directly), so the caller drains those after this.
 */

import type { Hero } from '../../entities/Hero';

/** Anything the queues can damage. Tower / DestructibleStructure /
 *  Creep / ArenaCreep all satisfy this (their takeDamage signatures
 *  diverge in return type — void vs boolean — so we don't rely on it). */
export interface PendingHittable {
  x: number;
  y: number;
  alive: boolean;
  takeDamage(amount: number): void | boolean;
}

export interface ApplyHeroPendingDeps {
  hero: Hero;
  /** Live targets the queues can damage. Caller filters dead/expired
   *  entries before calling. */
  targets: PendingHittable[];
  /** Where the meteor lands when the queue fires. Caller picks: arena
   *  uses arena-bounds random; finale could pick "near hero target". */
  pickMeteorPosition: (radius: number) => { x: number; y: number };
  /** Optional VFX hooks. Caller renders — Arena pushes ArenaEffects,
   *  Finale uses Phaser graphics directly. */
  onMeteorVfx?: (x: number, y: number, radius: number) => void;
  onSplashVfx?: (x: number, y: number, radius: number) => void;
  onChainHitVfx?: (sourceX: number, sourceY: number, hitX: number, hitY: number) => void;
}

export function applyHeroPendingEffects(deps: ApplyHeroPendingDeps): void {
  const { hero, targets } = deps;

  // ─── pendingMeteor ─────────────────────────────────────────────
  if (hero.pendingMeteor) {
    const m = hero.pendingMeteor;
    const { x: mx, y: my } = deps.pickMeteorPosition(m.radius);
    deps.onMeteorVfx?.(mx, my, m.radius);
    const r2 = m.radius * m.radius;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - mx;
      const dy = t.y - my;
      if (dx * dx + dy * dy <= r2) {
        t.takeDamage(m.damage);
        hero.totalDamageDealt += m.damage;
        hero.pendingDamageNumbers.push({
          x: t.x, y: t.y - 10, text: String(m.damage),
          color: '#cc66ff', duration: 1.0,
        });
        if (!t.alive) hero.kills++;
      }
    }
    hero.pendingMeteor = null;
  }

  // ─── pendingSplash (list — N entries per frame) ────────────────
  for (const splash of hero.pendingSplash) {
    deps.onSplashVfx?.(splash.x, splash.y, splash.radius);
    const r2 = splash.radius * splash.radius;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - splash.x;
      const dy = t.y - splash.y;
      if (dx * dx + dy * dy <= r2) {
        t.takeDamage(splash.damage);
        hero.totalDamageDealt += splash.damage;
        hero.pendingDamageNumbers.push({
          x: t.x, y: t.y - 10, text: String(splash.damage),
          color: '#ff8844', duration: 0.6,
        });
        if (!t.alive) hero.kills++;
      }
    }
  }
  hero.pendingSplash.length = 0;

  // ─── pendingChainLightning (80px hardcoded radius — matches arena) ──
  if (hero.pendingChainLightning) {
    const cl = hero.pendingChainLightning;
    const r2 = 80 * 80;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - cl.x;
      const dy = t.y - cl.y;
      if (dx * dx + dy * dy <= r2) {
        t.takeDamage(cl.damage);
        hero.totalDamageDealt += cl.damage;
        hero.pendingDamageNumbers.push({
          x: t.x, y: t.y - 10, text: String(cl.damage),
          color: '#44aaff', duration: 0.6,
        });
        deps.onChainHitVfx?.(cl.x, cl.y, t.x, t.y);
        if (!t.alive) hero.kills++;
      }
    }
    hero.pendingChainLightning = null;
  }
}
