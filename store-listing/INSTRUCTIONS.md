# Internal Testing rollout — step-by-step

Order matters: you can't upload the AAB until the privacy policy is live, and you can't complete the store listing until you have screenshots. Work through top-to-bottom.

---

## Step 1 — Host the privacy policy on GitHub Pages (~10 min)

The privacy policy is already written at `public-legal/privacy-policy.html`. GitHub Pages just serves it.

### 1a. Enable Pages on the repository

1. Browser → [github.com/Ahuge/tower_defence](https://github.com/Ahuge/tower_defence) → **Settings** → **Pages** (left sidebar).
2. **Source**: select **Deploy from a branch**.
3. **Branch**: select **develop** (or `main` — whichever is authoritative for releases) → **Folder**: select `/ (root)`.
4. **Save**.

### 1b. Privacy policy location

The source file lives at `public/privacy-policy.html`. Vite copies everything under `public/` into `dist/` verbatim at build time, so the existing `deploy.yml` workflow deploys it alongside the game on every push to `develop` or `main`.

Wait 2-3 minutes after the push for the GitHub Pages deploy workflow to finish, then verify by browsing to the final URL.

**PR preview caveat**: PR-branch builds deploy to `https://ahuge.github.io/tower_defence/pr/{PR_NUM}/privacy-policy.html` — useful for previewing before merge, but the Play Store listing should use the production URL (the one without `/pr/N/`) which only appears after merging to `develop` or `main`.

### 1c. The URL to paste into Play Console

```
https://ahuge.github.io/tower_defence/privacy-policy.html
```

---

## Step 2 — Create the Play Console app record (~5 min)

If you haven't already:

1. [Play Console](https://play.google.com/console) → **All apps** → **Create app**.
2. **App name**: `Factions`
3. **Default language**: `English (United States)`
4. **App or game**: `Game`
5. **Free or paid**: `Free`
6. Declarations: tick **Developer Program Policies** + **US export laws**.
7. Click **Create app**.

You land on the app dashboard. The left sidebar now has everything we need: **Dashboard**, **Store listing**, **App content**, **Testing**.

---

## Step 3 — Capture phone screenshots (~15 min)

Play Console requires at least 2 phone screenshots; 4-8 is typical. Resolution: 1080 × 1920 (portrait) or 1920 × 1080 (landscape), 16:9 or 9:16.

### Capture method

Sideload the current debug APK on your Android phone (already at `C:\Users\ahugh\Downloads\android\factions-debug-fd1dc96.apk`). Inside the game:

1. **Menu screen** — shows the faction tower icon + mode grid. Good hero shot.
2. **Faction select** — colourful card grid, sells the "12 asymmetric factions" pitch.
3. **Mid-match with towers + creeps on screen** — the actual gameplay moment. Look for a frame with lots of projectiles in the air.
4. **Store / cosmetics screen** — shows skins, sells the progression angle.
5. **Hero Defense gameplay** — hero controller + ability bar visible.
6. **Game over summary** — tower DPS table, shards earned.

### Taking screenshots

- **Android**: Power + Volume Down. Default save path: `/Internal/Pictures/Screenshots/`.
- Transfer via USB or pick them up from Google Photos.

### Where to put them for the Play Console upload

Save the final PNG/JPEG files (1080 × 1920 each) into **`store-listing/screenshots/phone/`**. Create the folder. I'll cover one in the next commit but you'll want to replace with real captures.

No exact filename convention — Play Console re-orders by the order you upload them. Numbering them `01-menu.png`, `02-faction-select.png`, etc. makes the upload order obvious.

### Optional: tablet screenshots

Play Console separately lists "7-inch tablet" and "10-inch tablet" slots. Optional but gives your listing better visibility on Android tablets. Same capture process on a tablet device. Save into `store-listing/screenshots/tablet/`.

---

## Step 4 — Fill in Store listing (~20 min)

Play Console → your app → **Grow** → **Store presence** → **Main store listing**.

Paste from `store-listing/descriptions.md`:

1. **App name**: `Factions: Tower Defense`
2. **Short description**: (the 79-char line)
3. **Full description**: (the long block)
4. **App icon**: upload `resources/icon.png` (1024 × 1024 — already generated).
5. **Feature graphic**: upload `store-listing/feature-graphic.png` (1024 × 500 — just generated).
6. **Phone screenshots**: upload the 2-8 you captured in Step 3.
7. **Tablet screenshots**: optional.
8. **Video**: skip for now; you can add a YouTube trailer later.

Save draft.

---

## Step 5 — App content declarations (~30 min)

Play Console → your app → **Policy** → **App content**. Every row here must be ✅ green before a release can go live. Work through each.

### Privacy policy

Paste the Pages URL: `https://ahuge.github.io/tower_defence/privacy-policy.html`

### App access

Is any app content restricted? Factions has no login gate or region lock.
→ **All functionality is available without any special access restrictions.**

### Ads

Does your app contain ads?
→ **Yes, my app contains ads.**

### Content rating questionnaire

Click **Start questionnaire**. Answers for Factions:

- **Email**: `ahughesalex@gmail.com`
- **Category**: Game (not "Reference, news, or educational")
- **Violence**: **Yes**, the game contains violence, **fantasy / cartoon only**, **no blood**, **no realistic gore**, **no decapitation or mutilation**, **no sexual violence**. Creatures and magical constructs get defeated; no humans rendered in detail.
- **Fear**: No horror / frightening content.
- **Sexuality**: No sexual content.
- **Language**: No profanity.
- **Controlled substances**: No drugs/alcohol/tobacco references.
- **Gambling**: **No**. Skin rolls use in-game currency (shards) earned through play or purchased; there is NO real-money gambling, NO ability to cash out, NO gambling mechanics per the IARC definition.
- **User-generated content**: **No**. (Custom maps stored locally don't count — they're not shared to other users through our infrastructure.)
- **Miscellaneous**: Shares location? No. Allows digital purchases? Yes.

Expected ratings: **PEGI 7**, **ESRB Everyone 10+**, **USK 6**, **IARC 3+**. (Cartoon violence tier.)

### Target audience

- **Target age group**: `13 and older`. (Not kid-focused — AdMob + IAP in the app.)
- **Appeals to children**: Ensure **Children are not included in your target audience** is set. Google cares about this one for COPPA compliance.

### News app

→ **No, my app is not a news app.**

### COVID-19 contact tracing

→ **No**.

### Data safety

Work through the form following `store-listing/data-safety.md`. Every question has a pre-written answer in there.

### Government apps

→ **No**.

### Financial features

→ **No**.

### Health

→ **No**.

### Advertising ID

- **Does your app use advertising ID?** → **Yes**.
- Declare the purposes: **Advertising or marketing** + **Analytics**.
- Not used for account-linked advertising. No CCPA opt-out needed for a game.

---

## Step 6 — Build + upload the release AAB (~10 min)

### On this machine (WSL):

```bash
npm run android:release:aab
```

Produces `android/app/build/outputs/bundle/release/app-release.aab`. Already built once today — current file is at `C:\Users\ahugh\Downloads\android\factions-release-fd1dc96.aab`.

### Upload

Play Console → your app → **Release** → **Testing** → **Internal testing** → **Create new release**.

1. **App integrity**: first time Play Console uploads will ask whether to enrol in Play App Signing. **Enrol yes** — Google holds the upload key (recommended; means you can always re-sign future builds even if you lose the local keystore). You keep control via the upload key.
2. **Upload app bundle**: drag in the .aab file.
3. **Release name**: auto-populates from versionName (`1.0-fd1dc96`). Leave or edit.
4. **Release notes**: paste the internal-testing release notes from `store-listing/descriptions.md`.

Click **Save** → **Review release** → you land on a "Ready to be reviewed" summary.

---

## Step 7 — Add testers + publish internally (~10 min)

Still in **Internal testing**:

1. Tab **Testers** → **Create email list** → name: `Factions Internal Testers` → add the addresses:

```
ahughesalex.house@gmail.com
ovvenski@gmail.com
ahughesalex@gmail.com
```

Save.

2. Back on the Internal testing page → toggle the email list **On** for this track.
3. Grab the **"Copy link"** under "How testers join your test" — this is the opt-in URL. Share with each tester. They click, accept, and Factions shows up in their Play Store.
4. Click **Start rollout to internal testing**.

Google does a ~30-minute processing pass (basically just virus scanning — no content review at internal tier). Testers get Factions in their Play Store shortly after.

---

## Step 8 — Verify on a tester device

1. Tester opens the opt-in link on their Android phone.
2. Play Store → search "Factions" → install.
3. Launch — should behave exactly like the sideloaded debug build, except:
   - Ads are production ad units (test watermarks gone — USE_PRODUCTION_AD_UNITS should be flipped for this build, see below)
   - Play Games sign-in works seamlessly if the tester is on the OAuth tester list
   - Crash reports + installs show up in Play Console dashboards within a few hours

### Before the release build

Before running `npm run android:release:aab` for the version that goes to testers, flip:

```diff
// src/systems/platform/AdUnits.ts
-export const USE_PRODUCTION_AD_UNITS = false;
+export const USE_PRODUCTION_AD_UNITS = true;
```

This swaps test ad units for real ones. Keep the commit reverted for future debug builds (or better: wire the flag to `process.env.NODE_ENV` so it auto-flips — can do that in a follow-up).

---

## Troubleshooting

- **"Upload failed — duplicate versionCode"**: bump `versionCode` in `android/app/build.gradle` (+1 from last upload) and rebuild.
- **"The signing configuration uses a different key"**: the Play App Signing enrolment happens ONCE. After the first upload, every build has to be signed with the same key. Don't regenerate the keystore.
- **"Missing privacy policy"**: Pages might not have deployed yet. Wait 5 min after pushing, verify the URL loads in a browser, then retry.
- **"Content rating needed"**: finish the content rating questionnaire — it's one of the mandatory gates.
- **Tester sees "App not available"**: the opt-in link hasn't been clicked, or the rollout is still processing. Give it 30 min after "Start rollout".

---

## After internal testing

Once the three of you have had a chance to bang on it and it feels good:

- **Promote to Closed Testing** (invite-only but wider — more testers, same code flow)
- Or **Promote to Open Testing** (anyone with the opt-in link can join)
- Then **Production** — this is the one Google actually reviews (3-7 day review wait).

Each promotion is one click in Play Console; the same AAB moves between tracks without re-uploading.
