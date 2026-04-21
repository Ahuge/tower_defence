# AdMob Setup

Step-by-step for creating the live AdMob account and replacing the test IDs currently baked into the build.

---

## Status

Dev / CI builds use Google's **public test IDs**, configured in:

- `capacitor.config.ts` — `plugins.AdMob.appIdAndroid` / `appIdIos`
- `android/app/src/main/res/values/strings.xml` — `admob_app_id` (read from AndroidManifest.xml meta-data)
- `ios/App/App/Info.plist` — `GADApplicationIdentifier`
- `src/systems/platform/AdUnits.ts` — per-placement test units

These always fill, never count against impression caps, and are safe to commit. `USE_PRODUCTION_AD_UNITS` in `AdUnits.ts` gates the swap to real IDs.

The plugin wiring (`@capacitor-community/admob`, v8) lives in `src/systems/platform/capacitor/CapacitorAdBridge.ts` — `initialize()` on bootstrap, prepare+show for interstitial and rewarded, adaptive banner at the bottom of the screen, rewarded flow guarded by the `Rewarded` event so dismissals return `'skipped'` rather than `'shown'`.

---

## What we need before release

1. One AdMob **app ID** per OS (Android + iOS).
2. Three **ad unit IDs** per OS: banner, interstitial, rewarded.
3. IDs filled into `PROD_AD_UNITS` in `AdUnits.ts`.
4. `capacitor.config.ts` appId values swapped.
5. `USE_PRODUCTION_AD_UNITS = true`.

Then rebuild + sync: `npm run cap:sync:android` / `:ios`.

Also update the native-side app-id strings alongside the runtime unit swap:

- **Android** — `android/app/src/main/res/values/strings.xml` → `admob_app_id` (the Gradle build reads this at compile time; forgetting this step crashes the app on boot with `The Google Mobile Ads SDK was initialized incorrectly`).
- **iOS** — `ios/App/App/Info.plist` → `GADApplicationIdentifier`.

---

## Create the AdMob account

### 1. Sign up

1. Go to <https://admob.google.com>.
2. Sign in with the Google account you want the payouts to land on. Use the same Google account you use for Google Play Console if you want unified reporting.
3. Fill in account details:
   - Country (for tax forms).
   - Time zone (affects reporting day boundaries).
   - Billing currency.
4. Accept the AdSense terms (AdMob rides on AdSense infra).
5. Set up payments: tax info + bank account. AdMob holds earnings until you hit the $100 threshold, so this can wait until after first publish if you want.

### 2. Register a new app — Android

1. AdMob dashboard → **Apps** → **Add app**.
2. Choose "Yes, the app is published" if the Play Store listing exists, otherwise "No".
3. Platform: **Android**.
4. Enter the package name (same as `appId` in `capacitor.config.ts` — currently `com.runningmangames.factions`).
5. Enter the app name (shown in ad-mediation reports).
6. Copy the generated **AdMob App ID** — looks like `ca-app-pub-1234567890123456~1234567890`. This replaces `appIdAndroid` in `capacitor.config.ts`.

### 3. Register a new app — iOS

1. Same flow as Android but platform **iOS**.
2. Enter the iOS bundle ID (same as Android's appId — `com.runningmangames.factions`).
3. Copy the **AdMob App ID** for iOS. Replaces `appIdIos`.

### 4. Create ad units per app

For **each app** (Android and iOS), repeat:

1. Open the app from **Apps** → click your app → **Ad units** → **Add ad unit**.
2. Create three units:
   - **Banner** (Display)
     - Name: `Factions Banner — Menu` (name is for your dashboard only).
     - Frequency capping: usually leave default.
   - **Interstitial**
     - Name: `Factions Interstitial — Post-Game-Over`.
     - Ad type: Text, image, and video all selected.
     - Frequency capping: 1 per 60 seconds is a safe default.
   - **Rewarded**
     - Name: `Factions Rewarded — Watch for Shards`.
     - Reward item: `shards`, amount 10 (or whatever you pay out).
     - Server-side verification: optional. Turn on and integrate later if fraud becomes a concern.
3. Each creation produces a unit ID like `ca-app-pub-1234567890123456/1234567890` (note the slash — app IDs use `~`, unit IDs use `/`). Record all six — three per platform.

### 5. Populate the code

Edit `src/systems/platform/AdUnits.ts`:

```ts
export const USE_PRODUCTION_AD_UNITS = true;

export const PROD_AD_UNITS = {
  android: {
    banner:       'ca-app-pub-XXXX/YYYY',
    interstitial: 'ca-app-pub-XXXX/ZZZZ',
    rewarded:     'ca-app-pub-XXXX/WWWW',
  },
  ios: {
    banner:       'ca-app-pub-XXXX/AAAA',
    interstitial: 'ca-app-pub-XXXX/BBBB',
    rewarded:     'ca-app-pub-XXXX/CCCC',
  },
};
```

Edit `capacitor.config.ts`:

```ts
plugins: {
  AdMob: {
    appIdAndroid: 'ca-app-pub-XXXX~YYYY',
    appIdIos:     'ca-app-pub-XXXX~ZZZZ',
  },
},
```

Then: `npm run cap:sync`.

---

## Enabling test devices during real-IDs development

Before launch you'll want to run real builds with the production IDs but **not** accumulate impressions on your own phones — AdMob will flag this as invalid traffic and suspend the account.

In the AdMob console: **Settings** → **Test devices** → **Add test device**. Enter the Advertising ID from each device you'll test on (find it in Settings → Google → Ads on Android; Settings → Privacy & Security → Apple Advertising on iOS). These devices receive real ads but their impressions are marked as test.

---

## App-ads.txt (programmatic guard)

For Google AdX compliance, publish `app-ads.txt` at the root of your developer website. AdMob generates the exact contents for you under:

**Apps** → **Apps** → **app-ads.txt**.

Copy the contents to `https://alexhughes.com/app-ads.txt` (or wherever your developer URL points). Google's crawler verifies this monthly.

---

## Policies to know before launch

- **No ads during gameplay with interactive elements near the banner edges.** Ads in menus + between waves is fine; never during active placement.
- **No rewarded ads gating core progression.** "Watch to earn shards" is fine. "Watch to unlock the next level" is against policy.
- **Kids-directed content** triggers stricter rules and lower CPMs. Our age rating probably qualifies as 13+ which avoids this.
- **Family Ads Program** — opt in if targeting families; higher-quality ads, lower revenue.

---

## Links

- [AdMob home](https://admob.google.com/)
- [AdMob test ads — Android](https://developers.google.com/admob/android/test-ads)
- [AdMob test ads — iOS](https://developers.google.com/admob/ios/test-ads)
- [`@capacitor-community/admob` plugin docs](https://github.com/capacitor-community/admob)
- [AdMob policy centre](https://support.google.com/admob/answer/6128543)
- [app-ads.txt spec](https://iabtechlab.com/wp-content/uploads/2019/03/app-ads.txt-v1.0-final-.pdf)
