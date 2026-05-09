/**
 * AttackerComposer — per-wave creep-pick state for attacker missions
 * (Plan 12 v2 Phases 1, 2, 2.5, 3 — economy v3).
 *
 * Holds the player's picks, ability cooldowns, wagon count, persistent
 * Reinforcement Camps, and the carryover-aware essence budget. The
 * composer is the single source of truth for the pre-wave UI; the
 * scene reads `lockedPicks()` / `queuedAbilities()` / state.wagon /
 * state.camps and dispatches everything at Send Wave time.
 *
 * Economy v3 additions:
 *  - **Carryover** — unspent essence rolls forward, capped at
 *    `economy.maxCarryoverMult × this wave's income cap`.
 *  - **Income growth** — each wave's income cap = baseBudget +
 *    growthPerWave × (waveNum-1) + camps × campIncomePerWave.
 *  - **Reinforcement Camps** — one-time essence-spend that adds
 *    permanent income. Persists across waves; resetForWave does NOT
 *    clear them.
 *
 * One Composer instance per scene. Stored on GameScene as
 * `attackerComposer`. resetForWave runs between waves.
 */
import type { AttackerPalette, AttackerPaletteEntry } from '../../data/AttackerPalettes';
import type { AttackerAbilityDef } from '../../data/AttackerAbilityDefs';

export interface AttackerPick {
  entry: AttackerPaletteEntry;
  count: number;
}

/** One ability slot — UI binding + live cooldown state. */
export interface AttackerAbilitySlot {
  def: AttackerAbilityDef;
  /** Waves remaining until this ability is available. 0 = ready. */
  cooldownRemaining: number;
  /** True when the player has armed this ability for the next Send. */
  queued: boolean;
}

/** Anti-magic Wagon: pre-wave essence-spend that grants the first N
 *  spawned creeps a 2-hit shield. Resets per wave. */
export interface AttackerWagonState {
  count: number;
  max: number;
  costPerWagon: number;
}

/** Reinforcement Camps — permanent income buildings. Each camp costs
 *  `costPerCamp` essence (one-time, paid out of the current wave's
 *  budget) and adds `incomePerWave` to every subsequent wave's income
 *  cap. PERSIST across waves — resetForWave does NOT reset count. */
export interface AttackerCampState {
  count: number;
  max: number;
  costPerCamp: number;
  incomePerWave: number;
}

/** Economy v3 config — per-mission tuning of the income curve. */
export interface AttackerEconomyConfig {
  /** Wave-1 income cap (before camps + carryover). */
  baseBudget: number;
  /** How much the income cap grows per wave (additive). 0 = flat. */
  growthPerWave: number;
  /** Carryover cap as a multiple of the current wave's income. 0 = no
   *  carryover, 2.0 = up to 2× this wave's income can roll over. */
  maxCarryoverMult: number;
  /** Reinforcement Camps config. Set max=0 to disable. */
  camps: { costPerCamp: number; incomePerWave: number; max: number };
  /** Wagon config (existing). */
  wagon: { costPerWagon: number; max: number };
}

export interface ComposerState {
  picks: Map<string, AttackerPick>;
  /** Total available this wave: thisWaveIncome + carryover. */
  budget: number;
  /** Carryover from the previous wave's leftover. UI displays this
   *  separately so the player understands where their money came from. */
  carryover: number;
  /** This wave's income cap (excluding carryover): baseBudget +
   *  growth + camps. UI shows it as the "income" line. */
  thisWaveIncome: number;
  abilities: AttackerAbilitySlot[];
  wagon: AttackerWagonState;
  camps: AttackerCampState;
  /** 1-indexed wave number this composer is currently composing for.
   *  resetForWave bumps it. */
  waveNum: number;
}

export class AttackerComposer {
  private palette: AttackerPalette;
  private economy: AttackerEconomyConfig;
  private state: ComposerState;
  private listeners: Set<(state: ComposerState) => void> = new Set();
  /** Snapshot of camp count at the start of this wave — anchored by
   *  resetForWave / constructor. Used by totalCost to charge only
   *  freshly-built camps against the current wave's budget. */
  private _campsAtWaveStart: number = 0;

  constructor(
    palette: AttackerPalette,
    economy: AttackerEconomyConfig,
    abilities: AttackerAbilityDef[] = [],
  ) {
    this.palette = palette;
    this.economy = economy;
    this.state = {
      picks: new Map(),
      budget: economy.baseBudget,
      carryover: 0,
      thisWaveIncome: economy.baseBudget,
      abilities: abilities.map(def => ({ def, cooldownRemaining: 0, queued: false })),
      wagon: { count: 0, max: economy.wagon.max, costPerWagon: economy.wagon.costPerWagon },
      camps: { count: 0, max: economy.camps.max, costPerCamp: economy.camps.costPerCamp, incomePerWave: economy.camps.incomePerWave },
      waveNum: 1,
    };
  }

