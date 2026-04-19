/**
 * AdMob-backed AdBridge for Android / iOS.
 *
 * Wraps `@capacitor-community/admob`:
 *   - `initialize()` on construction (one-shot). Safe to call repeatedly
 *     in practice but we gate it behind a ready Promise so callers that
 *     hit showInterstitial() before init finishes queue cleanly.
 *   - prepare → show pattern per ad unit. The plugin keeps one loaded
 *     instance per ad type at a time, so we preload the *next* ad after
 *     each show to minimise visible latency.
 *   - Rewarded flow resolves with an `AdMobRewardItem` only when the
 *     user watches to the reward point — we still track a flag off the
 *     Rewarded event to be defensive in case the plugin ever returns a
 *     zero-amount reward on skip.
 *   - `isEnabled()` reads `PlayerInventory.isAdFree()`; the bridge
 *     short-circuits every show if ads-off is owned, so game code
 *     doesn't need to branch on entitlements.
 */
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import type { AdBridge, AdResult } from '../PlatformBridge';
import { PlayerInventory } from '../../monetization/PlayerInventory';
import { getAdUnits, USE_PRODUCTION_AD_UNITS } from '../AdUnits';

export class CapacitorAdBridge implements AdBridge {
  private ready: Promise<void>;
  private interstitialReady = false;
  private rewardedReady = false;
  private bannerShown = false;
  private rewardGranted = false;
  private readonly units: { banner: string; interstitial: string; rewarded: string };

  constructor(platform: 'android' | 'ios') {
    this.units = getAdUnits(platform);
    this.ready = this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    await AdMob.initialize({
      // When running with the test unit IDs, flipping this tells the
      // SDK to use the testing-ad pipeline end-to-end (safer than just
      // passing test unit IDs, in case of unit-id typos).
      initializeForTesting: !USE_PRODUCTION_AD_UNITS,
      testingDevices: [],
    });
    // Global reward listener — set the flag when the user earns a
    // reward so `showRewarded()` can convert the result.
    await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      this.rewardGranted = true;
    });
    // Warm the first ad of each full-screen type. Failures here are
    // not fatal: we'll retry on demand. Banners are on-demand only.
    void this.prepareInterstitial();
    void this.prepareRewarded();
  }

  isEnabled(): boolean {
    return !PlayerInventory.isAdFree();
  }

  async showInterstitial(_placement: string): Promise<AdResult> {
    if (!this.isEnabled()) return 'disabled';
    await this.ready;
    if (!this.interstitialReady) {
      // Load on demand if the bootstrap preload hasn't landed yet.
      const ok = await this.prepareInterstitial();
      if (!ok) return 'unavailable';
    }
    try {
      await AdMob.showInterstitial();
      this.interstitialReady = false;
      // Preload the next one in the background.
      void this.prepareInterstitial();
      return 'shown';
    } catch {
      this.interstitialReady = false;
      return 'unavailable';
    }
  }

  async showRewarded(_placement: string): Promise<AdResult> {
    if (!this.isEnabled()) return 'disabled';
    await this.ready;
    if (!this.rewardedReady) {
      const ok = await this.prepareRewarded();
      if (!ok) return 'unavailable';
    }
    this.rewardGranted = false;
    try {
      await AdMob.showRewardVideoAd();
      this.rewardedReady = false;
      void this.prepareRewarded();
      // `showRewardVideoAd` resolves when the ad is dismissed whether
      // or not the user earned the reward — the Rewarded event is the
      // source of truth.
      return this.rewardGranted ? 'shown' : 'skipped';
    } catch {
      this.rewardedReady = false;
      return 'unavailable';
    }
  }

  async showBanner(): Promise<void> {
    if (!this.isEnabled()) return;
    await this.ready;
    if (this.bannerShown) {
      // Per the contract this method is idempotent. Resume rather
      // than re-create so we don't flicker.
      try { await AdMob.resumeBanner(); } catch { /* ignore */ }
      return;
    }
    try {
      await AdMob.showBanner({
        adId: this.units.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: !USE_PRODUCTION_AD_UNITS,
        margin: 0,
      });
      this.bannerShown = true;
    } catch {
      this.bannerShown = false;
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.bannerShown) return;
    try {
      await AdMob.hideBanner();
    } catch { /* ignore */ }
    this.bannerShown = false;
  }

  private async prepareInterstitial(): Promise<boolean> {
    try {
      await AdMob.prepareInterstitial({
        adId: this.units.interstitial,
        isTesting: !USE_PRODUCTION_AD_UNITS,
      });
      this.interstitialReady = true;
      return true;
    } catch {
      this.interstitialReady = false;
      return false;
    }
  }

  private async prepareRewarded(): Promise<boolean> {
    try {
      await AdMob.prepareRewardVideoAd({
        adId: this.units.rewarded,
        isTesting: !USE_PRODUCTION_AD_UNITS,
      });
      this.rewardedReady = true;
      return true;
    } catch {
      this.rewardedReady = false;
      return false;
    }
  }
}
