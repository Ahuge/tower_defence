/**
 * AttackerComposer — per-wave creep-pick state for attacker missions
 * (Plan 12 v2 Phase 1 + Phase 2).
 *
 * Holds the player's current pre-wave picks, the essence budget, the
 * ability cooldowns, the queued abilities for the next wave, and the
 * Anti-magic Wagon count. Pre-wave UI (AttackerComposerOverlay) reads
 * + mutates this state via the methods below. When the player clicks
 * "Send Wave", GameScene reads the locked picks + queued abilities,
 * builds a WaveDefinition via AttackerWaveBuilder, dispatches the
 * abilities through AttackerAbilities, and starts the wave.
 *
 * One Composer instance per scene. Stored on GameScene as
 * `attackerComposer`. Re-initializes per wave (essence + queue
 * refresh; cooldowns tick down).
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
 *  spawned creeps a 2-hit shield. v2 prototype: same essence pool as
 *  picks; UI is a simple 0..max counter. */
export interface AttackerWagonState {
  /** How many wagons are currently bought for this wave (0..max). */
  count: number;
  /** Max wagons per wave. Default 2. */
  max: number;
  /** Essence cost per wagon. Default 25. */
  costPerWagon: number;
}

export interface ComposerState {
  /** Picks indexed by creep type id. count: 0 means not picked. */
  picks: Map<string, AttackerPick>;
  /** Essence remaining after current picks + abilities + wagons are
   *  subtracted. */
  remainingEssence: number;
  /** Total essence available this wave. */
  budget: number;
  /** Ability slots — UI tray reads these. */
  abilities: AttackerAbilitySlot[];
  /** Wagon spend state. */
  wagon: AttackerWagonState;
}

export class AttackerComposer {
  private palette: AttackerPalette;
  private budget: number;
  private state: ComposerState;
  private listeners: Set<(state: ComposerState) => void> = new Set();

  constructor(palette: AttackerPalette, budget: number, abilities: AttackerAbilityDef[] = []) {
    this.palette = palette;
    this.budget = budget;
    this.state = {
      picks: new Map(),
      remainingEssence: budget,
      budget,
      abilities: abilities.map(def => ({ def, cooldownRemaining: 0, queued: false })),
      wagon: { count: 0, max: 2, costPerWagon: 25 },
    };
  }

  /** Reset the composer for a new wave. Called between waves so the
   *  player starts each wave with a clean pick slate. Cooldowns tick
   *  down by 1 (with a floor of 0). Queued ability flags clear. Wagon
   *  count resets. */
  resetForWave(budget: number): void {
    this.budget = budget;
    for (const ab of this.state.abilities) {
      ab.cooldownRemaining = Math.max(0, ab.cooldownRemaining - 1);
      ab.queued = false;
    }
    this.state = {
      picks: new Map(),
      remainingEssence: budget,
      budget,
      abilities: this.state.abilities,
      wagon: { count: 0, max: this.state.wagon.max, costPerWagon: this.state.wagon.costPerWagon },
    };
    this.notify();
  }

  /** Increment count for a creep type by `delta` (can be negative).
   *  Clamps to budget — refuses to add a creep that wouldn't fit.
   *  Refuses to go below 0. Returns true if the change applied. */
  adjust(creepTypeId: string, delta: number): boolean {
    const entry = this.palette.entries.find(e => e.creepType === creepTypeId);
    if (!entry) return false;
    const current = this.state.picks.get(creepTypeId)?.count ?? 0;
    const next = current + delta;
    if (next < 0) return false;
    const newSpend = next * entry.cost;
    const otherSpend = this.totalCost() - current * entry.cost;
    if (otherSpend + newSpend > this.budget) return false;
    if (next === 0) {
      this.state.picks.delete(creepTypeId);
    } else {
      this.state.picks.set(creepTypeId, { entry, count: next });
    }
    this.state.remainingEssence = this.budget - this.totalCost();
    this.notify();
    return true;
  }

  /** Toggle whether an ability is queued for the next Send. Refuses
   *  if the ability is on cooldown. Returns true if the toggle
   *  applied. Abilities don't cost essence — only cooldown. */
  toggleAbility(abilityId: string): boolean {
    const slot = this.state.abilities.find(a => a.def.id === abilityId);
    if (!slot) return false;
    if (slot.cooldownRemaining > 0) return false;
    slot.queued = !slot.queued;
    this.notify();
    return true;
  }

  /** Adjust the wagon count by `delta` (typically +1 / -1). Costs
   *  `wagon.costPerWagon` essence per wagon, capped at wagon.max.
   *  Refuses if budget can't fit. Returns true if the change applied. */
  adjustWagon(delta: number): boolean {
    const next = this.state.wagon.count + delta;
    if (next < 0) return false;
    if (next > this.state.wagon.max) return false;
    const wagonSpendBefore = this.state.wagon.count * this.state.wagon.costPerWagon;
    const wagonSpendAfter = next * this.state.wagon.costPerWagon;
    const projected = this.totalCost() - wagonSpendBefore + wagonSpendAfter;
    if (projected > this.budget) return false;
    this.state.wagon.count = next;
    this.state.remainingEssence = this.budget - this.totalCost();
    this.notify();
    return true;
  }

  /** Mark queued abilities as cast — sets their cooldown and clears
   *  the queued flag. Called by GameScene at Send Wave time AFTER the
   *  effects have dispatched. */
  commitQueuedAbilities(): void {
    for (const ab of this.state.abilities) {
      if (ab.queued) {
        ab.cooldownRemaining = ab.def.cooldown;
        ab.queued = false;
      }
    }
    this.notify();
  }

  /** Snapshot of currently-queued abilities. GameScene dispatches
   *  these at startWave time so the wave inherits the buffs. */
  queuedAbilities(): AttackerAbilitySlot[] {
    return this.state.abilities.filter(a => a.queued);
  }

  /** Clear all picks. Cooldowns + queued abilities + wagons unaffected. */
  clear(): void {
    this.state.picks.clear();
    this.state.remainingEssence = this.budget - this.totalCost();
    this.notify();
  }

  /** Snapshot of locked picks for the current wave — used by
   *  AttackerWaveBuilder to construct the actual WaveDefinition. */
  lockedPicks(): AttackerPick[] {
    return [...this.state.picks.values()];
  }

  getState(): ComposerState {
    return this.state;
  }

  /** True if at least one creep is picked. UI uses this to enable/
   *  disable the Send-Wave button (no point sending an empty wave). */
  hasAnyPicks(): boolean {
    return this.state.picks.size > 0;
  }

  /** Subscribe to state changes. UI calls this to re-render. */
  subscribe(fn: (state: ComposerState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Total essence currently spent — picks + wagons. Abilities are
   *  cooldown-gated, not essence-priced. */
  private totalCost(): number {
    let total = 0;
    for (const pick of this.state.picks.values()) {
      total += pick.entry.cost * pick.count;
    }
    total += this.state.wagon.count * this.state.wagon.costPerWagon;
    return total;
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this.state); }
      catch (err) { console.warn('[AttackerComposer] listener threw:', err); }
    }
  }
}
