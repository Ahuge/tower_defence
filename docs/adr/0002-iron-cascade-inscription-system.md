# Iron Cascade gets a campaign-defining player verb (Inscriptions) and a typed Campaign State (the Codex)

## Context

Comparing the four shipped campaigns reveals that three of them have a *campaign-defining mechanical verb* the player performs in every mission, and one does not.

- **Greenward** has Consecration cairns / shrines as per-mission ritual interactions, plus `WildwoodReserves` regenerating between missions — players feel the Greenward identity in every mission.
- **Snake Eyes** has the Pactbook wager system — players accept or refuse Voidcaller wagers in every mission and the resulting debt is the explicit narrative engine of the campaign.
- **Arcane** has a recurring "interrupt" archetype across early missions and Frost interrupts as a teaching verb — less uniform than the other two, but still has a recurring mechanical identity.
- **Iron Cascade** has **Suppression Pylons in only 4 of 10 missions** (M2/M5/M6/M8) and a sabotage finale in M10. The other 5 missions (M1, M3, M4, M7, M9) have no Mech-specific mechanic — they read as generic standard-mode tower defence with Mech-themed creep art. Half of the campaign is mechanically anonymous.

Architecturally, this asymmetry shows up in the campaign-state schemas: Greenward has `WildwoodReserves`, Snake Eyes has `Pactbook` debt, but Mech's `TState` is `Record<string, never>` — Iron Cascade is the only campaign with no cross-mission state. There is nothing for the player to accumulate or carry forward.

The audit happened opportunistically while fixing the M6 walker-sprite issue, then escalated when the user noticed M3/M7/M10 were using generic wave generation (now fixed in a separate commit). With the wave content corrected, the deeper question surfaced: *what does it mean to be playing Iron Cascade rather than just "another TD campaign with mech-skinned creeps"?*

## Decision

Iron Cascade gets a campaign-wide player verb called **Inscriptions** and a typed Campaign State called the **Codex**.

The Codex is a list of owned Inscription ids stored as `MechState.codexPages: InscriptionId[]`. Vael starts the campaign owning 5 starter Inscriptions. Every mission won unlocks 2 of 3 randomly-offered new Inscriptions; every mission lost unlocks 1 of 3. The total pool is 16 Inscriptions. Once fully owned, subsequent reward picks become **Duplicate Stacks** that upgrade an owned Inscription one tier (capped per-shape).

Before each mission, the engine drafts 5 Inscriptions at random from the player's owned Codex and the player brings 2 of those 5 into the mission. Inscriptions are painted on grid tiles during the mission and trigger effects. There are three **Inscription Shapes**:

- **Consumable** — paint fires immediately, spent. 2 base charges per mission.
- **Persistent** — paint stays on a path tile the whole mission. 1 base placement.
- **Aura** — paint buffs every tower in the surrounding 3×3 zone for the whole mission. 1 base placement.

Painted Inscriptions are **unaffected by Suppression Pylons** and **do not count toward tower-cap restrictions** (M1 4-tower kit, M7 6-tower cap). They are spells, not buildings.

A second per-mission mechanic — **Salvage Cores** — is added to M7 *Rationed Mana* only, as that mission's distinct verb. Walker creeps drop a Core ground-sprite on death; click-pickup adds to a counter; every 5 Cores grants +1 emplacement slot above the M7 frugal cap, max +3 slots per mission. M7 was the only mission in the campaign whose distinctness was purely numeric (half gold + 6-tower cap); Salvage Cores makes the "active scarcity" fiction mechanical.

## Considered alternatives

