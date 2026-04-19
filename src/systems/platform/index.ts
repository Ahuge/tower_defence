/**
 * PlatformBridge public API.
 *
 * Consumers import only the high-level `platformBridge()` accessor
 * and the type definitions — never a specific implementation. The
 * active bridge is selected and installed at boot by main.ts via
 * `installPlatformBridge()` below.
 */
export type {
  PlatformBridge, PlatformId,
  AdBridge, AdResult,
  IAPBridge, ProductInfo, PurchaseResult, PurchaseStatus,
  ProfileBridge, PlayerProfile,
} from './PlatformBridge';

export { platformBridge, setPlatformBridge } from './PlatformBridge';

import { setPlatformBridge } from './PlatformBridge';
import { WebPlatformBridge } from './WebPlatformBridge';

/**
 * Select and install the right bridge for the current runtime.
 *
 * Installs the web bridge synchronously so any early caller finds a
 * valid default, then kicks off an async upgrade path for native
 * runtimes (Capacitor / Electron). Anything that subscribes to
 * platform state should do so at every call rather than cache a
 * reference, since the bridge can swap once during boot.
 *
 * Dynamic imports so web builds don't pull in native-only modules.
 */
export function installPlatformBridge(): Promise<void> {
  // Synchronous default — web / no-op. Replaced below if we detect
  // a native runtime.
  setPlatformBridge(new WebPlatformBridge());

  return (async () => {
    // Capacitor runtime? (populated by @capacitor/core when the
    // webview is running inside a Capacitor app)
    if (typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
      try {
        const { CapacitorPlatformBridge } = await import('./CapacitorPlatformBridge');
        setPlatformBridge(new CapacitorPlatformBridge());
        return;
      } catch (err) {
        console.warn('[platform] Capacitor detected but bridge failed to load; staying on web', err);
      }
    }

    // Electron runtime? (exposed by the preload script)
    if (typeof window !== 'undefined' && (window as unknown as { __td_electron?: unknown }).__td_electron) {
      try {
        const { ElectronPlatformBridge } = await import('./ElectronPlatformBridge');
        setPlatformBridge(new ElectronPlatformBridge());
        return;
      } catch (err) {
        console.warn('[platform] Electron detected but bridge failed to load; staying on web', err);
      }
    }
  })();
}
