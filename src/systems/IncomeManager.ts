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
    return income;
  }

  getBreakdown(): { base: number; sends: number; frontier: number; total: number } {
    return {
      base: this.baseIncome,
      sends: this.sendBonus,
      frontier: this.frontierIncome,
      total: this.getWaveIncome(),
    };
  }
}
