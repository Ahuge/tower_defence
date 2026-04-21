/**
 * Capacitor configuration.
 *
 * `webDir` points at the Vite `dist/` output, which must be built
 * with VITE_BASE_PATH=./ (see `npm run build:native`) so asset URLs
 * resolve correctly inside the Android / iOS webview (file:// on
 * iOS, capacitor://localhost on Android).
 *
 * Workflow: `npm run build:native && npx cap sync` copies the
 * freshly-built web bundle into both native projects. Then
 * `npx cap open android` or `npx cap open ios` launches the
 * native IDE for build/run/debug.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runningmangames.factions',
  appName: 'Factions',
  webDir: 'dist',

  // Bundled web assets run via the Capacitor scheme on Android and
  // the capacitor-local scheme on iOS. No remote server — we ship
  // the whole bundle inside the app so it works offline.
  server: {
    androidScheme: 'https',
  },

  // Plugin-level config slots in as they're added. Using Google's
  // public AdMob TEST IDs for now — these always return fill,
  // never count as impressions, and are safe to keep in source.
  // Before first real release we swap them for the real app IDs
  // minted in the AdMob console (see docs/admob-setup.md).
  plugins: {
    AdMob: {
      // Android: real production app id (AdMob Console / Running Man
      // Games, 2026-04-19). iOS still on Google's public test id until
      // the iOS AdMob app is registered.
      appIdAndroid: 'ca-app-pub-4227593694949279~8779260912',
      appIdIos:     'ca-app-pub-3940256099942544~1458002511',
      // Actual ad unit ids come from `PROD_AD_UNITS` /
      // `TEST_AD_UNITS` in src/systems/platform/AdUnits.ts,
      // gated by USE_PRODUCTION_AD_UNITS.
    },
    // SplashScreen / StatusBar config lands with the relevant
    // plugin installs in Phase 3.
  },

  android: {
    // Temporary: allow mixed content so the signalling server can
    // run on http during dev. Flip off for release.
    allowMixedContent: false,
  },

  ios: {
    // Keyboard / scroll behaviour tweaks go here when we hit them.
  },
};

export default config;
