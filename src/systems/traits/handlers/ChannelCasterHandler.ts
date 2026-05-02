/**
 * channel_caster trait — caster creeps that channel a spell after a
 * delay. Cancelled if any damage is taken before completion.
 *
 * Trait config (declared in CreepTypes.ts):
 *   id: 'channel_caster'
 *   channelStartAt: seconds since spawn before channel begins (e.g. 1.0)
 *   channelDuration: seconds the channel takes (e.g. 4.0)
 *   effectId: ChannelEffects registry id (e.g. 'clear_towers_radius')
 *   meta?: extra fields passed to the effect (radius, percent, etc)
 *   interruptible?: true — any damage cancels (default true)
 *
 * Wires into the Trait registry via creep update + creep damage hooks.
 * Per-creep state lives on the trait object (`_channelId`, `_age`).
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
  // Back-ref so the damage hook can reach the scene + creep without
  // breaking the existing (trait, damage) signature.
  trait._creep = creep;
  trait._age = (trait._age ?? 0) + delta / 1000;
  // Diagnostic — fires once per caster on first tick so we can confirm
  // the trait pipeline reached this handler. Drop after Plan A v1.
  if (!trait._loggedTick) {
    trait._loggedTick = true;
    console.log(`[ChannelCaster] tick fired for creep ${creep._creepTypeId ?? '?'}, effect=${trait.effectId}`);
  }
  const startAt = trait.channelStartAt ?? 1.0;
  const duration = trait.channelDuration ?? 4.0;
  const effectId = trait.effectId ?? 'noop';
  const meta = trait.meta ?? {};

  if (!trait._channelId && trait._age >= startAt) {
    const sys = ChannelSystem.forScene(creep._scene);
    trait._channelId = sys.start(creep, effectId, duration, meta);
  } else if (trait._channelId) {
    const sys = ChannelSystem.peek(creep._scene);
    sys?.tick(trait._channelId, delta);
  }
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
