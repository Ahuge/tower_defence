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

/** meteor_drop — Meteora's signature. Drops AOE damage at a random
 *  walkable tile inside the arena. Sells with a screen shake + fire
 *  ring + falling debris VFX. Does not target the caster — the caster
 *  is the spell-source, the meteor lands on a random tile in the play
 *  area. meta: { damage: 250, radius: 80 } */
ChannelEffects.register('meteor_drop', (ctx) => {
  const damage = (ctx.meta.damage as number) ?? 250;
  const radius = (ctx.meta.radius as number) ?? 80;
  const scene = ctx.scene as any;
  const caster = ctx.caster;

  // Pick a random arena tile near the caster (within ~6 tiles).
  // Coupling to caster keeps the meteor meaningful in context — it
  // lands "near you" rather than randomly off-screen.
  const tx = (caster?.x ?? 400) + (Math.random() - 0.5) * 280;
  const ty = (caster?.y ?? 300) + (Math.random() - 0.5) * 280;

  // Damage anything caught in the radius. Currently towers + the base.
  // Towers in radius lose 60% of their max-equivalent (set _expired
  // for now; a future tier could damage rather than destroy).
  const towers = scene.towers ?? scene.towerManager?.towers;
  if (Array.isArray(towers)) {
    for (const t of towers) {
      if (!t || t._expired) continue;
      const dx = (t.x ?? 0) - tx;
      const dy = (t.y ?? 0) - ty;
      if (dx * dx + dy * dy <= radius * radius) t._expired = true;
    }
  }

  // VFX: fire ring + filled core + lingering crater.
  const g = scene.add?.graphics?.();
  if (g) {
    g.setDepth(40);
    g.fillStyle(0xff4400, 0.6);
    g.fillCircle(tx, ty, radius);
    g.fillStyle(0xffaa44, 0.5);
    g.fillCircle(tx, ty, radius * 0.55);
    g.lineStyle(4, 0xff8822, 1);
    g.strokeCircle(tx, ty, radius);
    g.lineStyle(2, 0xffe066, 0.85);
    g.strokeCircle(tx, ty, radius * 1.4);
    scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1100, onComplete: () => g.destroy() });
  }
  scene.cameras?.main?.shake?.(380, 0.012);

  const log = scene.eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`☄ Meteora's meteor landed — damage: ${damage}`);
  }
  void damage; // kept for future tower-HP-damage upgrade path
});

/** chain_lightning_on_towers — Stormcaller's signature. Picks N
 *  random non-disabled towers and disables them for `duration` seconds
 *  (no fire, blue-grey tint, lightning particles). meta: { count: 3,
 *  duration: 5 } */
ChannelEffects.register('chain_lightning_on_towers', (ctx) => {
  const count = (ctx.meta.count as number) ?? 3;
  const duration = (ctx.meta.duration as number) ?? 5;
  const scene = ctx.scene as any;
  const caster = ctx.caster;
  const towers = scene.towers ?? scene.towerManager?.towers;
  if (!Array.isArray(towers) || towers.length === 0) return;

  // Pick `count` random towers that aren't already disabled or expired.
  const candidates = towers.filter((t: any) => t && !t._expired && (t._disabledRemaining ?? 0) <= 0);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const targets = candidates.slice(0, count);
  for (const t of targets) {
    t._disabledRemaining = duration;
  }

  // VFX: lightning bolt from caster to each victim.
  const g = scene.add?.graphics?.();
  if (g && caster && typeof caster.x === 'number') {
    g.setDepth(40);
    g.lineStyle(3, 0x88ccff, 1);
    for (const t of targets) {
      // Two-segment lightning (one mid-jitter point) for that
      // hand-drawn-shock look.
      const mx = (caster.x + t.x) / 2 + (Math.random() - 0.5) * 30;
      const my = (caster.y + t.y) / 2 + (Math.random() - 0.5) * 30;
      g.lineBetween(caster.x, caster.y, mx, my);
      g.lineBetween(mx, my, t.x, t.y);
    }
    scene.tweens?.add?.({ targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy() });
  }
  scene.cameras?.main?.shake?.(180, 0.005);

  const log = scene.eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`⚡ Stormcaller chained lightning — ${targets.length} tower${targets.length === 1 ? '' : 's'} disabled for ${duration}s`);
  }
});

