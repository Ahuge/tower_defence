import { ArmorType, DamageType } from '../../data/CreepTypes';
import { calculateDamage } from '../DamageCalculator';
import type { DamageSource } from '../../entities/Damageable';

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
  isBoss: boolean;
  pathIndex: number;
  path: { col: number; row: number }[];
  takeDamage(amount: number): void;
  applySlow(duration: number, factor: number): void;
}

/** Per-hit stat recording that traits write to */
export interface HitStats {
  directDamage: number;
  splashDamage: number;
  burnDamage: number;
  poisonDamage: number;
  chainDamage: number;
  pierceDamage: number;
  auraDamage: number;
  [key: string]: number; // extensible for future trait-specific stats
}

export function createHitStats(): HitStats {
  return { directDamage: 0, splashDamage: 0, burnDamage: 0, poisonDamage: 0, chainDamage: 0, pierceDamage: 0, auraDamage: 0 };
}

export interface HitContext {
  towerLevel: number;
  damage: number;
  damageType: DamageType;
  target: HitTarget;
  allTargets: HitTarget[];
  hitTargets: HitTarget[];
  goldEarned: number;
  hitStats: HitStats;
  /** Owner of the firing tower. Splash / chain / similar AOE
   *  deliveries skip creeps with the same ownerIndex (a tower's own
   *  team is immune to its own splash). Optional so legacy callers
   *  don't have to set it; undefined falls back to friend-fire-on
   *  behaviour. */
  towerOwnerIndex?: number;
}

