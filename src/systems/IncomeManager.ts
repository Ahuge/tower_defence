import { EventBus } from './EventBus';

export class IncomeManager {
  private events: EventBus;
  baseIncome: number = 10;
  sendBonus: number = 0; // bonus income from sends
  frontierIncome: number = 0; // income from frontier buildings
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
