/**
 * PlatformBridge — thin abstraction over the native surfaces that
 * vary by store / wrapper: ads, in-app purchases, user profile,
 * cloud save. Each platform (web / Android / iOS / Electron /
 * Electron+Steam) supplies its own implementation; the rest of the
 * game calls the bridge interface only.
 *
 * Design rules:
 *   - The web implementation is the default and must be a valid
 *     runtime (no throws, no-op or local-storage fallback). A
 *     Phaser dev build in a browser hits this code path.
 *   - Every method is async so native plugin integrations don't
 *     force a refactor later.
 *   - Failures return explicit result objects or null rather than
 *     throwing. Ad failures, purchase cancels, offline profile
 *     lookups — all "normal" outcomes, not exceptions.
 */

export type PlatformId = 'web' | 'android' | 'ios' | 'electron' | 'electron-steam';

// ─── Ads ────────────────────────────────────────────────────

export type AdResult = 'shown' | 'skipped' | 'unavailable' | 'disabled';

export interface AdBridge {
  /** Ads globally disabled when the ad-free IAP is owned. The bridge
   *  reads the owned-SKU set from the IAP bridge and honours it —
   *  callers don't need to gate on it themselves. */
  isEnabled(): boolean;
  /** Show an interstitial between a screen transition (e.g. post-
   *  game-over → menu). Returns 'shown' if the ad actually played,
   *  'skipped' if the network filled late, 'unavailable' if the
   *  provider isn't initialised, 'disabled' when ads-off IAP is on. */
  showInterstitial(placement: string): Promise<AdResult>;
  /** Rewarded video — resolves 'shown' only if the ad fully played
   *  to its reward-granting point. Typical placements: "watch to
   *  earn 10 shards", "watch to continue after loss". */
  showRewarded(placement: string): Promise<AdResult>;
  /** Banner ads. Idempotent — calling show() twice keeps one banner. */
  showBanner(): Promise<void>;
  hideBanner(): Promise<void>;
}

// ─── In-app purchases ───────────────────────────────────────

export type PurchaseStatus = 'success' | 'cancelled' | 'pending' | 'failed' | 'unavailable';

export interface PurchaseResult {
  status: PurchaseStatus;
  productId: string;
  transactionId?: string;
  error?: string;
}

export interface ProductInfo {
  id: string;
  /** Localised display price. Always use this for UI — don't show
   *  numeric amounts computed from your own cents / shards tables. */
  displayPrice: string;
  title: string;
  description: string;
  /** Consumable (shard packs) vs non-consumable (skins, ad-free). */
  type: 'consumable' | 'non-consumable';
}

export interface IAPBridge {
  /** Fetch localised pricing for a list of SKUs. Returns whatever
   *  the store will surface — missing SKUs simply aren't in the
   *  returned map. */
  listProducts(skus: string[]): Promise<Record<string, ProductInfo>>;
  /** Kick off a purchase. The UI should navigate to a "pending"
   *  state until this resolves. Pending returns are possible on
   *  Play Store when receipt validation is async. */
  purchase(sku: string): Promise<PurchaseResult>;
  /** User-initiated restore (standard on iOS, polite on Android).
   *  Re-emits any previously-owned non-consumables so the UI can
   *  re-apply entitlements. */
  restorePurchases(): Promise<string[]>;
  /** True when the store reports the user owns this SKU. Used to
   *  gate ads-off / skin unlocks at runtime. Reads from a locally
   *  cached entitlements map — always-fresh versions should hit
   *  restorePurchases() first. */
  ownsProduct(sku: string): boolean;
}

// ─── Player profile + cloud save ─────────────────────────────

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** Which store / OS the profile is attached to. */
  provider: PlatformId;
}

export interface ProfileBridge {
  /** Trigger the native sign-in flow. On Android = Play Games
   *  Services; iOS = Game Center; Steam = automatic; web = anon. */
  signIn(): Promise<PlayerProfile | null>;
  /** Currently-signed-in profile or null (anonymous). Cheap local
   *  read — doesn't hit the network. */
  getProfile(): PlayerProfile | null;
  /** Submit a high score / stat to the platform leaderboard. */
  submitLeaderboard(leaderboardId: string, score: number): Promise<void>;
  /** Unlock a native achievement. */
  unlockAchievement(achievementId: string): Promise<void>;
  /** Tick progress on an incremental achievement by `steps`. Play
   *  Games Services + Game Center both expose this separately from
   *  unlock — incremental achievements auto-unlock server-side when
   *  cumulative progress hits the target count configured in the
   *  store's console. Used for "see all N creep types", "win with
   *  all N factions" style progress-bar achievements. */
  incrementAchievementProgress(achievementId: string, steps: number): Promise<void>;
  /** Cloud-save JSON state under a named slot. Writes happen in the
   *  background; failures are logged, not thrown. */
  cloudSave(slot: string, json: string): Promise<void>;
  cloudLoad(slot: string): Promise<string | null>;
}

// ─── Bridge aggregate ────────────────────────────────────────

export interface PlatformBridge {
  readonly platform: PlatformId;
  /** True if we're running inside a native wrapper (Capacitor /
   *  Electron). False for plain web. Handy for "show download
   *  these apps" CTAs on the web build vs hiding them in native. */
  readonly isNative: boolean;
  readonly ads: AdBridge;
  readonly iap: IAPBridge;
  readonly profile: ProfileBridge;
}

// ─── Registry ────────────────────────────────────────────────

let activeBridge: PlatformBridge | null = null;

/** Install the active PlatformBridge. Called once at boot from
 *  main.ts after selecting the right implementation for the
 *  runtime. Subsequent calls replace the bridge — used by tests. */
export function setPlatformBridge(bridge: PlatformBridge): void {
  activeBridge = bridge;
}

/** The active PlatformBridge. Throws if accessed before main.ts
 *  installs one — that's a programming bug, not a runtime error
 *  worth gracefully recovering from. */
export function platformBridge(): PlatformBridge {
  if (!activeBridge) {
    throw new Error('PlatformBridge accessed before install — call setPlatformBridge first');
  }
  return activeBridge;
}
