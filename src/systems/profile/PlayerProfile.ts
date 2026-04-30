/**
 * PlayerProfile — facade singleton for the global, permanent player
 * profile (level / XP / cores / unlocks).
 *
 * Boot sequence (called from main.ts):
 *   PlayerProfile.init();       // migrate if needed; emit profile_initialized
 *   Analytics.setPlayerContextProvider(PlayerProfile.contextProvider);
 *
 * After `init()`:
 *   - `td_profile` localStorage key is guaranteed present.
 *   - Legacy players (gamesPlayed > 0 in `td_store`) get an inferred
 *     starting level so they don't feel reset; a one-shot banner is
 *     queued via `flags.migration_banner_pending`.
 *   - Every Analytics event auto-includes playerLevel + cores +
 *     shards + unlockedFactionsCount.
 *
 * State writes go through this facade. No direct PlayerProfileStore
 * mutation outside of profile/ to keep the level-up detection +
 * analytics emission centralized.
 */

import { Analytics } from '../AnalyticsClient';
import { StorePersistence } from '../monetization/StorePersistence';
import { PlayerProfileStore, PlayerProfileState } from './PlayerProfileStore';
import { CoreWallet } from '../wallets/CoreWallet';
import {
  levelFromXp,
  xpProgressInLevel,
  GameEndContext,
  xpForGameEnd,
} from './PlayerLevel';
import { unlocksAtLevel } from './UnlockGates';

type LevelChangeListener = (oldLevel: number, newLevel: number, reveals: ReturnType<typeof unlocksAtLevel>) => void;

class PlayerProfileClass {
  private initialized = false;
  private levelListeners: LevelChangeListener[] = [];

  /** Idempotent. Safe to call once at boot — subsequent calls no-op. */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const isFresh = PlayerProfileStore.isFreshInstall();
    if (isFresh) {
      this.maybeMigrateFromLegacy();
    }

    // Reconcile cached level field with actual xp (in case a future
    // schema change re-tunes the curve, the cache must follow).
    PlayerProfileStore.update(s => {
      s.level = levelFromXp(s.xp);
    });

    const state = PlayerProfileStore.load();
    Analytics.track('profile_initialized', {
      level: state.level,
      cores: state.cores,
    });