  /** Reset the composer for a new wave. Picks + wagons clear; camps
   *  PERSIST. Cooldowns tick down. Carryover from this wave's
   *  remaining essence rolls into the next wave's pool, capped by
   *  economy.maxCarryoverMult × the new income cap.
   *
   *  `nextWaveNum` is 1-indexed (the wave the composer is now setting
   *  up for, not the one that just cleared). */
  resetForWave(nextWaveNum: number): void {
    const cfg = this.economy;
    const camps = this.state.camps;
    const thisWaveIncome = cfg.baseBudget
      + cfg.growthPerWave * (nextWaveNum - 1)
      + camps.count * camps.incomePerWave;
    const priorLeftover = this.state.budget - this.totalCost();
    const carryover = Math.min(
      Math.max(0, priorLeftover),
      thisWaveIncome * cfg.maxCarryoverMult,
    );
    const budget = thisWaveIncome + carryover;
    for (const ab of this.state.abilities) {
      ab.cooldownRemaining = Math.max(0, ab.cooldownRemaining - 1);
      ab.queued = false;
    }
    this.state = {
      picks: new Map(),
      budget,
      carryover,
      thisWaveIncome,
      abilities: this.state.abilities,
      wagon: { count: 0, max: cfg.wagon.max, costPerWagon: cfg.wagon.costPerWagon },
      camps: { ...camps }, // persist
      waveNum: nextWaveNum,
    };
    // Anchor camps-paid-for so further adjustCamps charges only the
    // delta against this wave's budget.
    this._campsAtWaveStart = camps.count;
    this.notify();
  }

  /** Increment count for a creep type by `delta` (can be negative).
   *  Refuses if the next state wouldn't fit the budget. */
  adjust(creepTypeId: string, delta: number): boolean {
    const entry = this.palette.entries.find(e => e.creepType === creepTypeId);
    if (!entry) return false;
    const current = this.state.picks.get(creepTypeId)?.count ?? 0;
    const next = current + delta;
    if (next < 0) return false;
    const newSpend = next * entry.cost;
    const otherSpend = this.totalCost() - current * entry.cost;
    if (otherSpend + newSpend > this.state.budget) return false;
    if (next === 0) {
      this.state.picks.delete(creepTypeId);
    } else {
      this.state.picks.set(creepTypeId, { entry, count: next });
    }
    this.notify();
    return true;
  }

  /** Toggle whether an ability is queued for the next Send. Refuses
   *  if the ability is on cooldown. */
  toggleAbility(abilityId: string): boolean {
    const slot = this.state.abilities.find(a => a.def.id === abilityId);
    if (!slot) return false;
    if (slot.cooldownRemaining > 0) return false;
    slot.queued = !slot.queued;
    this.notify();
    return true;
  }

  /** Adjust the wagon count by ±1 within budget + max. */
  adjustWagon(delta: number): boolean {
    const next = this.state.wagon.count + delta;
    if (next < 0) return false;
    if (next > this.state.wagon.max) return false;
    const before = this.state.wagon.count * this.state.wagon.costPerWagon;
    const after = next * this.state.wagon.costPerWagon;
    const projected = this.totalCost() - before + after;
    if (projected > this.state.budget) return false;
    this.state.wagon.count = next;
    this.notify();
    return true;
  }

  /** Adjust the camp count by ±1. Camps persist across waves and are
   *  irreversible — once you build one you can't refund it (delta=-1
   *  is rejected here so the UI can't accidentally roll it back). */
  adjustCamps(delta: number): boolean {
    if (delta <= 0) return false;
    const next = this.state.camps.count + delta;
    if (next > this.state.camps.max) return false;
    const before = this.state.camps.count * this.state.camps.costPerCamp;
    const after = next * this.state.camps.costPerCamp;
    const projected = this.totalCost() - before + after;
    if (projected > this.state.budget) return false;
    this.state.camps.count = next;
    this.notify();
    return true;
  }

  /** Mark queued abilities as cast — sets cooldown + clears queued. */
  commitQueuedAbilities(): void {
    for (const ab of this.state.abilities) {
      if (ab.queued) {
        ab.cooldownRemaining = ab.def.cooldown;
        ab.queued = false;
      }
    }
    this.notify();
  }

  queuedAbilities(): AttackerAbilitySlot[] {
    return this.state.abilities.filter(a => a.queued);
  }

  /** Clear picks (not wagons / camps / abilities). */
  clear(): void {
    this.state.picks.clear();
    this.notify();
  }

  lockedPicks(): AttackerPick[] {
    return [...this.state.picks.values()];
  }

  getState(): ComposerState {
    return this.state;
  }

  hasAnyPicks(): boolean {
    return this.state.picks.size > 0;
  }

  subscribe(fn: (state: ComposerState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Essence available after current picks + wagons + camps purchased
   *  this wave. Derived from `budget - totalCost()` rather than cached
   *  to avoid drift across the four mutators that change cost. */
  getRemainingEssence(): number {
    return this.state.budget - this.totalCost();
  }

  /** Total essence committed this wave: picks + wagons + camps just
   *  bought. (Camps already built in earlier waves don't count — they
   *  were paid for then.) */
  totalCost(): number {
    let total = 0;
    for (const pick of this.state.picks.values()) {
      total += pick.entry.cost * pick.count;
    }
    total += this.state.wagon.count * this.state.wagon.costPerWagon;
    // Camps cost is the *new* camps charged against this wave's
    // budget. We track it via a `_campsAtWaveStart` snapshot so we
    // know how many were paid for in prior waves vs this one.
    const newCamps = this.state.camps.count - this._campsAtWaveStart;
    total += newCamps * this.state.camps.costPerCamp;
    return total;
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this.state); }
      catch (err) { console.warn('[AttackerComposer] listener threw:', err); }
    }
  }
}
