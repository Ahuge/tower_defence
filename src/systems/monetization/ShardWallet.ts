/**
 * ShardWallet — manages the premium currency (Shards).
 * Singleton. All shard earning/spending goes through here.
 * Persists via StorePersistence and emits change callbacks.
 */
import { StorePersistence, TransactionRecord } from './StorePersistence';

type ShardListener = (balance: number, delta: number, reason: string) => void;

class ShardWalletClass {
  private listeners: ShardListener[] = [];

  /** Current shard balance */
  getBalance(): number {
    return StorePersistence.load().shards;
  }

  /** Whether the player can afford a given cost */
  canAfford(cost: number): boolean {
    return this.getBalance() >= cost;
  }

  /**
   * Earn shards (positive delta). Returns new balance.
   * @param amount Must be > 0
   * @param reason Human-readable reason for analytics/history
   */
  earn(amount: number, reason: string): number {
    if (amount <= 0) return this.getBalance();
    const state = StorePersistence.update(s => {
      s.shards += amount;
      s.transactions.unshift({
        amount,
        reason,
        timestamp: Date.now(),
      });
    });
    this.notify(state.shards, amount, reason);
    return state.shards;
  }

  /**
   * Spend shards (negative delta). Returns true if successful, false if insufficient.
   * @param amount Must be > 0
   * @param reason Human-readable reason
   */
  spend(amount: number, reason: string): boolean {
    if (amount <= 0) return true;
    const current = this.getBalance();
    if (current < amount) return false;

    const state = StorePersistence.update(s => {
      s.shards -= amount;
      s.transactions.unshift({
        amount: -amount,
        reason,
        timestamp: Date.now(),
      });
    });
    this.notify(state.shards, -amount, reason);
    return true;
  }

  /** Get recent transaction history */
  getTransactions(limit = 50): TransactionRecord[] {
    return StorePersistence.load().transactions.slice(0, limit);
  }

  /** Register a listener for balance changes */
  onChange(listener: ShardListener): void {
    this.listeners.push(listener);
  }

  /** Remove a listener */
  offChange(listener: ShardListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  private notify(balance: number, delta: number, reason: string): void {
    for (const fn of this.listeners) {
      fn(balance, delta, reason);
    }
  }
}

export const ShardWallet = new ShardWalletClass();
