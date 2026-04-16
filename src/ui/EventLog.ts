/**
 * EventLog — lightweight message logger.
 * Routes all messages to GameUIStore for DOM rendering.
 * Kept as a class (not singleton) for backward compatibility with systems
 * that receive it as a constructor parameter.
 */
import { GAME_HEIGHT, getSidebarWidth, TOWER_BAR_HEIGHT } from '../config';
import { GameUIStore } from './GameUIStore';

const MAX_LINES = 12;

export class EventLog {
  private lines: string[] = [];

  constructor(_scene: unknown, _topY?: number) {
    // No-op: Phaser rendering removed. Parameters kept for call-site compat.
  }

  log(message: string, color?: string): void {
    this.lines.push(message);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    GameUIStore.addLogEntry(message, color ?? '#999');
  }

  waveStarted(waveNum: number, totalWaves: number, creepTypes: string[]): void {
    const types = creepTypes.length > 0 ? `: ${creepTypes.join(', ')}` : '';
    this.log(`Wave ${waveNum}/${totalWaves} started${types}`);
  }

  waveCleared(waveNum: number, income: number): void {
    this.log(`Wave ${waveNum} cleared! +${income}g income`);
  }

  frontierIncome(buildingName: string, amount: number): void {
    this.log(`${buildingName}: +${amount}g`);
  }

  towerBuilt(name: string, cost: number): void {
    this.log(`Built ${name} (-${cost}g)`);
  }

  towerSold(name: string, refund: number): void {
    this.log(`Sold ${name} (+${refund}g)`);
  }

  sendQueued(name: string, cost: number): void {
    this.log(`Send: ${name} (-${cost}g)`);
  }

  frontierPurchased(name: string, cost: number): void {
    this.log(`Frontier: ${name} (-${cost}g)`);
  }

  frontierAction(action: string, result: string): void {
    this.log(`${action}: ${result}`);
  }

  creepReached(): void {
    this.log('Creep reached exit! -1 life');
  }

  gameMessage(msg: string): void {
    this.log(msg);
  }

  /** No-op — kept for call-site compat */
  getContainer(): any { return { setVisible() {} }; }
}
