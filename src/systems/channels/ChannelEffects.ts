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

/** buff_next_wave_hp — increment a per-mission HP-buff stack AND
 *  optionally summon extra creeps at the caster's location. Cumulative.
 *
 *  meta:
 *    percent: 0.30        — HP buff to stack onto every future creep
 *    summonCount: 3       — additional creeps spawned at caster (default 0)
 *    summonType: 'standard' — creep type for the summons
 *
 *  The summon side-effect makes the cast immediately visible in the
 *  current wave (3 fresh creeps appear by the path) on top of the
 *  invisible HP buff that affects future waves. Without it the cast
 *  is purely cerebral and easy to ignore in the moment. */
ChannelEffects.register('buff_next_wave_hp', (ctx) => {
  const pct = (ctx.meta.percent as number) ?? 0.30;
  const scene = ctx.scene as any;
  const prev = (scene._channelHpBuff as number) ?? 0;
  scene._channelHpBuff = prev + pct;

  const caster = ctx.caster;

  // Dramatized visual: layered gold flash + ring + camera shake. M2's
  // beta-tester flagged that the buff felt invisible until next wave's
  // bars came back inflated — make the moment unmissable.
  if (caster && typeof caster.x === 'number') {
    const g = scene.add?.graphics?.();
    if (g) {
      g.setDepth(40);
      g.fillStyle(0xffe066, 0.55);
      g.fillCircle(caster.x, caster.y, 56);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(caster.x, caster.y, 24);
      g.lineStyle(4, 0xffe066, 1);
      g.strokeCircle(caster.x, caster.y, 56);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(caster.x, caster.y, 90);
      scene.tweens?.add?.({
        targets: g, alpha: 0, duration: 1000,
        onComplete: () => g.destroy(),
      });
    }
    scene.cameras?.main?.shake?.(220, 0.004);
  }

  // Summon — push entries directly into SpawnManager's queue so the
  // standard spawn-tick pipeline handles them (path resolution, sprite
  // creation, gold-on-kill bookkeeping). 200ms apart for visual rhythm.
  const summonCount = (ctx.meta.summonCount as number) ?? 0;
  const summonType = (ctx.meta.summonType as string) ?? 'standard';
  if (summonCount > 0 && scene.spawner) {
    for (let i = 0; i < summonCount; i++) {
      scene.time?.delayedCall?.(i * 220, () => {
        scene.spawner?.spawnQueue?.push?.({
          creepType: summonType,
          hpScale: 50,
          speedScale: 1,
          isBoss: false,
          groupBurst: 1,
          pathIndex: 0,
        });
      });
    }
  }

  const log = scene.eventLog;
  if (log?.gameMessage) {
    const totalPct = Math.round(scene._channelHpBuff * 100);
    const summonNote = summonCount > 0 ? ` + ${summonCount} extras inbound` : '';
    log.gameMessage(`⚠ Scribe cast landed — future creeps +${totalPct}% HP${summonNote}`);
  }
});
