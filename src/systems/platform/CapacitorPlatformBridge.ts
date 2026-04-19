/**
 * CapacitorPlatformBridge — stub.
 *
 * Real implementation lands in Phase 3 alongside AdMob, Google Play
 * Games Services, Google Play Billing (Android) and StoreKit +
 * Game Center (iOS). For now this stub lets the dynamic-import
 * detection path in `index.ts` type-check and gives the Capacitor
 * install a valid fallback (web-level behaviour) so the app can run
 * inside the wrapper before plugin integration.
 */
import type {
  PlatformBridge, AdBridge, IAPBridge, ProfileBridge,
  AdResult, PurchaseResult, ProductInfo, PlayerProfile, PlatformId,
} from './PlatformBridge';

class NoopAds implements AdBridge {
  isEnabled(): boolean { return false; }
  async showInterstitial(_: string): Promise<AdResult> { return 'unavailable'; }
  async showRewarded(_: string): Promise<AdResult> { return 'unavailable'; }
  async showBanner(): Promise<void> { /* noop */ }
  async hideBanner(): Promise<void> { /* noop */ }
}
class NoopIAP implements IAPBridge {
  async listProducts(_: string[]): Promise<Record<string, ProductInfo>> { return {}; }
  async purchase(sku: string): Promise<PurchaseResult> { return { status: 'unavailable', productId: sku }; }
  async restorePurchases(): Promise<string[]> { return []; }
  ownsProduct(_: string): boolean { return false; }
}
class NoopProfile implements ProfileBridge {
  async signIn(): Promise<PlayerProfile | null> { return null; }
  getProfile(): PlayerProfile | null { return null; }
  async submitLeaderboard(_: string, __: number): Promise<void> { /* noop */ }
  async unlockAchievement(_: string): Promise<void> { /* noop */ }
  async cloudSave(_: string, __: string): Promise<void> { /* noop */ }
  async cloudLoad(_: string): Promise<string | null> { return null; }
}

export class CapacitorPlatformBridge implements PlatformBridge {
  readonly platform: PlatformId;
  readonly isNative = true;
  readonly ads = new NoopAds();
  readonly iap = new NoopIAP();
  readonly profile = new NoopProfile();

  constructor() {
    // Capacitor's getPlatform() returns 'ios' | 'android' | 'web'.
    // Defensive cast — if @capacitor/core isn't available, we
    // shouldn't even be here, but fall through to 'android' so the
    // type stays sound.
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    this.platform = p === 'ios' ? 'ios' : 'android';
  }
}
