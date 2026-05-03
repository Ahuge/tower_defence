/**
 * channel_caster trait — caster creeps that channel a spell after a
 * delay, optionally repeating up to castCount times.
 *
 * Trait config (declared in CreepTypes.ts):
 *   id: 'channel_caster'
 *   channelStartAt: seconds since spawn before FIRST channel begins (e.g. 1.0)
 *   channelDuration: seconds the channel takes (e.g. 4.0)
 *   effectId: ChannelEffects registry id (e.g. 'clear_towers_radius')
 *   meta?: extra fields passed to the effect (radius, percent, etc)
 *   interruptible?: true — any damage cancels (default true)
 *   castCount?: max number of channels per creep. Defaults to 1
 *               (single-shot). Pass 0 for unlimited — caster channels
 *               as long as it's alive, only stopping when killed or
 *               when it walks off the end of the path.
 *   castCooldown?: seconds of downtime between cast 1 → cast 2 (default 3)
 *
 * Wires into the Trait registry via creep update + creep damage hooks.
 * Per-creep state lives on the trait object (`_channelId`, `_age`,
 * `_castsDone`, `_cooldownRemaining`).
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
    console.log(`[ChannelCaster] tick fired for creep ${creep._creepTypeId ?? '?'}, effect=${trait.effectId}`);
  }

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
  // casting. castCount: 0 means unlimited — Scribes use this so they
  // channel for the duration of their walk.
  if (castCount > 0 && castsDone >= castCount) return;

  // Decrement the inter-cast cooldown if one is running. Initial cast
  // uses `channelStartAt` as its only delay; subsequent casts use the
  // cooldown set when the prior channel ended.
  if (trait._cooldownRemaining !== undefined && trait._cooldownRemaining > 0) {
    trait._cooldownRemaining -= delta / 1000;
    if (trait._cooldownRemaining > 0) return;
  }

  // Initial-channel start gate (only for cast #0).
  if (castsDone === 0 && trait._age < startAt) return;

  const sys = ChannelSystem.forScene(creep._scene);
  trait._channelId = sys.start(creep, effectId, duration, meta);
});

registerCreepDamage('channel_caster', (trait: Trait, damage: number) => {
  if (!trait._channelId) return damage;
  if (trait.interruptible === false) return damage;
  const creep = trait._creep;
  if (!creep) return damage;
  const sys = ChannelSystem.peek(creep._scene);
  if (sys) sys.interrupt(trait._channelId, 'damage');
  trait._channelId = null;
  return damage;
});
