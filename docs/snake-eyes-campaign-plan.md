# Plan — Campaign #4: "Snake Eyes" (Void)

**Status:** Active planning, ready for execution.
**Owner:** Alex
**Trigger:** Greenward (Campaign #3) shipped. Four PRs in (#74 parent + #75/#76/#77 merged in). The campaign-system primitives proved out at scale — `CampaignStatePanelRegistry`, `MissionResult.custom`, per-mission `MissionRunner` finalize hooks, the bag-of-flags v2 trait pipeline. Time for the fourth campaign.

---

## Brief

Ten-mission narrative campaign for the Void faction. The bar: **better and more fun and more polished than any of the existing three campaigns.** Void's mechanical identity — gambling, chance, gold generation, teleportation — means the campaign's center has to be *player agency over variance*. Chaos the player steers is fun; chaos that just rolls dice at the player is frustrating.

Player locked into Void's tower kit (`defaultPlayerFaction: 'void'`) — Gambler / Spike / Siphon / Rift / Oblivion + Frontier (Rift / Abyssal Rift). Tone is **stable cocky throughout** — Ardax never breaks character. Dramatic weight comes from gameplay state (Debt, Divergence), not from prose register.

Two campaign-unique gameplay systems. Final mission must feel epic but distinct from "kill the boss tower" and from Greenward's three-Nave fork — Void's M10 is a *single tableau with a personalized epilogue*, not three branches.

All narrative writing reviewed by a professional-writer agent per CLAUDE.md convention; three blind-comparison versions for every major creative choice.

---

## Lore foundation

**Snake Eyes.** Ardax owes the House more than the House can collect. He has been a Voidsmith — Gambler, Spike, Siphon, Rift — long enough to have a name on every ledger from Talavar to the Pale. The Dealer wants him on the road. So he goes on the road.

Ardax bets his way west across the gambling-frontier, mission by mission, paying down the Debt with the only thing he has — risk. The further west he goes, the more he sees a silhouette walking parallel to him: **the Counterfactual** — the version of him that took the safe bet at the first table, twenty years ago, and never owed anyone anything. Ardax has spent his whole life outrunning that man. At the **Counterfactual's Mirror** (M10), the two finally sit down across the same table.

His partner **Theris** rides with him through Act I. She cashes out at M6 with a note: *"I cashed out, Ardax. You should too."* He doesn't.

### Named cast

- **Ardax** — POV, the gambler. Cocky throughout. Owes the House. Closing on Snake Eyes.
- **The Counterfactual** — antagonist face. Ardax's safe-play self. Silhouette → mirror tower → creep variant → M10 boss. Never speaks directly until M10.
- **Theris** — Ardax's partner gambler. M1-M5 companion; vanishes M6; appears on the Counterfactual's grid in M10.
- **The Dealer** — off-screen antagonist; the House's hand. Speaks to Ardax via terse one-line interludes between missions ("Talavar's done. West. Don't sleep."). Repossesses towers when Debt is uncovered.
- **The House** — the institution the Debt is owed to. Never named more specifically; not a character so much as a force.

### Tone

Stable cocky throughout. Closer to noir antihero voiceover than to Greenward's terse reverence. Mission prose: 1-2 paragraphs, situation + jab + kit lean. Ardax narrates in first person past tense. Even at M10, the joke is that he doesn't take it seriously.

---

## Two unique gameplay systems

### 1. The Pactbook (signature)

Before every mission, the player draws **3 Wagers** from a deck of **12** with replacement. Each Wager is a one-mission mutator with asymmetric risk/reward. The player picks **1**.

- **Declining all 3** is allowed but adds Debt (interest penalty: +20g Debt).
- **Accepted Wager that succeeds** → multiplies Debt paydown by Divergence (see §2).
- **Accepted Wager that fails** → cosmetic ledger entry only (it's the failure that *feeds the Counterfactual*; see §2).

The 12 cards are tiered (4 small / 4 medium / 4 high-risk) and named with playing-card iconography. See **Wager Deck** below.

The campaign-wide Pactbook **tally** is persisted across missions in `PlayerProfile.campaignState['void']`. The M10 epilogue reads which Wagers Ardax accepted, declined, and failed.

### 2. Debt × Divergence (supporting)

Two coupled persistent counters:

- **Debt** — Ardax owes the House. Starts at **800g** at M1. Per-mission interest **+50g**. Leak surcharge: each creep that leaks adds **+5g** Debt. Declining all 3 Pact draws: **+20g** Debt. Mission win paydown: **base 100g + (50 × Divergence) g**.

- **Divergence** — a 0-10 risk-tally. Resets per mission. Each accepted Wager adds Divergence by tier (1 / 2 / 3 for small / medium / high). Caps at 10. Multiplies the win-paydown.

**The bite:** if Debt exceeds threshold N at start of a mission, the Dealer takes one action per excess threshold step:

| Debt threshold | Dealer action |
|---|---|
| ≥1000g | Bounty wave (extra fast creeps mid-mission) |
| ≥1300g | Repossess one tower at random when the wave starts (one-time per mission) |
| ≥1600g | One Wager slot void — only 2 cards drawn instead of 3 |
| ≥2000g | Two Wager slots void + bounty wave |

The arc: pay down Debt early via risky Pacts (Divergence is plentiful when Debt is light). Defer paying down → late missions punish geometrically — the Dealer pushes harder, your Pact options narrow, and a single mission can blow the whole campaign.

Surfaced via the **VoidStatePanel** (lobby `CampaignStatePanelRegistry`) showing Debt, last mission's Divergence, and the Pactbook tally to date.

### Theris (the partner beat)

Theris rides with Ardax M1-M5 as a soft NPC presence — referenced in mission intros, hers is the second silhouette in the M1-M3 splash art. In **M6 (coop_with_bot)** she is the AI partner. Mid-mission text overlay: she draws a Wager from her own deck and *wins big*. After the mission, an interlude text: *"I cashed out, Ardax. You should too."* She does not appear in M7-M9.

In **M10**, she appears at the Counterfactual's table — the safe-play self kept her. No dialogue from her at M10; her presence is the punctuation.

Mechanical: she's a `coop_with_bot` partner in M6, otherwise pure narrative. Lighter mechanical hook than Caer Wenna — we lean harder on the writing for her M5→M6 transition.

### The Counterfactual (recurring face)

Four escalating beats:

1. **M2** — silhouette in fog-of-war on the far ridge. Renders for ~3 seconds when the wave starts, fades. No interaction.
2. **M4** — a **mirror tower** appears one tile from a tower you place. Looks like your tower with inverted palette. Fires at half rate. If you sell it, Debt -10g but Divergence resets for the mission.
3. **M7** — **Mirror Walker** creep variant — copies your last tower placement at low %, drops double gold when killed.
4. **M10** — full boss, on a paired grid. The Mirror Bet setpiece.

He does not speak until M10. He does not need to.

---

## Arc skeleton (10 missions, three acts)

### Act I — The Border (M1-M3)

**M1 — The Last Hand at Talavar** *(interrupt; tutorial Pact)*
The casino town Ardax is leaving. The Dealer hands him three cards: *"On the road, Voidsmith. Pick one."* First Pact draw. Theris is at his elbow.
*Star 2:* Won. *Star 3:* Accepted a Wager.

**M2 — The Road West** *(interrupt; **Counterfactual silhouette introduced**)*
Bounty hunters on the road. A silhouette walks parallel along the far ridge — Ardax pretends not to look. Theris doesn't pretend.
*Star 2:* Won. *Star 3:* Won with Debt non-increasing.

**M3 — Silvermine Creek** *(interrupt; first major Pact tension)*
A frontier town. The deck draws heavy this mission — 3 high-risk Wagers. The Dealer is curious how Ardax is going to handle it.
*Star 2:* Won. *Star 3:* Accepted a high-tier Wager and succeeded.

### Act II — The Frontier (M4-M7)

**M4 — The Ferryman's Game** *(interrupt; **Counterfactual mirror tower beat**)*
River crossing. Tonight Ardax notices that one of his towers has a twin he didn't place. *"Cute."* He can sell the mirror, but it costs him.
*Star 2:* Won. *Star 3:* Did not sell mirror tower.

**M5 — Wheel of Cipher** *(speedrun; first Dealer interlude)*
Casino town, the Wheel spinning all night. Ardax has six minutes. Between waves, the Dealer interjects: *"You're slow tonight, Voidsmith. The boss is watching."* First mention of who Ardax owes.
*Star 2:* Won. *Star 3:* Cleared in ≤6 minutes.

**M6 — Theris's Goodbye** *(coop_with_bot; Theris partners; Theris vanishes)*
Theris is the bot. Mid-mission text overlay: *"Theris drew the King of Coins. She won."* End-of-mission interlude: the note. Wager-tier draws this mission lean small/medium — Ardax is distracted.
*Star 2:* Won. *Star 3:* Won + Theris bot alive at end + Debt paid down.

**M7 — Mirror Walkers** *(restriction: no Siphon; **Counterfactual creep variant**)*
Ardax's Siphon is "off the table" — Pact-locked. New creep variant — **Mirror Walkers** — copies your last tower placement at low %, drops double gold when killed.
*Star 2:* Won. *Star 3:* Won + ≥3 Mirror Walkers killed.

### Act III — The Mirror (M8-M10)

**M8 — Snake Eyes** *(frugal; gold cap 200g; **Collector boss creep**)*
The Dealer's enforcer arrives. The "Collector" — a creep that lobs damage tokens at your towers (not at your lives). Defeat the Collector to cancel next mission's interest.
*Star 2:* Collector defeated. *Star 3:* Collector defeated + Debt ≤ Debt at mission start.

**M9 — Burning the Pactbook** *(attacker; Ardax sends Void creeps)*
Ardax fronts his own ledger. He sends Gambler-tokens, Spike-tokens, Siphon-tokens, Rift-tokens against a defended grid. The defender? The Counterfactual. The mirror is on the other side.
*Star 2:* Won. *Star 3:* Won + ≥3 distinct creep-token types sent.

**M10 — The Counterfactual's Mirror** *(final_void; single ending, three setpieces)*

> "Ardax sits down across from himself at a table he didn't pick. The Counterfactual is wearing the coat Ardax was supposed to wear. Theris is at his shoulder. The Dealer is not in the room — the Dealer never is, at the end. There are cards on the table and a Pactbook open between them. *'My deal,'* Ardax says."

- **Setpiece 1 — Approach** *(auto-Siege; ≤5 waves)* The cathedral-casino's outer hall. Standard fight; deny the Counterfactual a foothold.
- **Setpiece 2 — Mirror Lane** *(paired grid; the Mirror Bet)* Two grids side-by-side. Towers you place on yours, the Counterfactual mirrors onto his (at half stats but auto). Each wave runs on both grids simultaneously. Side with the cleaner clear gains ground. Player's Divergence biases the spawn pressure: high Divergence = your grid harder, theirs cleaner (you bet bigger; they coast).
- **Setpiece 3 — The Table** *(boss confrontation; single creep, big stats)* The Counterfactual personified. HP scales on lifetime Pactbook tally. Tactics scales on Divergence-at-M10.

**Final tableau** — **one** illustrated end-card (3 outcome variants: Win / Draw / Loss) plus a personalized epilogue paragraph stitched from final-state at game-end:

- **Debt-at-M10** (settled / lingering / crushing) selects from 3 Debt-fragments.
- **Divergence-at-M10** (low / mid / high) selects from 3 Divergence-fragments.
- **Theris status** (alive at M6 end / fell mid-M6) selects from 2 Theris-fragments.
- **Pactbook tally** (a final dominant tier: small / medium / high) selects from 3 Tally-fragments.

Combined ≈ **54 stitched states** from a writer-authored set of **11 paragraph fragments** in `void.texts.ts`. Reads as if written for this specific run — distinguishes from Greenward's three hard-coded forks.

*Star 2:* Won. *Star 3:* Star 2 + Mirror-Lane setpiece won outright (not drawn).

---

## Wager Deck (12 cards)

Four tiers. Names lean playing-card / gambling-noir. Each card has a `name`, 1-line `flavor`, `tier`, balance numbers (`grant`, `cost`, `successCheck`, `divergenceGain`).

### Tier 1 — Small (Divergence +1)

1. **Coin Flip** — 50% chance: start mission with +50g; else -50g. *"He flipped it. He didn't look at it."*
2. **House Cut** — Lose 10% gold all mission; gain +1g per kill. *"Always works out in the long run."*
3. **Sleeve Card** — One forced free tower sell at full price, anytime. *"Card up the sleeve. Pick a tower."*
4. **Markers** — +1g per Siphon hit; -25% Siphon range. *"Closer to the table."*

### Tier 2 — Medium (Divergence +2)

5. **Double Down** — Spike towers deal 2× damage; Gamblers deal 0.5×. *"Pick the side. Stay there."*
6. **Echo Ledger** — Each Siphon hit fires a free Gambler shot. *"The book reads itself."*
7. **Loaded Dice** — Crit chance +30%; -20% damage when not critting. *"The dice are honest. He just knows them better."*
8. **Hot Streak** — 3 waves cleared without leak → free wave-skip. 1 leak voids the streak. *"Don't break it."*

### Tier 3 — High (Divergence +3)

9. **The Pact of Zeros** — Round all damage to nearest 10. Most shots whiff; survivors die instantly. *"The table only deals in tens tonight."*
10. **Inverted Stakes** — Win every wave with no leaks → double Debt paydown. One leak this mission = zero paydown. *"All or nothing. Pretty much always all."*
11. **The Counterfactual's Cut** — 2 random tower slots locked all mission. Debt -100g now. *"He's playing your hand for you. Pay him for it."*
12. **The Mirror Wager** — Mirror your tower placements onto the Counterfactual's grid (paired grid for this mission). Beat his grid faster → 3× Debt paydown. Slower → instant mission loss. *"His deal."*

Six of the twelve are pure stat mutators (1, 2, 4, 5, 6, 7) and six have spatial / structural effects (3, 8, 9, 10, 11, 12) — keeps the deck feeling varied. The Mirror Wager (12) is the only Wager that *requires* a paired grid; it boots a mini Mirror-Lane in the regular mission. Used strategically, it's a Debt-paydown speedrun.

**Balance flow:** Tier 1 averages +30g Debt paydown delta (with Divergence multiplier). Tier 3 averages +200g Debt paydown delta on success, near-mission-loss on failure. The whole deck is balanced so a player who **always accepts** finishes M10 with Debt ≤ 0 (settled). A player who **always declines** finishes M10 with Debt ≥ 2000g (crushed). Both endings have written prose — failure is not game-over.

---

## Sprite + system manifest

### Art deliverables

| Asset | Count | File / location |
|---|---|---|
| Counterfactual states | 4 | silhouette / mirror tower / Mirror Walker / boss — `void_campaign_sprites.tsx` |
| Wager card faces | 12 | one PNG per card in Pactbook UI |
| Pactbook UI shell | 1 | The draw / pick / decline panel |
| Frontier-city map themes | 4 | casino / river / saltflat / cathedral-casino — extend existing theme system |
| Maps | 10 | JSON via `/editor.html` → `src/data/maps/snake-eyes/` |
| UI: Debt readout | 1 | Lobby panel + mission HUD |
| UI: Divergence dial | 1 | Visual riser; resets per mission |
| UI: Dealer interlude card | 1 | Single between-mission overlay; reuses Pactbook UI shell |
| Theris portrait | 1 | M1-M6 lobby splash + M10 cinematic |
| Mirror Walker creep | 1 | Inverted-palette walker; uses existing creep system |
| Collector boss creep | 1 | M8 special creep; lobs damage at towers |
| End tableau | 1 | The Table — 3 outcome variants in one PNG |
| Card-flip end animation | 1 | Phaser tween + sprite frames for the 3-card reveal |

Sprite generation via TSX convention: `void_campaign_sprites.tsx` at repo root + render script `scripts/render_void_campaign_sprites.ts`.

### Code systems

| System | New file | Risk |
|---|---|---|
| Pactbook (deck + draw + selection) | `src/systems/voidc/Pactbook.ts` | **High** — central new gameplay |
| WagerEffects (per-card mutators) | `src/systems/voidc/WagerEffects.ts` | High — touches damage / cost / spawn pipelines |
| DebtTracker | `src/systems/voidc/DebtTracker.ts` | Low — small `PlayerProfile.campaignState` extension |
| DivergenceTracker | `src/systems/voidc/DivergenceTracker.ts` | Low |
| DealerActions (threshold-gated effects) | `src/systems/voidc/DealerActions.ts` | Medium — bounty wave / repossess / void Wager slot |
| CounterfactualSpawner | `src/systems/voidc/CounterfactualSpawner.ts` | Medium — mirror tower placement + Mirror Walker creep |
| MirrorLaneController | `src/systems/voidc/MirrorLaneController.ts` | High — paired-grid setpiece for M10 + Wager 12 |
| TheresInterludes | `src/systems/voidc/TheresInterludes.ts` | Low |
| `final_void` archetype | extension of `MissionArchetypes.ts` | Medium — three-setpiece, single ending |
| Snake Eyes campaign data | `src/data/campaigns/snake-eyes.ts` + `texts.ts` | Low |
| Snake Eyes traits | `src/systems/voidc/SnakeEyesTraits.ts` | Low — bag-of-flags v2 pipeline |
| VoidStatePanel | `src/ui/campaign/VoidStatePanel.tsx` | Low |
| EpilogueComposer (stitching) | `src/systems/voidc/EpilogueComposer.ts` | Medium — text fragment selector |

Directory: `src/systems/voidc/` — the `c` suffix avoids name collision with potential `void` reserved-word grep noise.

### Existing systems reused (themed, not rebuilt)

| Existing | How used |
|---|---|
| Interrupt archetype | M1, M2, M3, M4 (standard mission shape) |
| Speedrun archetype | M5 (Wheel of Cipher 6-minute clear) |
| Coop_with_bot archetype | M6 (Theris bot partner) |
| Restriction archetype | M7 (Siphon locked) |
| Frugal archetype | M8 (Snake Eyes gold cap) |
| Attacker archetype | M9 (Burning the Pactbook) |
| `bag-of-flags v2` trait pipeline | All Wager mutators — no Tower.ts changes needed |
| `PersistedTowerState` | Not used (no Caer-Wenna-equivalent) — explicit non-reuse for differentiation |
| `CampaignStatePanelRegistry` | VoidStatePanel registration |

---

## Differentiation from prior campaigns

| Axis | Greenward | Snake Eyes |
|---|---|---|
| **Tone** | Reverent terse-medieval | Cocky noir antihero |
| **Player choice surface** | Ruin mode (3 modes baked into map) | Pactbook draw (3 cards picked from deck) |
| **Persistence model** | Resource depletion (Reserves) | Debt accumulation × risk multiplier |
| **Final mission** | Three Nave forks (Ceremony / Mercy / Siege) | Single tableau + personalized epilogue |
| **Recurring face** | Heron (4 silhouette states) | Counterfactual (4 escalation states) |
| **Named character beat** | Caer Wenna (tower-grief, mechanical refusal) | Theris (partner-grief, narrative-only) |
| **Art language** | Sun-Cathedral / Wildwood / vines | Playing cards / dice / mirrors / dust |
| **Replay hook** | NG+ for Mercy-lowest-Reserves run | NG+ for Debt-settled with all-tier-3 Pacts |

---

## Phased execution plan (22 commits, 4 phases)

Mirrors Greenward's plan: phased commits, each commit a single concern. Each phase ends with `npx tsc --noEmit + npx vitest run` green.

### Phase 1 — Foundation (commits 1-6)

1. **Plan doc** (this file).
2. Snake Eyes campaign skeleton: `snake-eyes.ts` data + `final_void` archetype stub + `texts.ts` empty file + register in `campaigns/index.ts`.
3. `DebtTracker` + tests (PlayerProfile.campaignState['void'] plumbing).
4. `DivergenceTracker` + tests.
5. `Pactbook` deck + draw + selection logic + tests (no UI yet — pure logic).
6. `WagerEffects` registry + 4 tier-1 cards wired through bag-of-flags v2 + tests.

### Phase 2 — Mid-tier Wagers + Dealer (commits 7-12)

7. 4 tier-2 Wager cards + tests.
8. 4 tier-3 Wager cards (excluding Mirror Wager 12) + tests.
9. `DealerActions` thresholds (interest, leak surcharge, decline penalty, bounty wave, repossess, void Wager slot) + tests.
10. `CounterfactualSpawner` — silhouette (M2) + mirror tower (M4) + Mirror Walker creep (M7) + tests.
11. M1-M4 mission definitions + intro/outro copy + Wager-deck-per-mission.
12. M5-M7 mission definitions + intro/outro copy.

### Phase 3 — Theris, Collector, Attacker, MirrorLane (commits 13-17)

13. `TheresInterludes` (M6 vanishing + note + M10 Mirror appearance) + tests.
14. Collector boss creep (M8) + tests.
15. M8 + M9 mission definitions + attacker-mode Void creep tokens for M9.
16. `MirrorLaneController` (paired grid, Mirror Wager card 12, M10 setpiece 2) + tests.
17. M10 three-setpiece controller + Wager card 12 wires through MirrorLane.

### Phase 4 — UI, endings, polish (commits 18-22)

18. `VoidStatePanel` (Debt + Divergence + Pactbook tally) + tests.
19. Pactbook draw/pick UI (the actual `<PactbookPanel>` Phaser scene) + tests.
20. `EpilogueComposer` — 11 paragraph fragments + stitching logic + tests.
21. Card-flip end animation (Phaser tween, 3-card reveal of the M10 tableau) + tests + smoke.
22. CHANGELOG + FACTIONS + cross-references in README; final unit-suite + smoke + bespoke maps pass.

**Follow-up PRs** (per Greenward precedent — split after the parent):
- **PR for bespoke maps** (10 hand-authored JSON layouts) — mirrors `greenward-bespoke-maps-prd.md`.
- **PR for M10 e2e** (paired-grid + epilogue-stitch coverage) — mirrors `m10-e2e-prd.md`.
- **PR for Pactbook card art** — 12 illustrated card faces via TSX.

---

## Quality bar (above Greenward)

Specific things Snake Eyes ships that Greenward didn't:

1. **Personalized epilogue** instead of three hard-coded forks. ~54 reachable text-states from 11 paragraph fragments.
2. **Player-driven variance** (Pactbook draws + accept/decline) as the central mechanic — Greenward's Consecration Modes are level-baked, not player-drawn.
3. **Card-flip ending animation** — 1-day polish lift over Greenward's static reveal.
4. **Stable cocky voice** — first time the series has tried first-person past-tense narration. Riskier; bigger payoff if it lands.
5. **Mirror Lane setpiece** — paired-grid mechanic that exists nowhere else in the codebase.
6. **Wager Deck as art** — 12 illustrated cards is a portfolio piece even if you never play the game.

---

## Open questions / risks

- **Pactbook balance** — 12 cards × 10 missions × 3 draws = a lot of permutations. Balance via simulation in `ml/`, similar to nature-balance-findings.
- **Mirror Lane perf** — paired grid means 2× rendering load. Test on phone target early.
- **Epilogue stitching coherence** — 11 fragments × multiple selectors can produce grammar collisions. The composer needs a `connector` system between fragments. Stretch a writer-agent pass on every reachable epilogue at the end.
- **Counterfactual mirror tower** (M4) — what happens if the player has no tower placed when the spawner fires? Spec: spawner waits until first player tower exists, then mirrors that one.
- **Mirror Wager card 12** vs **M10 setpiece 2** — both use the paired-grid system. Card 12 must not collide with M10's MirrorLaneController if the player draws it on M10 (spec: card 12 is excluded from M10's deck).
