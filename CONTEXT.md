# Tower Defence — Context

This codebase is a Phaser-based tower defence game with twelve factions, multiple match modes, and per-faction story **Campaigns**. This document is the glossary for terms whose meaning isn't obvious from code alone — particularly around the campaign system, which is the most domain-heavy subsystem in the project.

## Language

### Campaign system

**Campaign**:
A per-faction set of ten Missions that the player fights *against* a faction; completing it unlocks playing *as* that faction. Each shipped faction has its own narrative arc and bespoke mechanics.
_Avoid_: Story mode, chapter, season.

**Mission**:
A single playable run within a Campaign. Identified by its position `idx` (0..9) and a stable `id`. Mission `N+1` unlocks when Mission `N` is won with any star count; replays are always allowed.
_Avoid_: Level, stage, chapter.

**Mission Entry**:
The data record for one Mission inside a Campaign Extension's `missions[]` list. Carries identity, objectives, **Core Mission Config**, and a typed campaign-specific payload.
_Avoid_: MissionDef (legacy term — refers to the older flat schema).

**Base Mode**:
The engine-level shape of a Mission. Four exist: `standard`, `hero_defense`, `circle_coop`, `attacker`. Base modes change input model, win condition, or who controls what. They do NOT include `heist` or `base_defense` — those are **Map Topologies** authored as maps.
_Avoid_: Game mode, archetype, match mode.

**Map Topology**:
The spatial shape of a Map (entries/exits/walls). Heist (reversed path) and base defence (omni-directional spawns) are map topologies, not Base Modes — they reuse the standard engine.
_Avoid_: Map type, map style.

**Core Mission Config**:
The Base-Mode-discriminated, engine-level config for a Mission: wave count, difficulty, gold, lives, modifier, map, restrictions, etc. Fields that only apply to one Base Mode (attacker essence, hero id) live on that variant.
_Avoid_: Mission overrides, mission settings.

**Campaign Config**:
The opaque-at-registry, fully-typed-inside-the-Campaign-module per-mission payload. Lives on `MissionEntry.campaign` and is typed via the Campaign Extension's `TCfg` generic parameter.
_Avoid_: Mission rules, custom config.

**Campaign Extension**:
The single module per Campaign that exposes its behavior — its mission list, its typed Campaign State, its UI Surface, and a `buildRuntime` factory that returns the per-mission **Aspects**. Registered by `factionId`.
_Avoid_: Campaign module, mission handler.

**Aspect**:
A narrow role interface owned by one subsystem of the game. Six exist: **Setup**, **Lifecycle**, **Gameplay**, **Intercept**, **Mission State**, **UI Surface**. A Campaign Extension exposes any subset of them.
_Avoid_: Hook, plugin, handler.

**Setup Aspect**:
Per-mission, one-shot. Mutates the world at scene init — installs Pre-placed Towers, Suppression Pylons, ruin cells, summoning circles, workshops. Undo on shutdown is the Setup's responsibility.

**Lifecycle Aspect**:
Per-mission, owns `update(delta)` and `shutdown()`. Hosts campaign-specific controllers (e.g. `SabotageController`, `GreenwardMissionController`).

**Gameplay Aspect**:
Per-mission, subscribes to game events (wave start, creep spawn, tower placed, leak). Auto-subscribed at scene init, auto-unsubscribed at shutdown.

**Intercept Aspect**:
Per-mission, consumes player input before the default handler runs (e.g. a Suppression-Pylon-cell click is a channel action, not a tower placement).

**Mission State Aspect**:
Per-campaign (one instance ever, not per-mission). Owns the typed **Campaign State** lifecycle: read state, transform a Mission Entry via dynamic overrides at start, write state at end, tick between missions.

**UI Surface Aspect**:
Per-campaign. Provides state panels, parametric story text, and end-of-campaign epilogue text.

**Campaign State**:
Typed, persistent, cross-mission, per-faction data. Greenward's `WildwoodReserves`, Snake Eyes' `Pactbook` debt, the Mech ore tally — all Campaign State. Stored in `PlayerProfileStore.campaignState[factionId]`, typed via the Campaign Extension's `TState` generic.
_Avoid_: Save data, progress (those are broader concepts that also cover Mission stars, profile, etc.).

**Mission Star**:
A 0–3 score recorded per mission. Star 1 = win. Star 2 = win + an objective predicate. Star 3 = star 2 + a stricter predicate. Persisted separately from Campaign State on `PlayerProfile`.

**Wave Script**:
A `WaveDefinition[]` that replaces the global wave generator for a single mission. Sits on `Core Mission Config`. May be built inline or by a helper function (`buildPassColumn` etc.).

**Pre-placed Tower**:
A tower stamped onto the grid at scene init by the Setup aspect. Can be a tower type the player can't otherwise build this mission (used by Arcane M1/M2 to teach the Frost interrupt verb before Frost is buildable).

**Suppression Pylon**:
A Voss device that mutes player towers within a radius until the player channels the pylon down. Per-mission placements live in the Mech Campaign Extension's Setup aspect; the runtime singleton is registered by Setup and read by the `mech_pylon_vent_armor` creep trait.

