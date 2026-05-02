/**
 * ChannelEffects — registry + dispatcher for "what happens when a
 * channel completes" (Plan A: Counterspell).
 *
 * Each effect is a pure function `(ctx) => void` that does one thing:
 *  - clear_towers_radius: destroys towers in radius around caster
 *  - buff_next_wave_hp: increments a per-mission HP buff stack
 *  - chain_lightning_on_towers: disables towers in radius for N seconds
 *  - summon_creeps: spawns additional creeps mid-wave
 *  - permadebuff_player_towers: scales player tower DPS down for the
 *    rest of the mission
 *  - polymorph_tower: turns one tower into a chicken (no fire) for N seconds
 *  - banish_tower: removes one tower from the grid for N seconds
 *  - meteor_drop: AOE damage at random tile
 *
 * Plan A v1 ships clear_towers_radius + buff_next_wave_hp (M1, M2).
 * Other effects land with their respective missions. The registry is
 * additive — register more effects without changing this file.
 */

import * as Phaser from 'phaser';

export interface ChannelEffectContext {
  scene: Phaser.Scene;
  caster: any;
  meta: Record<string, unknown>;
}

type EffectFn = (ctx: ChannelEffectContext) => void;

const REGISTRY: Map<string, EffectFn> = new Map();

export const ChannelEffects = {
  register(id: string, fn: EffectFn): void {
    REGISTRY.set(id, fn);
  },

  dispatch(id: string, ctx: ChannelEffectContext): void {
    const fn = REGISTRY.get(id);
    if (!fn) {
      console.warn(`[ChannelEffects] no effect registered for "${id}"`);
      return;
    }
    try {
      fn(ctx);
    } catch (err) {
      console.warn(`[ChannelEffects] effect "${id}" threw:`, err);
    }
  },

  has(id: string): boolean {
    return REGISTRY.has(id);
  },

  __reset(): void {
    REGISTRY.clear();
  },
};

// ─── Built-in effects ──────────────────────────────────────────────

/** clear_towers_radius — destroy player towers within radius of caster.
 *  Used by M1's Glyph Sigil. meta: { radius: pixels (default 5 tiles) }.
 *
 *  Radius bumped from 3→5 tiles after first playtest: a 3-tile radius
 *  routinely missed every player tower if the Sigil cast near spawn,
 *  making the cast feel inert ("nothing happened"). 5 tiles ≈ 140px is
 *  large enough that mazing-near-the-path almost always loses something. */
ChannelEffects.register('clear_towers_radius', (ctx) => {
  const radius = (ctx.meta.radius as number) ?? 140; // 5 tiles
  const caster = ctx.caster;
  if (!caster || typeof caster.x !== 'number') return;
  const scene = ctx.scene as any;
  const towers = scene.towers ?? scene.towerManager?.towers;
  if (!Array.isArray(towers)) return;
  const toRemove: any[] = [];
  for (const t of towers) {
    if (!t || t._expired) continue;
    const dx = (t.x ?? 0) - caster.x;
    const dy = (t.y ?? 0) - caster.y;
    if (dx * dx + dy * dy <= radius * radius) {
      toRemove.push(t);
    }
  }
  for (const t of toRemove) {
    t._expired = true; // GameScene's frame loop cleans up _expired towers
  }
  // Visible feedback — multi-ring shockwave + camera shake. Every cast
  // lands visibly even when no towers are in radius; players need to
  // *see* the threat connect or they'll keep ignoring the casters.
  const g = scene.add?.graphics?.();
  if (g) {
    g.setDepth(40);
    // Outer ring at full radius — fades over 800ms.
    g.lineStyle(4, 0xaa44ff, 1);
    g.strokeCircle(caster.x, caster.y, radius);
    // Inner ring expanding from caster.
    g.lineStyle(2, 0xff66ff, 0.85);
    g.strokeCircle(caster.x, caster.y, radius * 0.5);
    // Filled hot core fading out.
    g.fillStyle(0xff66ff, 0.4);
    g.fillCircle(caster.x, caster.y, 28);
    scene.tweens?.add?.({
      targets: g,
      alpha: 0,
      duration: 900,
      onComplete: () => g.destroy(),
    });
  }
  // Camera shake — small, brief. Sells the impact even when zero
  // towers were in range.
  scene.cameras?.main?.shake?.(180, 0.005);
  // Event-log callout so the player gets a concrete read on what just
  // happened. Reads off the existing eventLog used by the rest of the
  // game for cast-relevant notifications.
  const log = scene.eventLog;
  if (log?.gameMessage) {
    const cleared = toRemove.length;
    log.gameMessage(
      cleared > 0
        ? `⚠ Sigil cast landed — ${cleared} tower${cleared > 1 ? 's' : ''} destroyed`
        : `⚠ Sigil cast landed — no towers in radius`,
    );
  }
});

/** buff_next_wave_hp — increment a per-mission HP-buff stack that the
 *  spawn pipeline reads to scale next-wave creep HP. Cumulative.
 *  meta: { percent: 0.30 } (default +30% per uninterrupted Scribe) */
ChannelEffects.register('buff_next_wave_hp', (ctx) => {
  const pct = (ctx.meta.percent as number) ?? 0.30;
  const scene = ctx.scene as any;
  const prev = (scene._channelHpBuff as number) ?? 0;
  scene._channelHpBuff = prev + pct;
  // Visible feedback — gold pulse at the caster + event-log callout.
  // Without these, the buff is invisible until next wave's HP bars
  // come back inflated; players miss the cause-and-effect.
  const caster = ctx.caster;
  if (caster && typeof caster.x === 'number') {
    const g = scene.add?.graphics?.();
    if (g) {
      g.setDepth(40);
      g.fillStyle(0xffd966, 0.5);
      g.fillCircle(caster.x, caster.y, 32);
      g.lineStyle(3, 0xffe066, 1);
      g.strokeCircle(caster.x, caster.y, 32);
      scene.tweens?.add?.({
        targets: g,
        alpha: 0,
        duration: 800,
        onComplete: () => g.destroy(),
      });
    }
  }
  const log = scene.eventLog;
  if (log?.gameMessage) {
    const totalPct = Math.round(scene._channelHpBuff * 100);
    log.gameMessage(`⚠ Scribe cast landed — future creeps +${totalPct}% HP`);
  }
});
