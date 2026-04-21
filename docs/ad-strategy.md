# Ad Strategy

Where we show ads, why, and — just as importantly — where we don't. Written as a policy doc; engineers should treat the "Placements" table as the canonical list and add new placements here *before* wiring them in code so review happens against the whole surface, not one call at a time.

---

## Principles

These rules drive every placement decision.

1. **Ads never interrupt active gameplay.** No mid-match interstitials, no wave-transition banners, no "starting wave 5? here's an ad first." The player is in a rhythm; breaking it to insert a third-party video frustrates more than it earns.
2. **Rewarded ads are always player-initiated.** Every rewarded video has a button the user tapped to start it, with the reward clearly stated before the ad plays ("Watch ad for +100 shards"). We never auto-play a rewarded ad and surprise the user with what comes back.
3. **Every rewarded ad has a concrete payoff the player wants.** Shards, a modifier, a revive, a speed boost. We don't show ads purely for ad revenue — if there's no reward that feels fair for 30 seconds of the player's attention, the placement doesn't belong here.
4. **The ad-free IAP (`ads_off`) grants every rewarded benefit directly, no ad required.** A player who paid to remove ads gets *all* the rewards that ad-watchers get — daily shards, the continue revive, draft modifier unlocks, speed boost, tower-roll reroll — by clicking the same button, but without the video. The reward is the thing they were paying to access frictionlessly. Implemented via `claimRewarded(placementId)` in `src/systems/monetization/RewardedClaim.ts`: returns true immediately for ads-off owners, otherwise routes through the rewarded video. Interstitials stay fully off for ads-off (they're not rewards).
5. **Frequency caps on anything unlimited.** "Unlimited" placements (modifier rerolls, speed boost) need a cooldown or a hard cap somewhere — otherwise a determined player can farm ads for 45 minutes straight and burn out both our revenue share and their own goodwill with the experience.
6. **Store-policy compliance is non-negotiable.** Both Apple (App Store Review Guideline 1.1.6) and Google (Play Policy on ads / deceptive behaviour) require: ads clearly distinguishable from content, rewards reliably granted after completion, no simulated close buttons, no ads in loading screens that block progress. Every placement here is designed to satisfy both.

---

## Ad format cheatsheet

- **Rewarded video** — 15-30s, user-initiated, pays a specific reward on completion. All eight player-initiated placements below are rewarded.
- **Interstitial** — 15-30s, full-screen, no reward beyond "you can continue." Used for natural breakpoints; one placement only (post-match → menu).
- **Banner** — intentionally unused. See "What we don't do" below.

A note on "short ad vs long ad": AdMob doesn't give us a knob for ad length — the network picks 15-30s based on what inventory is available. The perceived length difference in a UX like "short ad for modifier 2, longer ad for modifier 3" has to come from *how many ads we ask the player to watch*, not ad-level configuration. Placements 2 and 3 below are both single rewarded videos.

---

## Placements

| # | Placement ID | Format | When | Reward | Frequency cap | Status |
|---|---|---|---|---|---|---|
| 1 | `shards_daily` | Rewarded | "Watch ad for +100 shards" button in Store header | 100 shards | 1 / day (UTC midnight reset) | **Live** |
| 2 | `draft_modifier_2` | Rewarded | "Watch Ad (Option 2)" button in Draft | Second modifier option to choose from (still pick 1 total) | 1 / match | **Live** |
| 3 | `draft_modifier_3` | Rewarded | "Watch Ad (Option 3)" button in Draft (only after #2 watched — progressive reveal) | Third modifier option to choose from (still pick 1 total) | 1 / match | **Live** |
| 4 | `draft_reroll` | Rewarded | "Re-roll all modifiers" button in Draft | All three modifier slots re-rolled | Soft cap: 3 / match, then increasing cooldown | Planned |
| 5 | `speed_boost_10m` | Rewarded | "Unlock 3× speed for 10 min" button on pause menu / speed toggle | 3× speed enabled for 10 minutes of real time | 1 active timer at a time; stacks up to 30 min | Planned |
| 6 | `game_over_continue` | Rewarded | "Continue — revive with +5 lives" button on loss screen | Revive with 5 lives; wave resumes | 1 / match | Planned |
| 7 | `tower_roll_reroll` | Rewarded | "Re-roll this drop" button shown after a paid roll result | Re-roll the 150-shard tower roll once | 1 / paid roll | Planned |
| I | `game_over_exit` | Interstitial | On "Play Again" / "Menu" after a match | n/a (just a transition ad) | Play Store's frequency-cap flag at the ad-unit level; we also skip if shown in last 60 s | **Live** (wired in GameOverScreen) |

Placement IDs are strings passed to `platformBridge().ads.showInterstitial(id)` / `.showRewarded(id)`. They flow through to AdMob reporting so we can see revenue and fill rate per placement and retire or redesign underperformers.

### Placement notes

- **#1 daily shards** — the strongest retention hook on the list. A free 100-shard top-up is enough to feel meaningful (≈1/6 of a skin roll) without inflating the shard economy. Reset at UTC midnight: cloud-synced cooldowns across devices agree without timezone math, and a player can't farm the daily by crossing a timezone boundary on a flight.
- **#2 / #3 draft modifiers** — free tier sees 1 of 3 options; watching an ad reveals a second, watching another reveals the third. Player always picks one total, so no balance impact — the ads unlock *optionality* (more faces to choose from) not *power*. Progressive reveal: slot 3 only unlocks after slot 2, which gives us the "short ad → longer ad" perceived-length distinction without needing AdMob to honour an ad-length knob it doesn't expose.
- **#4 draft reroll** — "unlimited" on the user's terms but with the soft cap: after 3 rerolls per match the cooldown grows (next reroll gated behind 30s, then 60s, then 120s). Discourages compulsion watching.
- **#5 speed boost** — the README says the game already cycles 0× / 0.5× / 1× / 1.5× / 2× / 3× via TAB. Before implementing this placement we need to decide: does the baseline cap drop to 2× (making 3× the ad unlock), or does this unlock something faster than 3×? My recommendation: **drop the free cap to 2×, gate 3× behind the rewarded ad**. Keeps the current speed variety in the game while giving us something meaningful to gate.
- **#6 continue** — 5 lives is a sensible baseline for Normal. On Hard/Insane 5 lives may evaporate in one wave; I'd recommend scaling the revive to `max(5, floor(startingLives * 0.15))` or similar. Flag for playtest.
- **#7 tower-roll reroll** — nice anti-dupe-frustration tool. Exactly once per paid roll is the right cap — any more and the 150-shard price tag becomes meaningless because players will just watch ads until they get what they want.
- **#I game-over interstitial** — the one non-rewarded ad. Already wired in `GameOverScreen.tsx`. Has a 60-second same-session cooldown client-side *in addition* to AdMob's own frequency cap so we don't show two interstitials back-to-back if the player taps Menu then Play Again quickly.

---

## What we deliberately don't do

Each of these has been considered and rejected.

- **Banner ads.** The tower dock, status bar, and economy panels already fill the screen on phone; a banner eats ~10% of vertical pixels with low revenue ($0.50-$2 eCPM for mobile banners vs $15-$30 eCPM for rewarded video). Bad revenue-per-pixel, breaks responsive layout, nothing gained.
- **Mid-match interstitials.** Wave transitions are part of gameplay; interrupting them kills flow and tanks retention. Tested-to-death anti-pattern.
- **Pre-wave rewarded ads that are mandatory to proceed.** "Watch an ad to start wave 5" would breach Apple 1.1.6 (manipulating users to view ads) and would make the game unplayable for ad-averse users. All ads here are optional.
- **App-open ads.** The Capacitor AdMob plugin supports them but they make the launch experience feel like a mobile web browser. Our first impression is the splash + tower icon; we don't want to interrupt it with an ad before the menu mounts.
- **Ads before Settings / Store / Leaderboard screens.** Players navigating to their own progress shouldn't pay an ad tax for it. The Store screen is already our IAP funnel; blocking access to it with someone else's ad is actively self-harming.
- **Ads during the tutorial.** First-session experience needs to land without friction. No ads fire in tutorial mode; the ad bridge gets a `matchMode === 'tutorial'` short-circuit when we wire the first rewarded placement.
- **Ads on Android Auto / TV / tablets bought for kids.** We don't actively target those contexts; AdMob's content-rating settings (`tagForChildDirectedTreatment: false`, `maxAdContentRating: Teen`) are already set in `capacitor.config.ts`. The actual policy compliance lives there.

---

## Implementation shape

Every placement routes through one of two bridge calls:

```ts
// Rewarded — awaits completion, returns 'shown' only if the user
// watched to the reward point. We apply the reward only on 'shown'.
const result = await platformBridge().ads.showRewarded('shards_daily');
if (result === 'shown') {
  ShardWallet.earn(100, 'Daily ad reward');
}
```

```ts
// Interstitial — fire-and-forget transition. We navigate in a
// `.finally()` so a missing ad never blocks the user. Already the
// pattern in GameOverScreen.
await platformBridge().ads.showInterstitial('game_over_exit');
```

Each UI that hosts a rewarded placement follows the same structure:

1. **Gate the button on `canShow(placementId)`** — returns false when the cooldown hasn't elapsed or the frequency cap is hit. Shows the button greyed out with "Available in 2h 14m" so the player knows the option exists even when it's not yet.
2. **On click → show loading state → call the bridge → apply reward on 'shown' → show result toast.** Toast states the reward ("+100 shards added") so there's no ambiguity about whether the ad "counted."
3. **Persist frequency state** to `localStorage` via a new `AdCooldowns.ts` module (to be built when we wire placement #1). Cloud-save hooks it so a cross-device player doesn't double-dip by reinstalling.
4. **Tutorial gate**: every rewarded call is preceded by an `if (matchMode === 'tutorial') return 'skipped';` check on the bridge side so we never fire ads during the first-run tutorial match.

---

## Roll-out order

We do these in risk-reverse order — smallest surface, easiest to remove, most obviously net-positive first:

1. **Placement #I (interstitial on game-over)** — ✅ live.
2. **Placement #6 (continue after loss)** — ✅ live (includes revive shockwave board-wipe so +5 lives aren't burned by in-flight creeps).
3. **Placement #1 (daily shards)** — ✅ live.
4. **Placement #2 + #3 (draft modifier unlocks)** — ✅ live.
5. **Placement #4 (draft reroll)** — next. Builds on #2/#3.
6. **Placement #7 (tower-roll reroll)** — needs roll-result screen surface.
7. **Placement #5 (speed boost)** — last, pending the baseline-cap decision.

Each ships behind its own small PR with a telemetry event per placement so we can track fill rate and completion rate on release and drop or redesign the dog.

---

## Open questions for lock-in

Flag these back to Alex before implementing the corresponding placement.

- ~~**#1** — does the daily reset align with local midnight or UTC?~~ → **Decided: UTC midnight.** Cross-device sync agrees without timezone math + no timezone-farming.
- ~~**#2 / #3** — do three simultaneous modifiers break difficulty pacing?~~ → **Decided: N/A.** Player picks 1 of however many options are revealed; ads unlock more options, not more active modifiers.
- **#5** — baseline speed cap stays at 3× (and the ad unlocks something else, e.g. 4×?) or drops to 2× with 3× ad-gated? Recommend drop to 2×.
- **#6** — flat +5 lives, or scale with difficulty? Recommend scale.
- **#7** — should the reroll redraw from the same rarity tier (prevents downgrades) or from the full pool? Recommend same tier.
- **Restore behaviour** — rewarded ad state (cooldowns, daily-shard claim) is tied to a device, not a store account. Do we cloud-save cooldowns under the Play Games / Game Center profile so switching devices doesn't reset the daily claim? Recommend yes, in the ProfileBridge's `cloudSave` slot under `ad_cooldowns`.

---

## References

- [AdMob policies overview](https://support.google.com/admob/answer/6128543)
- [Google Play: Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753)
- [App Store Review Guideline 1.1.6 — ads](https://developer.apple.com/app-store/review/guidelines/#safety) (see 1.1.6 and 3.1.1)
- [`AdBridge` contract](../src/systems/platform/PlatformBridge.ts) — the four methods we call from game code.
- [`CapacitorAdBridge` implementation](../src/systems/platform/capacitor/CapacitorAdBridge.ts) — current native wiring.
- [`AdUnits.ts`](../src/systems/platform/AdUnits.ts) — test vs production unit IDs.