**Pactbook**:
The Snake Eyes Campaign's cross-mission debt ledger. The player accepts mid-run wagers; unpaid debt compounds across missions; the M10 epilogue is composed from final-state by the **Epilogue Composer**.

**Epilogue Composer**:
Snake Eyes' end-of-campaign text generator. Reads final Campaign State and stitches a single illustrated ending. Lives on the Snake Eyes UI Surface as `ui.epilogue(state)`.

**Inscription**:
The Iron Cascade Campaign's per-mission player verb. Vael paints a ground glyph drawn from the **Codex** onto a grid tile; the glyph triggers an effect. Each Inscription has one of three **Inscription Shapes**: consumable, persistent, aura. The player drafts five from owned Codex pages before each mission and brings two.
_Avoid_: Sigil (collides with the `arcane_sigil` creep type), spell, rune.

**Inscription Shape**:
A discriminator on every Inscription. **Consumable** fires immediately and is spent (2 base charges per mission). **Persistent** stays painted on a path tile for the whole mission (1 placement). **Aura** is painted on any tile and buffs every tower in the surrounding 3×3 zone for the whole mission (1 placement); some auras are single-target instead of zone-wide.

**Codex**:
Iron Cascade's typed **Campaign State**. Tracks Inscriptions owned across missions — every mission win lets Vael choose 2 of 3 new Inscriptions to add to the Codex; a loss adds 1 of 3. Once the pool is fully owned, additional picks become **Duplicate Stacks** that upgrade an owned Inscription. Replaces the previously-empty `MechState = Record<string, never>` slot.
_Avoid_: Codex pages list, library, schematic library.

**Duplicate Stack**:
A Codex unlock past the initial 16-Inscription pool. Each stack upgrades an owned Inscription one tier — consumables gain +1 charge (cap 5), persistents gain +1 placement (cap 3), auras gain +2 to zone width (3×3 → 5×5 → 7×7, cap 7×7).

**Salvage Core**:
Iron Cascade Mission M7's unique verb. A walker creep on death drops a Core sprite on the ground for ~6 seconds; click-pickup adds it to the player's M7 Core counter. Every 5 Cores grants +1 emplacement slot above the M7 6-tower cap, max +3 slots per mission. M7-only; no other mission spawns Cores.

## Relationships

- A **Campaign** has exactly ten **Missions**, listed in a **Campaign Extension**.
- A **Mission Entry** has one **Base Mode**, one **Core Mission Config**, and one **Campaign Config**.
- A **Campaign Extension** has zero or one **Mission State Aspect**, zero or one **UI Surface Aspect**, and produces a fresh **Aspects** bundle (Setup / Lifecycle / Gameplay / Intercept — any subset) per mission via `buildRuntime`.
- Each **Aspect** is consumed by exactly one engine subsystem:
  - **Setup** by `GameScene.init` (via a `WorldMutator` helper)
  - **Lifecycle** by `GameScene`'s per-frame loop
  - **Gameplay** by `EventBus`
  - **Intercept** by `InputManager`
  - **Mission State** by `MissionRunner`
  - **UI Surface** by `LoadingScreen`, `GameOverScene`, and the state-panel registry
- **Campaign State** is owned by exactly one **Campaign** (keyed by `factionId`) and read/written only via that campaign's **Mission State Aspect**.

## Example dialogue

> **Dev:** "I want to add a 'Frost only' mission to the Arcane Campaign. Where does the tower restriction live?"
> **Domain expert:** "Restrictions are a **Base Mode**-level concern — they affect what towers can be placed regardless of campaign. So `allowedTowerIds: ['arcane_frost']` goes on the **Core Mission Config**, not on the **Campaign Config**."

> **Dev:** "What about the Mech M5 Suppression Pylons — those are placements, not restrictions, so they go on **Campaign Config**?"
> **Domain expert:** "Yes — they're Mech-specific data, fully typed inside the Mech Campaign Extension. The **Setup Aspect** reads `mission.campaign.pylons` and installs them. The shared schema knows nothing about pylons."

> **Dev:** "Greenward's `WildwoodReserves` get a `+10` regen between missions. Where does that go?"
> **Domain expert:** "**Mission State Aspect**'s `tickBetweenMissions(state)` hook — that's the only place where Campaign State mutates outside of a mission run."

## Flagged ambiguities

- "archetype" was used historically to mean both **Base Mode** and a config-defaults bundle — resolved: there is no longer a separate archetype concept. Base Mode picks the engine; defaults live in helper builder functions used by mission authors.
- "rules" was used in field names (`finaleRules`, `sabotageRules`, `greenwardRules`) for what is really **Campaign Config**. New code should use `campaign:` as the field name on `MissionEntry`.
- "Campaign" historically meant the JSON-shape `CampaignDef`. Now it means the runtime **Campaign Extension** — the def-shape collapses inside.
- "Sigil" was reused for Iron Cascade's player-painted ground glyphs in early design — collides with `arcane_sigil` creep type. Resolved: the player-verb term is **Inscription**, the per-shape and per-Inscription names use varied terms (Mark, Glyph, Brand, Rune, Lattice) but the umbrella term is Inscription.
