/**
 * ChannelSystem — runtime manager for caster-creep channel timers
 * (Plan A: Arcane Counterspell mechanic signature).
 *
 * One instance per GameScene. Lazy-constructed via `forScene(scene)`.
 * Disposed automatically when the scene shuts down via the
 * 'shutdown' event listener registered on first construction.
 *
 * The `channel_caster` creep trait posts events into this manager
 * (start / progress / interrupt / complete). The manager owns the
 * authoritative channel registry, dispatches effects, and exposes a
 * read API for the HUD (ChannelBarOverlay) and for star-objective
 * counters (channelsInterrupted, channelsCompleted).
 *
 * Effects are looked up via `ChannelEffects.dispatch(id, ctx)`. The
 * dispatcher decides what happens when a cast lands (clear-towers,
 * buff-next-wave-HP, etc).
 */

import * as Phaser from 'phaser';
import { ChannelEffects, type ChannelEffectContext } from './ChannelEffects';
import { Analytics } from '../AnalyticsClient';

export interface ChannelInstance {
  /** Stable id — the casting creep's instance id, padded with a
   *  monotonic counter so a creep that channels twice has distinct
   *  ids per channel. */
  id: string;
  /** The casting creep. Held for HUD positioning + interrupt source. */
  caster: any;
  /** Effect id dispatched on completion. */
  effectId: string;
  /** Total channel duration in seconds. */
  duration: number;
  /** Seconds elapsed since channel start. Range [0, duration]. */
  elapsed: number;
  /** True once duration is reached and the effect has been fired. */
  completed: boolean;
  /** True if cancelled by damage / death / external interrupt. */
  interrupted: boolean;
  /** Optional metadata the trait passed in (e.g. radius for clear-towers). */
  meta: Record<string, unknown>;
}

export interface ChannelStats {
  started: number;
  interrupted: number;
  completed: number;
}

const SCENE_MAP = new WeakMap<Phaser.Scene, ChannelSystem>();
let nextChannelCounter = 0;

export class ChannelSystem {
  private scene: Phaser.Scene;
  private active: Map<string, ChannelInstance> = new Map();
  private stats: ChannelStats = { started: 0, interrupted: 0, completed: 0 };
  /** Listeners (HUD subscribes). Keep cheap — fired on add/remove only,
   *  never per-tick. HUD can poll listActive() each frame for progress. */
  private listeners: Set<() => void> = new Set();

  static forScene(scene: Phaser.Scene): ChannelSystem {
    let inst = SCENE_MAP.get(scene);
    if (!inst) {
      inst = new ChannelSystem(scene);
      SCENE_MAP.set(scene, inst);
      scene.events.once('shutdown', () => {
        SCENE_MAP.delete(scene);
      });
    }
    return inst;
  }

  /** True only when the scene has had a ChannelSystem touched. Avoids
   *  forcing creation in code paths that just want to peek. */
  static peek(scene: Phaser.Scene): ChannelSystem | null {
    return SCENE_MAP.get(scene) ?? null;
  }

  private constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Begin a channel for a casting creep. The trait calls this when
   *  the channel-start condition is met (typically time-since-spawn).
   *  Returns the channel id. */
  start(caster: any, effectId: string, duration: number, meta: Record<string, unknown> = {}): string {
    const id = `${caster?.id ?? 'creep'}_c${++nextChannelCounter}`;
    const chan: ChannelInstance = {
      id, caster, effectId, duration,
      elapsed: 0, completed: false, interrupted: false, meta,
    };
    this.active.set(id, chan);
    this.stats.started++;
    Analytics.track('arcane_channel_started', {
      channelId: id,
      effectId,
      duration,
    });
    this.fire();
    return id;
  }

  /** Per-frame tick. Trait update calls this with `delta` ms. */
  tick(channelId: string, deltaMs: number): void {
    const chan = this.active.get(channelId);
    if (!chan || chan.completed || chan.interrupted) return;
    chan.elapsed += deltaMs / 1000;
    if (chan.elapsed >= chan.duration) {
      this.complete(channelId);
    }
  }

  /** Mark a channel completed and dispatch its effect. Idempotent. */
  complete(channelId: string): void {
    const chan = this.active.get(channelId);
    if (!chan || chan.completed || chan.interrupted) return;
    chan.completed = true;
    chan.elapsed = chan.duration;
    this.stats.completed++;
    const ctx: ChannelEffectContext = {
      scene: this.scene,
      caster: chan.caster,
      meta: chan.meta,
    };
    ChannelEffects.dispatch(chan.effectId, ctx);
    Analytics.track('arcane_channel_completed', {
      channelId, effectId: chan.effectId,
    });
    // Hold completed channels in the map briefly so HUD can show the
    // "completed" state for a beat, then prune on next start/cleanup.
    this.fire();
    this.scene.time.delayedCall(800, () => {
      this.active.delete(channelId);
      this.fire();
    });
  }

  /** Cancel a channel (damage, death, AMF zone). Idempotent. */
  interrupt(channelId: string, source: 'damage' | 'death' | 'amf' | 'external' = 'damage'): void {
    const chan = this.active.get(channelId);
    if (!chan || chan.completed || chan.interrupted) return;
    chan.interrupted = true;
    this.stats.interrupted++;
    Analytics.track('arcane_channel_interrupted', {
      channelId,
      effectId: chan.effectId,
      source,
      percentRemaining: Math.max(0, 1 - chan.elapsed / chan.duration),
    });
    this.fire();
    this.scene.time.delayedCall(400, () => {
      this.active.delete(channelId);
      this.fire();
    });
  }

  /** Find the active (non-completed, non-interrupted) channel for a
   *  caster, if any. Used by the damage hook to interrupt on hit. */
  activeChannelForCaster(caster: any): ChannelInstance | null {
    for (const c of this.active.values()) {
      if (c.caster === caster && !c.completed && !c.interrupted) return c;
    }
    return null;
  }

  /** All channels in any state, ordered by start time. HUD reads this. */
  listActive(): ChannelInstance[] {
    return Array.from(this.active.values());
  }

  getStats(): Readonly<ChannelStats> {
    return this.stats;
  }

  /** Subscribe to add/remove events (state changes that affect HUD
   *  membership). Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private fire(): void {
    for (const fn of this.listeners) {
      try { fn(); } catch (err) { console.warn('[ChannelSystem] listener threw:', err); }
    }
  }
}
