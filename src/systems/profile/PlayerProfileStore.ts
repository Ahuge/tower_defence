/**
 * PlayerProfileStore — localStorage-backed persistence for the global,
 * permanent player profile.
 *
 * Distinct from `StorePersistence` (`td_store`), which holds the seasonal
 * monetization state — Battle Pass XP, shards, owned skins, daily/weekly
 * challenges. The profile here is the *spine* of long-term progression:
 * the player level that ungates modes / maps / factions, the Cores
 * currency for tower-chip purchases, and per-tower-chip state.
 *
 * Why separate keys: BattlePass season-rolls and clears its slice; profile
 * is a strictly grow-only record (other than rare dev resets). Splitting
 * keeps each store's reset semantics independent and avoids an accidental
 * profile wipe when a season ends.
 *
 * Mirror of `StorePersistence` shape: single key, atomic load/save,
 * `update(mutate)` helper, defaults merged on load so new fields don't
 * crash older saves.
 */

export interface CoreTransactionRecord {
  amount: number;
  reason: string;
  timestamp: number;
}

export interface TowerChipState {
  /** Chip-perk level: 0..5. Each level applies one passive perk pick. */
  level: number;
  /** Chips collected toward the next level (0..thresholds[level]). */
  chips: number;
  /** Perk ids picked at each level so far; length === level. */
  picks: string[];
}

export interface PlayerProfileState {
  /** Bumped when the schema changes incompatibly. Migrate in load(). */
  schemaVersion: 1;

  /** Current Player Level (>=1). Derived from xp on read but cached
   *  here so we can detect level-up transitions in `addXP`. */
  level: number;

  /** Total accumulated XP. Curve: xpToNext(level) = 200 * level. */
  xp: number;

  /** Cores currency balance — earned in Career, spent on tower chips. */
  cores: number;
  /** Cores ledger (most recent first, capped). */
  coreTransactions: CoreTransactionRecord[];

  /** Mode ids the player has been awarded access to. Read-mostly: a
   *  mode appears here once unlocked-at-level is reached. The
   *  authoritative gate is `UnlockGates.isModeUnlocked` which reads
   *  `level` directly; this list is for "what's NEW" callouts and to
   *  let us snapshot what was already revealed. */
  unlockedModes: string[];
  /** Map ids similarly tracked. */
  unlockedMaps: string[];
  /** Faction ids the player has *ever* unlocked, regardless of route
   *  (Shards via PlayerInventory, future faction-tree, future
   *  campaign-completion). Grow-only. Distinct from `td_store`'s
   *  `unlockedFactions` which is the active monetization inventory. */
  unlockedFactionsLifetime: string[];

  /** Per-faction campaign mission completion count (0..10). */
  campaignProgress: { [factionId: string]: number };
  /** Highest career stage ever cleared. */
  careerHighStage: number;

  /** Per-tower chip-token state. Empty until Plan 16 introduces chip
   *  earning; the field exists now so save format is forward-stable. */
  towerChips: { [towerId: string]: TowerChipState };

  /** Generic flag bag for one-shot UX milestones (firstSeen.flying,
   *  faction_brief_seen.<id>, migration banner shown, etc.). */
  flags: { [k: string]: boolean };

  /** Epoch (ms) of the migration from a legacy save, if applicable. */
  migratedAt?: number;
  /** Inferred starting level from the migration (telemetry / debug). */
  migratedFromInferredLevel?: number;
}

const STORAGE_KEY = 'td_profile';
const MAX_CORE_TRANSACTIONS = 200;

export function defaultProfileState(): PlayerProfileState {
  return {
    schemaVersion: 1,
    level: 1,
    xp: 0,
    cores: 0,
    coreTransactions: [],
    unlockedModes: ['standard', 'tutorial'],
    unlockedMaps: ['plains', 'tutorial', 'hero_plains'],
    unlockedFactionsLifetime: ['arcane'],
    campaignProgress: {},
    careerHighStage: 0,
    towerChips: {},
    flags: {},
  };
}

export class PlayerProfileStore {
  /** Load the profile, merging defaults so missing fields are present. */
  static load(): PlayerProfileState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfileState();
      const parsed = JSON.parse(raw) as Partial<PlayerProfileState>;
      return { ...defaultProfileState(), ...parsed };
    } catch {
      return defaultProfileState();
    }
  }

  /** True only if no `td_profile` key has been written to localStorage. */
  static isFreshInstall(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === null;
    } catch {
      return true;
    }
  }

  static save(state: PlayerProfileState): void {
    if (state.coreTransactions.length > MAX_CORE_TRANSACTIONS) {
      state.coreTransactions = state.coreTransactions.slice(0, MAX_CORE_TRANSACTIONS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /** Load, mutate, save. Returns the saved state. */
  static update(mutate: (state: PlayerProfileState) => void): PlayerProfileState {
    const state = PlayerProfileStore.load();
    mutate(state);
    PlayerProfileStore.save(state);
    return state;
  }

  /** Reset profile data (testing/debug only). */
  static reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
