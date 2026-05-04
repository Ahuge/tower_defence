/**
 * AttackerComposer — per-wave creep-pick state for attacker missions
 * (Plan 12 v2 Phase 1).
 *
 * Holds the player's current pre-wave picks and the essence budget.
 * Pre-wave UI (AttackerComposerOverlay) reads + mutates this state
 * via the methods below. When the player clicks "Send Wave",
 * GameScene reads the locked picks, builds a WaveDefinition via
 * AttackerWaveBuilder, and starts the wave.
 *
 * One Composer instance per scene. Stored on GameScene as
 * `attackerComposer`. Re-initializes per wave (essence refresh).
 */
import type { AttackerPalette, AttackerPaletteEntry } from '../../data/AttackerPalettes';

export interface AttackerPick {
  entry: AttackerPaletteEntry;
  count: number;
}

export interface ComposerState {
  /** Picks indexed by creep type id. count: 0 means not picked. */
  picks: Map<string, AttackerPick>;
  /** Essence remaining after current picks are subtracted. */
  remainingEssence: number;
  /** Total essence available this wave. */
  budget: number;
}

export class AttackerComposer {
  private palette: AttackerPalette;
  private budget: number;
  private state: ComposerState;
  private listeners: Set<(state: ComposerState) => void> = new Set();

  constructor(palette: AttackerPalette, budget: number) {
    this.palette = palette;
    this.budget = budget;
    this.state = {
      picks: new Map(),
      remainingEssence: budget,
      budget,
    };
  }

  /** Reset the composer for a new wave. Called between waves so the
   *  player starts each wave with a clean pick slate. */
  resetForWave(budget: number): void {
    this.budget = budget;
    this.state = {
      picks: new Map(),
      remainingEssence: budget,
      budget,
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

  /** Clear all picks. */
  clear(): void {
    this.state.picks.clear();
    this.state.remainingEssence = this.budget;
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

  private totalCost(): number {
    let total = 0;
    for (const pick of this.state.picks.values()) {
      total += pick.entry.cost * pick.count;
    }
    return total;
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this.state); }
      catch (err) { console.warn('[AttackerComposer] listener threw:', err); }
    }
  }
}
