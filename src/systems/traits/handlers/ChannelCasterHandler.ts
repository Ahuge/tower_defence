/**
 * channel_caster trait — caster creeps that channel a spell after a
 * delay, optionally repeating up to castCount times.
 *
 * Trait config (declared in CreepTypes.ts):
 *   id: 'channel_caster'
 *   triggerOn?: 'spawn' (default) — channel starts after channelStartAt
 *               seconds-since-spawn elapses
 *               'first_hit' — channel doesn't start until the creep
 *               takes its first damage. Used for "rage timer" style
 *               bosses that the player engages with deliberately.
 *   channelStartAt: seconds since spawn (or since first hit) before
 *               channel begins (e.g. 1.0)
 *   channelDuration: seconds the channel takes (e.g. 4.0)
 *   effectId: ChannelEffects registry id (e.g. 'clear_towers_radius')
 *   meta?: extra fields passed to the effect (radius, percent, etc)
 *   interruptible?: true — any damage cancels (default true)
 *   castCount?: max number of channels per creep. Defaults to 1
 *               (single-shot). Pass 0 for unlimited.
 *   castCooldown?: seconds of downtime between cast 1 → cast 2 (default 3)
 *
 * Wires into the Trait registry via creep update + creep damage hooks.
 * Per-creep state lives on the trait object (`_channelId`, `_age`,
 * `_castsDone`, `_cooldownRemaining`, `_firstHitAt`).
 */

import {
  registerCreepUpdate, registerCreepDamage,
  Trait,
} from '../Trait';
import { ChannelSystem } from '../../channels/ChannelSystem';

registerCreepUpdate('channel_caster', (trait: Trait, creep: any, delta: number) => {
  if (!creep.alive) {
    // Death is always an interrupt — regardless of `interruptible: false`.
    // Without this, an uninterruptible caster killed by raw DPS would
    // leave its channel dangling in ChannelSystem until scene shutdown.
    if (trait._channelId) {
      const sys = ChannelSystem.peek(creep._scene);
      sys?.interrupt(trait._channelId, 'death');
      trait._channelId = null;
    }
    return;
  }
  trait._creep = creep;
  trait._age = (trait._age ?? 0) + delta / 1000;
  if (!trait._loggedTick) {
    trait._loggedTick = true;
    console.log(`[ChannelCaster] tick fired for creep ${creep._creepTypeId ?? '?'}, effect=${trait.effectId}, triggerOn=${trait.triggerOn ?? 'spawn'}`);
  }

  const triggerOn = trait.triggerOn ?? 'spawn';
  const startAt = trait.channelStartAt ?? 1.0;
  const duration = trait.channelDuration ?? 4.0;
  const effectId = trait.effectId ?? 'noop';
  const meta = trait.meta ?? {};
  const castCount = trait.castCount ?? 1;
  const cooldown = trait.castCooldown ?? 3.0;
  const castsDone = (trait._castsDone ?? 0);

  if (trait._channelId) {
    // A channel is in flight — tick it. Detect end-of-channel
    // (completed or interrupted, both via ChannelSystem) and roll
    // bookkeeping to start the cooldown for the next cast.
    const sys = ChannelSystem.forScene(creep._scene);
    sys.tick(trait._channelId, delta);
    const chan = sys.listActive().find(c => c.id === trait._channelId);
    if (!chan || chan.completed || chan.interrupted) {
      trait._channelId = null;
      trait._castsDone = castsDone + 1;
      trait._cooldownRemaining = cooldown;
    }
    return;
  }

  // No active channel. If we've hit the cap, this creep is done
  // casting. castCount: 0 means unlimited.
  if (castCount > 0 && castsDone >= castCount) return;

  // Decrement the inter-cast cooldown if one is running. Initial cast
  // uses `channelStartAt` as its only delay; subsequent casts use the
  // cooldown set when the prior channel ended.
  if (trait._cooldownRemaining !== undefined && trait._cooldownRemaining > 0) {
    trait._cooldownRemaining -= delta / 1000;
    if (trait._cooldownRemaining > 0) return;
  }

  // triggerOn='first_hit' — the rage clock doesn't start until the
  // player engages. Trait._firstHitAt is set by the creep_damage hook
  // below on the first damage event. Until then, no channel starts.
  if (triggerOn === 'first_hit') {
    if (trait._firstHitAt === undefined) return; // not engaged yet
    // First-hit count gate: subtract first-hit-time from age to
    // produce "seconds since first hit" for the startAt gate.
    if (castsDone === 0 && (trait._age - trait._firstHitAt) < startAt) return;
  } else {
    // Default 'spawn' triggering — gate the first cast on age.
    if (castsDone === 0 && trait._age < startAt) return;
  }

  const sys = ChannelSystem.forScene(creep._scene);
  trait._channelId = sys.start(creep, effectId, duration, meta);
});

registerCreepDamage('channel_caster', (trait: Trait, damage: number) => {
  // Record first-hit timestamp for triggerOn:'first_hit' rage timers.
  // Stored as seconds-elapsed-since-spawn so the update tick can
  // gate the rage start cleanly without time drift.
  if (trait._firstHitAt === undefined && (trait.triggerOn === 'first_hit')) {
    trait._firstHitAt = trait._age ?? 0;
  }
  // Standard interrupt-on-damage path. interruptible: false skips
  // (Sigil / Scribe / Archmage / Warlord-rage all use this).
  if (!trait._channelId) return damage;
  if (trait.interruptible === false) return damage;
  const creep = trait._creep;
  if (!creep) return damage;
  const sys = ChannelSystem.peek(creep._scene);
  if (sys) sys.interrupt(trait._channelId, 'damage');
  trait._channelId = null;
  return damage;
});