- **Vent Armor as universal verb.** Extend the existing M5-flagship `mech_pylon_vent_armor` trait so every walker periodically opens armor vents (timer-based) and physical damage gets bonus during the window. Rejected: not unique or creative enough; reads as a passive damage variance rather than a player verb with agency.
- **Hijack the Iron.** Player gets a per-wave charge to channel a creep and turn it back toward Voss's spawn; flipped creeps body-collide with other creeps for damage. Rejected when the user expressed stronger preference for the Inscription direction, though the verb's narrative fit ("Vael bending Iron to a counter-purpose") remains strong and could resurface as a single-mission mechanic later.
- **Schematic Library / supermeter.** Persistent kill-counter across the campaign unlocks tiered emergency abilities (Halt at 50 pages, Recall at 150, Mortar Barrage at 350, Mana Furnace at 700). Rejected: the kill-counter pattern would have collided with the Codex-page pattern of Inscriptions; one cross-mission counter per campaign is the right ratio.
- **Engineer's Wrench (one-per-mission emergency lever).** Lighter than the others — once per mission the player picks Repair / Tune / Overclock on a chosen tower. Rejected: cooldown-trope, low novelty, didn't differentiate Iron Cascade enough.
- **Conveyor Belts (live route control).** Player flips belt direction during play to speed up or slow down creeps. Rejected for cost: requires pathfinding to be belt-aware on every Mech map, multi-week implementation, and the existing 7 Mech maps would need re-authoring to place belts.
- **Salvage Cores as the universal verb instead of M7-only.** Rejected: kill-driven ground pickup at every mission would compete with Inscription painting for moment-to-moment APM and dilute the Inscription verb. Better as a single-mission spice that mirrors the M7 frugality fiction.

## Consequences

### Architectural

- `MechState` gains real shape: `{ codexPages: InscriptionId[]; cores: Record<MissionId, number> }`. The empty-record-type that made Mech the architectural outlier among campaigns disappears. All four campaigns now have meaningful typed cross-mission state.
- A new `MissionState` aspect on the Mech `CampaignExtension` handles Codex page accrual at mission end (the existing `applyMissionResult` hook). The "choose 2 of 3 offered Inscriptions" UI is a new screen handled by the Mech `UISurface` aspect, between `GameOverScene` and the next mission's loading screen.
- The pre-mission "draft 5, bring 2" UI is also a new `UISurface` screen, between loading and `GameScene.init`. It runs *every* Mech mission, including M10.
- Inscription painting is a new player action handled by a Mech `Intercept` aspect (consumes the click on a grid tile when the player has selected an Inscription from the loadout slot). The existing `Intercept` infrastructure already supports this pattern from Suppression Pylons.
- A new `IronCascadeInscriptions.ts` module owns the 16-Inscription definitions (effect predicates, charges, shape). New `mech_inscription_*` trait ids may be added for Inscription effects on creeps (slow, root, damage-amp) following the existing `mech_pylon_vent_armor` trait pattern.

### Campaign feel

- All 10 missions get a shared moment-to-moment verb. M1/M3/M4/M7/M9 — the "anonymous" missions — gain mechanical identity through the Inscription loadout and per-mission painting decisions.
- Early game = collecting variety (Codex page accrual). Late game = stacking specialty (Duplicate Stack picks). M7-M10 reward picks are dominated by stack choices; the player commits to a favorite Inscription cluster.
- 3×3 zone auras reward intentional tower clustering on every Mech map — a new spatial strategy axis on top of existing tower placement.
- Pylon missions (M2/M5/M6/M8) gain new strategic weight: certain Inscription shapes work *through* pylon mute. The Inscription loadout choice becomes the answer to a pylon-heavy mission.
- M7 Rationed Mana gains a real mechanical verb (Salvage Cores) on top of Inscriptions; it stops being the campaign's least mechanically-distinct mission.

### Costs

- Pool authoring: 16 Inscription effect implementations, each touching the trait system and the creep damage pipeline. Smaller per-Inscription than a tower; aggregated it's probably 1-2 weeks of authoring + balance work.
- UI cost: two new screens (Draft, Reward) plus an in-mission HUD slot for the 2 loadout Inscriptions and their charges/placements.
- Backwards compatibility: existing player profiles will have `MechState = {}` — initialize as empty Codex (5 starter Inscriptions granted) on first load post-update. No save migration needed if the state shape is additive.
- Mech becomes the only campaign with a *content unlock* progression. Greenward unlocks resources, Snake Eyes accrues debt, Arcane has no cross-mission state at all; Mech now unlocks usable items. This is a deliberately distinct campaign-state texture: each of the four campaigns now occupies a different point in cross-mission-state design space (item collection / resource regen / debt accrual / stateless), which strengthens the campaigns-as-distinct-experiences thesis.
