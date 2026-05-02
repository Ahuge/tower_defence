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
 *  Used by M1's Glyph Sigil. meta: { radius: pixels (default TILE*3) } */
ChannelEffects.register('clear_towers_radius', (ctx) => {
  const radius = (ctx.meta.radius as number) ?? 84; // 3 tiles
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
  // Visible feedback — purple shockwave at the caster.
  const g = scene.add?.graphics?.();
  if (g) {
    g.lineStyle(3, 0xaa44ff, 0.8);
    g.strokeCircle(caster.x, caster.y, radius);
    scene.tweens?.add?.({
      targets: g,
      alpha: 0,
      duration: 600,
      onComplete: () => g.destroy(),
    });
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
});
