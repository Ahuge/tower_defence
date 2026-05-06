import { EventBus } from './EventBus';

/**
 * Tracks per-wave income from multiple sources.
 * Works with EconomyManager — income is collected as gold at wave end.
 * Future modes can have income feed into different resources.
 */
export class IncomeManager {
  private events: EventBus;
  baseIncome: number = 10;
  sendBonus: number = 0;
  frontierIncome: number = 0;
  totalIncomeEarned: number = 0;

  constructor(events: EventBus) {
    this.events = events;
  }

  getWaveIncome(): number {
    return this.baseIncome + this.sendBonus + this.frontierIncome;
  }

  addSendBonus(amount: number): void {
    this.sendBonus += amount;
  }

  addFrontierIncome(amount: number): void {
    this.frontierIncome += amount;
  }

  collectWaveIncome(): number {
    const income = this.getWaveIncome();
    this.totalIncomeEarned += income;
    // Accumulate the per-source slices so the Game Over screen can
    // show realised gold per channel (Send ROI, Frontier ROI, etc.)
    // without each mode wiring its own bookkeeping. Cleared together
    // when the IncomeManager is disposed at match end.
    this.totalSendsRealized += this.sendBonus;
    this.totalFrontierRealized += this.frontierIncome;
    return income;
  }

  /** Cumulative gold paid out via send bonuses across the whole
   *  match. Used by GameOverScreen for the Sends ROI stat. */
  totalSendsRealized: number = 0;
  /** Cumulative gold paid out via frontier steady income across
   *  the whole match. Mirror of totalSendsRealized for the
   *  Frontier ROI breakdown. */
  totalFrontierRealized: number = 0;

  getBreakdown(): { base: number; sends: number; frontier: number; total: number } {
    return {
      base: this.baseIncome,
      sends: this.sendBonus,
      frontier: this.frontierIncome,
      total: this.getWaveIncome(),
    };
  }
}