    // Wire player context into every future analytics event. Reads
    // current values lazily on each emit so changes propagate
    // immediately without listener plumbing.
    Analytics.setPlayerContextProvider(() => {
      const s = PlayerProfileStore.load();
      const store = StorePersistence.load();
      return {
        playerLevel: s.level,
        cores: s.cores,
        shards: store.shards,
        unlockedFactionsCount: store.unlockedFactions.length,
      };
    });
  }

  /** Existing players (with gamesPlayed > 0 from `td_store`) get a
   *  one-time inferred starting level so they don't feel demoted. */
  private maybeMigrateFromLegacy(): void {
    const store = StorePersistence.load();
    if (store.gamesPlayed <= 0) return;

    // Conservative inference: 1 game played ≈ 1 level, capped at 20.
    // Tunable. The intent is "you don't lose your sense of progress",
    // not "you keep all your future XP earnings."
    const inferred = Math.min(20, Math.max(1, Math.floor(store.gamesPlayed / 1)));

    PlayerProfileStore.update(s => {
      s.level = inferred;
      // Set xp to the start of this level so any future XP earnings
      // count toward the next level normally.
      let total = 0;
      for (let i = 1; i < inferred; i++) total += i * 200;
      s.xp = total;
      s.migratedAt = Date.now();
      s.migratedFromInferredLevel = inferred;
      s.flags.migration_banner_pending = true;
    });

    Analytics.track('profile_migrated_from_legacy', {
      inferredLevel: inferred,
      gamesPlayed: store.gamesPlayed,
    });
  }

  // ---- Read access ------------------------------------------------------

  getLevel(): number {
    return PlayerProfileStore.load().level;
  }

  getXP(): number {
    return PlayerProfileStore.load().xp;
  }

  /** XP within the current level + amount required to advance. */
  getXPProgress(): { current: number; required: number; level: number } {
    return xpProgressInLevel(this.getXP());
  }

  getFlag(key: string): boolean {
    return !!PlayerProfileStore.load().flags[key];
  }

  setFlag(key: string, value: boolean): void {
    PlayerProfileStore.update(s => { s.flags[key] = value; });
  }

  /** Faction first-play tracking — read snapshot for XP-bonus decisions.
   *  Looks at both our profile flag (set on first match started) and
   *  the legacy `firstWinFactions` (some legacy players have wins
   *  recorded but no profile flag yet). */
  hasPlayedFaction(factionId: string): boolean {
    const store = StorePersistence.load();
    if (store.firstWinFactions.includes(factionId)) return true;
    return this.getFlag(`first_play_faction.${factionId}`);
  }

  hasWonOnMap(mapId: string): boolean {
    return this.getFlag(`first_win_map.${mapId}`);
  }

  // ---- XP awarding ------------------------------------------------------

  /** Award XP and run level-up detection. Emits analytics. */
  addXP(amount: number, reason: string): { from: number; to: number } {
    if (amount <= 0) return { from: this.getLevel(), to: this.getLevel() };

    const fromLevel = this.getLevel();
    const state = PlayerProfileStore.update(s => {
      s.xp += amount;
      s.level = levelFromXp(s.xp);
    });
    const toLevel = state.level;

    Analytics.track('xp_awarded', { amount, source: reason });

    if (toLevel > fromLevel) {
      // Level-up sweep: for each level crossed, mark associated
      // unlocks as revealed and emit telemetry. Most level-ups cross
      // exactly one level but loops are cheap and correct against
      // bulk XP awards that span multiple.
      for (let l = fromLevel + 1; l <= toLevel; l++) {
        const reveals = unlocksAtLevel(l);
        for (const r of reveals) {
          if (r.type === 'mode') {
            PlayerProfileStore.update(s => {
              if (!s.unlockedModes.includes(r.id)) s.unlockedModes.push(r.id);
            });
          } else if (r.type === 'map') {
            PlayerProfileStore.update(s => {
              if (!s.unlockedMaps.includes(r.id)) s.unlockedMaps.push(r.id);
            });
          }
          Analytics.track('unlock_revealed', {
            unlockType: r.type,
            id: r.id,
            atLevel: l,
          });
        }
      }
      Analytics.track('level_up', { from: fromLevel, to: toLevel });
      this.notifyLevelChange(fromLevel, toLevel, unlocksAtLevel(toLevel));
    }

    return { from: fromLevel, to: toLevel };
  }

  /** Convenience: award XP for a finished game. Reads first-play /
   *  first-win flags, awards bonuses, and updates the flags. */
  awardGameEndXP(ctx: Omit<GameEndContext, 'firstFactionPlay' | 'firstMapWin'>): { from: number; to: number; amount: number; reason: string } {
    const firstFactionPlay = ctx.faction
      ? !this.hasPlayedFaction(ctx.faction)
      : false;
    const firstMapWin = ctx.result === 'victory' && !this.hasWonOnMap(ctx.mapId);

    const { amount, reason } = xpForGameEnd({ ...ctx, firstFactionPlay, firstMapWin });

    if (firstFactionPlay && ctx.faction) {
      this.setFlag(`first_play_faction.${ctx.faction}`, true);
    }
    if (firstMapWin) {
      this.setFlag(`first_win_map.${ctx.mapId}`, true);
    }

    const change = this.addXP(amount, reason);
    return { ...change, amount, reason };
  }

  // ---- Cores ------------------------------------------------------------

  getCores(): number {
    return CoreWallet.getBalance();
  }

  // ---- Listeners --------------------------------------------------------

  /** Called whenever a level-up happens (from ANY XP source). The
   *  level-up modal subscribes here so it can play its reveal. */
  onLevelUp(listener: LevelChangeListener): () => void {
    this.levelListeners.push(listener);
    return () => {
      const i = this.levelListeners.indexOf(listener);
      if (i >= 0) this.levelListeners.splice(i, 1);
    };
  }

  private notifyLevelChange(from: number, to: number, reveals: ReturnType<typeof unlocksAtLevel>): void {
    for (const fn of this.levelListeners) {
      try { fn(from, to, reveals); }
      catch (err) { console.warn('[PlayerProfile] level listener threw:', err); }
    }
  }

  // ---- Debug / testing --------------------------------------------------

  /** Reset to defaults. NEVER call this from product code. */
  __reset(): void {
    PlayerProfileStore.reset();
    this.initialized = false;
  }

  /** Read-only snapshot for debug panels. */
  __snapshot(): PlayerProfileState {
    return PlayerProfileStore.load();
  }
}

export const PlayerProfile = new PlayerProfileClass();