/** warlord_reinforcements — Stalwart's rage. Spawns 6 fast creeps. */
ChannelEffects.register('warlord_reinforcements', (ctx) => {
  const scene = ctx.scene as any;
  if (scene.spawner) {
    for (let i = 0; i < 6; i++) {
      scene.time?.delayedCall?.(i * 200, () => {
        scene.spawner?.spawnQueue?.push?.({
          creepType: 'fast', hpScale: 80, speedScale: 1,
          isBoss: false, groupBurst: 1, pathIndex: i % 4,
        });
      });
    }
  }
  warlordVfx(ctx, 0xff8844, 0xffaa44);
  scene.eventLog?.gameMessage?.('⚠ Stalwart\'s rage — 6 reinforcements inbound');
});

/** warlord_heal_all — Healer's rage. Heals every alive creep to full. */
ChannelEffects.register('warlord_heal_all', (ctx) => {
  const scene = ctx.scene as any;
  const creeps: any[] = scene.creeps ?? [];
  let healedCount = 0;
  for (const c of creeps) {
    if (!c.alive) continue;
    const before = c.hp ?? 0;
    c.hp = c.maxHp ?? before;
    if (c.hp > before) healedCount++;
  }
  warlordVfx(ctx, 0x44ff88, 0xaaffcc);
  scene.eventLog?.gameMessage?.(`⚠ Healer's rage — ${healedCount} creep${healedCount === 1 ? '' : 's'} restored to full HP`);
});

/** warlord_shield_all — Champion's rage. Adds a shield trait to every
 *  alive creep (50% of current HP). */
ChannelEffects.register('warlord_shield_all', (ctx) => {
  const scene = ctx.scene as any;
  const creeps: any[] = scene.creeps ?? [];
  let count = 0;
  for (const c of creeps) {
    if (!c.alive || !c.traits) continue;
    if (c.traits.some((t: { id: string }) => t.id === 'shield')) continue;
    const shieldHp = Math.round((c.maxHp ?? 50) * 0.5);
    c.traits.push({ id: 'shield', hpPercent: 0.5, _shieldHp: shieldHp, _active: true });
    count++;
  }
  warlordVfx(ctx, 0xeecc88, 0xfff0aa);
  scene.eventLog?.gameMessage?.(`⚠ Champion's rage — ${count} creep${count === 1 ? '' : 's'} gained shields`);
});

/** warlord_haste_all — Tactician's rage. +60% speed on all alive
 *  creeps for the rest of the wave. */
ChannelEffects.register('warlord_haste_all', (ctx) => {
  const scene = ctx.scene as any;
  const creeps: any[] = scene.creeps ?? [];
  let count = 0;
  for (const c of creeps) {
    if (!c.alive) continue;
    if (typeof c.baseSpeed === 'number') {
      c.baseSpeed *= 1.6;
      c.speed = (c.speed ?? c.baseSpeed) * 1.6;
      count++;
    }
  }
  warlordVfx(ctx, 0x66ccff, 0xaaddff);
  scene.eventLog?.gameMessage?.(`⚠ Tactician's rage — ${count} creep${count === 1 ? '' : 's'} now running 60% faster`);
});

/** warlord_mass_summon — Captain's rage (final warlord). Big swarm:
 *  10 standard + 5 armored. Map-clearing ultimate. */
ChannelEffects.register('warlord_mass_summon', (ctx) => {
  const scene = ctx.scene as any;
  if (scene.spawner) {
    for (let i = 0; i < 10; i++) {
      scene.time?.delayedCall?.(i * 150, () => {
        scene.spawner?.spawnQueue?.push?.({
          creepType: 'standard', hpScale: 100, speedScale: 1,
          isBoss: false, groupBurst: 1, pathIndex: i % 6,
        });
      });
    }
    for (let i = 0; i < 5; i++) {
      scene.time?.delayedCall?.(1500 + i * 200, () => {
        scene.spawner?.spawnQueue?.push?.({
          creepType: 'armored', hpScale: 140, speedScale: 1,
          isBoss: false, groupBurst: 1, pathIndex: i % 4,
        });
      });
    }
  }
  warlordVfx(ctx, 0xff44aa, 0xff88dd);
  scene.eventLog?.gameMessage?.('☠ Captain\'s rage — 10 swarm + 5 armored inbound');
});

/** Shared red-pulse VFX for warlord rages. Big bright flash + camera
 *  shake at the caster's position so the rage moment is unmistakable. */
