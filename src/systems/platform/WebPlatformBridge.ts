/**
 * WebPlatformBridge — the default implementation used on plain
 * web (PWA, itch.io, dev server). Every native surface is either
 * a no-op or a localStorage fallback.
 *
 * When the game runs in Capacitor or Electron, this is replaced
 * with a platform-specific bridge before the game uses any of
 * the surfaces (ads etc are only touched well after boot).
 */
import type {
  PlatformBridge, AdBridge, IAPBridge, ProfileBridge,
  AdResult, PurchaseResult, ProductInfo, PlayerProfile,
} from './PlatformBridge';

const PROFILE_KEY = 'td_web_profile';

class WebAdBridge implements AdBridge {
  isEnabled(): boolean { return false; } // no web ads
  async showInterstitial(_placement: string): Promise<AdResult> { return 'unavailable'; }
  async showRewarded(_placement: string): Promise<AdResult> { return 'unavailable'; }
  async showBanner(): Promise<void> { /* no-op */ }
  async hideBanner(): Promise<void> { /* no-op */ }
}

class WebIAPBridge implements IAPBridge {
  async listProducts(_skus: string[]): Promise<Record<string, ProductInfo>> { return {}; }
  async purchase(sku: string): Promise<PurchaseResult> {
    return { status: 'unavailable', productId: sku };
  }
  async restorePurchases(): Promise<string[]> { return []; }
  ownsProduct(_sku: string): boolean { return false; }
}

class WebProfileBridge implements ProfileBridge {
  private cached: PlayerProfile | null = null;

  constructor() {
    // Load the locally-stored anonymous profile on boot so the
    // UI can show the same name/avatar across sessions.
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) this.cached = JSON.parse(raw) as PlayerProfile;
    } catch { /* storage may be unavailable — fall through */ }
  }

  /** Web sign-in just mints an anonymous profile and persists it.
   *  Future: could prompt the player for a display name via a
   *  modal — for now we use a generated one. */
  async signIn(): Promise<PlayerProfile | null> {
    if (this.cached) return this.cached;
    const profile: PlayerProfile = {
      id: `web:${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      displayName: `Player${Math.floor(Math.random() * 10_000)}`,
      avatarUrl: null,
      provider: 'web',
    };
    this.cached = profile;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* noop */ }
    return profile;
  }

  getProfile(): PlayerProfile | null { return this.cached; }

  async submitLeaderboard(_id: string, _score: number): Promise<void> { /* no-op on web */ }
  async unlockAchievement(_id: string): Promise<void> { /* no-op on web */ }

  /** localStorage-backed cloud-save so the contract works even on
   *  web — just scoped to the browser instead of an account. */
  async cloudSave(slot: string, json: string): Promise<void> {
    try { localStorage.setItem(`td_cloud_${slot}`, json); } catch { /* noop */ }
  }
  async cloudLoad(slot: string): Promise<string | null> {
    try { return localStorage.getItem(`td_cloud_${slot}`); } catch { return null; }
  }
}

export class WebPlatformBridge implements PlatformBridge {
  readonly platform = 'web' as const;
  readonly isNative = false;
  readonly ads = new WebAdBridge();
  readonly iap = new WebIAPBridge();
  readonly profile = new WebProfileBridge();
}
