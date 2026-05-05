/**
 * FinaleEffects — string-id-keyed registry of phase-hook handlers fired
 * when a `DestructibleStructure` crosses an HP fraction threshold.
 *
 * Why a separate dispatcher (vs inlining into FinaleController):
 *   - Each campaign's boss will have its own phase mechanics (M10
 *     throne heals + summons + rages; future Mech Furnace might
 *     overheat at 25%; Nature Elder Tree might root the hero at 10%).
 *     A registry keeps FinaleController generic.
 *   - Phase hook ids live in `DestructibleStructureDef.phaseHooks`
 *     (data) and are dispatched via string lookup, so adding a new
 *     boss is data-only + one handler — no FinaleController edits.
 *
 * The dispatcher receives a `DestructibleStructure` reference + a
 * lightweight context (scene, controller back-ref, hero) so handlers
 * can read/write throne state, log messages, modify the embedded
 * tower's stats (rage), spawn additional creeps (reinforcements), etc.
 */

import * as Phaser from 'phaser';
import type { DestructibleStructure } from '../../entities/DestructibleStructure';
import type { Hero } from '../../entities/Hero';
import type { FinaleController } from './FinaleController';

export interface FinaleEffectContext {
  scene: Phaser.Scene;
  controller: FinaleController;
  hero: Hero | null;
}

export type FinaleEffectHandler = (structure: DestructibleStructure, ctx: FinaleEffectContext) => void;

/** Registry of effect-id → handler. Populated below; new handlers can
 *  be appended for future bosses. */
const HANDLERS: Record<string, FinaleEffectHandler> = {};

export function registerFinaleEffect(id: string, handler: FinaleEffectHandler): void {
  HANDLERS[id] = handler;
}

/** Dispatch a phase hook by id. Silent no-op if id is unknown — that
 *  way a typo in a structure's phase config doesn't crash the game,
 *  just fails silently (we surface a warn the first time). */
const _warnedMissing = new Set<string>();
export function dispatchFinaleEffect(
  id: string,
  structure: DestructibleStructure,
  ctx: FinaleEffectContext,
): void {
  const handler = HANDLERS[id];
  if (!handler) {
    if (!_warnedMissing.has(id)) {
      _warnedMissing.add(id);
      console.warn(`[FinaleEffects] no handler registered for phase effect '${id}'`);
    }
    return;
  }
  try {
    handler(structure, ctx);
  } catch (err) {
    console.error(`[FinaleEffects] handler '${id}' threw:`, err);
  }
}

// ─── Built-in handlers — Arcane M10 throne ────────────────────────

function gameMessage(ctx: FinaleEffectContext, msg: string): void {
  const log = (ctx.scene as { eventLog?: { gameMessage?: (s: string) => void } }).eventLog;
  log?.gameMessage?.(msg);
}

/** 50% HP — heal the throne by 10% of maxHp. Applied instantly to the
 *  embedded tower (the structure delegates HP). */
registerFinaleEffect('arcane_throne_heal', (s, ctx) => {
  const healAmount = Math.round(s.maxHp * 0.10);
  s.hp = Math.min(s.maxHp, s.hp + healAmount);
  gameMessage(ctx, 'The Throne calls reinforcement spells — its wards mend!');
});

/** 25% HP — summon mage reinforcements. v1 ships the narrative beat;
 *  future polish: spawn N mage creeps at the entry. */
registerFinaleEffect('arcane_throne_summon_reinforcements', (_s, ctx) => {
  gameMessage(ctx, 'The Throne summons mage reinforcements!');
  // TODO: spawn N elite mage creeps at the map entry. Wave creeps
  // already ramp via standard hpWaveBoost so the pressure is partly
  // there; this is a v2 polish item.
});

/** 10% HP — rage mode. Halves the embedded tower's fireRate (= 2x
 *  attack speed). Floor at 200ms so the throne doesn't fire faster
 *  than 5 shots/sec (which would be unfair). */
registerFinaleEffect('arcane_throne_rage', (s, ctx) => {
  const tower = s.embeddedTower;
  if (tower) {
    tower.fireRate = Math.max(200, Math.floor(tower.fireRate / 2));
  }
  gameMessage(ctx, 'THE THRONE RAGES! Attack speed doubled!');
});