function warlordVfx(ctx: ChannelEffectContext, primary: number, secondary: number): void {
  const scene = ctx.scene as Phaser.Scene & {
    add?: { graphics?: () => Phaser.GameObjects.Graphics | null };
    tweens?: { add?: (cfg: { targets: Phaser.GameObjects.Graphics; alpha: number; duration: number; onComplete: () => void }) => void };
    cameras?: { main?: { shake?: (duration: number, intensity: number) => void } };
  };
  const caster = ctx.caster as { x?: number; y?: number };
  if (caster && typeof caster.x === 'number' && typeof caster.y === 'number') {
    const g = scene.add?.graphics?.();
    if (g) {
      g.setDepth(40);
      g.fillStyle(primary, 0.7);
      g.fillCircle(caster.x, caster.y, 64);
      g.fillStyle(secondary, 0.55);
      g.fillCircle(caster.x, caster.y, 36);
      g.lineStyle(5, secondary, 1);
      g.strokeCircle(caster.x, caster.y, 64);
      g.lineStyle(2, secondary, 0.7);
      g.strokeCircle(caster.x, caster.y, 96);
      scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1300, onComplete: () => g.destroy() });
    }
  }
  scene.cameras?.main?.shake?.(450, 0.012);
}

/** summon_creeps_at_position — Necromaster's signature. Spawns N
 *  creeps at the caster's location with a necromancy VFX (purple-black
 *  pulse, rising shades). meta: { count: 5, summonType: 'standard' } */
ChannelEffects.register('summon_creeps_at_position', (ctx) => {
  const count = (ctx.meta.count as number) ?? 5;
  const summonType = (ctx.meta.summonType as string) ?? 'standard';
  const scene = ctx.scene as any;
  const caster = ctx.caster;

  if (scene.spawner) {
    for (let i = 0; i < count; i++) {
      scene.time?.delayedCall?.(i * 180, () => {
        scene.spawner?.spawnQueue?.push?.({
          creepType: summonType,
          hpScale: 60,
          speedScale: 1,
          isBoss: false,
          groupBurst: 1,
          pathIndex: 0,
        });
      });
    }
  }

  // VFX: purple pulse + rising shade ribbons. Necromancy reads as
  // "darker than buff/meteor" — keep the palette deep.
  if (caster && typeof caster.x === 'number') {
    const g = scene.add?.graphics?.();
    if (g) {
      g.setDepth(40);
      g.fillStyle(0x441166, 0.6);
      g.fillCircle(caster.x, caster.y, 60);
      g.fillStyle(0x8833aa, 0.4);
      g.fillCircle(caster.x, caster.y, 30);
      g.lineStyle(3, 0xaa44dd, 1);
      g.strokeCircle(caster.x, caster.y, 60);
      g.lineStyle(2, 0x6622aa, 0.7);
      g.strokeCircle(caster.x, caster.y, 90);
      scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1000, onComplete: () => g.destroy() });
    }
  }
  scene.cameras?.main?.shake?.(220, 0.006);

  const log = scene.eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`☠ Necromaster summoned ${count} shades`);
  }
});

/** buff_next_wave_hp — increment a per-mission HP-buff stack AND
 *  optionally summon extra creeps at the caster's location. Cumulative
 *  but capped — without a cap, 18+ uninterrupted casts cube-stacked
 *  the wave-12 boss to 110k+ HP and made the mission unbeatable.
 *
 *  meta:
 *    percent: 0.20        — HP buff to stack onto every future creep
 *    summonCount: 3       — additional creeps spawned at caster (default 0)
 *    summonType: 'standard' — creep type for the summons
 *    maxBuff: 1.0         — cap on _channelHpBuff (default; ≈ 5 completions
 *                           to fully cap at 20%/cast). Bounds the boss
 *                           inflation to 2× base; per the M2 balance
 *                           pass, the wave-script hpScale was halved
 *                           in tandem so the max-buffed boss matches
 *                           the prior no-buff boss in HP.
 *
 *  The summon side-effect makes the cast immediately visible in the
 *  current wave (3 fresh creeps appear by the path) on top of the
 *  invisible HP buff that affects future waves. Without it the cast
 *  is purely cerebral and easy to ignore in the moment. */
ChannelEffects.register('buff_next_wave_hp', (ctx) => {
  const pct = (ctx.meta.percent as number) ?? 0.20;
  const cap = (ctx.meta.maxBuff as number) ?? 1.0;
  const scene = ctx.scene as any;
  const prev = (scene._channelHpBuff as number) ?? 0;
  scene._channelHpBuff = Math.min(cap, prev + pct);

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
