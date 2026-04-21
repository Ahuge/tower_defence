/**
 * ElectronPlatformBridge — stub.
 *
 * Real implementation lands alongside the Steam integration
 * (steamworks.js). For standalone Electron (non-Steam) a lot of
 * these surfaces stay no-op: no ads on desktop by default, no IAP
 * outside a store, profile is "the OS user". Real values appear
 * once Steamworks is initialised and user id / achievements / DLC
 * flow through it.
 */
import type {
  PlatformBridge, AdBridge, IAPBridge, ProfileBridge,
  AdResult, PurchaseResult, ProductInfo, PlayerProfile,
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
  async incrementAchievementProgress(_: string, __: number): Promise<void> { /* noop */ }
  async cloudSave(_: string, __: string): Promise<void> { /* noop */ }
  async cloudLoad(_: string): Promise<string | null> { return null; }
}

export class ElectronPlatformBridge implements PlatformBridge {
  readonly platform = 'electron' as const;
  readonly isNative = true;
  readonly ads = new NoopAds();
  readonly iap = new NoopIAP();
  readonly profile = new NoopProfile();
}
