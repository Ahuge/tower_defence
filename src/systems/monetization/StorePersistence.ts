/**
 * StorePersistence — localStorage-backed persistence for all monetization data.
 * Single storage key, atomic read/write of the full player store state.
 */

export interface SkinEquip {
  /** Skin definition id */
  skinId: string;
  /** Entity it applies to (faction id for tower/creep skins, hero id for hero skins) */
  entityId: string;
}

export interface TransactionRecord {
  amount: number;
  reason: string;
  timestamp: number;
}

export interface ChallengeProgress {
  challengeId: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface StoreState {
  /** Shard balance */
  shards: number;
  /** Transaction history (most recent first, capped at 200) */
  transactions: TransactionRecord[];

  /** Owned skin definition ids */
  ownedSkins: string[];
  /** Equipped skins by slot: 'tower:<factionId>', 'hero:<heroId>', 'creep:<factionId>' */
  equippedSkins: Record<string, string>;
  /** Equipped terrain theme id (null = use faction default) */
  equippedTerrain: string | null;

  /** Unlocked premium faction ids */
  unlockedFactions: string[];
  /** Unlocked terrain theme ids */
  unlockedTerrains: string[];

  /** Whether the premium battle pass has been purchased for the current season */
  battlePassPremium: boolean;
  /** Current season id (to detect season rollover) */
  battlePassSeason: string;
  /** Battle pass XP accumulated this season */
  battlePassXP: number;
  /** Claimed reward level indices (free track) */
  claimedFreeRewards: number[];
  /** Claimed reward level indices (premium track) */
  claimedPremiumRewards: number[];

  /** Daily challenge progress */
  dailyChallenges: ChallengeProgress[];
  /** ISO date string of last daily reset */
  dailyResetDate: string;
  /** Weekly challenge progress */
  weeklyChallenges: ChallengeProgress[];
  /** ISO date string of last weekly reset */
  weeklyResetDate: string;

  /** Number of free skin rolls remaining this week (premium pass perk) */
  freeRollsRemaining: number;
  /** ISO date string of last free roll reset */
  freeRollResetDate: string;

  /** Whether "Remove Ads" has been purchased */
  adFree: boolean;

  /** Total games played (for analytics / unlock gating) */
  gamesPlayed: number;
  /** Total games won */
  gamesWon: number;
}

const STORAGE_KEY = 'td_store';
const MAX_TRANSACTIONS = 200;

function defaultState(): StoreState {
  return {
    shards: 0,
    transactions: [],
    ownedSkins: [],
    equippedSkins: {},
    equippedTerrain: null,
    unlockedFactions: [],
    unlockedTerrains: [],
    battlePassPremium: false,
    battlePassSeason: '',
    battlePassXP: 0,
    claimedFreeRewards: [],
    claimedPremiumRewards: [],
    dailyChallenges: [],
    dailyResetDate: '',
    weeklyChallenges: [],
    weeklyResetDate: '',
    freeRollsRemaining: 0,
    freeRollResetDate: '',
    adFree: false,
    gamesPlayed: 0,
    gamesWon: 0,
  };
}

export class StorePersistence {
  /** Load the full store state, returning defaults for missing fields */
  static load(): StoreState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      // Merge with defaults so new fields are always present
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  /** Save the full store state */
  static save(state: StoreState): void {
    // Cap transaction history
    if (state.transactions.length > MAX_TRANSACTIONS) {
      state.transactions = state.transactions.slice(0, MAX_TRANSACTIONS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /** Load, apply a mutation, and save in one step */
  static update(mutate: (state: StoreState) => void): StoreState {
    const state = StorePersistence.load();
    mutate(state);
    StorePersistence.save(state);
    return state;
  }

  /** Reset all store data (for testing / debug) */
  static reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
