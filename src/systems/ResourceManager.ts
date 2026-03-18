import { EventBus } from './EventBus';

export interface ResourceDef {
  id: string;
  name: string;
  startingAmount: number;
  tickRate: number; // per-second real-time income (0 = wave-only)
  color: string; // for UI display
}

export interface ResourceState {
  current: number;
  tickRate: number;
  waveIncome: number; // accumulated from various sources
  totalEarned: number;
  totalSpent: number;
}

/**
 * Manages N named resources. Gold is always present.
 * Supports real-time ticking (for Dual Economy's Essence)
 * and per-wave income collection.
 *
 * Standard mode: just gold.
 * Dual Economy: gold + essence with real-time essence ticking.
 * Future modes: wood, mana, souls, etc.
 */
export class ResourceManager {
  private resources: Map<string, ResourceState> = new Map();
  private events: EventBus;

  constructor(events: EventBus) {
    this.events = events;
  }

  /** Register a resource. Must be called before using it. */
  addResource(def: ResourceDef): void {
    this.resources.set(def.id, {
      current: def.startingAmount,
      tickRate: def.tickRate,
      waveIncome: 0,
      totalEarned: def.startingAmount,
      totalSpent: 0,
    });
  }

  /** Get current amount of a resource */
  get(id: string): number {
    return this.resources.get(id)?.current ?? 0;
  }

  /** Can afford a cost in a specific resource? */
  canAfford(id: string, cost: number): boolean {
    return this.get(id) >= cost;
  }

  /** Spend a resource. Returns false if insufficient. */
  spend(id: string, cost: number): boolean {
    const r = this.resources.get(id);
    if (!r || r.current < cost) return false;
    r.current -= cost;
    r.totalSpent += cost;
    this.events.emit('goldChanged', -cost, r.current); // compat event
    return true;
  }

  /** Add to a resource */
  add(id: string, amount: number): void {
    const r = this.resources.get(id);
    if (!r) return;
    r.current += amount;
    r.totalEarned += amount;
    this.events.emit('goldChanged', amount, r.current); // compat event
  }

  /** Set the per-wave income bonus for a resource */
  setWaveIncome(id: string, amount: number): void {
    const r = this.resources.get(id);
    if (r) r.waveIncome = amount;
  }

  /** Add to per-wave income */
  addWaveIncome(id: string, amount: number): void {
    const r = this.resources.get(id);
    if (r) r.waveIncome += amount;
  }

  /** Collect per-wave income. Returns amount collected. */
  collectWaveIncome(id: string): number {
    const r = this.resources.get(id);
    if (!r) return 0;
    const income = r.waveIncome;
    r.current += income;
    r.totalEarned += income;
    return income;
  }

  /** Real-time tick — call each frame with delta in ms */
  tick(delta: number): void {
    for (const [id, r] of this.resources) {
      if (r.tickRate > 0) {
        const amount = r.tickRate * (delta / 1000);
        r.current += amount;
        r.totalEarned += amount;
      }
    }
  }

  /** Get state for UI display */
  getState(id: string): ResourceState | undefined {
    return this.resources.get(id);
  }

  /** Get all resource IDs */
  getResourceIds(): string[] {
    return [...this.resources.keys()];
  }

  /** Check if a resource exists */
  has(id: string): boolean {
    return this.resources.has(id);
  }
}
