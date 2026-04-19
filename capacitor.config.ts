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
  appId: 'com.alexhughes.factions',
  appName: 'Factions',
  webDir: 'dist',

  // Bundled web assets run via the Capacitor scheme on Android and
  // the capacitor-local scheme on iOS. No remote server — we ship
  // the whole bundle inside the app so it works offline.
  server: {
    androidScheme: 'https',
  },

  // Plugin-level config slots in as they're added. Placeholders for
  // the work that lands in Phase 3:
  //
  //   SplashScreen:
  //     launchShowDuration: 2000
  //     backgroundColor: '#15101a'
  //   StatusBar:
  //     style: 'DARK'
  //     backgroundColor: '#15101a'
  //   AdMob:
  //     appId: 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy'
  plugins: {
    // Minimum-safe defaults while the real plugin config is
    // worked out. Capacitor ignores unknown keys so this is safe
    // even before plugins are installed.
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
