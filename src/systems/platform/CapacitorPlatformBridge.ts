/**
 * CapacitorPlatformBridge — Android / iOS native wrapper.
 *
 * Each surface is split into its own file under `./capacitor/` as
 * plugins land:
 *   - AdBridge:      @capacitor-community/admob ✓
 *   - IAPBridge:     Google Play Billing / StoreKit (stub pending plugin)
 *   - ProfileBridge: Play Games Services / Game Center (stub pending plugin)
 *
 * All imports are top-level; this file is only loaded when
 * `installPlatformBridge()` detects `Capacitor.isNativePlatform()`,
 * so web builds don't pull these in.
 */
import type {
  PlatformBridge, AdBridge, IAPBridge, ProfileBridge, PlatformId,
} from './PlatformBridge';
import { CapacitorAdBridge } from './capacitor/CapacitorAdBridge';
import { CapacitorIAPBridge } from './capacitor/CapacitorIAPBridge';
import { CapacitorProfileBridge } from './capacitor/CapacitorProfileBridge';

export class CapacitorPlatformBridge implements PlatformBridge {
  readonly platform: PlatformId;
  readonly isNative = true;
  readonly ads: AdBridge;
  readonly iap: IAPBridge;
  readonly profile: ProfileBridge;

  constructor() {
    // Capacitor's getPlatform() returns 'ios' | 'android' | 'web'.
    // Defensive cast — if @capacitor/core isn't available, we
    // shouldn't even be here, but fall through to 'android' so the
    // type stays sound.
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const p = cap?.getPlatform?.();
    this.platform = p === 'ios' ? 'ios' : 'android';
    this.ads = new CapacitorAdBridge(this.platform);
    this.iap = new CapacitorIAPBridge(this.platform);
    this.profile = new CapacitorProfileBridge(this.platform);
  }
}
