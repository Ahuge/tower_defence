/**
 * AdMob ad-unit catalogue.
 *
 * Google publishes public TEST unit IDs that always serve a real ad
 * without counting against impression caps. Use them in development
 * + CI so nobody accidentally racks up fake inventory against our
 * live account. Before first real release, replace each entry with
 * the real unit minted in the AdMob console (see
 * docs/admob-setup.md).
 *
 * Separate Android / iOS entries because AdMob allocates unit IDs
 * per-app, and the bridge picks based on Capacitor.getPlatform() at
 * runtime.
 */

export interface AdUnitSet {
  banner: string;
  interstitial: string;
  rewarded: string;
}

/** Google's published test unit IDs — safe to commit. Always fill. */
export const TEST_AD_UNITS: { android: AdUnitSet; ios: AdUnitSet } = {
  android: {
    banner:       'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded:     'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner:       'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded:     'ca-app-pub-3940256099942544/1712485313',
  },
};

/** Set this to `true` before first release and supply real unit
 *  IDs via the consts below. Keeping the toggle means dev builds
 *  never hit real inventory by accident. */
export const USE_PRODUCTION_AD_UNITS = false;

/** Real unit IDs — populated after the AdMob console setup in
 *  docs/admob-setup.md. Leave as empty strings until ready so a
 *  misconfigured release build fails loudly (empty unit id →
 *  AdMob rejects request → console error) rather than silently
 *  burning fake impressions. */
export const PROD_AD_UNITS: { android: AdUnitSet; ios: AdUnitSet } = {
  android: {
    banner:       'ca-app-pub-4227593694949279/7163986409',
    interstitial: 'ca-app-pub-4227593694949279/3983289290',
    rewarded:     'ca-app-pub-4227593694949279/1870237638',
  },
  ios: {
    // Populated alongside the iOS AdMob app registration (Step 6).
    banner:       '',
    interstitial: '',
    rewarded:     '',
  },
};

/** Pick the right set for the current build + platform. */
export function getAdUnits(platform: 'android' | 'ios'): AdUnitSet {
  return USE_PRODUCTION_AD_UNITS ? PROD_AD_UNITS[platform] : TEST_AD_UNITS[platform];
}