export interface UpdateContext {
  allTowers: any[];
  allCreeps: any[];
  /** Creeps that were killed since the last tower-update tick. Used by
   *  kill-reactive traits like `life_on_kill` that need to observe deaths
   *  after CreepManager has marked them but before its filter removes
   *  them from `allCreeps`. The list is cleared at the start of each
   *  CreepManager.update(). */
  justDiedCreeps: any[];
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

// --- Lifecycle / damage / render pipeline (Tower-side, v2 refactor) ---

/** Veto = "this damage should not apply at all" (e.g. M10 throne is
 *  invulnerable while generators alive, shield-bubble absorbs the hit).
 *  OR semantics: any handler returning true vetoes the damage. */
type DamageVetoFn = (trait: Trait, amount: number, source: DamageSource, tower: any) => boolean;
/** Modifier = chained multiplier/transform on the incoming amount
 *  (resists, vulnerability buffs, partial absorb). Run after veto. */
type DamageModifierFn = (trait: Trait, amount: number, source: DamageSource, tower: any) => number;
/** onTakeDamage = side-effect after damage applied (animations,
 *  events, retaliation flagging). Cannot change the amount. */
type OnTakeDamageFn = (trait: Trait, amount: number, source: DamageSource, tower: any) => void;
/** onKill = killing-blow hook. Fires after hp <= 0 + _expired set,
 *  before the next-frame cleanup. */
type OnKillFn = (trait: Trait, source: DamageSource, tower: any) => void;
/** onSpawn / onDespawn — lifecycle hooks. Fire on construction
 *  (after trait list is materialised) and at cleanup time. */
type OnSpawnFn = (trait: Trait, tower: any) => void;
type OnDespawnFn = (trait: Trait, tower: any) => void;
/** Overlay draw — each trait can paint on top of the base tower
 *  render. Replaces drawTower's hard-coded campaign-specific
 *  conditionals (golden ult border, conduit link arc, etc.). */
type OverlayDrawFn = (trait: Trait, tower: any, graphics: any, scene: any) => void;

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
const damageVetoReg = new Map<string, DamageVetoFn>();
const damageModifierReg = new Map<string, DamageModifierFn>();
const onTakeDamageReg = new Map<string, OnTakeDamageFn>();
const onKillReg = new Map<string, OnKillFn>();
const onSpawnReg = new Map<string, OnSpawnFn>();
const onDespawnReg = new Map<string, OnDespawnFn>();
const overlayDrawReg = new Map<string, OverlayDrawFn>();

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
export function registerDamageVeto(id: string, fn: DamageVetoFn) { damageVetoReg.set(id, fn); }
export function registerDamageModifier(id: string, fn: DamageModifierFn) { damageModifierReg.set(id, fn); }
export function registerOnTakeDamage(id: string, fn: OnTakeDamageFn) { onTakeDamageReg.set(id, fn); }
export function registerOnKill(id: string, fn: OnKillFn) { onKillReg.set(id, fn); }
export function registerOnSpawn(id: string, fn: OnSpawnFn) { onSpawnReg.set(id, fn); }
export function registerOnDespawn(id: string, fn: OnDespawnFn) { onDespawnReg.set(id, fn); }
export function registerOverlayDraw(id: string, fn: OverlayDrawFn) { overlayDrawReg.set(id, fn); }

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

// --- Tower lifecycle / damage / render resolvers (v2) ---

/** Run the damage-veto pipeline. OR semantics: any handler returning
 *  true vetoes the damage entirely. Caller short-circuits on true. */
export function resolveDamageVeto(traits: Trait[], amount: number, source: DamageSource, tower: any): boolean {
  for (const trait of traits) {
    const fn = damageVetoReg.get(trait.id);
    if (fn && fn(trait, amount, source, tower)) return true;
  }
  return false;
}

/** Run the damage-modifier chain on a Tower-side hit. Each handler
 *  takes the current amount and returns the new amount; order is
 *  trait-list order. Run AFTER veto, BEFORE applying to hp. */
export function resolveTowerDamageModifiers(traits: Trait[], amount: number, source: DamageSource, tower: any): number {
  let a = amount;
  for (const trait of traits) {
    const fn = damageModifierReg.get(trait.id);
    if (fn) a = fn(trait, a, source, tower);
  }
  return a;
}

/** Side-effect hooks after damage applied (animations, retaliation
 *  flagging). Cannot change the amount; runs even on 0-amount hits
 *  if any trait wants to react to "I was targeted but absorbed." */
export function resolveOnTakeDamage(traits: Trait[], amount: number, source: DamageSource, tower: any): void {
  for (const trait of traits) {
    const fn = onTakeDamageReg.get(trait.id);
    if (fn) fn(trait, amount, source, tower);
  }
}

/** Killing-blow hook. Fires once, after hp <= 0 and _expired = true. */
export function resolveOnKill(traits: Trait[], source: DamageSource, tower: any): void {
  for (const trait of traits) {
    const fn = onKillReg.get(trait.id);
    if (fn) fn(trait, source, tower);
  }
}

/** Lifecycle: tower constructed and trait list materialised. Run
 *  once at the end of Tower's constructor. */
export function resolveOnSpawn(traits: Trait[], tower: any): void {
  for (const trait of traits) {
    const fn = onSpawnReg.get(trait.id);
    if (fn) fn(trait, tower);
  }
}

/** Lifecycle: tower about to be cleaned up (next-frame after _expired).
 *  Run before grid removal so handlers can read final state. */
export function resolveOnDespawn(traits: Trait[], tower: any): void {
  for (const trait of traits) {
    const fn = onDespawnReg.get(trait.id);
    if (fn) fn(trait, tower);
  }
}

/** Run each trait's overlay-draw handler after the base tower render.
 *  Replaces drawTower's campaign-specific conditionals — each campaign
 *  registers its own overlay (golden ult border, conduit link, hack
 *  glow, etc.) and drawTower just iterates. Order is trait-list order;
 *  Phaser graphics compositing makes overlapping draws additive. */
export function resolveOverlayDraw(traits: Trait[], tower: any, graphics: any, scene: any): void {
  for (const trait of traits) {
    const fn = overlayDrawReg.get(trait.id);
    if (fn) fn(trait, tower, graphics, scene);
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
