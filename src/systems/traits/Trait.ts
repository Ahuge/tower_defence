import { ArmorType, DamageType } from '../../data/CreepTypes';
import { calculateDamage } from '../DamageCalculator';

// --- Core Types ---

export interface Trait {
  id: string;
  [key: string]: any;
}

export interface HitTarget {
  x: number;
  y: number;
  alive: boolean;
  reached: boolean;
  armor: ArmorType;
  pathIndex: number;
  path: { col: number; row: number }[];
  takeDamage(amount: number): void;
  applySlow(duration: number, factor: number): void;
}

export interface HitContext {
  towerLevel: number;
  damage: number;
  damageType: DamageType;
  target: HitTarget;
  allTargets: HitTarget[];
  hitTargets: HitTarget[];
  goldEarned: number;
}

export interface UpdateContext {
  allTowers: any[];
  allCreeps: any[];
  time: number;
  delta: number;
}

// --- Handler Signatures ---

type DeliveryFn = (trait: Trait, ctx: HitContext) => void;
type DamageModFn = (trait: Trait, damage: number, ctx: HitContext) => number;
type FireRateModFn = (trait: Trait, rate: number, tower: any) => number;
type HitEffectFn = (trait: Trait, ctx: HitContext) => void;
type OnFireFn = (trait: Trait, tower: any, targetIdx: number) => void;
type TowerUpdateFn = (trait: Trait, tower: any, ctx: UpdateContext) => void;
type CreepDamageFn = (trait: Trait, damage: number) => number;
type CreepUpdateFn = (trait: Trait, creep: any, delta: number, nearbyCreeps: any[]) => void;
type CreepDrawFn = (trait: Trait, creep: any, graphics: any) => void;

// --- Registry ---

const deliveryReg = new Map<string, DeliveryFn>();
const damageModReg = new Map<string, DamageModFn>();
const fireRateModReg = new Map<string, FireRateModFn>();
const hitEffectReg = new Map<string, HitEffectFn>();
const onFireReg = new Map<string, OnFireFn>();
const towerUpdateReg = new Map<string, TowerUpdateFn>();
const creepDamageReg = new Map<string, CreepDamageFn>();
const creepUpdateReg = new Map<string, CreepUpdateFn>();
const creepDrawReg = new Map<string, CreepDrawFn>();

// --- Registration ---

export function registerDelivery(id: string, fn: DeliveryFn) { deliveryReg.set(id, fn); }
export function registerDamageMod(id: string, fn: DamageModFn) { damageModReg.set(id, fn); }
export function registerFireRateMod(id: string, fn: FireRateModFn) { fireRateModReg.set(id, fn); }
export function registerHitEffect(id: string, fn: HitEffectFn) { hitEffectReg.set(id, fn); }
export function registerOnFire(id: string, fn: OnFireFn) { onFireReg.set(id, fn); }
export function registerTowerUpdate(id: string, fn: TowerUpdateFn) { towerUpdateReg.set(id, fn); }
export function registerCreepDamage(id: string, fn: CreepDamageFn) { creepDamageReg.set(id, fn); }
export function registerCreepUpdate(id: string, fn: CreepUpdateFn) { creepUpdateReg.set(id, fn); }
export function registerCreepDraw(id: string, fn: CreepDrawFn) { creepDrawReg.set(id, fn); }

// --- Resolution Pipeline ---

/** Run the first matching delivery trait. Fallback: single-target damage. */
export function resolveDelivery(traits: Trait[], ctx: HitContext): void {
  for (const trait of traits) {
    const fn = deliveryReg.get(trait.id);
    if (fn) {
      fn(trait, ctx);
      return;
    }
  }
  // Fallback: direct single-target
  const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
  ctx.target.takeDamage(dmg);
  ctx.hitTargets.push(ctx.target);
}

/** Run all matching damage modifier traits, mutating ctx.damage. */
export function resolveDamageModifiers(traits: Trait[], ctx: HitContext): void {
  for (const trait of traits) {
    const fn = damageModReg.get(trait.id);
    if (fn) {
      ctx.damage = fn(trait, ctx.damage, ctx);
    }
  }
}

/** Run all matching fire rate modifier traits. */
export function resolveFireRate(traits: Trait[], baseRate: number, tower: any): number {
  let rate = baseRate;
  for (const trait of traits) {
    const fn = fireRateModReg.get(trait.id);
    if (fn) {
      rate = fn(trait, rate, tower);
    }
  }
  return Math.max(100, rate);
}

/** Run all matching hit effect traits on the already-hit targets. */
export function resolveHitEffects(traits: Trait[], ctx: HitContext): void {
  for (const trait of traits) {
    const fn = hitEffectReg.get(trait.id);
    if (fn) {
      fn(trait, ctx);
    }
  }
}

/** Run all matching on-fire traits (e.g. ramp_up tracking). */
export function resolveOnFire(traits: Trait[], tower: any, targetIdx: number): void {
  for (const trait of traits) {
    const fn = onFireReg.get(trait.id);
    if (fn) {
      fn(trait, tower, targetIdx);
    }
  }
}

/** Run per-frame tower update traits (e.g. adjacency_buff). */
export function resolveTowerUpdates(traits: Trait[], tower: any, ctx: UpdateContext): void {
  for (const trait of traits) {
    const fn = towerUpdateReg.get(trait.id);
    if (fn) {
      fn(trait, tower, ctx);
    }
  }
}

/** Run creep damage modifiers (e.g. shield absorb). Returns final damage. */
export function resolveCreepDamage(traits: Trait[], damage: number): number {
  let d = damage;
  for (const trait of traits) {
    const fn = creepDamageReg.get(trait.id);
    if (fn) {
      d = fn(trait, d);
    }
  }
  return d;
}

/** Run per-frame creep update traits (e.g. heal_aura). */
export function resolveCreepUpdates(traits: Trait[], creep: any, delta: number, nearbyCreeps: any[]): void {
  for (const trait of traits) {
    const fn = creepUpdateReg.get(trait.id);
    if (fn) {
      fn(trait, creep, delta, nearbyCreeps);
    }
  }
}

/** Run creep draw overlay traits (e.g. shield glow, aura ring). */
export function resolveCreepDraw(traits: Trait[], creep: any, graphics: any): void {
  for (const trait of traits) {
    const fn = creepDrawReg.get(trait.id);
    if (fn) {
      fn(trait, creep, graphics);
    }
  }
}

/** Remove traits whose _ttl has expired. */
export function cleanupExpiredTraits(traits: Trait[]): void {
  for (let i = traits.length - 1; i >= 0; i--) {
    if (traits[i]._ttl !== undefined && traits[i]._ttl <= 0) {
      traits.splice(i, 1);
    }
  }
}

// --- Utility ---

export function hasTrait(traits: Trait[], id: string): boolean {
  return traits.some(t => t.id === id);
}

export function getTrait(traits: Trait[], id: string): Trait | undefined {
  return traits.find(t => t.id === id);
}

export function removeTrait(traits: Trait[], id: string): void {
  const idx = traits.findIndex(t => t.id === id);
  if (idx !== -1) traits.splice(idx, 1);
}

export function addOrRefreshTrait(traits: Trait[], trait: Trait): void {
  const existing = traits.find(t => t.id === trait.id);
  if (existing) {
    Object.assign(existing, trait);
  } else {
    traits.push(trait);
  }
}
