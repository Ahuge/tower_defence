/**
 * Play Games Services / Game Center-backed ProfileBridge.
 *
 * Wraps `@osmanraifgunes/capacitor-game-connect`, which exposes
 * sign-in + achievements + leaderboards for both Android (Play Games
 * Services v2) and iOS (Game Center) through one Capacitor-native API.
 *
 * Caveat: the plugin does NOT currently wrap Play Games Snapshots /
 * Game Center iCloud save. Cloud-save here falls back to localStorage
 * scoped by the signed-in player id, so the contract works and data
 * is preserved within a device / reinstall, but cross-device sync
 * waits on either a dedicated snapshots plugin or a custom native
 * bridge. The ProfileBridge contract is platform-agnostic so callers
 * won't need to change when the storage backend upgrades.
 */
import { CapacitorGameConnect } from '@osmanraifgunes/capacitor-game-connect';
import type {
  ProfileBridge, PlayerProfile, PlatformId,
} from '../PlatformBridge';

const CLOUD_PREFIX = 'td_native_cloud:';

export class CapacitorProfileBridge implements ProfileBridge {
  private readonly providerId: PlatformId;
  private cached: PlayerProfile | null = null;

  constructor(os: 'android' | 'ios') {
    this.providerId = os;
  }

  async signIn(): Promise<PlayerProfile | null> {
    try {
      const result = await CapacitorGameConnect.signIn();
      this.cached = {
        id: result.player_id,
        displayName: result.player_name,
        // Plugin doesn't surface avatar URLs — GameConnect exposes the
        // raw native credentials but not profile images. Leave null
        // until the plugin grows support or we add a custom fetch.
        avatarUrl: null,
        provider: this.providerId,
      };
      return this.cached;
    } catch (err) {
      console.warn('[profile] sign-in failed', err);
      return null;
    }
  }

  getProfile(): PlayerProfile | null { return this.cached; }

  async submitLeaderboard(leaderboardId: string, score: number): Promise<void> {
    try {
      await CapacitorGameConnect.submitScore({ leaderboardID: leaderboardId, totalScoreAmount: score });
    } catch (err) {
      console.warn('[profile] submitScore failed', err);
    }
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    try {
      await CapacitorGameConnect.unlockAchievement({ achievementID: achievementId });
    } catch (err) {
      console.warn('[profile] unlockAchievement failed', err);
    }
  }

  async cloudSave(slot: string, json: string): Promise<void> {
    // Scope per signed-in player so a different account on the same
    // device doesn't read the other player's save.
    const key = this.scopedKey(slot);
    try { localStorage.setItem(key, json); } catch { /* storage may be full */ }
  }

  async cloudLoad(slot: string): Promise<string | null> {
    try { return localStorage.getItem(this.scopedKey(slot)); } catch { return null; }
  }

  private scopedKey(slot: string): string {
    const id = this.cached?.id ?? 'anon';
    return `${CLOUD_PREFIX}${id}:${slot}`;
  }
}
