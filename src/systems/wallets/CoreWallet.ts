/**
 * CoreWallet — manages the Cores currency.
 *
 * Cores power tower-chip purchases (Plan 16) and synergy unlocks (Plan
 * 17). Earned almost exclusively from Career mode (Plan 15). Per the
 * roadmap: Cores are NEVER sold for money — that protects the
 * progression system from feeling pay-to-win.
 *
 * Mirror of `ShardWallet` shape. Listeners notify on every change.
 * Persisted via PlayerProfileStore (separate from the shard/skin
 * monetization store so the spine of progression has its own key).
 */
import { PlayerProfileStore, CoreTransactionRecord } from '../profile/PlayerProfileStore';

type CoreListener = (balance: number, delta: number, reason: string) => void;

class CoreWalletClass {
  private listeners: CoreListener[] = [];

  getBalance(): number {
    return PlayerProfileStore.load().cores;
  }

  canAfford(cost: number): boolean {
    return this.getBalance() >= cost;
  }

  /** Earn cores. Returns new balance. */
  earn(amount: number, reason: string): number {
    if (amount <= 0) return this.getBalance();
    const state = PlayerProfileStore.update(s => {
      s.cores += amount;
      s.coreTransactions.unshift({ amount, reason, timestamp: Date.now() });
    });
    this.notify(state.cores, amount, reason);
    return state.cores;
  }

  /** Spend cores. Returns true if successful, false if insufficient. */
  spend(amount: number, reason: string): boolean {
    if (amount <= 0) return true;
    const current = this.getBalance();
    if (current < amount) return false;
    const state = PlayerProfileStore.update(s => {
      s.cores -= amount;
      s.coreTransactions.unshift({ amount: -amount, reason, timestamp: Date.now() });
    });
    this.notify(state.cores, -amount, reason);
    return true;
  }

  getTransactions(limit = 50): CoreTransactionRecord[] {
    return PlayerProfileStore.load().coreTransactions.slice(0, limit);
  }

  onChange(listener: CoreListener): void {
    this.listeners.push(listener);
  }

  offChange(listener: CoreListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  private notify(balance: number, delta: number, reason: string): void {
    for (const fn of this.listeners) fn(balance, delta, reason);
  }
}

export const CoreWallet = new CoreWalletClass();
