/**
 * AttackerAbilities — registry + dispatcher for player-cast abilities
 * in attacker mode (Plan 12 v2 Phase 2).
 *
 * Mirrors the ChannelEffects pattern: each effect is a pure function
 * the composer calls when the player commits a wave that has the
 * ability queued. Effects manipulate scene state (creep speed, tower
 * disable, hpScale boost) — they're fired from GameScene.startWave so
 * the wave's spawned creeps see the buff from the first frame.
 *
 * Effects are also "predeclared" via AbilityDef (label, cost, cooldown)
 * so the composer UI can render the tray without knowing the
 * implementation. Adding a new ability = one register() call + one
 * AbilityDef entry.
 */

import * as Phaser from 'phaser';

export interface AbilityEffectContext {
  scene: Phaser.Scene;
  /** The wave being committed. Effects can modify the wave (e.g. bump
   *  hpScale on every group) before SpawnManager reads it. */
  wave: import('../../data/WaveDefinitions').WaveDefinition;
  /** Wave number being sent (1-indexed). */
  waveNum: number;
  /** Free-form per-ability config from the AbilityDef.meta. */
  meta: Record<string, unknown>;
}

type EffectFn = (ctx: AbilityEffectContext) => void;

const REGISTRY: Map<string, EffectFn> = new Map();

export const AttackerAbilities = {
  register(id: string, fn: EffectFn): void {
    REGISTRY.set(id, fn);
  },

  dispatch(id: string, ctx: AbilityEffectContext): void {
    const fn = REGISTRY.get(id);
    if (!fn) {
      console.warn(`[AttackerAbilities] no effect registered for "${id}"`);
      return;
    }
    try {
      fn(ctx);
    } catch (err) {
      console.warn(`[AttackerAbilities] effect "${id}" threw:`, err);
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

/** frenzy — speedScale multiplier on every group in the wave. meta:
 *  { factor: 2.0 }. The composer queues this when the player hits
 *  Frenzy; effect fires at startWave-time so spawned creeps inherit
 *  the boost via WaveCreepGroup.speedScale. */
AttackerAbilities.register('frenzy', (ctx) => {
  const factor = (ctx.meta.factor as number) ?? 2.0;
  for (const g of ctx.wave.groups) {
    g.speedScale *= factor;
  }
  const log = (ctx.scene as any).eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`⚡ Frenzy! Wave creeps move at ${factor.toFixed(1)}x speed.`);
  }
});

/** smoke_screen — disables every defender tower on the field for
 *  `duration` seconds at wave start. Tower._disabledRemaining is the
 *  existing field used by Stormcaller's chain lightning, so the fire-
 *  block + sprite tint already work. meta: { duration: 5 }. */
AttackerAbilities.register('smoke_screen', (ctx) => {
  const duration = (ctx.meta.duration as number) ?? 5;
  const scene = ctx.scene as any;
  const towers = scene.towers ?? scene.towerManager?.towers;
  if (!Array.isArray(towers)) return;
  let count = 0;
  for (const t of towers) {
    if (!t || t._expired) continue;
    t._disabledRemaining = duration;
    count++;
  }
  const log = scene.eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`🌫 Smoke Screen — ${count} defender tower${count === 1 ? '' : 's'} blinded for ${duration}s.`);
  }
});

/** power_surge — hpScale multiplier on every group in the wave. meta:
 *  { factor: 1.5 }. */
AttackerAbilities.register('power_surge', (ctx) => {
  const factor = (ctx.meta.factor as number) ?? 1.5;
  for (const g of ctx.wave.groups) {
    g.hpScale *= factor;
  }
  const log = (ctx.scene as any).eventLog;
  if (log?.gameMessage) {
    log.gameMessage(`💪 Power Surge — wave creeps gain +${Math.round((factor - 1) * 100)}% HP.`);
  }
});
