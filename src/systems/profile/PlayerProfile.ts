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
  xpToNext,
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

    const state = PlayerProfileStore.load();
    Analytics.track('profile_initialized', {
      level: levelFromXp(state.xp),
      cores: state.cores,
    });

    // Wire player context into every future analytics event. Reads
    // current values lazily on each emit so changes propagate
    // immediately without listener plumbing.
    Analytics.setPlayerContextProvider(() => {
      const s = PlayerProfileStore.load();
      const store = StorePersistence.load();
      return {
        playerLevel: levelFromXp(s.xp),
        cores: s.cores,
        shards: store.shards,
        unlockedFactionsCount: store.unlockedFactions.length,
      };
    });
  }

  /** Existing players (with gamesPlayed > 0 from `td_store`) get a
   *  one-time inferred starting level so they don't feel demoted. Also
   *  marks `first_game_complete` so they don't see Plan 3's splash. */
  private maybeMigrateFromLegacy(): void {
    const store = StorePersistence.load();
    if (store.gamesPlayed <= 0) return;

    // Conservative inference: 1 game played ≈ 1 level, capped at 20.
    // Tunable. The intent is "you don't lose your sense of progress",
    // not "you keep all your future XP earnings."
    const inferred = Math.min(20, Math.max(1, Math.floor(store.gamesPlayed / 1)));

    PlayerProfileStore.update(s => {
      // Set xp to the start of the inferred level so any future XP
      // earnings count toward the next level normally. Closed-form
      // triangular sum: Σ_{i=1..L-1} 200·i = 100·(L-1)·L.
      s.xp = 100 * (inferred - 1) * inferred;
      s.migratedAt = Date.now();
      s.migratedFromInferredLevel = inferred;
      s.flags.migration_banner_pending = true;
      // Legacy player has played the game already — splash + FTG would
      // be patronizing. Mark FTG complete so the cold-boot splash is
      // suppressed for them.
      s.flags.first_game_complete = true;
      // Plan 5 migration: any faction the player already owned in
      // td_store.unlockedFactions becomes pre-marked playable so the
      // tree's two-step unlock model (Shards → campaign → playable)
      // doesn't demote veterans' rosters. Without this, every legacy
      // faction would suddenly require a campaign run.
      for (const factionId of store.unlockedFactions) {
        s.flags[`legacy_faction_playable.${factionId}`] = true;
      }
    });

    Analytics.track('profile_migrated_from_legacy', {
      inferredLevel: inferred,
      gamesPlayed: store.gamesPlayed,
    });
  }

  // ---- Read access ------------------------------------------------------

  getLevel(): number {
    return levelFromXp(PlayerProfileStore.load().xp);
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

  /** True once the player has finished (or skipped past) their first
   *  guided tutorial. Drives the cold-boot splash decision in App.tsx. */
  isFirstGameComplete(): boolean {
    return this.getFlag('first_game_complete');
  }

  // ---- Announcements ---------------------------------------------------

  /** True once the player has dismissed (read) the named announcement.
   *  Persisted per-id under `flags.announcement_seen.<id>` so adding
   *  new announcements doesn't disturb prior state. */
  hasSeenAnnouncement(id: string): boolean {
    return this.getFlag(`announcement_seen.${id}`);
  }

  /** Mark the announcement as read. Idempotent. Dispatches a
   *  `td-announcements-changed` window event so the profile-avatar
   *  badge + the mailbox panel can re-render without subscribing to
   *  the whole profile store. */
  markAnnouncementSeen(id: string): void {
    if (this.hasSeenAnnouncement(id)) return;
    this.setFlag(`announcement_seen.${id}`, true);
    try {
      window.dispatchEvent(new CustomEvent('td-announcements-changed', { detail: { id } }));
    } catch {
      // SSR / non-browser test envs lack `window` — the in-memory
      // flag is already updated, listeners that exist will re-read
      // on their next render anyway.
    }
  }

  // ---- Campaign progress (Plan 10) -------------------------------------

  /** Star map: factionId → missionIdx → stars (0..3). Stars are
   *  monotonic — replays only ever upgrade, never downgrade. */
  getCampaignProgress(factionId: string): { [missionIdx: number]: number } {
    const raw = PlayerProfileStore.load().campaignProgress[factionId];
    return raw ?? {};
  }

  /** Stars earned on a specific mission. 0 means not yet attempted/won. */
  getMissionStars(factionId: string, missionIdx: number): number {
    const progress = this.getCampaignProgress(factionId);
    return progress[missionIdx] ?? 0;
  }

  /** Sum of stars across all missions of a campaign. */
  getCampaignTotalStars(factionId: string): number {
    const progress = this.getCampaignProgress(factionId);
    let total = 0;
    for (const stars of Object.values(progress)) total += stars;
    return total;
  }

  /** Mission N is unlocked when mission N-1 is won (any star count).
   *  Mission 0 is always unlocked once the campaign itself is. */
  isMissionUnlocked(factionId: string, missionIdx: number): boolean {
    if (missionIdx === 0) return true;
    return this.getMissionStars(factionId, missionIdx - 1) >= 1;
  }

  /** Persist a mission result. Stars are monotonic — a 2-star replay
   *  doesn't downgrade a previous 3-star clear. Field stored as a
   *  numeric value rather than the StarCount type because the profile
   *  schema is plain JSON. */
  recordMissionResult(factionId: string, missionIdx: number, stars: number): void {
    if (stars < 0 || stars > 3) {
      console.warn(`[PlayerProfile] invalid star count ${stars}; clamping`);
      stars = Math.max(0, Math.min(3, stars));
    }
    const previous = this.getMissionStars(factionId, missionIdx);
    if (stars <= previous) return; // monotonic; never demote
    PlayerProfileStore.update(s => {
      if (!s.campaignProgress[factionId]) s.campaignProgress[factionId] = {};
      s.campaignProgress[factionId][missionIdx] = stars;
    });
  }

  /** Mark FTG complete. Idempotent. Awards a one-shot XP bonus the
   *  first time it's called so the FTG winner sees the level-up
   *  modal immediately and feels the rest of the unlock loop. */
  markFirstGameComplete(): void {
    if (this.isFirstGameComplete()) return;
    this.setFlag('first_game_complete', true);
    // Bonus equal to one full level at the current level. Crosses the
    // L1->L2 boundary cleanly for a brand-new player; older players
    // who somehow trigger this (re-running ftg from Help) get a
    // smaller relative bump.
    this.addXP(xpToNext(this.getLevel()), 'ftg-completed');
  }

  // ---- XP awarding ------------------------------------------------------

  /** Award XP and run level-up detection. Emits analytics. */
  addXP(amount: number, reason: string): { from: number; to: number } {
    if (amount <= 0) return { from: this.getLevel(), to: this.getLevel() };

    const fromLevel = this.getLevel();
    // Single load+save round-trip: bump xp + push every reveal from
    // each crossed level into the unlock lists in one update. Naive
    // per-reveal `update()` calls would re-load + JSON.stringify the
    // entire profile per unlocked mode/map (16+ writes for a
    // 5-level/3-reveals burst).
    const state = PlayerProfileStore.update(s => {
      s.xp += amount;
      const newLevel = levelFromXp(s.xp);
      for (let l = fromLevel + 1; l <= newLevel; l++) {
        for (const r of unlocksAtLevel(l)) {
          if (r.type === 'mode' && !s.unlockedModes.includes(r.id)) s.unlockedModes.push(r.id);
          else if (r.type === 'map' && !s.unlockedMaps.includes(r.id)) s.unlockedMaps.push(r.id);
        }
      }
    });
    const toLevel = levelFromXp(state.xp);

    Analytics.track('xp_awarded', { amount, source: reason });

    if (toLevel > fromLevel) {
      for (let l = fromLevel + 1; l <= toLevel; l++) {
        for (const r of unlocksAtLevel(l)) {
          Analytics.track('unlock_revealed', { unlockType: r.type, id: r.id, atLevel: l });
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
