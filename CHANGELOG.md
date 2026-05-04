# Changelog

## 2026-05-04

### M8 attacker v3 followups: brain tuning, palette costs, faction confirmation

Three fixes after M8 v3 first playtest reported "still Coalition, only 2 towers, T2 sends too strong."

**AttackerDefenderBrain** — new brain id wrapping BalancedBrain with attacker-mode tuning. Default BalancedBrain treats coverage > 1.5× as "good enough, just upgrade now"; the bot would place 2 arcane_bolts that cover most of the corridor and then never place again. New brain bumps `highCoverageRatio` to 5.0, zeroes `panicLives` (the bot's "lives" is the player's 999-leak counter, not real HP), zeroes `maxWallPlacements` (Arcane has no walls), zeroes meta-economy probabilities (no sends/frontier wired in attacker mode), and skips ultimate-save so the bot doesn't hoard 700g for Nova. Bot now keeps placing as long as candidates + budget last.

**Faction confirmation log** — `addBot` runs with the campaign's `creepFaction` (Arcane on M8). The defender brain instantiates with `FACTIONS.arcane.towerIds = ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova']`. To make this verifiable in-game, M8 now logs `Defender: Arcane CPU.` to the event log at scene init.

**Palette cost rebalance** — T2 / T3 sends were dominating: 100e bought 8 Bulwarks or 7 Healers, both nearly unstoppable. T1 (Raider, Skirmisher) felt strictly worse. New costs:
- Wolfpack 8 → 12, Bulwark 12 → 20, Healer 14 → 25, Smoker 9 → 14, Battering Ram 60 → 100.
- Glider 10 → 8 (cheaper since the user reported it weak — flying bypass is situational against any non-mazed corridor).
- Raider 5, Skirmisher 4 unchanged.

100e budget now buys ~20 raiders OR 5 bulwarks OR 4 healers — T2 is a real spend decision instead of a strict upgrade.

### M8 attacker v3: real Arcane CPU brain, full game

The static defender lattice (arrow / cannon / sniper pre-placed at fixed positions, light upgrade ticks on top) was a thin "treadmill" — the player's strategy collapsed to "find the right composition once, repeat." Replaced with a real CPU brain playing a full game on the Arcane kit:

- **No more pre-placed lattice**. `attacker_assault` map clears `preplacedTowers` + `expansionSockets`. The map is empty corridor when the mission starts; the CPU builds everything from scratch.
- **BotAI defender** with the BalancedBrain spins up at scene init. Faction is the campaign's creep faction (M8 → Arcane), so the bot picks from `arcane_bolt / arcane_storm / arcane_focus / arcane_frost / arcane_drain / arcane_meteor / arcane_nova`. It mazes, builds, and upgrades exactly like a human Arcane player would.
- **Economy plumbing**: `addAttackerDefenderGold` now credits the bot's `EconomyManager` via `creditKill`, with the existing `treasuryMult × waveScale` multipliers applied. Wave-start / wave-clear events fan out to the bot too, so its income mirrors a real player's economy.
- **Seed gold**: 300g at scene init, enough for ~6 cheap towers wave 1 before kill-gold starts flowing in.
- The legacy `tickAttackerDefenderUpgrades` upgrade-only picker is no longer called in the attacker update branch; the bot's `tick(delta)` runs in its place. The expansion-socket helper code stays in the file as dead-code-callable (kept for future maps that might still want the static-lattice + sockets mode), but `attacker_assault` doesn't trigger it.

**M8 story** rewritten as a heist: the player is breaking in to steal the meteor archive (a tower they can't yet build), and the defending archmage is on the line in person — building, upgrading, calling in Frost and Mana Drain as needed. "Don't expect the same fight twice."

### M8 attacker: CPU defender now builds new towers; M9: bot ally now actually exists

Two related defender-side fixes.

**M8** was wired with `attackerDefenderDifficulty: 'easy'` which has `maxExpansions: 0` — the static lattice never grew across the run regardless of treasury. Bumped to `'normal'` (1× treasury, up to 2 socket builds). The corridor's 4 expansion sockets now fill in over the run as the defender accumulates kill gold.

**M9 (Allied Circle)** described a CPU partner in its story but didn't actually have one. Campaign missions launch straight into GameScene, bypassing CircleLobbyScene where the bot slot normally gets created — so `botSlots` was empty and the BotAI block never spun up. Added an auto-create path: when archetype is `coop_with_bot` and no `circle` is in the registry, GameScene now constructs a solo-host CircleManager + adds one bot with the player's faction, and the existing BotAI wiring picks it up.

### M5 Warlords: tighter rage timers + speed differentiation

Five Warlords were homogeneous mechanically — all had `channelDuration: 25` and similar `speedMultiplier` values (0.40–0.55). Engaging one effectively meant 25 seconds of buffer before the rage fired, which is plenty even with sloppy DPS. And every Warlord moved at the same crawl, so the player never had to reprioritize based on "who's about to leak."

Tighter timers + per-role speeds:

| Warlord | speed | rage duration |
|---|---|---|
| Stalwart | 0.40 (very slow) | 15s |
| Healer | 0.65 (medium) | 15s |
| Champion | 0.40 (very slow) | 18s |
| Tactician | **0.95 (fast)** | **12s** |
| Captain | 0.50 (slow) | 18s |

Tactician is the standout — almost normal-creep speed, the shortest rage window, and their rage hastes everyone alive. The player now has to either burn them down on sight or eat a fast wave. Stalwart and Champion remain anvils. Captain stays the capstone but loses 7s of grace.

Description updated on Tactician to call out the speed.

### LoadingScreen Begin button: pointer-events fix

The button rendered fine but couldn't be clicked — no cursor change on hover, no click response. Root cause: `#ui-root` carries `pointer-events: none` by default, only flipping to `auto` when a screen marks `.active`. UIBridge.startScene() clears `.active` before the LoadingScreen mounts (the loading screen lives in the gap between screens), so the entire loading overlay was inside a `pointer-events:none` container.

Children with `pointer-events: auto` should still receive events through a `pointer-events:none` parent, but in practice the button wasn't being hit. Forcing explicit `pointer-events: auto` on the LoadingScreen's outer div fixes both the hover cursor and the click handler.

### LoadingScreen Begin button — actually waits forever now

Two bugs in the campaign-mission loading flow:

- 10-second safety timer auto-dismissed the screen even when `requiresContinue=true`, defeating the purpose of the Begin gate.
- 800ms min display time meant the loading bar barely showed before the button appeared (effectively skipping the loading-bar phase).

Fixed:
- Safety timer skipped entirely when `requiresContinue` is set. The screen now genuinely waits forever for the player's click.
- Min display time bumped to 1500ms so the loading bar always animates fully at least once before the button can appear.
- Button visibility now gates on BOTH `sceneReady` AND min-time elapsed, so the loading bar always plays through before the Begin button takes its place. Previously the button could appear in <100ms on fast scene loads, making clicks silently no-op until 800ms had passed.

### Attacker mode economy v3 — temporal pressure + investment loop

After the Defender-Prep playtest the mode still felt static — every wave was a one-shot decision with no consequence carrying forward. Adding a real economy curve so the player has to make timing decisions across the run.

**Four mechanics ship together:**

1. **Reinforcement Camps** — new line item in the composer. 50e once → +15e to every subsequent wave's income, max 2 camps. First-wave question: build a camp (skip offense to compound income) or push hard now? Camps persist across waves; once built they can't be refunded.

2. **Income growth + carryover** — wave-1 income is 80e; each wave's cap rises by 12e (W10 cap = 188e). Unspent essence rolls forward, capped at 2× the current wave's income. Saving for a boss wave is now a real strategy. Composer header shows the breakdown: `income 92 + saved 70 = 162/180`.

3. **CPU treasury wave-scaling** — defender treasury earns +10% per wave the player has been alive (×1.0 W1 → ×2.0 W11). Stalling forever is no longer free; the lattice gets meaner the longer you sit on essence.

4. **Burst spawning** — attacker `spawnInterval` dropped from 150ms floor to 60ms floor. A 15-raider wave now flushes through in ~1s of charging column instead of a 9s trickle. Defender splash and slow towers actually matter; small-creep swarm comps are viable.

**Composer config refactor** — `AttackerComposer` constructor now takes either a number (legacy) or an `AttackerEconomyConfig` object. New mission overrides on `MissionOverrides`: `attackerEssenceGrowthPerWave`, `attackerEssenceCarryoverMult`, `attackerCampMax`, `attackerCampCost`, `attackerCampIncome`. M8 wired with the v3 numbers above.

9 new tests for carryover + camps + economy curve. Total 530 passing.

### Attacker v2 Phase 2.5: Defender Prep + composer compaction

After M8 first playtest the strategy collapsed into "always send boss + healer + bulwark" because the defender lattice was static. Adding a per-wave **Defender Prep** axis: each wave the defender announces what they're countering, and creeps of that type take a real HP penalty for the wave. Player has to rotate composition every 1-2 waves instead of finding one solved combo.

**Five prep types** (`src/data/AttackerPreps.ts`):
- **Sustained Fire** — all creeps -15% HP (broad pressure intro)
- **Anti-Light** — light-armor creeps -35% HP (Skirmisher/Wolfpack/Smoker/Glider)
- **Anti-Medium** — medium creeps -35% HP (Raider — single-target hit)
- **Anti-Heavy** — heavy creeps -40% HP (Bulwark/Healer/Battering Ram)
- **Anti-Air** — flying creeps -65% HP (Glider — hard counter)

Prep applies as an HP multiplier on the per-group `hpScale` at wave-build time. Player sees the prep in the composer header (red banner with the description) and per-card red badge with the percentage on countered creeps BEFORE composing. They route around it.

M8 ships a **10-wave prep order**: cycles all 5 preps with no two adjacent waves the same. Wave 1 is Sustained Fire (gentle); the order escalates through Anti-Heavy → Anti-Light → Anti-Medium → Anti-Air across the early waves so the player encounters every prep within the first half of the mission. Future faction attacker missions can ship their own prep order via `MissionOverrides.attackerPrepOrder`.

### Composer UI compaction

Phone overlay was overflowing the visible area with 8 creep cards + wagon + abilities. Tightened all paddings (10→8 / 6→3), shrunk creep card to a single row (description moves to the title attribute / hover tooltip), button sizes 24→22, fonts 12→11. Hard-capped to `60vh` on phone with internal scroll. The full panel including header, palette, wagon row, ability tray, and footer now fits comfortably in roughly half the screen on a 412×915 phone.

11 new tests (AttackerPreps math + M8 prep order). Total 521 passing.

## 2026-05-03

### Attacker v2 — Phase 2 + Phase 3 (abilities, wagons, smart CPU)

Lands the rest of the v2 plan from `notes/campaign-game-modes/09-attacker-v2-spec.md`. Player gains abilities + a mode-specific kit item; defender becomes adaptive.

**Phase 2 — abilities, wagons:**
- New `AttackerAbilities.ts` registry (mirrors ChannelEffects). Three v2 abilities: **Frenzy** (next-wave creeps move 2× speed), **Smoke Screen** (defender towers blinded for 5s at wave start), **Power Surge** (next-wave creeps gain +50% HP). Each has a wave-cooldown (3/4/3); composer ticks cooldowns down on `resetForWave`.
- `AttackerComposer` extended with ability slots (`{def, cooldownRemaining, queued}`) + `toggleAbility / commitQueuedAbilities`. Effects dispatch at Send-Wave time so the wave's spawned creeps inherit the buff.
- **Anti-magic Wagon** kit item — pre-wave, the player can spend essence (25e/wagon, max 2/wave) to grant the first N spawned creeps a 2-hit shield. New `Creep._wagonHits` field; `takeDamage()` short-circuits while shield > 0. `SpawnManager` reads `scene._pendingWagonCount` (set at Send Wave) and stamps the shield on each new creep.
- UI: `AttackerComposerOverlay` adds a wagon spinner row + an ability tray (3 buttons with cooldown indicators + queued highlight). All gated through `GameUIStore.requestAttackerAbilityToggle / WagonAdjust`.

**Phase 3 — smart CPU:**
- New `CpuDefender.ts` with a hand-tuned counter table for `(towerId, creepType)` pairs. `arrow` strongly prefers fast/swarm/evasive; `cannon` prefers swarm/armored; `slow` prefers fast; `sniper` prefers boss/regen/armored. 11 tests pin the math.
- `pickUpgradeTarget` combines a level-inverse base score (low-level catches up) with the counter multiplier vs the upcoming wave. Replaces the v1.5 lowest-level-first picker.
- **Expansion sockets** — `MapDefinition` gains `expansionSockets[]`. The CPU may build new towers on these as treasury accumulates, picking the counter-best affordable tower from each socket's allowedTowerIds. Path is recomputed + creeps reroute on placement. `attacker_assault` ships with 4 sockets staggered along the corridor.
- **Difficulty curve** — new `attackerDefenderDifficulty: 'easy' | 'normal' | 'hard'` on MissionOverrides. Easy = 0.5× treasury, no socket builds (M8's first-encounter setting). Normal = 1× + 2 builds. Hard = 1.5× + 4 builds. Treasury multiplier applied at `addAttackerDefenderGold` so downstream code stays simple.

**M8** runs `attackerDefenderDifficulty: 'easy'` so the first attacker encounter doesn't include socket builds; later faction campaigns will tune up. CHANGELOG note for this slot is in the "v2 polish" entry below.

### Attacker v2 polish: hide dock, mobile layout, M8 threshold tune

Three fixes after first M8 v2 playtest.

**Dock hidden in attacker mode** — `TowerDockDOM` returns null when `matchMode === 'attacker'`. The player isn't placing towers, the dock was dead chrome that overlapped the composer overlay.

**Sidebar trims WAVES + ECONOMY in attacker mode** — `GameSidebar` hides those two panels (gold counter is meaningless, upcoming-wave previews are stale until the player composes). MISSION + tower/creep info panels remain.

**Composer mobile layout** — on phone the overlay now occupies the full top row (left:8, right:8) instead of being clipped at right:12 with a 320px width that overflowed under the sidebar. Desktop is unchanged.

**M8 threshold + star tune** — at 100e/wave the player can dump ~20 raiders in a single wave, so the v1 default 5-leak threshold gave instant-win on round 2. New `attackerLeakThreshold` per-mission override; M8 set to 12. Stars switch from leak-count (capped by instant-win) to wave-count: ★★ = win in ≤6 waves, ★★★ = win in ≤4. Rewards composer efficiency.

### Attacker mode v2 — Phase 1 (composer + palette)

Phase 1 of the Plan 12 v2 spec at `notes/campaign-game-modes/09-attacker-v2-spec.md`. The player composes each wave from a palette by spending a per-wave essence budget — no more reusing standard waves where the player commands creeps but doesn't pick them.

**Engine** — three new files in `src/systems/attacker/` and `src/data/`:
- `AttackerPalettes.ts` — 8-entry Coalition palette: Raider (5e), Skirmisher (4e), Wolfpack swarm (8e), Bulwark armored (12e), Healer regen (14e), Smoker evasive (9e), Glider flying (10e), Battering Ram boss (60e). 100e per wave produces ~10-20 raiders depending on mix.
- `AttackerComposer.ts` — per-wave pick state (Map<creepType, count>), budget tracking, listener pattern for UI subscribe. `adjust(creepTypeId, delta)` clamps to budget + zero. `resetForWave(budget)` between waves.
- `AttackerWaveBuilder.ts` — pure function: `(picks, waveNum) → WaveDefinition` with hpScale/speedScale curves matching the standard generator.

**UI** — `src/ui/game/AttackerComposerOverlay.tsx` (Preact). Top-right overlay; appears when `GameUIStore.attackerComposer` is set. Header shows "COMPOSE WAVE N" + budget bar (teal→violet gradient). Palette cards with +/- buttons disabled when budget exhausted. Footer Clear + Send Wave buttons. Mounted in App.tsx alongside GameSidebar.

**GameScene wiring** — `attackerComposer` field initialized when mission supplies `attackerEssencePerWave`. Subscribe pushes snapshot to GameUIStore on every adjust. Send Wave overrides `waves[currentWave]` with the built wave then calls `startWave()`. `onWaveCleared` resets composer for next wave (which fires the snapshot push). Generic Next-Wave button / SPACE blocked while composer is active — wave only starts via Send Wave.

**M8 (Breach the Relay)** updated: `attackerEssencePerWave: 100`, `attackerPaletteFaction: 'coalition'`. Star objectives unchanged (8/12 leaks for stars 2/3).

Phase 2 (abilities + lane choice + mode-specific kit items like Mana Drain → Anti-magic Wagon) and Phase 3 (smart CPU + per-faction polish) are queued per the spec.

## 2026-05-02

### Hero Defense art PRDs 01-03 — procedural pixel-art generation

Three PRDs from `notes/art_prds/` shipped as Python generators + engine wire-up. All in the in-house pixel-art style (28 px scale, 1 px outlines, 3-color blob palette, NEAREST filter, no AA), matching existing terrain tilesets / structures / creep death animations. Hand-pixel polish remains a future option without changing engine consumers.

**PRD 01 — Arena floor tileset** (`scripts/generate_arena_floor_tileset.py`). 11 sheets, 448×56 each (16 cols × 2 rows × 28 px). Row 0 = 12 ground variants + 4 accents (rune / gem / dots / pip); row 1 = 16 alpha-PNG faction prop tiles (crystal / cog / blob / skull / chip / etc). Engine consumer: new `ArenaFloorRenderer` paints tiles into a `RenderTexture` once at depth -100; deterministic per-cell so layouts are stable across replays.

**PRD 02 — Per-faction HD base** (`scripts/generate_hero_base_sheets.py`). 11 sheets, 112×700 each (5 vertical damage frames × 112×140). Each frame's silhouette is a faction-specific shape (arch + spire / smelter + chimneys / tree shrine / floating shard / bunker / hive / server stack / altar / pillar / glass orb / tuning fork). Damage states reuse the silhouette and add cumulative chip-pixels / scorch / crack-lines / knock-out regions per level. New `ArenaBase` sprite class swaps frame on baseHp threshold (100/85/60/35/10/0 = frames 0-4). Replaces the legacy procedural blue rect when art loaded.

**PRD 03 — Hero ability VFX** (`scripts/generate_hero_vfx_atlas.py`). 12 sheets v1: arcanist (mage) / ranger / paladin × Q / W / E / R. 384×64 each (6 frames × 64×64). 18 fps anticipation→peak→decay cadence. Four archetypes assigned per ability: `burst` (single-target hit spikes), `ring` (expanding AoE), `aura` (centered self-cast rays), `beam` (vertical beam + ground flare). New `spawnHeroAbilityVfx()` helper, called from `Hero.useAbility` at the resolved impact location. No-op when sheet not authored — procedural FX continue to play.

`createHeroAbilityVfxAnimations()` registers play-once `repeat: 0` anims with the same defensive backstop timer as creep death animations (1.5× duration in case `animationcomplete` is dropped). All systems gate behind asset existence checks so missing files fall through to the procedural fallback.

### Post-mission UX + in-mission star tracker + leak-sprite bug

Three campaign-flow features in one batch.

**Post-mission flow → campaign lobby + Next Mission CTA**. Per user: "We need to drop the player back in the campaign menu after they finish a campaign match, ideally some sort of lobby where they can press yes and go to the next campaign level." GameOverScreen now detects mission runs and renders a star reveal block + per-objective met/unmet rows + mission-flow buttons. Won + has-next: "Next Mission →" is the primary CTA. Won + last: "Campaign Lobby" is primary. Lost: "Retry Mission" is primary, lobby + menu fall-throughs always present.

**In-mission objective tracker (sidebar MISSION panel)**. Per user: "I'd also like to see the things that give me stars throughout the mission and how I'm doing in realtime. Maybe a mission tab beside waves." New `MissionPanelDOM` renders inside `GameSidebar` above WAVES on campaign runs. Each frame GameScene pushes the live state of every star objective by evaluating its predicate against an "if I won this instant" snapshot — lives, sends bought, hero hp, attacker leaks, etc all tick the tracker live. Star icons fill / unfill in real time. Default-open on campaign runs so the player sees objectives without an extra tap.

**Bugfix: leaked creep sprites orphaned**. User report: "creeps I leaked got about halfway before my lives counter went down and they stopped moving but their sprites are still there." Root cause: `CreepManager.update`'s leak-processing loop ran the leak handler and marked `creep.alive = false` but never destroyed the sprite. Normal end-of-path leaks (Creep.update sets reached=true AND destroys sprite) were fine, but the wave-stuck recovery path (`forceLeakAllAlive` from `WaveController`) only sets `reached = true` — sprite was orphaned. Fixed: leak loop now destroys any lingering sprite on the leaked creep.

### Campaign mode now always available (level 1)

User feedback: a fresh player should be able to dive into the Arcane campaign immediately rather than grinding to level 7 first. Campaigns ARE the polished onboarding path into the faction content, not a late-game reward. Drops `MODE_UNLOCK_LEVEL.campaign` from 7 → 1.

### Bugfix: parallax v2 high-res silently overwritten by sheet slicer

Discovered while investigating "the parallax in `public/assets/arcane/` isn't the new stuff." Cause: `slice_high_res_art.py`'s `slice_parallax` step writes to the same output paths as `import_parallax_v2.py` (`{faction}_parallax_{far,mid,fore}.png`), so any time the slicer ran (e.g. for splash imports) it silently re-overwrote the high-res with low-res slices from `image_c.png`.

Fix: `slice_parallax` now skips any faction whose bespoke `parallax/parallax_<faction>_far.png` exists in the v2 source folder. `import_parallax_v2.py` retains exclusive ownership of those files for delivered factions; the sheet slicer continues to handle the 7 not-yet-delivered factions. Re-imported high-res for arcane / mech / nature / void; WebP refreshed.

### Mechanical campaign — 10 missions, Iron Cascade

Second complete campaign. Player fights AGAINST Mechanical across 10 missions; completing it unlocks playing AS Mechanical (alternate route to the Shards spend in the faction tree). Mechanical is a tier-1 unlock.

Mission lineup leans on the new Plan 11/12/13 archetypes:
- M1 Perimeter Breach — Standard with basic-kit restriction
- M2 Supply Road — Standard 15 on serpentine
- M3 The Depot Raid — **Heist** (steal back captured ordnance)
- M4 Foundry Siege — **Base Defense** (factory under all-sides assault)
- M5 Iron Convoy — Boss Rush (5 walker bosses)
- M6 First Light — Speedrun (20 waves before they mobilize)
- M7 Rationed Steel — Frugal (6 towers, half gold)
- M8 Assembly Strike — **Attacker** (we strike their fortified line)
- M9 The Ace — Hero vs Boss (Engineer vs the rival mech ace)
- M10 Cascade Terminus — Final Showdown (30 waves at the core foundry)

Tone is grimdark warhammer / war-machine — smoke, gears, oil, iron — counterpoint to Arcane's medieval-fantasy register. Reuses existing shared maps + the new archetype-default maps for the three new archetype missions; bespoke mech-tileset maps land in a follow-up.

`mechanical.test.ts` covers shape + registry + predicate behavior (15 new tests, mirrors arcane.test.ts).

### Bespoke mobile splashes — 10 of 11 factions

Artist drop in `resources/high_res_art_v2/splash_mobile_<faction>.png` (1530 × 2720, 9:16 aspect, hand-authored portrait composition rather than landscape center-crop). 10 factions delivered (everyone except void, which continues to auto-crop from the landscape source until its bespoke version lands).

Slicer update: `scripts/slice_high_res_art.py` now prefers the bespoke `splash_mobile_<faction>.png` if present, and falls back to center-cropping the landscape splash for any faction without one. Output filename + engine consumer paths unchanged — drop-in for `FactionUnlockSplash`, `LoadingScreen`, `CampaignLobbyScreen`.

WebP refresh: bespoke 4.5MB sources compress to ~200KB on average (~5% of original). Total mobile splash bundle: 4.3MB across all 11 factions.

### Bugfix: hero_vs_boss campaign missions never spawned a boss + ended early

User report: "In campaign, hero defence mode mentions 5 waves then boss. I never got the boss, and the wave 5 ended with creeps still in the hero area but says victory."

Two distinct issues, both fixed:

1. **No boss spawned**. The `hero_vs_boss` archetype defaulted to a 5-wave standard script. Wave 5 isn't a boss wave under the standard wave generator (bosses fall on multiples of 10), so the player got a regular wave instead. Fix: when a mission's archetype is `hero_vs_boss`, GameScene mutates the LAST wave of the generated script to a single-creep boss wave at 1.4× hpScale. The existing engine handles the boss flag transparently from there.
2. **Premature victory**. The wave-clear gate checked `this.creeps.length === 0` (path creeps) but ignored arena creeps in HD mode. With 10× creep spawn density and a hero mid-fight, the path drained while the arena was still busy → false victory. Fix: the gate now also waits for `arenaManager.arenaCreeps.every(c => !c.alive)` when an arena exists.

### Bugfix: dead creeps could persist indefinitely (sprite cleanup race)

User report: "lots of dead creeps with their art still just hanging around, no death animation or anything, just them there forever."

`playCreepDeath` relied solely on `sprite.once('animationcomplete', destroy)` to clean up the corpse. Phaser 4 has documented edge cases where the event is swallowed (scene transitions, sprite re-targeted, animation interrupted) — the corpse then lives forever. Fix: in addition to the listener, schedule a backstop `delayedCall` at 1.5× the natural animation duration. The two race; whichever fires first destroys the sprite, the second is a no-op.

### Plan 12 v1 polish — attacker HUD swap + intro hint

The 999-lives counter was misleading in attacker mode (the player WANTS leaks). Three changes for clarity:

- **`GameUIState.attackerProgress`**: new field `{ leaks, threshold } | null`, populated each frame by GameScene when `matchMode === 'attacker'`.
- **StatusBarDOM**: shows "Breakthrough: 2/5" instead of "Lives: 999" in attacker mode. Color flips to green once threshold met (player knows they can stop pushing).
- **Intro hint**: gameMessage event-log entry fires once at attacker-mode game start: "Attacker mode — you command the creeps. Get N through the defense to win." Persistent in the log so a player who misses it on first wave can scroll back.

### Faction tree backdrop dim 48% → 25%

Per user — the dark scrim behind the faction-detail modal was still too heavy after the v1 reduction. Dropped from `rgba(8,6,14,0.48)` to `rgba(8,6,14,0.25)`. Modal text contrast is preserved by the modal's own `--bg-surface` panel and border.

### CampaignLobbyScreen — faction keyart hero background

Wires the `_big_no_text` art delivery (`{faction}_keyart.webp`) into the campaign sub-scene lobby as a fixed-position background. Heavy radial vignette layered over it keeps the mission-card text readable. Falls back to the existing flat dark background for factions without keyart yet (psionic, harmonic, infernal, military, aliens, cypherpunk, celestial — until those land in the v2 parallax delivery). Currently visible on Arcane, Mechanical, Nature, Void.

### High-res parallax v2 import — arcane / mech / nature / void

Artist drop in `resources/high_res_art_v2/parallax/`. 6 files per faction (4 of 11 delivered so far). New `scripts/import_parallax_v2.py` routes them to the right engine slots:

| Source | Destination | Purpose |
|---|---|---|
| `parallax_<faction>_far.png` | `<faction>_parallax_far.png` | parallax background — strict upgrade (2040×708 vs v1's smaller slice) |
| `parallax_<faction>_mid.png` | `<faction>_parallax_mid.png` | parallax mid — RGBA, composites cleanly |
| `parallax_<faction>_fore.png` | `<faction>_parallax_fore.png` | parallax foreground — auto-luminosity-mask if shipped as RGB so dark regions don't block lower layers |
| `parallax_<faction>_big_no_text.png` | `<faction>_keyart.png` | NEW slot — square hero art (2040×1812) reserved for CampaignLobby / FactionTree detail panels |

Skipped: `_big` (text overlay, baked-in title) and `_composite` (pre-flattened, no current consumer). Both stay under `resources/` as design references.

**RGB → alpha auto-mask**: arcane and mech delivered the fore layer as opaque RGB which would block the mid+far layers when stacked. The importer applies a luminosity → alpha conversion (Rec.601 luminance × 1.4 bias) so dark sky/void becomes near-transparent while embers/crystals stay readable. Nature and void shipped as RGBA already and are copied straight through.

**WebP refresh**: `_keyart` added to the convert script's pattern list. Re-running `convert_assets_to_webp.py` now produces 4 new `_keyart.webp` files at ~90-120KB each (down from ~3.6MB PNG).

`FactionTreeScreen.FactionParallax` consumes the new files transparently — same paths, just higher quality. Keyart slot is staged for future wiring (next likely consumer: CampaignLobby hero background).

### Faction art loading speed — WebP conversion (95% size reduction)

User reported faction images and splash screen loading slowly. Cause: the high-res v2 art delivery shipped 2MB landscape splashes + 800KB emblems as PNG. New `scripts/convert_assets_to_webp.py` bulk-converts every `_splash` / `_splash_mobile` / `_emblem` / `_parallax_{far,mid,fore}` PNG to WebP at q=82.

**Conversion impact**: 42.7 MB → 2.1 MB across 11 factions (4.9% of original size). Per-faction breakdown roughly: splash 2MB → 100KB, emblem 800KB → 50KB, parallax bundle 600KB → 25KB.

**Component switch**: `FactionEmblem`, `FactionUnlockSplash`, `LoadingScreen`, and `FactionTreeScreen.parallaxSrc` all now point at `.webp` paths. WebP is universally supported in the target browser matrix (Chrome, Edge, Firefox 65+, Safari 14+, Capacitor WebView). PNG sources stay on disk as a defensive fallback for one release; cleanup PR after WebP ships verified.

**Preload helper**: `src/ui/utils/preloadFactionArt.ts` — when the player picks a faction in `FactionSelectScreen`, fire-and-forget `<img>` prefetches for `_splash.webp`, `_splash_mobile.webp`, and `_emblem.webp` warm the browser HTTP cache. By the time they reach LoadingScreen / FactionUnlockSplash a few clicks later, the art is decoded and renders instantly.

**Other tweaks**: `decoding="async"` added to FactionEmblem `<img>` so emblem decode happens off the main thread. Existing `loading="lazy"` retained — emblems in card lists shouldn't block initial paint.

**Verification**: 440/440 vitest pass, tsc clean. `FactionEmblem.test.tsx` updated to assert WebP path.

### Plan 12 v1 — Attacker mission archetype (pre-placed defender towers)

Roles reverse: the player commands the creep waves and the map ships with a fixed defender lattice. v1 implementation per the roadmap — bespoke `attacker_assault` map with hand-placed Arrow/Cannon/Sniper/Frost-Trap towers along a central corridor, the player can't build, and the win condition flips at end-of-waves.

**`MatchMode` extended**. Added `'attacker'` to the union in `WaveDefinitions.ts`. `getWavesForMode` calls `generateStandardWaves(waveCount ?? 10)` for it — same wave script as Standard, the asymmetry comes from the inverted player role rather than the spawn pattern.

**`MapDefinition.preplacedTowers`**. New optional field: `Array<{ col, row, towerId }>`. Loaded after `TowerManager` init when `matchMode === 'attacker'`; each entry calls the same placement path a player would, but skips gold cost and faction gating (they're authored fixtures). The lattice for `attacker_assault` is 10 towers — Arrow pairs flanking the corridor for chip damage, Cannon mid-corridor for splash, two Sniper anchors at long range, and a Frost-Trap pair to slow boss waves through the kill zone.

**GameScene attacker hooks**:
- `lives = 999` so the existing zero-lives game-over check doesn't fire prematurely (the player WANTS leaks to happen).
- `tryBuildTower` early-returns — no player tower placement.
- Wave-complete branch flips: if all waves cleared and `creepsLeaked < ATTACKER_LEAK_THRESHOLD_DEFAULT (5)`, that's a defeat ("Defenders held"). At or above threshold = victory ("Breakthrough"). Threshold is a constant for v1; mission overrides will be threaded through `MissionContext` later.
- `Analytics.gameEnd` and `PlayerProfile.awardGameEndXP` read `lives > 0` which correctly reports defeat (we explicitly zero lives in the under-threshold branch) or victory (lives stays at 999).

**Archetype unstubbed**. `MissionArchetypes.attacker` now points at `attacker_assault` with `baseMode: 'attacker'`, 10 waves, normal difficulty. `CampaignDef.test.ts` updated to assert the new shape (was asserting the stub remained).

**Out of scope for v1** (per the plan):
- Dynamic AI defender via `BotAI` on `this.grid` — the plan v2 work, won't ship until creep-buff palette is also designed.
- Essence-bought creep buffs / send composition picker — the player still gets standard "Z" sends, but a richer per-faction creep palette is the v2 piece.
- Standalone top-level Attacker mode in the menu — campaign-only until data justifies promotion.

**Verification**: 440/440 vitest pass, tsc clean.

## 2026-05-01

### High-res art v2 + parallax delivery + LoadingScreen splash

Second drop of bespoke art replacing the v1 lower-res files. Same engine slots, higher fidelity, plus a net-new parallax delivery.

**v2 files at `resources/high_res_art_v2/`**: 11 individual splash PNGs at 2164×816 (4× v1's 541×204), one 5016×5016 emblem reference sheet (4× v1's 1254×1254), and a brand-new 6144×4096 `image_c.png` parallax sheet containing all 33 layer cells (11 factions × Far / Mid / Fore).

**`scripts/slice_high_res_art.py` updates**:
- Reads from `resources/high_res_art_v2/` first, falls back to v1 if v2 isn't present.
- Splash files copy directly with `mech → mechanical` name normalization.
- Emblem cell boundaries auto-detected on the new 5016×5016 sheet (gutters between bright crests on dark background).
- Parallax cells sliced from `image_c.png` with hand-tuned y-bands. Discovered the top and bottom rows have different label conventions (top is image-then-label, bottom is label-before-image) so the boundary tables are kept separate.
- 11 splash + 11 emblem + 33 parallax PNGs land under `public/assets/{faction}/`. Engine slots (FactionEmblem, FactionUnlockSplash, FactionTreeScreen) consume the new files transparently — same paths as v1.

**LoadingScreen now uses faction art**. Per the user's request: while GameScene loads, the player's faction splash key art renders as a 35%-opacity background layer with a radial vignette over it for text readability. Self-hides on load failure or for meta factions (`chaos` / `random`) — the existing radial gradient mood lighting remains as the universal fallback.

**Two critical bug fixes shipped alongside**:
- **MissionRunner faction default → `arcane`**. Plan 14 v1 Arcane campaign missions launched with `faction: null` because the mission overrides didn't specify a player faction. GameScene fell back to the generic Arrow/Cannon/Sniper/Frost-Trap pool. Default to Arcane (every player has it as the free root); long-term, a pre-mission faction picker UI replaces this.
- **Wave-stuck auto-recovery after 30s**. `WaveController` now fires `onStuckForceClear` if a wave has been active >30s with no spawning, no sending, but creep count > 0. `CreepManager.forceLeakAllAlive()` marks every alive creep as `reached`, routing them through the existing leak handler. Player loses lives proportional to the leaks but the wave clears; previously a single mis-pathed creep could hang the entire match indefinitely (which is what the user hit).

**Verification**: 438/438 vitest pass, tsc clean (client + server).

## 2026-04-30

### Art-pass extraction + Plans 11 / 13 v1 (Base Defense + Heist) + art PRD

**Art-pass extraction.** A single 1536×1024 composite art-pass file (`resources/composite_art_theme.png`) sliced into 55 individual PNGs across `public/assets/{faction}/`. Per faction: `{faction}_emblem.png` (A1 row), `{faction}_splash.png` (A2 row), and a 3-layer parallax set `{faction}_parallax_far/mid/fore.png` (A3 grid). The composite's columns aren't aligned identically across rows — A1 emblems were detected by scanning for dark gutters between the bright crests, A2 splashes were hand-tuned (designer used wider cells on the left half / narrower on the right), A3 parallax was even-spaced from x=85..1528 because of the LAYER-label gutter on the left. Slicer lives in `scripts/slice_art_pass.py` and is regenerable.

**FactionEmblem** now PNG-first with SVG fallback. Renders `/assets/{faction}/{faction}_emblem.png` as an `<img>` with a CSS `grayscale + brightness` filter for the locked state. If the image fails to load (offline / missing / `chaos` / `random`) the component falls through to the procedural SVG glyph from before so the tree never shows a broken-image icon.

**FactionUnlockSplash** layers the per-faction splash key art behind the existing emblem + identity copy. Width-clamped to `min(90vw, 720px)`, blurred 0.5px and saturated, with a darkening radial vignette over it for text legibility. Self-hides the `<img>` on load failure — splash falls back to the radial-only mood lighting.

**FactionTreeScreen** layers in the focused faction's 3-layer parallax (far / mid / fore) when a node is selected. Pan rates per the PRD A3 spec — far at 240s/cycle, mid at 120s, fore at 60s, all with `repeat-x` / `cover` for any viewport size. The default starfield still renders when no node is focused; selecting a node fades the homeworld scene in over it.

**Plan 11 — Base Defense (v1)**. Archetype unstubbed. New `base_arena` map: 4 perimeter spawners (N/S/E/W edge midpoints) converging on a single central exit. The center cell is the "base" — a leak there costs lives like Standard. A 3×3 `noBuild` ring around the base prevents arm's-length walling. Corner pillars anchor the arena geometry and stop the player from fully encircling. v2 will add a bespoke Base entity with HP bar, hit-flash, and damage states (Plan 8-style polish); v1 reuses the standard lives counter for shipping speed.

**Plan 13 — Heist (v1)**. Archetype unstubbed. New `heist_vault` map: reverse-direction layout with a vault structure on the east edge spawning creeps westward. Two diagonal walls force a serpentine kill funnel. The signature gold-on-ground mechanic (killed creeps drop pickups; surviving creeps absorb them up to capacity) is deferred to v2 — it needs a new `GoldDrop` entity plus per-creep `carriedGold` plumbing on the Creep base class. v1 ships as a reverse-path Standard variant which still feels distinct from the regular kit.

**Plan 12 — Attacker stays stubbed**. The role-reversal needs net-new engine surface (creep-send picker UI, AI defender driver via existing `BalancedBrain`, win-by-leak condition flip). Tracked separately when that engine work is scoped — flipping a stub on a map alone wouldn't capture the design intent.

**New art_prd.md** in `notes/` — production PRD covering 50+ assets across 6 categories (Faction visual identity, Campaign content, Tutorial / onboarding, Profile / progression, Generic UI, Future Hero Defense). Per asset: code, purpose, dimensions, format, composition spec, animation requirements, acceptance criteria, priority. Recommended 4-wave production sequencing so the asset backlog has a paced delivery cadence rather than 50 simultaneous deliverables.

**Verification**: 438/438 vitest pass (+8 new, archetype tests rewritten for PNG-first behavior with SVG fallback). tsc clean.

### Bespoke Arcane maps + procedural faction emblems + tree polish + unlock splash

Picking up the open deferred items from Chunk A — visual identity for the faction tree and faction-themed maps for the Arcane campaign. Both done procedurally rather than with bespoke art so they ship without an asset pipeline.

**Three new Arcane-tileset maps** (added inline in `Maps.ts` with the `arcane_crystal` terrain theme so blocked cells render as crystal formations):

- **`arcane_outskirts`** — Mission 1 opener. Wide corridor with two offset crystal clusters; soft mazing hint, the player can route around either side.
- **`arcane_pass`** — Mission 6 speedrun. Long winding S-shape from top-left to bottom-right with mirrored crystal walls forcing a serpentine route. Built specifically for time-attack scoring.
- **`arcane_throne`** — Mission 10 final showdown. Three-entry approach (top, middle, bottom) converging on a central crystal nexus + unbuildable dais. Fortified funnel walls before the exit. The throne campaign closer.

The Arcane campaign was updated — missions 1, 6, 10 now reference these instead of `plains` / `serpentine` / `siege`. Other missions still use existing standard maps; bespoke art for those is on the long-tail content track.

**Procedural FactionEmblem component** (`src/ui/components/FactionEmblem.tsx`). Circular SVG crest pulled from the existing primary/secondary colors in `FACTIONS[id]`. Per-faction glyph: Arcane = 4-pointed star, Mechanical = gear, Nature = 3-petal flower, Void = spiral, Military = chevrons, Aliens = hexagon hive, Cypherpunk = bracket-circuit, Infernal = flame, Celestial = sun rays, Psionic = concentric brain-wave arcs, Harmonic = 3-circle network. Stroke-only at small sizes for silhouette legibility; locked variant uses a muted `#444/#666` palette. Hand-drawn art can drop into the same shell later — the emblem signature stays the same.

**Faction tree visual polish**:
- Animated CSS starfield background drifting at 60s/loop with two soft radial color washes.
- Per-tier `↓` dividers between rows so the parent → child topology reads at a glance.
- 2.4s pulsing halo (`box-shadow` keyframe) on every unlockable node so the next available step is visually obvious without a tutorial nudge.
- Each tree node shows its emblem at 56px above the faction name + state badge.

**FactionUnlockSplash** component — full-screen take-over after `attemptFactionUnlock` succeeds. Listens for a new `td-faction-unlocked` window event the unlock flow dispatches. Big 180px emblem with color-tinted drop-shadow glow + 3s glow-pulse animation, faction identity copy, "Begin Campaign" CTA when content is shipped or "Continue" otherwise. Decoupled from the tree screen via the window event so any future unlock surface (campaign-completion route, achievement route) gets the splash for free.

**No bespoke art assets** in this drop. Every visual is procedural CSS / SVG. When real per-faction illustrations and parallax homeworld backgrounds land later, they slot into the same component shells without engine changes.

**Verification**: 431/431 vitest pass (+12 new). tsc clean. Both changelogs updated.

### Mission restrictions enforced + custom counters wired (Plan 14 v1.1)

Cleanup pass on the open deferred items from Chunk A. Two real changes:

**Restriction enforcement**. `noSends` and `noFrontier` mission restrictions were wired into the schema in Plan 10 but had no runtime gates — purchases would silently succeed. Now both the keyboard send paths (`SendPanel` callback) and the DOM-side callbacks (`GameUIStore.onSend` / `onFrontierPurchase`) short-circuit with a "Sends are disabled for this mission." / "Frontier buildings are disabled for this mission." event-log message before the spend hits.

Implementation: `GameModeContext` gained a `missionRestrictions` field. `GameScene` populates it from `missionContext.restrictions` when the scene was launched as a mission. `StandardMode` + `BaseFrontierMode` read `ctx.missionRestrictions?.noSends` / `noFrontier` at the top of every purchase handler.

**Custom counters**. Two new per-mission counters fed into `MissionResult.custom`:

- `sendsBought` — incremented on the existing `sendPurchased` EventBus event. Always-on but only consumed by missions that care (the `sendPurchased` listener was already capturing for LiveCapture, so this is a single extra increment).
- `heroHpMin` — fraction (0..1) sampled once per `update()` frame from `arenaManager.hero.hp / hero.maxHp`. Tracks the lowest the hero ever fell. Skipped when no hero exists.

This lets two Arcane mission star-3 predicates flip from placeholder `() => false` to real conditions:

- **Mission 3 "Hero never falls below 50% HP"** → `r.custom.heroHpMin >= 0.5`
- **Mission 4 "Win without buying any sends"** → `r.custom.sendsBought === 0`

Two other placeholders remain — **Mission 5 "Kill every warlord before halfway"** (needs per-creep distance-traveled tracking) and **Mission 9 "Ally never below 5 lives"** (needs co-op state inspection). Both deferred until the surfaces get the right hooks; players still earn 1-2 stars on those missions via the simpler conditions.

**Verification**: 419/419 vitest pass (+5 new). tsc clean.

### Faction Tree — unlock-via-Shards-and-campaign progression UI (Plan 5)

The visible spine of progression. New `FactionTreeScreen` lets the player see all 11 factions, their unlock requirements, and their current state in the new two-step unlock model. Replaces the previous one-shot Shards spend in FactionSelect.

**Tree shape** (locked with the user in conversation):

```
                Arcane (root, L1, free)
                  /        |         \
        Mechanical (L3) Nature (L3)  Void (L3)         (1000 Shards each)
          /     \         /     \      /     \
      Military Celestial Aliens Infernal Psionic Cypherpunk   (1500 each)
                       \    |    |   /
                       Harmonic (L18, 2000 Shards, requires any 4)
```

**Two-step unlock model**: pay Shards on the tree → unlocks that faction's campaign → beat the campaign → faction becomes playable in every non-campaign mode (Standard, Endless, Battle, etc.). Arcane is the free root and always playable. No rerolls, no refunds.

**State machine** per node (drives the UI badge + CTA):
- `locked_level` — Player Level too low; silhouette + L_ tooltip
- `locked_parents` — parent(s) not yet Shards-unlocked
- `locked_capstone` — Harmonic, needs 4 other unlocks first
- `unlockable` — all gates clear, can spend Shards now
- `campaign_pending` — Shards spent but campaign content not yet shipped (Mech/Nature/Void/specialists at this point)
- `campaign_in_progress` — at least one mission won, not all
- `playable` — Arcane (free root) OR Shards-unlocked + campaign complete OR legacy migration

**Migration safety**: PlayerProfile's legacy migration (Plan 2) was extended — any faction the player already had in `td_store.unlockedFactions` gets pre-marked playable via `legacy_faction_playable.<id>` flags. Veterans keep their full roster on first launch with Plan 5; new players have only Arcane and walk the tree from there.

**Purchase flow** (`attemptFactionUnlock`): checks Shards balance, parent gates, level gate, capstone N-of-any. Switched from legacy `PlayerInventory.ownsFaction` (which still treats `FREE_FACTIONS` of arcane/mech/nature/void/military/celestial as free) to Plan-5-aware `isFactionCampaignPurchased` so the new model wins. Emits `faction_unlock_attempted` / `faction_unlocked` / `faction_unlock_failed` to the existing Plan-1 analytics catalog.

**FactionSelect** rewired — locked factions now tap into the tree screen rather than offering a one-shot Shards spend in place. Cleaner: the tree is the unlock surface, FactionSelect is "pick from your playable factions."

**Menu** now exposes a Factions tile at L3+ (matches the first archetype unlock). Replaces the temporary single-Campaigns tile that Plan 14 v1 used as a stopgap. The tree itself routes to campaign lobbies for any faction whose content has shipped.

New `'faction-tree'` ScreenId. New `src/data/FactionTree.ts` (graph spec). New `src/systems/profile/FactionUnlockFlow.ts` (purchase orchestration). New `src/ui/screens/FactionTreeScreen.tsx` (UI). UnlockGates extended with `isFactionPlayable` / `isFactionCampaignPurchased` / `isFactionCampaignComplete` / `getFactionNodeState`.

**Verification**: 414/414 vitest pass (+25 new). tsc clean. Both changelogs updated.

**Not shipped this plan**: bespoke per-faction emblem art, animated parallax homeworld backgrounds, edge animations between unlocked nodes, audio stings on unlock. Plan 5 v1 ships the structural shell + state machine; the polish art lands as a separate cosmetic-track release. Per-faction welcome splashes also deferred.

### Arcane campaign — first complete 10-mission campaign (Plan 14 v1)

The first piece of campaign content on top of Plan 10's framework. **Arcane Reckoning** — 10 missions where the player commands one of their unlocked factions and fights *against* Arcane creeps + bosses on Arcane-themed maps. Arcane is the free root faction in the Plan 5 tree, so beating this campaign rewards Cores + cosmetics rather than unlocking a new faction. It's the proof-of-concept demo that validates the unlock-via-campaign loop before the Mechanical campaign (Chunk C) lands with real faction-unlock stakes.

**Mission lineup** (v1, no Plans 11/12/13):

| # | Archetype | Map | Notes |
|--:|-----------|-----|-------|
| 1 | restriction | plains | First 4 towers only — soft opener |
| 2 | standard | serpentine | 15 waves, winding path |
| 3 | hero_vs_boss | hero_plains | Arcanist hero vs Archmage NPC |
| 4 | restriction | fortress | No walls allowed (swap-in for Base Defense) |
| 5 | boss_rush | crossroads | 5 boss-only waves on hard |
| 6 | speedrun | serpentine | 20 waves, time-attack |
| 7 | frugal | islands | 0.5× gold, 6-tower cap |
| 8 | standard | spiral | 25-wave siege (swap-in for Attacker) |
| 9 | coop_with_bot | circle_2p | Co-op with bot ally |
| 10 | final_showdown | siege | 30 waves, hard, the closer |

**Star objectives** per mission: 1 star = win, 2 = win + bonus condition (no leaks / fast clear / lives remaining etc.), 3 = stricter condition (perfect run / under N minutes etc.). Stars are monotonic (replays only upgrade). A handful of star-3 predicates are placeholder `() => false` where the underlying counter doesn't yet exist — hero HP-floor tracking, send count, per-creep "killed before halfway" markers. Players still earn 2 stars on those missions via the simpler condition; the 3-star path waits on a counter-instrumentation pass.

**Story tone** is terse-mechanical medieval-fantasy report style. Each mission has ~50 words of narrative — a coalition pushing back against an Arcane invasion in stages. No in-character flourish, no internal canon hardlock — keeps each future campaign's lore self-contained.

**Menu integration**: a new Campaigns tile on `MenuScreen` shows up at Player Level 7 (matches the existing `MODE_UNLOCK_LEVEL.campaign` gate). Opens the Arcane lobby directly. Plan 5's faction tree later supersedes this single tile with the full tree picker.

**Restriction enforcement** in GameScene at the placement gate: `allowedTowerIds`, `allowedFactions`, `noWalls` (filters out `mech_wall` / `mil_sandbag` / `mil_wire`), `maxTowers` (counts non-walls only). Sends + frontier restrictions are wired in the schema but not yet enforced — wired in Chunk C alongside the Mechanical campaign.

**Maps** are existing standard maps (plains, serpentine, fortress, crossroads, islands, spiral, circle_2p, siege, hero_plains). Bespoke Arcane-tileset maps deferred to a polish pass once Chunk C ships and we have content authoring tooling.

**Verification**: 389/389 vitest pass (+15 new). tsc clean on client + server. Both changelogs updated.

### Campaign framework — mission archetypes, MissionRunner, sub-scene lobby (Plan 10)

Foundation for the Arcane / Mechanical / future campaigns. Ships the *invisible* infrastructure — schema, runtime orchestrator, lobby UI, profile state — without any campaign content. Plan 14 (Arcane) and the Mechanical campaign land next as content drops on top of this framework.

**Schema** (`src/data/campaigns/CampaignDef.ts`). A campaign is 10 missions targeting one faction. Player fights *against* that faction in its tileset; beating all 10 unlocks playing AS that faction. Each mission picks a `MissionArchetype` and applies overrides — waveCount, difficulty, starting gold (delta or multiplier), lives, hero, modifier, restrictions (allowedFactions / allowedTowerIds / maxTowers / noWalls / noSends / noFrontier / forceHeroId). Star objectives are predicates evaluated at game-end against a `MissionResult` snapshot (won / wave / durationMs / livesRemaining / livesStart / goldRemaining / goldEarned / towerCount / perfectRun / custom counters).

**Archetype catalog**. 8 v1 archetypes that reuse existing MatchModes:
- `standard` — basic; 15 waves on Normal
- `boss_rush` — 10-wave hard; campaigns swap creep mix at wave-script time
- `speedrun` — 20 waves, time-attack scoring
- `frugal` — 15 waves, 0.5× starting gold, 6 tower cap
- `hero_vs_boss` — Hero Defense base mode, 5 waves
- `coop_with_bot` — Circle Co-op base mode for solo practice
- `final_showdown` — 30 waves, hard
- `restriction` — Standard with allowedTowerIds / noWalls etc.

Plus 3 stubs (`base_defense`, `attacker`, `heist`) reserved for Plans 11/12/13. Stub archetypes refuse to launch; the lobby surfaces them as "Coming Soon."

**MissionRunner** orchestrates a single run. `start(campaign, missionIdx)` resolves archetype defaults + mission overrides into init data, threads a `MissionContext` through `UIBridge.startScene('GameScene', ...)`, and emits `mission_started`. GameScene applies the gold / lives / wave overrides at init and, at game-end, calls `MissionRunner.finalize(result)` — which evaluates star predicates (1 = win, 2 = win + objective, 3 = perfect run), calls `PlayerProfile.recordMissionResult`, and emits `mission_completed` / `mission_failed`. Final mission completion fires `campaign_completed`.

**GameScene threading**. Init signature accepts `missionContext` + `missionGoldStart` + `missionGoldStartMult` + `missionLives`. Mission lives override beats both tutorial mode (99) and DraftModifier overrides. Gold delta + multiplier can both apply (delta first, then multiply by current). Game-end imports `MissionRunner` lazily and calls `finalize` only when the scene was launched as a mission.

**`CampaignLobbyScreen`** — Preact full-screen lobby per faction. Linear 10-mission card list with star ratings (★/☆), archetype badge per card, locked silhouettes (mission N is locked until N-1 has ≥1 star), pre-mission story modal showing the mission's narrative intro + objective list before launching. Completion banner ("Campaign Complete") with the campaign's `outro` copy when all 10 missions are won. Faction color theming pulled from `FACTIONS[id].primaryColor`. New `'campaign-lobby'` ScreenId in UIBridge.

**`PlayerProfile.campaignProgress`** reshaped from `{ factionId → count }` to `{ factionId → { missionIdx → stars } }`. Helpers: `getMissionStars`, `getCampaignProgress`, `getCampaignTotalStars`, `isMissionUnlocked`, `recordMissionResult`. Stars monotonic — replay can never downgrade. Mission N+1 unlocks at ≥1 star on mission N.

**Analytics + server**. New events: `campaign_lobby_opened`, `mission_started`, `mission_completed`, `mission_failed`, `campaign_completed`. Server's per-event dim list extended with `campaignFactionId` + `archetypeId`. Summary `dimQueries` adds `campaignViews` / `missionsByFaction` / `missionsByArchetype` / `missionFailsByFaction` breakdowns.

**Verification**: 374/374 vitest pass (+13 new). tsc clean on client and server.

**Not shipped**: campaign content (Arcane / Mechanical / etc.). Lobby UI gracefully shows "no campaign loaded" if opened without a `data.campaign` payload.

### Tutorial extensions — economy / vs-CPU / JIT / faction briefs / Help carousel (Plan 4)

Rounds out the onboarding surface beyond Plan 3's FTG. New player or returning, every tutorial concept now has a JIT or opt-in track behind it. Per the roadmap user calls: gentle (no drama), real games (not just primer screens), terse voice (no flavor padding).

**Tutorial 2 — Economy** (`tutorial_economy`). Four-wave embedded lesson on Hero Plains in tutorial mode (99 lives, can't fail). Teaches the three income sources in order: kill gold (wave 1), frontier buildings (wave 2), sends (wave 3), synthesis (wave 4). Reached from the ? Help carousel and via an end-of-FTG CTA. No auto-prompt — the user explicitly picked the gentle approach over the wave-4-spike "drama" alternative.

**Tutorial 3 — vs CPU** (`tutorial_vs_cpu`). Real 5-wave Versus session against the existing `BalancedBrain` CPU opponent. Routes through the lobby's existing `startVsCpu` flow via a window flag (`__tutorialVsCpuQueued`) — Lobby auto-runs setup, queues `waveCount=5`, and calls `TutorialManager.queueInGameTrack('tutorial_vs_cpu')` right before scene-switch so the 10s pendingAfterMatchLoad TTL doesn't expire while the player is picking a faction. In-game coach marks cover the three Versus-specific surfaces: sends-go-to-opponent, opponent minimap, ready vote.

**JIT (just-in-time) lessons.** Five new single-step scrimless popovers fired the first time the player encounters each archetype outside of a scripted tutorial: flying creeps (ignore the maze), regenerators (heal between hits), mage creeps (auras buff allies), bosses (cost 5 lives), and leaks (a creep made it past your towers). Idempotent via `PlayerProfile.flags.jit_seen.<concept>`. Suppressed during active tutorial tracks so they don't collide with the scripted lesson. Wired off the existing `creepSpawned` and `creepReached` EventBus events with a `mapCreepTypeToJITConcept` switch.

**Faction briefs.** The old single-line "Key Tip" expanded to a 5-line teaching block per faction: *identity / opener / key tower / what to avoid / how you win*. 11 factions × 5 steps each, terse-mechanical voice — no flavor padding (the picked option). Each faction takes ~30 seconds to read. Auto-fires once per faction the first time it's picked in FactionSelect.

**Skip-all-faction-briefs toggle.** New global persistent setting — when on, every `faction:*` auto-trigger early-returns in `TutorialManager.maybeAutoStart`. Reachable via a checkbox in the Help carousel's "All Tutorials" view. Player can still replay any specific brief on demand. Stored in `TutorialPersistence.skipAllFactionBriefs`.

**Help carousel + basics rewrite.** Replaces the old "?" track-list drawer with a 6-card How To Play carousel — *Mazing / Income / Factions / Modes / Sends / Online*. ≤40 words per card, plain teaching voice. The carousel is the default view; an "All Tutorials →" link swaps to the full replay list. The legacy `basics` track copy was rewritten — the user-flagged "What's Different: Mazing / What's Different: Income" framing dropped (read like marketing), now reads as a normal walkthrough. End-of-`basics` CTA now launches the FTG instead of the longer tutorial_match.

**No new analytics events** — Plan 1's `tutorial_track_started/completed/quit` plus `tutorial_step_seen/completed/skipped` already cover Tutorial 2 / 3 / JIT / brief funnels at the schema level. The new track ids show up automatically in summary `dim:` breakdowns by `trackId`.

361/361 vitest pass (+14 new). tsc clean on client. Server unchanged this plan.

### First Tutorial Game (FTG) splash + slim onboarding track (Plan 3 of progression roadmap)

Replaces the menu-first onboarding with a contained tutorial-game-first flow. Net-new players now see a single splash card before the menu — large **Play Tutorial (~3 min)** button, small **Skip**. Tap Play and you go straight into a 5-minute scripted Arcane round on a single straight-corridor map. Tap Skip and you go to the menu, never re-prompted.

Per the user-flagged "tutorial game mode has too much in it": the new `ftg` track is **mazing + towers ONLY**. Eight steps total — welcome, pick Bolt, place, mazing reveal, pick Bolt again, extend the maze, start wave 1, done. No frontier, no sends, no draft, no economy lesson. Income/sends introduction is deferred to Plan 4's separate `Tutorial 2` (Economy) and `Tutorial 3` (vs CPU) tracks.

The existing longer `tutorial_match` track (covers economy + sends + frontier) is preserved as a Help-menu replay option but no longer the default first-time experience.

Reuses the existing `TutorialMode` (99 lives, +250 starting gold) and the existing `tutorial` map. No new mode or map needed — Plan 3's value is the framing and the slimmer script.

**On FTG complete**: `PlayerProfile.markFirstGameComplete()` sets the `first_game_complete` flag (so the splash never re-prompts on this device) and grants a one-shot 200 XP bonus that crosses L1 → L2 cleanly so the player immediately sees the unlock loop from Plan 2. Quitting the FTG mid-game returns to menu.

**Migration**: legacy players (with `gamesPlayed > 0`) were already pre-marked at Plan 2 migration time as `first_game_complete=true`, so they never see the new splash — they go directly to menu like before.

**Existing `basics` menu walkthrough**: no longer auto-fires on cold boot. Still available via the Help menu's `?` button. The user-flagged "What's Different" framing in basics is left for Plan 4 to overhaul.

Server analytics already sliced `splash_play_tapped` / `splash_skip_tapped` from Plan 1, so the splash decision funnel is queryable from day one.

+10 unit tests covering the FTG track shape (8 expected step ids, no economy steps), `markFirstGameComplete` idempotency, and the migration path. 347/347 vitest pass. tsc clean.

### Player Profile + Player Level + hidden-content menu (Plan 2 of progression roadmap)

Builds the spine of long-term progression. New permanent global Player Level — distinct from the seasonal Battle Pass — gates the modes / maps / future faction-tree unlocks. Per the roadmap's user direction: **hide locked content** in the menu, **keep the faction list visible** (silhouettes come with the faction tree, Plan 5). The player should always see the next thing they're about to unlock.

XP curve is `200 × level` per step. Standard 30 win on Normal = 150 XP. Hard +50%, Insane +100%. First-time faction +50, first-time map win +25. Defeat at wave 5+ awards 10 XP so unlucky runs aren't completely empty. L20 takes ~250–300 games — paced for "always something next week."

**Mode unlock levels**: Endless L5, Hero Defense L8, Essence (Battle) L9, Versus L10, Co-op L12, Gauntlet L14. Career L15 and Campaign L7 are reserved for their own future plans.

**Map unlock levels**: Crossroads L2, Fortress L4, Serpentine L5, Islands L6, Random L6, Gauntlet L8, Spiral L10, Siege L12.

**Cores currency** added (parallel to Shards). Earned in Career mode (Plan 15) — spent on tower-chip upgrades (Plan 16). The hard rule is that Cores are never sold for money. That separation is what keeps the random-chip-token loop from feeling like pay-to-win.

**Level-up modal** — full-screen take-over after each game-end with the new level + the list of unlocks revealed. Same modal handles the one-shot "Welcome back: starting at level X" banner for legacy players migrated from `td_store.gamesPlayed`. Migration is conservative (1 game ≈ 1 level, capped at L20) so nobody feels demoted.

Every analytics event now auto-includes `playerLevel / cores / shards / unlockedFactionsCount` via the player-context hook landed in Plan 1.

**Save format**: new `td_profile` localStorage key, deliberately separate from `td_store`. A Battle Pass season rollover wipes the seasonal slice; the spine of progression survives.

New events: `profile_initialized`, `profile_migrated_from_legacy`, `xp_awarded`, `level_up`, `unlock_revealed`, `menu_locked_tile_tapped`. +30 unit tests on the XP curve + unlock gates.

### Telemetry foundation (Plan 1 of progression roadmap)

Foundation work — every later progression plan depends on being able to measure whether it's working.

Typed analytics catalog (`AnalyticsEvents.ts`) with ~30 event shapes covering game lifecycle, onboarding, mode lifecycle, progression, monetization, encyclopedia, and achievements. New `Analytics.track<E>(name, payload)` typed entry point. Legacy `event(type, data)` preserved for back-compat — existing callsites unchanged.

Every event now carries `platform`, `sessionId`, `ts`, and (after Plan 2) the player-level context. Stripped `undefined` fields before send so the server schema (`string | number | boolean`) stays clean.

New `?debug`-gated `AnalyticsDebugPanel` — fixed bottom-left ring buffer of the last 200 events with filter + copy-as-JSON. Works even when network analytics are opted out, useful for verifying telemetry without a backend dashboard.

Wired the high-leverage events that don't need later plans: tutorial track start/complete + step seen/completed/skipped + quit, Battle Pass XP awards + level-ups + premium purchase + reward claims, `mode_entered` / `mode_exited` with `durationMs`, cold-boot `app_boot`, `menu_view`. Future plans wire their own events at landing time.

**Server side** (`server/src/index.ts`): schema docstring rewritten as a comprehensive event catalog, per-event dimension list extended with `trackId`, `stepId`, `factionId`, `route`, `unlockType`, `category`, `id`, `currency`. The summary + history endpoints now surface 17+ new event types and break down tutorial funnels by track, faction unlocks by route, achievements by id, and purchase mix by currency. Per-event KV cost stays approximately flat — events skip cheaply when they don't carry the dimension field.

## 2026-04-28

### Faction picker: Random renamed to Chaos, new "roll a real faction" Random added

The old `random` faction (rotating tower + frontier pool, 6 random towers each wave from all factions) is renamed to **Chaos**. The new `random` is a UI-only picker token — clicking it on the faction-select screen rolls one of the 11 real factions uniformly (Arcane / Mechanical / Nature / Void / Military / Spawn Aliens / Cypherpunk / Infernal / Celestial / Psionic / Harmonic, excluding Chaos itself) and substitutes the resolved id before any downstream screen sees it.

The motivation: `random` previously meant "play the rotating-pool meta-faction" with no way to ask the game to pick a real coherent faction for you — useful when capturing training data across factions you don't want to choose between, or just for variety.

Single-source resolution lives in `FactionSelectScreen.selectFaction` via the new `rollRandomRealFaction()` helper and the `REAL_FACTIONS` constant on `Factions.ts`. Every place that previously special-cased `=== 'random'` for the rotating-pool mechanic now special-cases `=== 'chaos'` instead — `~30 call sites updated across GameScene, FrontierManager, FrontierBuildings, TowerTypes, PlayerInventory, StoreDefinitions, LobbyScene, CircleLobbyScreen, EncyclopediaScreen, HeroSelectScreen, TutorialTracks, SkinEditorApp, and the matching test fixtures. Map-side `'random'` (for randomly-generated maps) is unrelated and untouched.

For training-data captures the resolution happens before the match starts, so each capture file is tagged with the real resolved faction (e.g. cypherpunk, harmonic) — distribution stays clean against the bot harness.

### Human captures v3: dropped modifier-tainted data, banked one clean Cypherpunk match

User flagged that the previous captures (`mech_games_human.jsonl`, `mixed_2026-04-26_human.jsonl`) predate the modifier-lock fix landed yesterday, so they may have been recorded with a DraftModifier active — distribution-tainted relative to the bot harness which always runs `modifier=null`. Dropped both files.

First clean capture: `cypherpunk_2026-04-28_human.jsonl` — one Cypherpunk match (normal, win at W20). 408 rows, decision mix `place:206 / send:198 / sell:4`. The play was distinctive: send-spam economy in W5–W10 (peaked at 59 standard sends in one wave) followed by a 100+ tower flood in W16–W20 (mostly Pings).

**Did not retrain on it.** Both `--human-weight=200` (CLAUDE.md's <500-rows tier) and `--human-weight=50` produced bit-identical regressions of -7 net cells against the prior committed model:

| faction | best of existing | prior LearningBrain | retrain attempt | Δ vs prior |
|---|---|---|---|---|
| arcane | greedy 50/50 | 50/50 | 49/50 | -1 |
| infernal | synergy 50/50 | 50/50 | 48/50 | -2 |
| cypherpunk | aoe_focus 41/50 | 41/50 | 39/50 | -2 |
| psionic | psionic 18/50 | 2/50 | 0/50 | -2 |
| harmonic | harmonic 47/50 | 45/50 | 45/50 | 0 |
| (other 6 cells unchanged at 50/50 or 0/50) | | | | |

xgboost hit the same local minimum at both weights — the captured strategy is too narrow (single game, single faction, single send type, no frontier) to act as good gradient. Notably it regressed *cypherpunk itself* by 2 cells, which is the canary that the model isn't generalising from this data.

Capture is checked in for the next ingest pass once we have ≥4–5 matches across different factions / strategies. Model on disk is the prior baseline, untouched.

## 2026-04-27

### Balance: Firewall slow 0.35 → 0.50

Firewall's `slowFactor` was 0.35 (creep at 35% speed = 65% slow), one of the heaviest single-source slows in the game. Combined with 35 dps, the beam scales bimodally: a perpendicular crossing deals ~21 damage (fine), but routing the path *along* the beam corridor turns the segment into a 280-damage death zone — broken with clever placement.

Bumped `slowFactor` to 0.50 (50% slow). Beam-along-path damage drops from ~280 → ~196; perpendicular crossing barely changes (~21 → ~17). Still tactically meaningful, no longer a path eraser. DPS untouched for now — re-evaluate after a few sessions.

### Capture-aware Draft: modifiers suppressed when training capture is on

Headless harness runs `modifier: null` for every match in the bot dataset (~515k turns). If a player records gameplay with capture enabled and picks a DraftModifier (Gold Rush +50g, Glass Cannon, Discount, etc.), those rows show up in human captures with state distributions the bot half can't match — the model gradient gets dominated by the no-modifier majority and the modifier dimension carries almost no signal.

Cleanest fix: gate the Draft screen on `isCaptureEnabled()`. When capture is on, replace the modifier picker with a single explanatory card ("Modifiers disabled — toggle capture off in Settings to pick a modifier") and a Continue button that picks `null`. The user can always disable capture if they want to play with a modifier; we just don't pretend those games are useful training data.

If/when the harness grows DraftModifier support and the bot dataset is regenerated 9× to cover each bucket, lift this gate in lockstep. Documented in CLAUDE.md alongside the existing capture-ingest playbook.

### Fix: Firewall (and any tick-based DoT) no-op on high-refresh-rate displays

`Creep.takeDamage` rounded the incoming amount via `Math.round(amount × amp)` and bailed if the result was ≤ 0. On a 60 Hz display the Firewall beam's per-frame damage `35 × 16/1000 ≈ 0.56` rounded to 1 every frame and worked. On a 144/180/240 Hz display, delta drops to ~5–7 ms, per-frame damage drops below 0.5, `Math.round` floors it to 0, and the early-return wiped the entire beam. Same shape would have also hit any direct-fire path that ever fed fractional damage in.

Replaced the `Math.round` step with a per-creep `_dmgDebt` accumulator that flushes only the integer portion each call and carries the fractional remainder forward. Sub-1-hp slivers now accumulate to real damage matching the requested DPS regardless of frame cadence, integer-damage callers are unaffected (debt is already empty so `floor(N + 0) === N`), and displayed HP stays integer-clean. The DoT path (`StatusEffects.getDotDamage`) was already doing this — `takeDamage` is now consistent.

Stripped the temporary `[firewall] hit/tick/linked/no partner` console traces; they did their job.

### Perf: shared creep overlay graphics

Spawning 10–15 sends at once dropped a lot of frames, and the lag persisted while the creeps were just walking — i.e. before any tower was firing at them. The cause was per-creep `Phaser.GameObjects.Graphics` objects: every creep ran `this.graphics.clear()` plus a stack of `fillRect` / `strokeCircle` / `fillEllipse` calls each frame. Phaser's WebGL batcher batches shapes within one Graphics, but each Graphics is its own render entry — 100+ creeps meant 100+ separate draw entries.

Now there's a single shared overlay owned by `CreepManager` (`setOverlay`), cleared once per frame and painted by every living creep via the new `Creep.drawInto(g)` method. Per-creep `graphics` field is gone, along with the `graphics.destroy()` calls in `Creep.update` / `takeDamage` / `killCreepForRevive` / scene-reset paths. Sprite handling is unchanged (Phaser already batches sprites by texture). All 307 tests pass; the headless `_isHeadless` short-circuit still skips draw work entirely outside the browser.

### Non-stacking auras: best contribution wins

`faction_speed_aura` (Aliens Spawner), `commander_aura` (Aliens Swarm Commander), and `overclock_buff` (Cypherpunk Quickener) were applying their buffs via `addOrRefreshTrait`, which is last-write-wins — two overlapping sources would arbitrarily pick whichever ran last in the update loop. Added a `setBestBuff` helper alongside the existing `accumulateBuff`: same per-frame `_setAt = ctx.time` tag, but each subsequent same-frame source keeps the higher `score` instead of accumulating. So a Lv3 Spawner adjacent to a Lv1 Spawner now wins the rate buff for the shared neighbour rather than depending on iteration order.

Left the Conduit `shareAura` / re-emit paths on the old helper — they write to the same trait IDs as the *stacking* direct Resonator/Quickener auras, and converting them in isolation would trigger the per-frame reset mid-frame and clobber stacked direct contributions. Worth a separate cleanup pass on the harmonic-aura plumbing before flipping that.

### Tower dock + info panel UI polish

- **Unaffordable cost text was nearly invisible** (`#664422` on the dim slot). Brightened to `#c89a44` so the player can still read the price tag while the slot itself stays desaturated.
- **Upgrade button always rendered green** even when the player couldn't afford it, leading to mis-clicks that did nothing. Now reads current gold, sets `disabled` plus a new `.action-disabled` style (grey, `cursor: not-allowed`), and the click is gated.
- **Selected tower wouldn't deselect** when the user pressed × on the mobile floating card or collapsed the tower section / opened Economy on desktop — a 250ms info-refresh in `GameScene.update` re-pushed the snapshot every tick and reopened the panel. Added `GameUIStore.requestDeselectTower()` plus an `onDeselectTower` callback that GameScene wires to `enterNoneMode()`, so the inspect mode tears down (range circle clears, selection clears) the moment the user dismisses the panel.

## 2026-04-26

### Live capture: sends, frontier purchases, frontier post-purchase actions

Discovered that `LiveCapture` only recorded tower place / upgrade / sell — sends and frontier buildings were silently dropped, so every human-recorded match was missing entire categories of strategic decisions. Fixed end-to-end:

- **T1 — purchases**: `GameScene` now subscribes to `sendPurchased` and `frontierPurchased` events and forwards them to `LiveCapture.recordAction`. `HumanReplayBrain` translates the captured `decisionRaw` back into `send` / `frontier` decisions when replaying.
- **T2 — frontier management**: New `BotDecision` kind `frontierManage` for post-purchase actions (overcharge / dig / harvest, single-target via `idx` or batch via `defId`). `BotAI` driver dispatches via a new `frontierActionCallback`; `BaseFrontierMode` emits a `frontierActionPerformed` event after each human or bot action; `GameScene` captures it; `HumanReplayBrain` and `HeadlessMatch.applyDecision` both replay it. So the same decision shape now flows through human capture, bot inference, and the headless harness.

Existing recorded data (everything before this commit) is missing these rows — re-record after this lands.

### Sends ROI on Game Over screen + per-wave attribution

Mirror of the Frontier ROI work — sends now have a `Sends Earned` cumulative-gold stat alongside the existing per-wave-rate `Send Income` line, plus a `Sends ROI` percentage. ROI is `(sendsEarned / sendsSpent) × 100`, coloured teal when ≥100% and red when below.

Required adding `sendsEarned: number` to `GameStats`, a `recordSendsEarned()` method on `StatsTracker`, and a per-wave hook in each mode's `onWaveCleared` that reads `incomeMgr.getBreakdown().sends` and accumulates it. `IncomeManager.collectWaveIncome()` also tracks `totalSendsRealized` / `totalFrontierRealized` so future surfaces (mid-match income readouts, leaderboard feeds) can read realised gold per channel without rewiring callers.

### Adjacency auras stack instead of replace

Two Blossoms next to one Resonator now contribute *both* their damage / fire-rate buffs instead of the second one overwriting the first. Same fix for Mana Drain's `spell_amp`. Implementation: per-frame tag (`_setAt = ctx.time`) on the buff trait — first call each frame resets the bucket, subsequent same-frame calls add. TTL still drops the buff if no aura source is adjacent next frame, so coverage holes still penalise the player.

Affects every `adjacency_buff` and `spell_amp` source in the game (Nature Blossom, Arcane Mana Drain, anything else on the same trait id).

### Spore: flat AoE pulse + 2% / 2.5% / 3% scaling poison

Spore (Nature, 100g) clarified and slightly buffed:

- Each fire pulses 8 / 14 / 22 damage to **all** creeps in range (was 5 / 8 / 12 — under-tuned vs other 100g area towers like Acid 100g 8 dmg + splash + shred).
- Poison persists at 2% HP/s base; upgrades now scale to 2.5% (L2) and 3% (L3) — was 2% / 2.3% / 2.6% under default per-level scaling.
- Description rewritten: was "Poisons ALL creeps near tower. 2% HP/s." → "8 dmg pulse to ALL creeps in range every 1.5s + 2% HP/s poison. Upgrades scale poison to 2.5% / 3% HP/s."

Implementation hung an optional `scalePerLevel` field on the `poison_dot` trait (default 0.15 — preserves existing scaling for nature_viper, alien_stinger, alien_acid). Spore overrides to 0.25 to land the 2/2.5/3 cadence cleanly.

### Bug fix: Game Over screen "Frontier Returned" / ROI showed 0g even with steady income

`StatsTracker.recordFrontierEarned()` was only being called for the *bonus* slice (dig-depth, grow-stacks, gamble rolls) returned from `FrontierManager.onWaveEnd()`. Steady-income buildings (Manor, Vault, Sacred Grove pre-harvest, etc.) flow through `IncomeManager.frontierIncome` → `collectWaveIncome()`, which only logged it under generic `goldEarned`. Result: a player could invest 2,250g in steady frontier buildings, earn thousands back over the match, and the stats screen still showed `Frontier Returned: 0g` and `Frontier ROI: 0%`.

Fix: `BaseFrontierMode.onWaveCleared` now reads the `frontier` slice from `incomeMgr.getBreakdown()` before `collectWaveIncome()` and records it as `frontierEarned` separately. ROI calculations now match the gold the player actually earned from frontier holdings.


### LearningBrain v2: one brain, 9/11 normal cells matched (action-value regression)

First end-to-end run of the learning-brain pipeline. Trains a gradient-boosted-tree regressor offline (Python / xgboost) on per-decision (state, action, outcome) tuples captured from the headless harness, then walks the JSON model in pure TS at inference. Single brain that pilots all 11 factions.

**Pipeline:**
- `src/systems/bots/learning/RecorderBrain.ts` — wraps any brain, captures features per decide() without side effects on decisions.
- `scripts/generate-training-data.mjs` — runs each of 10 brains × 11 factions × 20 seeds = 2200 matches, writes ~515k turn rows to `ml/training-data/turns.jsonl` (~17 min wall, sequential).
- `ml/train.py` — xgboost binary-logistic, max_depth=6, eta=0.1, scale_pos_weight (~1.83) for class balance, group-by-match train/val split. Early-stops at ~150 trees. Final val AUC ~0.998.
- `models/brain-q-model.json` (committed, ~585KB) — xgboost JSON dump wrapped in our trainingMeta header.
- `src/systems/bots/learning/TreeInference.ts` — pure-TS recursive walker, ~50 LoC, microseconds per prediction. Handles xgboost ≥3.0's stringified-array `base_score` format.
- `src/systems/bots/brains/LearningBrain.ts` — at decide() time, asks 10 sub-brains for proposals, scores each `(state || action || proposer-id)` through the model, returns argmax-Q.

**v2 validation (n=50 per cell):**

| faction | best of existing | LearningBrain | Δ |
|---|---|---|---|
| arcane | greedy 50/50 | 50/50 | 0 |
| nature | rush 50/50 | 50/50 | 0 |
| void | greedy 50/50 | 50/50 | 0 |
| military | rush 50/50 | 50/50 | 0 |
| infernal | synergy 50/50 | 50/50 | 0 |
| celestial | greedy 50/50 | 50/50 | 0 |
| cypherpunk | aoe_focus 41/50 | 41/50 | 0 |
| harmonic | harmonic 47/50 | 45/50 | -2 |
| psionic | psionic 18/50 | 2/50 | -16 |
| mechanical | balanced 0/50 | 0/50 | 0 |
| aliens | balanced 0/50 | 0/50 | 0 |

**9/11 cells match-or-near best-of-existing.** Net Δ = -18 across all cells, driven entirely by psionic.

**v1 → v2 gap was caused by missing proposer-id feature.** v1 action features encoded WHAT decision was emitted but not WHO proposed it, so identical "place Resonator on harmonic" decisions from BalancedBrain (loss) and HarmonicBrain (win) had identical features and got averaged-down Q. Adding a 10-dim proposer-brain one-hot (action features 19→29) let the model differentiate. Cypherpunk recovered 13→41, harmonic 0→45.

**Why psionic still drops:** PsionicBrain itself only wins 18/50 in training data, so the model's signal for psionic-specialist proposals is noisier than for harmonic (45/50). Better: oversample winning brain×faction pairs in next data generation, or train a per-faction sub-model for psionic.

**Operational notes:**
- Retrain workflow: `node --import tsx scripts/generate-training-data.mjs && python3 ml/train.py ml/training-data/turns.jsonl models/brain-q-model.json` (~30 min wall total).
- Game ships without Python — model JSON is loaded by `TreeInference.compileModel`. The Python training script is dev-only, lives in `ml/`.
- LearningBrain falls through to BalancedBrain if the model file is missing or has the wrong feature shape (e.g. after a feature schema change). Verified with smoke test (1/20 wins with no model = matches BalancedBrain default).

### Brain-tuning session summary (8/11 normal cells solved at ≥80%)

Ran a multi-day exploration to push BalancedBrain (and other brains) past their default win-rates across the 11 factions. Approach evolved through three phases:

**Phase 1 — L1+L2 hyperparameter search.** Refactored BalancedBrain to take 12 numeric tunables, then 3 categorical structural toggles. Built a μ+λ ES search loop with persistence, plateau/drift termination, warm-start support, holdout validation, and survival-depth fitness fallback for all-zero plateaus. Same loop later applied to GreedyBrain (2 params) and AOEFocusBrain (7 params). Lifts: arcane|normal 8% → 100%, void|normal 0% → 98%, infernal|normal default → 98%, celestial|normal 0% → 100% (with greedy).

**Phase 2 — Coverage scan.** Realised we'd been doing duplicate work tuning BalancedBrain on cells where rush/synergy/aoe_focus already win at defaults. Cross-brain × cross-faction default scan revealed nature/military/infernal solved by RushBrain or SynergyBrain at zero-tuning, and cypherpunk near-baseline with default AOEFocus. Lesson: survey first, tune second.

**Phase 3 — L3a specialised brains.** Built per-faction brains (HarmonicBrain, MechanicalBrain, AlienBrain, PsionicBrain) using existing BotDecision kinds + richer internal state. Results validated a clear rule: **specialised brains pay off iff the faction has a unique mechanic the existing primitives can't model.**
- HarmonicBrain (range-based aura stacking): 0% → 93% ✅
- PsionicBrain (slow_aura + true-damage compounding): 1-16% → 35-40% ⚠ partial
- MechanicalBrain (no unique mechanic, just diverse towers): matches Balanced default, no improvement ✗
- AlienBrain (raw-damage shortfall, not strategy fit): worse than greedy default ✗

**Final coverage at normal:** 8/11 cells at ≥80%, 1 partial (psionic 35-40%), 2 stuck (mechanical, aliens). Stuck cells likely need balance work or true driver-level primitives (sell-and-rebuild, expiry-aware-replace) — not more hand-crafted brains.

**Infrastructure committed:**
- `scripts/brain-search.mjs` — multi-brain hyperparameter search CLI
- `scripts/sweep-factions.mjs` — orchestrator for faction × normal sweeps
- `scripts/brain-coverage.mjs` — default-config win-rate matrix scan
- `scripts/ramp-sweep.mjs`, `scripts/all-brains-hard.mjs`, `scripts/all-factions-hard.mjs` — diagnostic tools
- `src/headless/brain-search/BrainSearchManager.ts` — μ+λ ES with persistence + adaptive termination
- `src/headless/brain-search/{Balanced,Greedy,AOEFocus}BrainSchema.ts` — per-brain search schemas
- `src/systems/bots/brains/BrainHelpers.ts` — shared placement utilities (placeAtBestCoverage, placeInBuffZone, placeAtMaxStack, bestUpgradeInBuffZone)
- `src/systems/bots/brains/{HarmonicBrain,PsionicBrain}.ts` — specialised brains
- `brain-baselines/` — winner JSONs for each solved cell (greedy, balanced, rush, synergy, aoe_focus, harmonic), 12 baselines total

**Balance change shipped from this work:** Hard difficulty toughnessPerWave 0.13 → 0.05, after diagnostic sweeps showed the original was 0/11 winnable for any default brain. The 0.05 ramp keeps hard genuinely difficult (still 1/11 winnable at default — celestial with greedy 26%) without being a 0% wall.

**Next direction:** Building a learning-brain architecture (regression-based) rather than continuing to hand-craft per-faction brains. The L3a results have confirmed where specialised brains earn their keep and where they don't; the natural next step is a system that learns the right strategy per cell from training data instead of requiring human-coded decision trees.

### Specialised brain: PsionicBrain — 1%/16% → 35-40% on psionic|normal (partial)

Second specialised brain. Builds on the BrainHelpers utilities introduced with HarmonicBrain.

**Why this works partially:**
Psionic's Terror tower (80g) is a 3.5-tile slow_aura field that halves creep speed AND deals true damage. Probes (20g, true damage) placed inside Terror's range get effectively-doubled DPS (slowed creeps spend twice as long per tile). Generic brains never made this connection — greedy spammed Probes alone (16% / avgWave 19.4); BalancedBrain stalled at 1% / avgWave 15.

**Why not more than 40%:**
The brain reaches avgWave 19.6 — losing on the final wave consistently. To push past 50% likely needs either:
- Balance change (Probe damage bump, Terror cost reduction), OR
- Driver-level primitives like sell-and-rebuild that the brain layer can't access.

Iteration history (commits not retained):
- Mesmer (45g, confuse 1.2s) tested and dropped — underperformed an extra Probe in the slow zone.
- Second Mind Spike + earlier second Terror tested — actively worse (5-10% wins) because they ate Probe-spam budget.
- Overmind lives gate lowered 15→10 — no measurable change (gold gate, not lives, was the binder).
- Mind Spike upgrade priority moved to first — no change (only 1 Mind Spike, levelled fast).

Committed as a documented partial win — meaningful improvement (+19 to +24 percentage points), future iteration target. No baseline file generated since 35-40% is below the 80% threshold.

Cumulative ≥80% normal coverage stays at 8/11. Stuck cells: mechanical, aliens, and now psionic at 35-40% (close but not landed).

### Specialised brain: HarmonicBrain — 0% → 93% on harmonic|normal

First L3-phase specialised brain. Lives entirely in brain code (no driver / BotDecision changes); uses standard `place` and `upgrade` decisions but with strategy-aware internal state.

**Why generic brains failed on harmonic:**
Harmonic auras are RANGE-based (Amplifier range 4, Quickener range 4, etc.) so an aura buffs every tower within ~4 tiles. The existing `auraAdjacencyBonus` heuristic in BalancedBrain checks Chebyshev-1 adjacency only — completely wrong proximity model. Greedy ignores auras entirely. Result: every generic brain got 0% on harmonic|normal at default and at L1+L2 tuning, despite reaching avgWave 18 (close to winning).

**Strategy:**
- Phase 1: place 1–2 Resonators on best path-coverage cells.
- Phase 2: build aura towers (Amplifier → Amplifier → Quickener → …) within AURA RANGE of existing Resonators. Cheap auras outweigh single expensive ones early because effects stack.
- Phase 3: more Resonators, but only inside the existing buff zone.
- Phase 4: Crescendo ult into the densest aura-stack cell.
- Upgrades: prefer the Resonator with the most auras in range (compounded per-level).

**Results (n=100 each, 3 seed ranges for holdout):**
- baseSeed=1:   93%
- baseSeed=999: 89%
- baseSeed=42:  89%

Up from 0% across all 8 generic brains. Real cell unlock.

**Negative result — AlienBrain (built, dropped):**
Tried the same template on aliens (Spitter spam → Swarm Node → Hive Spire → Brood Mother). The brain stalled at avgWave 12.7 (worse than default greedy at 15.9) because Hive Spire (180g) and Brood Mother (80g) ate budget that would otherwise have been Spitter spam. Aliens isn't a composition problem — it's a raw-damage shortfall on a fixed budget. Different factions have genuinely different shapes; a single template won't generalise.

Cumulative ≥80% coverage at normal: 8/11 (arcane, void, infernal, celestial, nature, military, cypherpunk@82%, harmonic). Remaining stuck: mechanical, aliens, psionic.

### Brain coverage scan: 7/11 normal cells already solvable with existing brains

Before building specialised per-faction brains, ran an 8-brain × 11-faction × n=50 coverage scan to find out which cells are *already* winnable by an existing brain at defaults. **Three new wins surfaced from brains we'd been ignoring**:

- **nature|normal:** RushBrain wins 50/50 at defaults (NatureBrain, the faction-specialised one, only manages 45/50).
- **military|normal:** RushBrain wins 50/50. Every other brain 0/50.
- **infernal|normal:** SynergyBrain wins 50/50 at defaults. Also AOEFocusBrain 50/50. (Balanced needed L1+L2 tuning to reach 98%.)
- **cypherpunk|normal:** AOEFocusBrain at defaults reaches 82% (41/50). Sub-baseline but very close.

Cumulative ≥80% coverage at normal difficulty:

| faction | best brain | wins | source |
|---|---|---|---|
| arcane | greedy | 100% | default |
| nature | rush | 100% | **default (new)** |
| void | greedy | 100% | default |
| military | rush | 100% | **default (new)** |
| infernal | synergy | 100% | **default (new)** |
| celestial | greedy | 100% | default |
| cypherpunk | aoe_focus | 82% | **default (new)** |

**Total: 7/11 normal cells covered without any tuning.** The remaining four (mechanical, aliens, psionic, harmonic) are the genuine "needs-new-brain" tier — every existing brain at defaults reaches 0–12% on these cells.

This finding reframes the work. Rather than tuning a single chosen brain per cell, the right architecture is a **meta-brain dispatcher** that selects per faction (`{nature: 'rush', military: 'rush', infernal: 'synergy', ...}`). The dispatcher would unlock the seven cells immediately; the four hard cells remain as targets for specialised brain work.

New diagnostic at `scripts/brain-coverage.mjs` — produces the brain × faction default-win matrix in ~1 min.

### Brain tuning: parameterised GreedyBrain unlocks celestial (4/11 solved)

GreedyBrain refactored to take 2 search-tunable params:
- `pickStrategyIdx` (0..3): cheapest-single (legacy) | damage-per-cost | fast-fire | long-range. Determines the single tower the brain spams.
- `allowUpgrade` (0/1): when 1, level up the highest-coverage instance of the spam-tower once placement options are exhausted.

Defaults preserve historical behaviour. Search infrastructure refactored so each brain reads its own env var (`GREEDY_BRAIN_PARAMS` / `BALANCED_BRAIN_PARAMS`); the worker derives the var name from `config.brainId` so adding new parameterised brains needs no worker change.

11-faction × normal sweep with greedy (~10 min wall time) added one new clean win: **celestial 0% → 100%**, the cell BalancedBrain couldn't crack. The winner uses pure defaults (15 evals) — even default greedy beats tuned BalancedBrain on celestial. Confirms that **different brains have different per-faction blind spots**; faction baselines should use whichever brain converges, not a single chosen brain across the board.

Cumulative ≥98% baseline coverage across both brains:
- arcane (balanced 100% / greedy 100%) — pick either
- void (balanced 98% / greedy 100%) — greedy slightly cleaner
- infernal (balanced 98% / greedy 0%, Imps expire) — balanced only
- celestial (balanced 0% / greedy 100%) — **greedy only**

Greedy's `avgWave` data also surfaces "almost-wins": cypherpunk/aliens/harmonic/infernal reach wave 18–19 of 20 with greedy but can't close. They're a single tactical adjustment away — outside greedy's "spam one tower" model but plausibly within reach of specialised per-faction brains.

Bug fix: `scripts/brain-search.mjs` was hardcoding `brainId: 'balanced'` in `makeMatchConfig`, so greedy searches were silently running BalancedBrain for the actual matches. Now propagates `--brain=` through.

### Brain tuning: 11-faction × normal sweep — 3/11 solved, 8 brain-structural

Ran the L1+L2 search across all 11 factions × normal in ~7 min wall time. **Three factions converged to ≥98% with per-faction tuning**: arcane (100%, prior), void (98%, new), infernal (98%, new). The L2 toggles added meaningful value — void's winner uses `towerPickStrategyIdx=damage-per-cost`, infernal's uses `skipUltimateSave=1`, neither reachable from the L1-only param space.

The other 8 factions plateaued at 0–10% wins:
- **mobile-unit / spawn-heavy** (nature 0%, military 0%, aliens 2%) — BalancedBrain's mobile-unit placement logic is weak and L1+L2 can't compensate
- **synergy / status-effect heavy** (cypherpunk 5%, harmonic 5%, psionic 1%) — adjacency planning + status combos + ult timing the brain doesn't model
- **anomaly** (celestial 0%) — greedy wins 100% on celestial|hard with no tuning, but BalancedBrain stalls at 0% on celestial|normal. Different brains pilot it differently; BalancedBrain's choices are actively worse for this faction

This is the **L3 trigger**: the parameterised search has hit a ceiling that new *decisions* (sell-and-rebuild, force-keystone-spam, place-adjacent-to-aura) could clear, but new *parameters* cannot. L3 work would add new BotDecision kinds + corresponding brain-search hyperparameters.

The committed `void` and `infernal` baselines bring the brain-baseline library to 3 (out of 44 cells in the full grid). Sweep tooling lives at `scripts/sweep-factions.mjs`.

## 2026-04-25

### Brain tuning: BalancedBrain on arcane|normal — 8% → 100% via L1 search

First end-to-end run of the new brain-search infrastructure. Hyperparameter sweep over 12 numeric knobs in `BalancedBrain` (panic threshold, wall cap, ultimate-save gates, expensive-bias, frontier/send buy probabilities, aura/coverage weights, wave-lookahead window). Search method: (μ+λ) evolution strategy with auto-validation of any candidate clearing 85% on n=20 search seeds.

- **Result: 100% win rate (n=100 validated)**, up from baseline 8% — confirmed on two holdout seed ranges (99% and 98%) so it's not overfit.
- **Total evaluations:** 135 (112 search + 23 validation), **wall time ~45 sec on 8 workers**.
- **Biggest single lever:** `frontierBuyChance` 0.4 → 0. Default brain was burning 40% of between-wave decisions on income buildings whose payoff doesn't land in 20 waves.
- **Other findings:** `panicLives` 5 → 13 (defend earlier), `minDpsTowersForUlt` 4 → 7 (don't rush the ultimate), `expensiveBias` 1.0 → 0.58 (cheap keystones like Bolt back in rotation).

Winner config saved at `brain-baselines/balanced-arcane-normal.json`. Currently env-driven (`BALANCED_BRAIN_PARAMS`); a runtime auto-loader is a follow-up.

New infrastructure:
- `src/headless/brain-search/BrainSearchManager.ts` — μ+λ ES with persistence, plateau/drift termination, auto-validation gate.
- `src/headless/brain-search/BalancedBrainSchema.ts` — bounds/defaults/step sizes for 12 tunable params.
- `src/headless/brain-search/brain-search-worker.ts` — subprocess match runner; brain reads params per task via env var.
- `scripts/brain-search.mjs` — CLI with `--probe`, `--resume`, `--max-evals`, `--workers`, etc. Append-per-eval `evaluations.jsonl` for crash recovery (mirrors the harness pattern).
- `BalancedBrain` refactor: hardcoded constants → `BalancedBrainParams` interface with env-loaded fallback. Behaviour-preserving when no env override is set.

### Balance: harness-validated buffs (nature × 3, psionic × 1)

Four data-driven balance tweaks landed from the 2026-04-25T14-34-23 harness run (231 changes × 44 cells × 100 seeds). Each one moved its target faction by ≥+16% target-cell win rate without hurting any other cell — i.e. low-risk universal buffs.

- **Grove Viper cost 40 → 30** (`nature.5`, +95% nature target). Viper was the keystone DPS already shown by prior nature-tuning work; this lowers the spend gate to land it in the early-mid game.
- **Root cost 35 → 25** (`nature.7`, +24% nature target). Strongest slow in the game was overpriced relative to its impact.
- **Sunroot range 3 → 4 + splash radius 56 → 72** (`nature.12`, +23% nature target). Mid-tier splash tower now actually reaches the lanes it's meant to cover.
- **Probe range 3 → 4** (`psi.2`, +16% psionic target). True-damage staple gets the same range as its L3 upgrade so initial placement isn't wasted.

Faction docs updated. Larger run notes saved to `harness-runs/2026-04-25T14-34-23/report.md`.

## 2026-04-24

### Balance harness: cluster-dedup score + combo catalog generator

Two follow-up additions to address the report-quality issues from the
earlier brain-roster commit.

**Cluster-dedup score (`HarnessReport.ts`)** — the ranking now uses

```
score = (targetΔ × 2 + netΔ) × (1 / √clusterSize) × max(0, 1 − brainSpread × 2)
```

`clusterSize` counts how many other changes within the same faction
produced the same per-cell delta signature (cells rounded to 0.5%
buckets). 19 sibling-cluster mech.* nerfs that all read identical
"+86% mech easy" now divide by √19, dropping their score from
the top of the table. `brainSpread` is the stdev of per-brain mean
deltas; a change that moved one brain by 50% while three didn't
budge has high spread and gets shrunk toward zero. New ranking
columns: `raw`, `cluster (1/N)`, `spread (%)`. Single distinct
effects with low brain spread now bubble above 19-sibling echoes.

**Combo catalog generator (`ComboGenerator.ts` + `--combos=N` CLI)**
— the catalog can now be expanded to test combinations of changes:

```
node --import tsx scripts/run-harness.mjs --combos=2  # singles + disjoint pairs
node --import tsx scripts/run-harness.mjs --combos=3  # singles + pairs + triples
```

Combos only span members of the same faction. Two changes are
"disjoint" iff they touch different `(entity.field)` keys, derived
by running each `apply()` against a tracking-shim PatchEngine.
Triples are capped at 100 per faction so the run stays bounded
(default catalog: 234 singles, +2167 pairs, +1200 triples).

The "empty third slot" the user asked for falls out of always
including singles + pairs alongside triples — any subset of
size 1, 2, or 3 has a catalog entry.

Combo apply() runs each member's apply() in sequence. Composite
ids look like `combo.mech.mech.1+mech.2`; descriptions prefix
`[combo:N]` so they're scannable in the ranking.

### Balance harness: brain roster expansion + per-brain + build-hash diagnostics

The previous run's biggest weakness was sibling-cluster artifacts: 19
unrelated mech.* changes all read identical "+86% mech easy" because
the only brain that could clear the cell shifted into a slightly
different MCTS path on each patch. Two changes here address that.

**Four new brains** — bringing the matrix from 4 to 8 brains:
- `greedy` — strict T1 single-target spam, no upgrades / frontier /
  ultimates / mazing. Deterministic stat-baseline anchor: when
  greedy moves, it's a real arithmetic effect, not roulette.
- `ultimate` — saves for the faction's ultimate while keeping a
  scaling DPS floor (2 + wave/4, max 6) on the board. Panic-spends
  on lives below 10. Tests whether ultimates are pickable / useful.
- `econ` — frontier-first IF survival floor met. Same survival gate
  as Ultimate; below floor it behaves like Greedy. Validates
  Frontier balance, which the existing 4 brains barely register.
- `aoe_focus` — splash + chain + aura specialist. Min cheap-DPS
  survival floor, then biggest-affordable AOE at chokepoints, then
  upgrades on existing AOEs. Counterpart to Rush.

The shipped 5th option (`wave_reactive`) was dropped — too
dependent on upcoming-wave data quality to give a strong signal.

**Per-brain delta in the report** — `formatChange` now appends a
"per-brain Δ" column. A delta concentrated in one brain is
brain-roulette; a delta spread across all brains is real.
Surfaces the 19-mech-clones artifact directly.

**Build-hash fingerprint** — `MatchResult.buildHash` is a 32-bit
FNV-1a fold of the sorted `id@Llevel` multiset of placed towers
at sim end. Two runs with identical builds produce identical
hashes. Lets future analysis distinguish "same build, different
winrate = brain noise" from "different build = real placement
shift". Added to `MatchResult`; not yet surfaced in the report.

### Balance ship from harness run 2026-04-24T16-55-42

Acted on the strongest signals from the latest 1000-seed sweep, plus a difficulty-curve softening guided by the report's headline finding that hard mode was unwinnable across half the matrix.

**Difficulty re-anchor (`Difficulty.ts`)** — pulled the *base* values closer together while leaving the strong per-wave ramps alone (the ramps are doing the late-game work; it was the wave-1 cliff that was unwinnable):
- normal toughness 1.0 → 0.95
- hard count 1.5 → 1.3, speed 1.1 → 1.05
- insane toughness 1.3 → 1.15, count 1.8 → 1.5, speed 1.2 → 1.1

**Tower stat tweaks (`TowerTypes.ts`)** — single-stat levers that registered cleanly above their faction's cluster floor:
- Tesla range 3 → 3.5 (mech)
- Grove Viper damage 8 → 12 (nature)
- Ping fireRate 900 → 700ms (cyber) — fire-rate over damage so the cheap tower stays cheap
- Soul Drain cost 70 → 90 (infernal) — counter-intuitive nerf-helps signal from the harness; the tower is over-bought
- Acolyte damage 10 → 14 + range 3.5 → 4.5 (celestial) — celestial|normal was 0% baseline, two-stat lift to crack it
- Gambler damage 25 → 20 (void) — precautionary nerf

**Infernal Frontier nerf (`FrontierBuildings.ts`)** — small precautionary cost bump in case Infernal stays too strong after the Soul Drain nerf:
- Soul Well cost 25 → 32g
- Blood Pact cost 175 → 185g

### Balance harness: default seedsPerCell 1000 → 100

Iteration default is now ±4.5% CI (still meaningful for ±10%-class deltas). Final-validation runs use `--seeds=1000` for ±1.5% CI. Wall time on the default config drops ~10× — turns "overnight sweep" into "lunch sweep".

## 2026-04-23

### Balance harness: full catalog (232 changes) + absurd-confidence defaults
Expanded `ChangeCatalog.ts` from the seeded 32 (Nature + Void + Infernal only) to **232 changes covering every faction**:
- **Arcane** 20 nerfs
- **Mechanical** 20 mixed
- **Nature** 20 buffs
- **Void** 20 nerfs
- **Military** 20 mixed
- **Aliens** 20 nerfs
- **Cypherpunk** 20 mixed
- **Infernal** 20 nerfs
- **Celestial** 20 buffs
- **Psionic** 20 buffs
- **Harmonic** 20 buffs
- **Global** 12 changes (difficulty ramps, toughness, count, gold multipliers)

All tagged `[buff]` / `[nerf]` / `[tune]` / `[big]` in the description so the report reads at a glance.

`seedsPerCell` bumped from 50 → **1,000**. ±1.5% CI on a binary win rate — any observed delta ≥ ±3% is statistically meaningful. Baseline sweep = 176,000 matches; faction-scoped change = 16,000; global change = 176,000. Full catalog = **~5.8 million matches**, ~2 hours on 28 cores. Overnight-friendly.

### Balance harness — scripted A/B testing for numeric tweaks
New `src/headless/harness/` — A/B-tests balance changes by running the tournament once per change and diffing best-brain win rates against a baseline. Pure A/B, no combinatorial explosion.

- `ChangeCatalog.ts` — seed catalog of 32 candidate changes (12 Nature buffs, 10 Void nerfs, 10 Infernal nerfs). Each entry is an `apply(patch)` function that mutates `TOWER_TYPES` / `DIFFICULTIES` via the `PatchEngine` (handles automatic rollback).
- `PatchEngine.ts` — records + reverts mutations on towers, traits, upgrades, and difficulty fields. Per-worker so parallel shards don't cross-contaminate.
- `HarnessRunner.ts` — baseline sweep → one sweep per change → delta computation. Shares the 3,520-match tournament matrix from `batch.test.ts`.
- `Pool.ts` — `worker_threads`-based parallel orchestrator. Each worker is a fresh V8 isolate (no shared heap state), so patches can run independently. Round-robin task split.
- `HarnessReport.ts` — markdown ranking table + per-change breakdown with target-band ✅/❌ flags per (faction, difficulty) cell.
- `scripts/run-harness.mjs` — CLI. Runs the full catalog, emits `harness-results.json` + stdout markdown.

Uses `tsx` (new devDep) as the TS loader for worker threads — Node 24 runs TypeScript natively but can't resolve extensionless imports, which the game systems use pervasively.

Runtime: ~70 s on 28 cores for the 32-change catalog + baseline. Not run yet; catalog seeded for the next balance pass.

### Sunroot damage buff — Nature easy 25% → 50%
Sunroot L1 damage 16 → 22 (L2/L3 scaled similarly). Nature's main splash DPS was under-scaling for the late game; the buff lands the faction in the target "playable on easy" band with a single knob.

### Nature round-2 buffs
Second pass after NatureBrain validated the branch-pivot play was working but the faction still underperformed. Three tweaks:
- Elder Treant: 600g → 450g (ULT now actually reachable mid-match)
- Bramble Hedge L1: damage 2 → 3 (wall is a real pricker now)
- Blossom adjacency: 20%/12% → 25%/15%

Sweep delta was flat (Nature easy 30% → 25%, within 20-seed variance). Signal: small numeric buffs aren't breaking Nature through the wave-20 ceiling. Further work wants structural changes (cheap scaling DPS tower, or re-examine Root's 35g cost for its slow-only role) rather than continued fine-tuning.

### Imp softened + NatureBrain
Partial rollback on Imp: damage 10 → 12 (kept cost 12). Previous nerf stacked with the difficulty ramp crashed Infernal hard from 100% to 0% — overshot. New DPS-per-coin 1.43 (was 2.0 pre-nerf, 1.19 over-nerfed). Middle ground preserves the nerf intent without kneecapping the faction.

Added **NatureBrain** — fourth brain in the tournament. Faction-aware opening: places 2-3 Bramble walls, then **immediately branch-upgrades** each to Razor Bramble as soon as the 15g switch is affordable. Priority 1 in `decide()` so the pivot happens before new placements. Then seeds a Blossom cluster, stacks Viper + DPS adjacent to it, Elder Treant ultimate when budget allows. For non-Nature factions the branch-check is a no-op and the brain falls through to a Rush-style DPS fill — so NatureBrain doubles as a second opinion for every faction.

Sweep deltas (best brain, before → after):
- **Nature easy: 0% → 30%** ✅ NatureBrain works — avg wave 9.1 → 16.4 (of 20). Still underperforming normal/hard/insane though.
- Infernal hard: 0% → 0% (Imp softening wasn't enough alone — hard difficulty is now uniformly impossible across all factions after the ramp)
- Harmonic easy: 90% → 55% (regression — rebalancing hit it sideways)
- Harmonic normal: 30% → 55% ✅
- Mechanical normal: 5% → 5% (stuck)

Nature **still can't reliably win easy** even with a dedicated brain — 30% is borderline. Signal: faction may need further buffs (cheaper Elder Treant? stronger Bramble base DPS?) rather than more brain tuning.

### Balance pass: difficulty ramp + Void/Infernal nerfs + Nature buffs
Validated via the autonomous-play sweep — 2,640 matches before and after, comparing best-brain win rates per (faction, difficulty) cell.

**Difficulty ramp**: `DifficultyHints.toughnessPerWave`. Effective creep HP = `toughness × (1 + wave × toughnessPerWave)`. Easy 0, Normal 0.5%/wave, Hard 1.5%/wave, Insane 2.5%/wave. Applied in `SpawnManager` + `OpponentSimulation` (1v1 shadow sim). The late game had no teeth before — once a player stacked towers, wave 30 creeps died as fast as wave 10.

**Void gold_on_hit → chance-based.** Trait schema extended with optional `chance` (defaults to 1.0 = old behavior). Siphon `amount 2 @ 40%` (0.8 EV vs old 1.0). Oblivion `amount 8 @ 30%` (2.4 EV vs old 3.0). Preserves gambling identity, trims EV, adds variance.

**Infernal Imp nerf.** cost 10→12, damage 14→10. DPS-per-coin 2.0→1.19. Imp was 3× better than anything else in the game.

**Nature buffs.** Bramble L1 damage 1→2, Razor Bramble branch cost 20→15, Grove Viper damage 5→8 / fireRate 950→750 (L2/L3 bumped in proportion), Blossom adjacency buff 15/8 → 20/12 %.

Sweep deltas (best brain, before → after): Void insane 70%→10%, Aliens normal 100%→70%, Cypherpunk normal 90%→60%, Infernal hard 100%→0% (overshot — may soften Imp to damage 12), Mechanical normal 50%→5%, Harmonic easy 80%→90%, Nature still stuck at 0%/0% (avg wave 7.7→9.1 — some survival gain but can't close).

### Autonomous play system — headless match runner for balance testing
New `src/headless/` module runs full game matches outside Phaser so we can play thousands of games faster than realtime and measure faction balance without the render loop in the way. Three pieces:

- **`HeadlessScene`** + **`SimClock`**: Phaser.Scene stub. `add.graphics()` / `add.sprite()` / `add.text()` return callable chaining proxies that no-op every method and property access; `scene.time.delayedCall` / `scene.time.addEvent` route into a priority queue that fires callbacks on sim-time (advanced per tick) rather than wall time. Covers the ~126 Phaser touches in `Tower.ts` / `Creep.ts` without changing either file.
- **`HeadlessMatch`**: composes the real game systems (Grid, SpawnManager, TowerManager, CreepManager, WaveController, EconomyManager, FrontierManager) and runs a tick loop until win / loss / timeout. The "player" is a `BotBrain` instance (default `BalancedBrain`); between-waves the brain places / upgrades / buys frontier until it skips, then the next wave fires immediately. Standard + endless modes supported in v1; Circle Co-op / 1v1 / Hero Defense are future work.
- **`Batch`**: Cartesian matrix expander + serial runner + aggregator. Grouped win-rate / avg-wave / avg-gold reports formatted as markdown tables. A skipped test (`runBalanceSweep — full faction matrix`) is ready to un-skip for ad-hoc sweeps.

Perf: a 5-wave `mechanical` / `normal` / `plains` match runs in **~40-50ms wall time** on a single thread — roughly **1300-1400× realtime**. A 1000-match balance sweep should finish in ~40 seconds serial. `worker_threads` parallelism is a future win; today's bottleneck is pathfinding + trait ticks, which don't benefit from threading until the batch is 10k+ matches.

Determinism: new `systems/Rng.ts` module-level seeded PRNG replaces the 15 scattered `Math.random()` sites in Creep, trait handlers (tower + creep), BalancedBrain, and FrontierManager. `HeadlessMatch` calls `seedRng(config.seed)` at match start — same `(config, seed)` pair now yields identical results across runs, which is what makes before/after balance comparisons honest. Production paths default to `Date.now()` seeding so live play keeps its usual randomness feel.

### Circle Co-op late-game rebalance
Coop started hard on insane but trended *easier* wave after wave — team DPS compounds once zones fill out, while creep HP scaling plateaus. Three coordinated nerfs + one buff:

- **Creep HP ramp**: new per-wave coop multiplier `1 + wave × 0.035` on top of existing difficulty + natural scaling. Wave 10 ≈ 1.35×, wave 25 ≈ 1.88×, wave 40 = 2.4×. Stacks with insane's 3.5× base so wave 40 insane-coop creeps are roughly 8.4× solo-normal HP. Plugs into `SpawnManager` via a new `setHpWaveMultiplier` callback — non-coop modes leave it at the default `() => 1` so solo / 1v1 are untouched.
- **Kill-gold nerf**: `CircleDeathHandler.killGoldMult` now `× 0.7` in coop. Team total drops to 70% of solo per kill; after the 50/50 killer/spawner split each player's share sits at 35%.
- **Frontier income buff**: `FrontierManager.incomeMultiplier = 1.5` in coop. Applies to `baseIncome` (the per-wave passive), the per-wave bonus slice for dig/grow/gamble, overcharge bursts, and grow harvests. Meta-economy stays a strong pivot despite the kill-gold cut.
- **Solo untouched**: every knob defaults to a no-op so standard / gauntlet / 1v1 / endless scaling is identical to before the commit.

### CPU brain: gate meta-economy behind having a fighting tower
`BalancedBrain.decide()` used to run its meta-economy pass (frontier + sends) at the top of every between-waves tick with a 70% commit roll. On wave 0 with an empty board the bot could blow its whole opening budget on a frontier building and enter wave 1 with zero defense. Added a gate: meta is only considered once the bot owns at least one **non-wall tower** — i.e. something with actual damage output. Placing a single wall then buying frontier is still blocked, since a wall-only zone has no DPS. A new `hasFightingTower(ctx)` helper reads from `ctx.placedTowers` so the check is cheap per-tick.

### Jackpot boss resistance tuned: halve → quarter
Follow-up to the earlier Gambler pass. Halving the kill chance against bosses (×0.5) still landed too often in practice — a cluster of Gamblers could still swing a boss wave on a lucky roll. Shifted the boss multiplier to **×0.25**:
- Gambler: 4% regular / **1%** boss (was 2%)
- Oblivion: 15% regular / **3.75%** boss (was 7.5%)

Same quartering mirrored in `OpponentSimulation`'s shadow sim so the 1v1 CPU's jackpot towers respect the same boss floor. Miss chance still untouched.

### Circle Co-op roster → DOM panel
The roster (kills / gold / towers / lives / timer) was Phaser `Text` at a hardcoded 11px font — unreadable on phone where everything else goes through `UIScale`. Moved to a Preact component (`CircleRosterDOM`) driven by a `GameUIStore.circleRoster` snapshot that GameScene rewrites each frame. Font sizes now use `UIScale.fontCapped` so phone scales to ~22–24px. Shallow-equality gate on the store skips re-renders when nothing changed.

Positioning: fixed top-right with a small inset on desktop so it clears the zoom buttons; hugs the right edge on phone (no zoom buttons there).

### Endless mode bug fixes (audit follow-up)
Three real bugs from the Endless audit:

1. **Missing sprite rebind on faction rotation.** After `creepFaction = X` the code didn't call `createCreepAnimations` so creeps on wave 11+ would render with the previous faction's textures (or fall back to the Graphics shape). Now runs `preloadCreepSprites` + `createCreepAnimations` immediately after the rotation.

2. **Faction rotation desynced in multiplayer.** `Math.random()` picked the new creep faction, so host and joiner landed on different factions after wave 10 in 1v1 Versus / Circle Co-op Endless. Now seeded via `versus.sharedSeed ^ (waveNum * 2654435761)` through a mulberry32 one-shot so both sides converge. Solo falls back to `Math.random` — standalone runs stay unpredictable.

3. **UpcomingWaves stale right after an append.** The append fires inside `onWaveCleared` but `upcomingWaves.update(...)` ran *before* the append. Moved the snapshot call to after the append block so newly-generated waves show up on the same tick.

### Gambler balance: 4% kill, quartered vs bosses
Dropped Gambler's `jackpot.killChance` from 8% → 4%. At 15g per tower with ~1s fire rate you could comfortably spam the entire late game — 8% across 8 Gamblers was effectively free wave clears. 4% still feels chunky without trivialising placement choices.

Added universal **boss resistance** to the jackpot handler: kill chance is **quartered** (×0.25) when `target.isBoss`. Gambler reads 4% regular / 1% boss; Oblivion (the void ULT) reads 15% / 3.75%. Keeps jackpot towers valuable without the "I erased the boss wave from one lucky roll" outcome. Miss slice is unchanged — bosses don't get the "please whiff" perk. `HitTarget` interface gained `isBoss: boolean` (phantom splash targets default to false). Matching change in `OpponentSimulation`'s shadow sim so the 1v1 CPU's Gamblers also respect boss resistance.

## 2026-04-22

### Multiplayer + random-faction bug sweep
Six bugs reported + fixed in one pass:

1. **1v1 — send tier unlock gates bypassed on receive.** Sender-side already gated T2/T3 sends behind `unlockWave`, but the receiver blindly queued whatever message landed. `StandardMode.handleSend` now re-checks `unlockWave` against the current wave and drops locked sends. Safe against a bad/modded peer firing `send_flying` at wave 5.

2. **1v1 — flying sends walked the maze for the receiver.** `SendManager` never knew about the flying path — it always used `currentPath`. Added `setFlyingPath` (called by `GameScene` alongside `SpawnManager.setFlyingPath`) and a per-spawn check on `CREEP_TYPES[type].spawnBehavior === 'flying'`. Flying squad sends now bypass the maze as intended.

3. **Circle Co-op — host + client saw divergent kill counts.** Each peer only counted creep deaths on their own local creep list, so a client killing host-zone creeps never updated the host's roster. New `creep_killed` broadcast: sender records locally + broadcasts; receivers apply via `CircleDeathHandler.onRemoteKill`. All peers converge on the same per-player kill count.

4. **Circle Co-op — human peers didn't see CPU players in the roster.** Host-added bots increment the host's `playerCount` but client's `playerCount` only tracked real peer joins. Client now reads `msg.players.length` + `msg.botSlots` from `circle_game_start` and syncs its `playerCount` / `botSlots` state — the roster iterates the right number of slots and labels bots `[CPU]`.

5. **Circle Co-op — shared economy: 50% killer / 50% spawn-owner.** `Creep` gains `spawnOwnerIndex`. Wave creeps carry their spawner's index (zone owner); sent creeps carry the buyer's index via `SendManager.queueSend(opt, senderIndex)`. `CircleDeathHandler` now splits kill gold 50/50 (killer gets the odd-penny half) and routes each share to the right beneficiary on each peer — broadcast on the `creep_killed` message so every peer credits any local economies they host (self + their bots). No spawn-owner = killer takes 100% (legacy solo behaviour).

6. **Random faction — Razor Bramble appeared in Random rolls.** `getAllFactionTowerIds()` iterated `TOWER_TYPES` directly, which picked up branch-only towers like `nature_razor_bramble` even though they're not in any faction's dock list. Switched it to iterate `Factions[*].towerIds` — the authoritative "placeable from the dock" list. Razor can still be reached via Bramble's L2 branch as designed.

### 1v1 Versus — CPU opponent now runs real per-tower combat
Replaced the DPS-smear approximation in `OpponentSimulation` with a full per-tower-per-creep combat loop. The CPU now picks targets, fires on cooldown, applies splash, slow, root, and poison, and routes per-hit / per-kill gold into its `EconomyManager` — so **void siphon, gambler jackpot, damage variance (spike/oblivion), and infernal soul drain finally credit the bot**. Adjacency buffs (Nature Blossom) stack onto neighbour towers' damage and fire rate just like the human side. Tower-aura DoTs (Spore) poison everything in radius each tick.

Branched towers (Bramble → Razor) resolve correctly: `VersusManager.tower_upgraded` now swaps the opponent's tower id when `branch` is set, so the shadow sim keys off the right TowerType's stats.

Simplifications vs. real `TowerManager`/`Tower`: no projectile travel time (hits resolve instantly), targeting is always "first-in-line", no creep armor/shield/mage resistances. Fine — the sim only drives the CPU's economy and the minimap visual; the user never sees the damage numbers.

### Nature hotkeys realigned + Razor Bramble re-coloured
Nature tower dock was scrambled — viper was on `8`, blossom on `3`, sunroot on `9`. Re-mapped to match dock position: bramble 1, root 2, viper 3, blossom 4, spore 5, sunroot 6, vine 7, elder 8. Razor stays unplaceable (reachable only via Bramble's L2 branch).

Razor Bramble's palette shifted from pink/magenta to **blood red + bone white** so it no longer reads as Blossom at game-icon scale. Veins are now `#cc2222` crimson, fangs get bone tips with a blood droplet, base pooling is dark blood red. Bramble's foliage + Blossom's pink petals + Razor's blood-and-bone trunk are now three distinctly coloured silhouettes.

### Grove Viper — thicker body, better contrast against grass
Snake body bumped from 2 cells to 3/4/5 per level, cross-section now orientation-aware (vertical stripe for walk-right, horizontal for walk-up/down) with guaranteed dark outline pixels on both edges. L1 palette shifted from greens to **bark browns** so a juvenile viper reads against a grass-tile backdrop instead of blending in. Denser segment sampling (10/12/14 body cells) prevents visible gaps.

### Debug logs gated behind `?debug` query-string param
Wave-sync diagnostics (`[wave] stuck creeps`, `[wave] wave N cleared`, `[wave] Next Wave ignored`) and endless-mode rotation logs (`[Endless] Creep faction rotated`) now only print when the page URL has `?debug`. New `src/systems/DebugFlags.ts` centralises the check. Normal play no longer spams console.warn — use `localhost:5173/?debug` to get full wave-state diagnostics when investigating a stuck-wave report.

### Mire Dart → Grove Viper (snake)
Swapped the poison-dart frog for a slithering snake — better thematic fit for Nature's ambush/DoT identity and a distinctly different silhouette from any other mobile unit. Id rename: `nature_dartfrog` → `nature_viper`. Display name: "Grove Viper". Sprite file: `dartfrog_mobile.png` → `viper_mobile.png` (old files deleted).

**Stats**: cost 40, 5 dmg, 2.5 range, 950ms fireRate, moveSpeed 100, engageRange 1.8, poison 6%/s over 4.5s. Upgrades to 9 dmg (L2, range 2.8) and 14 dmg (L3, range 3.2). Slower cadence + stronger venom than the frog.

**Mobile sprite** (`viper_mobile.png`): snake body is a sine-wave path of segments with the phase shifted per frame, so it visibly undulates as it moves. Head is a triangular block with single visible eye (slit-pupil at L3), forked tongue flicking at specific frames (L2+), and venom drool on attack retract. L1 slim sage juvenile, L2 diamond-back pattern + forked tongue, L3 dark matriarch with cobra-style hood flare, red diamond accents, fangs, and rattle-tipped tail. Attack row coils tightly on frame 0, lunges forward on frame 2 with fangs extended, retracts with venom splash on frame 3.

**Tower dock icon** (col 2 of `nature_towers.png`) redrawn as a coiled snake on the pedestal: 2-3 coil bands stacked like a ready-to-strike cobra, triangular head raised, visible eye, flicking tongue, diamond-back pattern (L2+), rattle tip, and cobra hood flare (L3).

**Attack visual** (`spawnAttackEffect`): replaced the tongue-lash with a **twin-fang strike lunge** — two parallel bone-white lines from snake to target (the fang trajectory), then a green venom splash with two red puncture dots at the bite site.

Rename touched: `TowerTypes`, `Factions.towerIds`, `Lore`, `SpriteManager` (3 sites), `FactionModules.ts`, `sprite-preview.tsx` MOBILE_FILES, `TowerTraitHandlers.ts` isDartfrog → isViper, autumn regen script, `FACTIONS.md`.

### Thornweaver replaced by Mire Dart — a jumping poison-dart frog
The Nature spider (`nature_spider` / "Thornweaver") is gone; in its place a poison-dart frog named **Mire Dart** (`nature_dartfrog`). Same mobile-unit slot, much better thematic fit for Nature's DoT identity, plus distinct jumping + tongue-lash animations rather than another chitinous bug (Alien already owns that aesthetic).

**Stats rebalance** — cost 45 → 40, damage 8 → 4, range 2 → 2.5, fireRate 700 → 900ms, moveSpeed 130 → 110, engageRange 0.8 → 1.5, poison 3%/s 3s → 5%/s 4s. Net: cheaper, slower cadence, weaker tongue-hit, but the venom now carries the real damage. Upgrades scale poison duration naturally via the existing +15%/level trait ramp.

**Sprite work** (`nature_sprites.tsx` col 2 + `mobile_unit_sprites.tsx` `drawDartfrog`):
- Walk rows use a 4-frame **hop cycle** via Y-offset sprite bobbing (crouch → launch → peak → landing) — the unit visibly jumps while the underlying mobile_unit trait still smooths its position. No engine changes needed.
- Attack row animates a **tongue-lash**: mouth opens → tongue extends → tongue fully out → retract with venom drip.
- L1 hatchling (pale sage, no stripes), L2 striped dart (yellow back stripes, short tongue visible, amber eyes), L3 ancient dart (dark forest body with red dart-frog spots, gnarled long tongue always out, bulging throat sac, four-eye cluster, constant venom drool).

**Attack visual** in `spawnAttackEffect` — replaced the spider's venom-gob arc with a tongue-lash line graphic (pink/magenta, thickness scales with tower level) that extends to the target, holds briefly, then retracts with a green venom-droplet splash at the impact point.

**Rename**: `nature_spider` → `nature_dartfrog` everywhere (`TowerTypes`, `Factions.towerIds`, `Lore`, `SpriteManager` × 4 sites, `FactionModules` skin editor, `sprite-preview.tsx` MOBILE_FILES, `TowerTraitHandlers` isSpider → isDartfrog, `regenerate-nature-autumn.mjs`). Sprite file `spider_mobile.png` replaced with `dartfrog_mobile.png` (old file deleted). `FACTIONS.md` updated.

### Razor Bramble + Thornweaver level art — denser detail, clearer per-level jumps
Razor Bramble's column redrawn from scratch: trunk now has actual bark grain (vertical strokes + knots), a red vein network running down the centre that brightens on charge/fire, serrated blades (2px-thick spine + alternating highlight pixels for the teeth), socketed attachment points, a tooth-like crown of 3/5/7 fangs (by level) with inter-fang shadow so each tooth reads separately, barbed spikes running down the outer edges at L2+, moss + dried blood pooling at the base, and state-specific overlays (charge pulses the vein, fire launches the central fang with a spark trail, cooldown dims). L2 gets a visible capillary branch; L3 adds hooked matriarch barbs, outer-edge thorns, blood pooling, and a bright-white blade tip.

Thornweaver dock icon (`col 2` in `nature_towers.png`) and mobile walk-cycle sheet (`spider_mobile.png`) both rewritten so L1 vs L2 vs L3 read as genuinely different creatures rather than the same sprite at different sizes. Discrete per-level jumps for body width (3/6/8 grid cells), head width, leg pair count (2/4/4), leg length, fang count (0/2/3), thorn crest (0/3/5), eye type (sage/amber/gold-cluster). L2 specifically gains a *stripe pattern* across the abdomen that neither L1 (plain) nor L3 (carapace spine + vine marks) has — so you can tell the juvenile, the striped adolescent, and the matriarch apart from across the board.

### Divergent upgrade paths — Bramble Hedge forks into Hedge or Razor Bramble at L2
First implementation of the engine's **divergent upgrade paths** system, prototyped on Nature's Bramble Hedge. At L1→L2, the tower info panel now shows TWO upgrade buttons side-by-side: `Hedge` (15g — keeps the wall identity, ladder caps at L3) and `Razor Bramble` (20g — swaps the tower into a dedicated DPS TowerType with its own art column, scales L2 → L3 (40g) → L4 (70g) up to 15 dmg @ 220ms, range 2.2). One-way choice; sell-and-rebuild to reset.

**Data model** (`src/data/TowerTypes.ts`): `TowerUpgrade` gains optional `branchLabel` + `branches: UpgradeBranch[]`. A branch points at another TowerType via `transformsTo` — no stat duplication, the target owns everything. Linear towers are unaffected (zero schema bump for them).

**Runtime** (`src/entities/Tower.ts`): new `chosenBranch`, `displayName`, and `_remainingUpgrades` fields. `upgrade(branchId?)` swaps `typeDef` when a branch is picked, destroys + recreates the sprite from the new typeId, and preserves the displayed level (Bramble L2 → Razor L2). `getUpgradeOptions()` returns 0/1/2+ choices; `getSellValue()` unchanged — `totalInvested` accumulates across the branch so refunds are correct either way.

**UI**: `TowerInfoPanelDOM` renders one button per option with an amber/red accent (`.action-upgrade-branch`) on the divergent path. Per-option stat-delta previews stack vertically above the button row. `TowerStats` gains `upgradeOptions: TowerUpgradeOption[]` — legacy `canUpgrade/upgradeCost/upgradePreview` stay populated from the default option for back-compat.

**Multiplayer**: `tower_upgraded` message gained optional `branch?: string`. Missing = linear (back-compat). All 4 broadcast sites + the remote-receive handler updated in GameScene.

**CPU bot**: `BotDecision.upgrade` gained `branch?: string | null`; `PlacedTower` gained `upgradeBranches` + `branchUpgradeCosts` so brains can afford-check per branch. `BalancedBrain.decideUpgrade` now promotes a wall-classified tower to upgrade-candidate if it has a DPS branch available — specifically lets Bramble → Razor happen without the old "skip walls" filter blocking it. Two new tests in `BalancedBrain.test.ts` cover the branch pick.

**Sprite / skin editor — full integration**. Nature sprite sheets expanded **8 → 9 columns**:
- `nature_towers.png` 576×1536, new Razor column at col 8 with 3 levels of blade-fanning art (dark-bark core + red bloodied tips + bright crown blade).
- `nature_projectiles.png` 288×192, matching Razor projectile column (red-edged thorn + bloody droplet impact).
- Both `_autumn` variants regenerated at new dimensions.
- Skin editor (`skin-editor.html`) now lists "Razor Bramble" as its own column — authors can paint a Razor skin independently of Bramble.
- `nature_sprites.tsx` is authoritative; `scripts/export-sprites.mjs` (puppeteer pipeline) baked all PNGs from source.

Skipped: per-skin Razor art (this PR opens the door; new autumn/future skin rolls cover Razor automatically via `SKIN_ASSETS['nature']`).

### Textures baked via TSX source, Thornweaver redesigned per level, unit-specific attack visuals
Ran the full `scripts/export-sprites.mjs` (Vite + puppeteer) pipeline so every PNG in `public/assets/` is a fresh build from the TSX sprite modules. The Nature sheets now match what the skin editor previews — including the detailed Bramble.

Added `drawSpider` to `mobile_unit_sprites.tsx` with genuinely different art per level, not just a scaled-up blob:
- **L1 juvenile** — small pale sage body, short 4-leg stance, no fangs or thorns, duller eyes
- **L2 adolescent** — darker moss body, 6 longer legs, 2 fangs, budding 3-spike thorn ridge, amber eyes, first venom bead
- **L3 matriarch** — massive dark-forest body with bark-brown carapace spine, 8 articulated legs with claw tips, 4-eye cluster (glowing amber), 3 fangs, full 5-spike thorn ridge, vine markings on abdomen, constant venom drip
All stats — body width, head width, leg length, leg pair count, thorn count, fang count — use discrete per-level jumps so the silhouette changes at each upgrade instead of smoothly tweening. Matching `spider_mobile.png` + `spider_mobile_autumn.png` regenerated from the TSX.

Added per-mobile-unit attack visuals to `spawnAttackEffect` in `TowerTraitHandlers.ts` so each unit has a signature attack:
- **Spider**: venom gob arcs from spider to target (scales with `tower.level`), splatters into 5–11 toxic droplets at impact — not a generic star burst
- **Swarmling**: three quick bone-yellow chitin-scratch lines at the target
- Rifleman/Commander/Brawler/Heavy keep their existing yellow trail / star burst / AoE ring
Unit type is detected by `tower.typeId` string so new mobile units can opt in with a single case.

New helper script `scripts/regenerate-nature-autumn.mjs` that re-applies the autumn palette swap to the base Nature PNGs without touching column layouts — safe to re-run any time the base sheets are rebaked.

### Skin editor now shows the new Nature towers
`skin-editor.html` was still rendering the legacy 6-tower Nature preview (Thorn at col 0) because `nature_sprites.tsx` — which the editor imports to draw its preview canvas — hadn't been ported to the 8-tower layout. Rewrote `drawTowers` in the TSX to match the new roster: Bramble (with dense leafy detail — dappled mid-green body over dark branch silhouettes, clustered leaf sprites, top-ridge highlight, side thorns, lv5 berries), Thornweaver dock icon, and Sunroot. Dropped the legacy Thorn draw function, renumbered the remaining towers, bumped `T_LEVELS`/`T_NAMES`/`baseYs`/`baseWidths` to the 8-col arrays, and updated all the hardcoded 6-col canvas widths in the App component. `drawProjectiles` got matching Bramble/Thornweaver (empty — mobile melee)/Sunroot slots. The Node regen script (`scripts/regenerate-nature-sprites.mjs`) now also produces the denser Bramble art and gained a dimension-check to fail loudly if re-run against an already-reshuffled 8-col source.

### Nature sprites regenerated: new tower + projectile + spider mobile sheets + autumn variants
Rebuilt `nature_towers.png` (512×1536, 8 cols × 24 rows) and `nature_projectiles.png` (256×192, 8 cols × 6 rows) to match the new post-Thorn roster. Kept columns (Root, Blossom, Spore, Vine, Elder) were copied out of the old sheet and remapped to new indices; the three new columns (Bramble Hedge at col 0, Thornweaver dock-icon at col 2, Sunroot at col 5) are drawn programmatically in Nature-palette pixel art. Thornweaver's actual animated sprite lives in the new `spider_mobile.png` (128×384 — 3 levels × walk-down/right/up + attack). `_autumn` skin variants regenerated for all three sheets via a pixel-by-pixel palette swap using the existing `skin_sources/nature_skin_autumn_nature.json`. New `scripts/regenerate-nature-sprites.mjs` drives the whole pipeline from Node using the `canvas` package — no browser needed. `SpriteManager.ts` updated to register the new 8-tower column mapping + the `nature_spider` mobile config (adds `nature` branch to the mobile faction-detection), and `FactionModules.ts` + `sprite-preview.tsx` pick up Thornweaver as a new mobile unit. The in-file TODO comments on `nature_sprites.tsx` and `FactionModules.ts` about a deferred regen pass have been resolved.

### Nature faction reshuffled: Thorn → Bramble, added Thornweaver + Sunroot, classifier fix
Nature's identity was fine on paper but the Balanced CPU brain played it badly for two reasons. First, `getTowerRole` was mis-classifying Blossom as a `wall` because its `adjacency_buff` trait didn't match the aura-naming convention the classifier checked for — so the bot was happily spending 60g per maze slot on a flower that doesn't attack. Extended `hasAnyAura` in `src/data/TowerRoles.ts` to cover `adjacency_buff`, `spell_amp`, `overclock_buff`, and `commander_aura`; Blossom is now correctly `aura`, and the same fix cleans up Arcane/Harmonic synergy towers. Second, Nature had real kit gaps and a redundant cheap-DPS slot.

**Thorn removed.** Its "cheap scaling DPS" role is now carried by the new **Bramble Hedge** (12g, 1 dmg @ 400ms fire rate, tiny 1.2 range, explicit `role: 'wall'` override; 5 upgrade levels scaling to 8 dmg @ 220ms range 2.0 at L5). Bramble is a thornbrush that doubles as Nature's maze piece — short range keeps it from soloing kill zones, but its fast fire rate + 5-level ladder carries the role Thorn used to. Faction lore paragraph in `Lore.ts` updated to reference brambles instead of thorns.

**Thornweaver** (45g mobile spider that crawls to creeps and bites with 3%/s poison — Nature's first `mobile_unit`, carrying the faction's DoT identity onto the mobile system, 3 upgrade levels to 18 dmg + 5%/s poison).

**Sunroot** (140g splash DPS with 56-radius fire-flower AoE — *"The Grove turned its face to the sun. It turned back burning."* 3 levels to 34 dmg radius 72).

All three reuse existing traits — no new engine code. Registered in `Factions.ts`, lore + `FACTIONS.md` updated (Nature now 8 towers: Bramble, Root, Thornweaver, Blossom, Spore, Sunroot, Vine, Elder). Spritesheet regeneration (current `nature_towers.png` still has Thorn at col 0 as a ghost slot, and Bramble/Thornweaver/Sunroot fall back to graphics diamonds until the PNG is rebuilt) is a follow-up — the skin editor (`src/skin-editor/FactionModules.ts`) and sprite generator (`nature_sprites.tsx`) both carry TODO comments for that work.

### Void Rift now deals a little damage on top of the teleport
`void_rift` was 0 damage across all three levels, which made the tower read as "only teleport" and left the Damage stat blank on the info panel. Bumped to 2 / 3 / 4 damage per level and added `direct_damage` alongside the existing `teleport_delivery` trait. Since `teleport_delivery` is the first-match delivery handler, the damage was silently getting dropped — patched the delivery handler (`src/systems/traits/TowerTraitHandlers.ts`) to apply `ctx.damage` via `calculateDamage` before shunting the creep backward. Now the Rift bites a little as it opens.

### Fixed: "Next Wave" button permanently greyed after a rejected placement
Root cause of a silent bug where the Next Wave button could stay unstartable for the rest of the match. When `TowerManager.placeTower` detected that a placement would block all paths, it correctly rolled back the grid (`removeTower`) and returned null — but the `recalcPaths` callback had *already mutated the scene's cached `allPaths` / `currentPath` to reflect the would-have-been-blocked state*. On the next `canStartWave() → !!currentPath` check, `currentPath` was null even though the grid was back to valid. A rejected **bot** placement was the most common trigger in Circle Co-op, but a rejected human placement could hit the same path. Fix: re-run `recalcPaths()` after the rollback so the cache matches reality.

### Bots now get credit for per-hit gold from their own towers
Fixed a silent leak in Circle Co-op where a bot's Void Market Tower (or anything else with `gold_on_hit` / `jackpot`) would fire all match and dump its +1g-per-hit into the **human's** shared economy. `TowerManager.updateTowers` was sweeping every tower's `goldEarned` into `this.economy` without looking at ownership. Fix: stamp `ownerIndex` on the `Tower` when a bot places it, then route per-hit gold via a new `TowerManager.botGoldRouter` callback that deposits to the bot's private `EconomyManager`. `BotAI.creditGold(playerIndex, amount)` is the direct deposit method (separate from `creditKill` since hit-gold isn't a kill event). Stats tracking stays intact — the tower-level gold totals still surface on the end-of-match screen. Remote-human tower gold on joiners remains a pre-existing consistency issue, but host-side bot gold now flows to the right place.

### CPU_BRAIN.md — bot decision state machine doc
New `CPU_BRAIN.md` at the repo root walks through how the bots decide what to do each frame. Covers both layers: the `BotAI` driver (cooldown gate, affordability gate, context snapshot) and `BalancedBrain.decide` (meta pass between waves → phase selection by lives/walls → place → upgrade → sell → skip). Also documents the brain registration flow so future brains (e.g. an Aggressive or Wave-Reactive variant) can slot in without touching the driver.

### CPU bots can now use the meta economy (sends + frontier)
Bots got two new decision types — `send` and `frontier` — plus the context + driver plumbing to make them work. In 1v1 Versus the CPU opponent now buys send creep packs at you between waves and invests in its faction's frontier buildings to compound income; in Circle Co-op bots also buy frontier to contribute per-wave income instead of stockpiling idle gold forever. The driver exposes `setMetaCallbacks({ sendCb, frontierCb, sendOpts, frontierOpts, betweenWaves })` so scene-side glue can differ by mode — Circle Co-op passes `sendCb: null` since co-op is PvE — while the brain sees a uniform `BotContext.sendOptions` / `frontierOptions` list and doesn't branch. `BalancedBrain` now runs a "meta pass" first between waves (40% frontier by income/cost, 30% most-expensive-affordable send, 30% fall through to towers) so bots don't freeze at "no placeable cell + no upgrade target". Bot income from frontier + send purchases is tracked via a new per-bot `incomeBonus` paid out at each `creditWaveClear` — no faction-specific frontier mechanic is simulated (flat `baseIncome` is close enough for the CPU).

### Human sends now land on the CPU opponent
Previously any `send_purchased` message in 1v1 CPU mode was dropped because the simulated-peer `send()` is a no-op; the creeps never actually reached the CPU. Added a `cpuSendReceiver` hook on `VersusManager.send()` that routes the id through to a scene-installed handler, plus `OpponentSimulation.enqueueSend()` which pushes the send's creep count into the shadow-sim spawn queue with HP/speed templated from the current wave. Now the human can pressure the CPU with sends exactly like against a remote human, and the CPU can pressure the human back via the new `send` decision — credit goes to the bot's `sendsReceived` stat on the human side so post-match totals stay consistent.

### Circle Co-op end screen breaks out per-player performance
The victory/defeat screen now shows a "Team Performance" table when the match was Circle Co-op — one row per slot (human or CPU) with kills, kill %, towers built, and gold remaining. Rows are sorted by kills so the MVP is at the top; your own slot is tagged "(you)" and bolded, CPU slots tagged "[CPU]". Gold is authoritative for the local player and CPUs (we read their EconomyManagers); remote humans show "—" since their economy isn't synced end-of-match yet. New `CoopPlayerStats` type + `buildCoopPlayerRows()` helper on GameScene assemble the rows from `circleDeathHandler.getKillsByPlayer()`, `towerOwners`, `circleBotAI.getBotGold()`, and the local economy. Threaded through `GameOverData.coopPlayers` and rendered in `GameOverScreen.tsx`.

### CPU opponent in 1v1 Versus (reuses Circle Co-op bot work)
Added a "VS CPU" button to the 1v1 Versus lobby so you can play against a local CPU without signaling, offers, or a second browser. Under the hood: `CircleBotAI` was renamed to `BotAI` (file + class) because it was already brain-driven and faction-agnostic — only the name was Circle-specific. A backwards-compat `CircleBotAI` alias remains. `VersusManager` gained a "simulated peer" mode (`cpuOpponent`, `cpuBrainId`, `cpuFaction`): `send()` is a no-op, `isConnected()` returns true, `startCpuOpponent()` flips the state, and `injectFromCpu()` pipes synthesized `tower_placed` / `tower_upgraded` / `tower_sold` / `lives_update` / `wave_cleared` / `wave_ready` / `game_over` messages through the same `handleMessage` path a real remote peer would hit.

GameScene's new `setupCpuOpponent()` builds the CPU a private `Grid` (derived from the match map) and drives a single-bot `BotAI` on it. Placements feed `versus.opponentTowers` via the injected messages, so `OpponentSimulation` and the opponent minimap treat the CPU's board exactly like a remote human's. `OpponentSimulation` grew a `drainEvents()` method that exposes accumulated leaks + typed kills per tick — GameScene reads them each frame to decrement `versus.opponentLives`, credit the CPU's bot economy (~human-parity gold curve), and synth `game_over` when the CPU runs out of lives. Wave coordination: `wave_ready` is fired once at setup + after each shadow-sim wave clear (guarded by `_cpuLastClearedWave` to avoid per-frame spam), so the human can skip countdowns and waves advance in lockstep.

### CPU bots can now upgrade and sell their towers
`BotBrain` gained two new decision types: `{ kind: 'upgrade'; col; row }` and `{ kind: 'sell'; col; row }`. `BotContext` now carries a `placedTowers: PlacedTower[]` list (with live `upgradeCost` / `sellValue`) so brains can score which of their own towers to level up or tear down. `BotAI` tracks per-bot placement ledgers and wires through new `BotUpgradeCallback` / `BotSellCallback` slots; Circle Co-op + the new 1v1 CPU opponent both register callbacks that mirror the human code path (broadcast, rebuild paths, keep `towerOwners` in sync). `TowerManager.sellTower` picked up a `free: boolean` param (matching the existing pattern on `placeTower`) so a bot selling one of its own towers doesn't dump the refund into the human's shared economy. `BalancedBrain` added `decideUpgrade` (prioritises the non-wall DPS tower with the best path coverage) and `decideSell` (tears down the lowest-coverage wall when the zone is saturated and budget is stuck), so bots don't freeze once their zone is full. New `ok / upgradeCost / sellValue` return shape on the place callback lets the driver track fresh economics without chasing Tower refs.

### Tower info panel shows effective (post-aura) stats + live buffs
The DOM tower info panel now displays **resolved** DMG / RNG / SPD — the values the tower is actually firing at right now, factoring in every aura buff and overclock stacked on top of it. When a buff is active, the number turns green and the base value is shown struck-through underneath (e.g. "36 — was 30"). Buff chips under the stat grid were expanded from just `_adj_damage_buff` / `_adj_rate_buff` to the full set: adjacency (dmg/spd), harmonic (dmg/spd/rng/crit), faction, spell amp, overclock, and ramp-up with live stack count. `TowerStats` gained `effectiveDamage` / `effectiveRange` / `effectiveFireRate`, computed by mirroring the damage-mod pipeline (flat adj → harmonic % → spell amp for magic types) and calling `tower.getEffectiveFireRate()` for rate. And because buff traits refresh every 200ms, the panel now re-publishes its snapshot every 250ms while a tower is selected so the display stays live instead of freezing at click-time.

### Circle Co-op: waves spawn at team-size tempo
Circle Co-op already scales the creep *count* by team size (2p = 3×, 3p/4p = 4×) but left the per-creep spawn interval alone, so waves dragged on for minutes as creeps trickled out one by one. `SpawnManager.startWave` now divides the wave's `spawnInterval` by the same `countMultiplier` (floored at 30ms for readability; `spawnInterval === 0` boss/set-piece waves untouched), keeping wave duration roughly constant across team sizes.

### Circle Co-op: can't spend your gold on other players' towers
Fixed a bug where, in Circle Co-op, clicking another player's (or bot's) tower and hitting Upgrade would deduct gold from your own economy and upgrade *their* tower. Sell was already guarded via `towerOwners`; upgrade was not. Added a `canModifyTower(col, row)` helper on GameScene that returns true only when the local player owns the tile (or it's unowned / not a Circle game), and gated all three upgrade paths (`GameUIStore.onUpgrade`, `TowerInfoPanel.onUpgrade`, inspect-mode click-to-upgrade) plus `handleRightClick` through it. The tower info panel now also hides the Upgrade and Sell buttons entirely for foreign towers via a new `owned` flag on `TowerStats` — you can still inspect stats, just not spend your gold. Also picked up a missing `tower_upgraded` broadcast on the DOM upgrade path so peers stay in sync.


### Random map gen: random tileset theme

`generateRandomMap(seed, difficulty)` now rolls a random tileset theme as part of generation and stamps it into the returned `MapDefinition.theme`. The pool is `Object.keys(THEMES)` — 11 faction themes (`arcane_crystal`, `hellscape`, `circuit`, `ancient_grove`, `factory`, `void_rift`, `urban`, `hive`, `marble`, `neural`, `concert`) + 6 non-faction themes (`forest`, `mountain`, `water`, `stone`, `volcanic`, `generic`) for 17 options total.

Adding a new theme to `TerrainTheme.ts` auto-includes it in the pool. Same seed always yields the same theme (reload-safe — the theme roll is the first RNG draw before any layout work, so map layouts stay stable across random-theme vs fixed-theme runs of the same seed).

API: `generateRandomMap(seed, difficulty, theme?)`. Pass nothing or the `RANDOM_THEME` sentinel to get a random theme. Pass a specific themeId to override (used by a future UI picker — not wired into the menu yet).

A store-equipped terrain still wins on top: the resolver sees the random map's stamped theme as the "map default" and applies the player's equipped override per the standard rules. (Custom maps, by contrast, stay locked to the editor-saved theme.)

### Terrain override: equipped store theme now actually overrides the map tileset

The store had `equipTerrain(themeId)` writing to `state.equippedTerrain` and `SkinManager.getTerrainOverrideFaction()` reading it back, but the getter was never called from the rendering pipeline — equipping a terrain theme did nothing visible.

Single resolver now: **`SkinManager.getActiveTerrainTheme(ctx)`**. Resolution order:

1. **Faction Gauntlet** → ignore override; use the map's authored theme. Overriding here would defeat the unlock-the-look loop.
2. **Custom maps** → ignore override; use the editor-saved theme. Custom maps were authored with intentional theming.
3. **Coop guest** → render the host's broadcast theme (shared grid → single visual; host wins).
4. **Coop host / 1v1 / single-player** → local equipped override; falls back to map default if nothing equipped.

`GameScene.drawGrid` was the only render call site that picked a themeId; it now routes through the resolver. The faction → render-themeId map (e.g. `arcane → arcane_crystal`, `infernal → hellscape`) is centralised in `SkinManager.factionToThemeId`.

**Coop wire piece**: the host's resolved themeId rides on the `circle_game_start` message as a new `hostTerrainOverride?: string | null` field. Joiners read it on receive and stash it on `CircleManager.hostTerrainOverride`; `GameScene` reads from there. Backwards-compat: the field is optional, so older clients still parse the message (they just won't see the host's terrain).

In 1v1 Versus each peer renders their own grid, so each applies their own equipped override independently — no host concept needed for that mode.

### GameScene: sync DOM lives/gold at end of create()

Push the correct lives + gold + income into the store explicitly at the end of `create()`. Uses the same `displayLives` selection as the update loop (`arenaManager.baseHp` for hero defence, else `this.lives`) so Hero Defence matches start with the right number.

## 2026-04-17 (cross-platform, cont.)

### Phase 5 — real native plugin integrations (Android)
Capacitor bridges stop being no-op stubs and start routing to real native plugins on Android. Every surface in `PlatformBridge` now has a working implementation behind it.

- **AdBridge** via `@capacitor-community/admob` (v8). `src/systems/platform/capacitor/CapacitorAdBridge.ts` wires `AdMob.initialize` on bootstrap, prepare+show for interstitial and rewarded, adaptive banner at the bottom, and a `Rewarded` event listener so `showRewarded()` correctly returns `'skipped'` when the user dismisses before the reward point. Preloads the next ad of each full-screen type after every show to minimise visible latency. Honors `PlayerInventory.isAdFree()` for short-circuiting every method.
- **IAPBridge** via `cordova-plugin-purchase` (v13). `CapacitorIAPBridge.ts` registers every SKU from our catalogue (ads-off + shard packs + every tower-faction skin-pack SKU generated from `SKIN_DEFS`) against the matching platform, hooks `when().approved` to track owned non-consumables + resolve pending purchase promises, auto-finishes transactions (server verification deferred), and waits out a 1.5s grace window on `restorePurchases()` so approved events flow in before we return. Consumables are deliberately not cached.
- **ProfileBridge** via `@osmanraifgunes/capacitor-game-connect` (v8, covers both Android Play Games Services v2 and iOS Game Center). `CapacitorProfileBridge.ts` implements `signIn`, `submitLeaderboard`, `unlockAchievement`; cloud-save falls back to localStorage scoped per-player-id until either the plugin grows Snapshots support or we bridge directly — contract is unchanged for callers.

Native-side plumbing landed alongside:
- `android/app/src/main/AndroidManifest.xml` — added `<meta-data>` for `com.google.android.gms.ads.APPLICATION_ID` + `com.google.android.gms.games.APP_ID`, both reading from string resources so real IDs drop into `strings.xml`.
- `android/app/src/main/res/values/strings.xml` — `admob_app_id` (Google's public test id, safe to commit) + `game_services_project_id` (000000000000 placeholder, must be swapped before PGS sign-in works).
- `MainActivity.java` — registers `CapacitorGameConnectPlugin` in `onCreate`.
- `ios/App/App/Info.plist` — `GADApplicationIdentifier` (iOS test id) + `NSUserTrackingUsageDescription` for App Tracking Transparency.

Docs (`admob-setup.md`, `play-games-services-setup.md`) updated to reflect the actual plugin choices and native-config edits required.

Verified: `tsc --noEmit` clean, 229 Vitest tests pass, production build succeeds (CapacitorPlatformBridge chunk lands at 160 KB — only loaded when a Capacitor runtime is detected, so web builds don't pay for it).

### Restore Purchases flow
User-facing "Restore Purchases" button in the Store header (native builds only — the web bridge returns `[]`, so the button would be a no-op there). Behind it, `restorePurchases()` in `src/systems/monetization/` asks `platformBridge().iap.restorePurchases()` for the user's owned non-consumable SKUs and re-applies them to `PlayerInventory`: `ads_off` flips the ad-free flag, `skin_pack_<faction>_<name>` SKUs are translated back to their internal skin id via a reverse map built at module load from `SKIN_DEFS`, then granted along with the bundled hero skin. Required by Apple App Store Guideline 3.1.1 for apps selling non-consumables. Consumable shard packs are intentionally excluded — the store won't re-emit them, and granting them again would enable reinstall-to-double-dip.

## 2026-04-18

### Lobby screens migrated to Preact DOM
Versus 1v1 and Circle Co-Op lobbies now render as DOM screens instead of Phaser scenes. New files:
- `src/ui/screens/LobbyScreen.tsx` — 1v1 with Host / Join / Manual phases, room code input, map + difficulty selector (host), faction picker.
- `src/ui/screens/CircleLobbyScreen.tsx` — 2-4 player co-op with roster, Setup Game gate (host, unlocks at ≥2 connected), difficulty + faction picker; keeps the same circle_Np auto-selection by player count.

Managers (`VersusManager` / `CircleManager`) created in the screen's effect scope, stashed into `game.registry` immediately before `UIBridge.startScene('DraftScene', ...)` so GameScene picks them up unchanged. A `launchedRef` flag skips the unmount `.close()` on successful handoff.

`ScreenId` gained `'lobby'` + `'circle-lobby'`; `MenuScreen.tsx` and `MenuScene.ts` now call `UIBridge.show(...)` instead of `scene.start(...)`. The two Phaser scenes (`LobbyScene`, `CircleLobbyScene`) are kept registered in `main.ts` as a fallback while the new screens bake in — remove once end-to-end multiplayer is verified.

### Two new 4-player circle maps
Authored via the new `/circle-editor.html` tool:
- `circle_4p` (Quadrants) — forest theme, 113 blocked cells, cross-divided quadrant zones.
- `circle_4p_hell_circle` — volcanic theme, 104 blocked / 184 animated / 232 no-build, inspired by Hell Circle TD.

Both registered in `Maps.ts` (`MapId` union + `MAPS` record + `CIRCLE_MAP_ORDER`) and `CircleMaps.ts` (`ALL_CIRCLE_MAPS`). The map editor's built-in dropdown lists all four so you can re-open and tweak any of them.

### Circle Co-Op map editor (5c)
New authoring tool at `/circle-editor.html` for building circumnavigation maps. Separate entry from the gauntlet editor so neither grows a mode switch. Round-tripped against the three existing JSON maps (82 blocked / 416×2 zone cells / all spawner waypoints preserved).

Editor features:
- Terrain brushes (Empty / Blocked / Animated / NoBuild) with drag-paint.
- Per-player zone painter with color-pickable overlays.
- Spawner list: each has Set Entry / Set Exit / Append Waypoint click-modes; waypoints reorder via ↑/↓ and delete; spawners add/remove on the fly.
- Player count toggle (2P/3P/4P) that resizes the spawner + zone-color arrays and demotes out-of-range zone assignments.
- Load JSON / Download JSON round-trip. Schema matches `src/data/maps/circle/*.json` exactly, so export → drop into the folder → `CircleMaps.ts` picks it up automatically.

Wired into `vite.config.ts` alongside `editor` and `skin-editor` so `npm run build` emits `dist/circle-editor.html`.

### Play Console achievement bulk-import — format fixes
`scripts/build-achievements-zip.mjs` now emits CSVs that pass Play Console's validator. Fixes discovered over two upload attempts:
- Removed `README.txt` from the ZIP root — Play Console rejects any non-CSV/PNG at the archive root.
- Column order in `AchievementsMetadata.csv` corrected: `Number of Steps` precedes `Points` (the importer is positional despite accepting headers).
- `Incremental` column takes `True`/`False` (not STANDARD/INCREMENTAL).
- `Initial State` is title-case `Revealed`/`Hidden` (not uppercase).
- Locale code in Localizations is BCP-47 `en-US` (not `en_US`).
- All three CSVs share the `Name` cross-reference column so Play Console can match rows across files.

### Review-pass cleanup
Tidy pass after `/review` on the tutorial branch: fixed `panCameraToStep` so it now handles `canvas-dynamic` targets (the three "place more towers" / "place frost" steps used dynamic rects that the pan was silently skipping); guarded `checkForSkipHintAfterDelay` so dismissing the skip-hint track doesn't immediately re-queue another check; collapsed the scene-lookup `as unknown as { allPaths }` casts into a single typed helper in `TutorialTargets`; dropped the `cam.pan` typeof guard in favour of the typed Phaser API; pulled the scattered animation delays (200/250/350/500/750 ms and 10 s TTL) into a `TIMING` constants block at the top of `TutorialManager`; added a TTL to `pendingAfterMatchLoad` so a stale queued trackId can't survive a 10s-abandoned match-load; removed the unused `econFrontierContent`/`econSendsContent` selectors and the now-redundant `data-tutorial-target="econ-content-*"` wrappers from `EconomyPanelDOM`; collapsed `gridCellRect`/`gridCellWorldRect` into a single source-of-truth using the shared `WorldRect` type; fixed a stapled comment block in `TutorialManager.init`.

### Tutorial match: comprehensive feedback pass
Large round of polish from actual play-testing on mobile + desktop, in rough chronological order:

- **Gold-init ordering bug** — tutorial was starting with 0 gold, 0 lives, empty map because the `this.economy.addGold(150)` line ran before `this.economy` was constructed, throwing a ReferenceError that aborted GameScene.create. Moved the bump to right after `EconomyManager` init.
- **Canvas spotlight camera-aware** — `resolveTarget` for canvas targets used to assume `zoom=1, scroll=0, DPR=1`, which was only true on desktop. Rewrote against `camera.worldView` (Phaser's own ground truth for "which world rect is currently visible") + the canvas bounding rect — linear interpolation, no assumptions about buffer size.
- **Scrimless tutorial match** — the 9999px spread-shadow scrim made the live gameplay unreadable. New track-level `scrimless: true` drops the scrim and the scrim click-catcher; only the pulsing gold ring remains. Applied to `tutorial_match`; other tracks keep the scrim since they sit over static menus.
- **Victory screen suppression** — wave 3 clear was firing `gameWon` → `GameOverScene` over the tutorial's closing popover. Now gated: `if (matchMode === 'tutorial') return;` before `goToGameOver(true)`. Player stays on the live board with their towers visible while reading the "You've got it" CTA.
- **Help modal portaled to `document.body`** — `.ui-screen > *` stacking context was scoping the modal's `z-index: 500` inside `.ui-header`, letting later `.ui-section` siblings paint on top. Switched to `preact/compat` `createPortal` so the modal lives at the document root. Also bumped backdrop to a near-opaque `rgba(10, 8, 15, 0.92)` with `backdrop-filter: blur(8px)` and added fade/rise animations.
- **Event-gated tap-through** — `ScrimClickCatcher` was rendering unconditionally whenever a spotlight had a rect, even when `onClickScrim` was undefined. For towerPlaced-gated steps, the four invisible `pointer-events: auto` divs swallowed every tap outside the tiny highlight and blocked the canvas. Now only rendered when `onClickScrim` is defined.
- **Loose-placement hints + pulse animation** — widened placement highlights to 5–7 cell strips (up from single cells) and added a 1.4s pulsing glow on the gold ring so the target draws the eye at mobile scale.
- **Dynamic path-aware hints** — new `canvas-dynamic` TutorialTarget kind with a `compute()` evaluated every frame. `nextMazeExtensionTarget()` inspects `GameScene.allPaths`, finds the current creep path's biggest deviation from row 13, and highlights the strip one row past that bulge — so the "place more towers" hints follow wherever the player is actually mazing (up, down, or both).
- **Frost tower introduction** — restructured the placement arc so the player runs wave 1 with two basic Bolts (core loop: maze → kill → collect), then meets Frost right before wave 2 (where the newly-boosted fast-creep count visibly demonstrates the slow effect). New `data-tutorial-tower-id` on each dock slot lets the tutorial point at the Frost slot specifically. Copy on `start_wave_2` / `watch_wave_2` calls out the synergy.
- **Mobile target offscreen** — first several mobile screenshots had the spotlight at wrong coords because of the camera-aware rewrite interacting with DPR / aspect-fit scaling. `worldView` rewrite fixed it permanently.
- **Camera unlocked during tutorial + auto-pan** — `setLocked(true)` was collapsing the grid into the top 16% of the mobile canvas. Removed; `TutorialManager.panCameraToStep` now smoothly pans (Sine.InOut, 350ms) to each canvas-target's world centre on step change. Player can also pan freely.
- **Top-banner popover placement** — new `Placement: 'top-banner'` pins the popover to viewport top-center, overlapping the WAVES/ECONOMY panels (less critical than the game board + tower dock on mobile). Applied to placement and wave-running steps.
- **Animated mobile zoom intro** — `DEFAULT_PHONE_ZOOM` bumped 1.8x → 2.4x and every mobile match now tweens `camera.zoom` from 1.0 → 2.4 over 750ms with `onUpdate` calling `centerOn` each tick (Phaser's `zoomTo` preserves scroll, which would drift the grid toward a corner). Gives a sense of scale on entry.
- **Scroll offscreen DOM targets into view** — new `useScrollIntoViewOnStepChange` hook inside `TutorialOverlay` calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` if the resolved rect falls outside the viewport. Canvas targets skip this; they use the camera pan.
- **Pick-tower gating** — `pick_tower` step was click-through on mobile. New `dockTowerSelected(index, towerId)` EventBus event (emitted only on actual selection, not deselect) gates the step.
- **Auto-deselect dock on non-placement steps** — `TutorialManager.runStepEnter` now dispatches `requestSelectDockTower(-1)` whenever a non-placement step in `tutorial_match` activates. Prevents accidental tower drops during wave-watching or explainer steps.
- **Economy-panel auto-close on wave start** — `openSidebarPanel` now accepts `null` to collapse whichever panel is open; `start_wave_2` / `start_wave_3` onEnter close the ECONOMY panel left open by the preceding send/frontier steps.
- **Econ-tab switch + frontier/sends targeting** — new `tutorial-switch-econ-tab` window event flips the internal Economy tab. Tab switch is deferred with `setTimeout(0)` so React finishes mounting `EconomyPanelDOM` (conditional on `open=true`) before the listener registers. `buy_frontier` / `buy_send` now target the tab headers rather than the whole panel so the spotlight lands on the right section even if the switch lags.
- **Skip-hint mini-track + Quit label** — one-step `skip_hint` points at the `?` help button and fires the first time the player completes or skips any other track while on the menu. Gated on "at least one other track completed" so it doesn't surface on first launch. Plus a new track-level `skipLabel` option — the tutorial match overrides to `"Quit"` because dismissing there kicks back to menu, not just the overlay.

## 2026-04-17

### Tutorial match: scripted Arcane sandbox round
New `'tutorial'` MatchMode running inside GameScene via a thin TutorialMode subclass of StandardMode. Three hand-tuned waves (5 standards / 8 std + 2 fast / 12 std + 1 armored), a new dedicated map (`tutorial` MapId — single straight east-west path with zero obstacles, excluded from MAP_ORDER so it never shows in the picker), 250g starting gold and 99 lives so the player literally cannot lose. The match is gated: `canStartWave()` returns false until the player has placed at least one tower, so they can't punch through the Start Wave button without understanding what towers do.

Scripted as a 15-step TutorialTrack. Tower-placement steps use a new `gridCellRect` helper that produces `{ kind: 'canvas' }` targets so the spotlight lands on an actual grid cell; event-gated `advanceOn: { event: 'towerPlaced'/'waveStarted'/'waveCleared'/'sendPurchased'/'frontierPurchased' }` advances as the player performs the real action. Two new EventBus events (`sendPurchased` / `frontierPurchased`) emitted from StandardMode's send handler and BaseFrontierMode's purchase handlers — hooks the tutorial needs but which are also useful for future analytics.

Step content walks through: pick Arcane Bolt → place it in the path → see mazing bend the route → place a second tower → start wave 1 → watch kills drop gold → notice +10/w income → buy a send (economy panel auto-opens via the `onEnter` hook we already had) → start wave 2 → buy an Arcane Leyline Nexus (copy calls out its Overcharge ability and notes other factions have different frontier mechanics — Mechanical digs, Nature harvests, Void gambles) → start wave 3 → "You've got it" with a CTA back to menu.

New `TutorialStep.cta?: { label, action }` field surfaced in the Popover. On terminal steps, the CTA button replaces Next and runs the supplied action before completing the track. Basics' final step now has a "Play Tutorial Match" CTA that dispatches `tutorial-launch-match` (TutorialManager listens and calls `launchTutorialMatch` — starts GameScene with the right params and queues the scripted track for after the match-load splash dismisses). Tutorial match's final step has "Back to Menu" → `tutorial-go-menu`. Window-event dispatch rather than direct imports keeps TutorialTracks (content) free of a circular dependency on TutorialManager / UIBridge.

Menu `?` help list's replay path for `tutorial_match` routes through `launchTutorialMatch` so the scene actually exists when the spotlights try to resolve. Skipping the tutorial track mid-match also navigates back to the menu so the player doesn't get stranded in the 99-lives sandbox.

CameraController gets a `setLocked(flag)` method that disables pan/zoom/pinch and forces zoom=1, scroll=0 when locking. Tutorial engages it in GameScene post-`CameraController` creation — required because phones default to `DEFAULT_PHONE_ZOOM = 1.8`, which would misalign the canvas-rect spotlights against the grid cells.

### Pause menu visibility fix
The pause menu was invisible. The cause: GameScene's UI-camera setup installs an `addedtoscene` listener that auto-ignores every new game object on the UI camera. `showPauseMenu` explicitly told the main camera to ignore the overlay too — so both cameras ignored it and nothing rendered. Replaced the `cameras.main.ignore()` pattern with `uiLayer.register()` on the container and every child; UILayer.register correctly sets the cameraFilter bitmask to hide from main and show on UI. Side-effect: the Exit-to-Menu button in the pause menu is now reachable (it was always there, just on an invisible overlay).

### In-game tutorial primers wait for match-load splash
Same timing race as the app-startup splash, different splash. In-match primers (`income_standard`, `income_hero`, `income_battle`) fired on `GameScene.create()`, which runs well before the LoadingScreen (5s min display + 200ms fade) dismisses — so the first popover appeared over the faction splash. LoadingScreen now emits `match-loading-dismissed` when it fully unmounts; `TutorialManager.onGameSceneCreated` queues the trackId into `pendingAfterMatchLoad` and the dismissal event drains the queue. Same pattern as the `app-splash-dismissed` wiring for the first-launch basics track.

### Pause button wired, path indicator redesigned, faction tagline on load

Three tutorial-follow-ups ahead of the tutorial game scene work.

**Pause button fixed.** The DOM status bar's pause button called `GameUIStore.requestPause()`, which in turn called the registered `onPause` callback — except `GameScene` never registered one. So the button quietly did nothing. Added the callback (`onPause: () => this.togglePause()` in `registerCallbacks`), which dispatches to the existing `togglePause` that shows the in-game pause menu with Resume and Exit to Menu buttons. Fixes both "pause doesn't work" and "I can't quit a game" in one stroke — the exit path was always there, just unreachable without the P keybinding.

**Path flow indicator replaces the yellow pip.** The old single-`Arc` pip that lerped from entry to exit kept reading as a creep. Replaced with a `PathFlowIndicator` that samples each path every ~14 px, renders all samples via a single `Graphics` per path, and animates alpha + radius along a traveling sine wave so bright bands march from start to end. Always-on between waves, dims to 0.12 alpha during live waves (stays as a reference but doesn't compete with creeps), flashes bright for ~550 ms when `drawPath` rebuilds (tower placed or sold). Cool blue palette (`0x88bbff`) means it's unambiguously not a gold creep. Phase is preserved across path recomputes so the wave keeps flowing without resetting. New file `src/systems/PathFlowIndicator.ts`; the three old `pathPip*` methods and five state fields in `GameScene` collapse to one indicator array and two small methods.

**Faction identity tagline on the match-load screen.** The `FACTIONS[id].description` text ("Precision magic. Crits, AoE, and spell amplification.") existed only on the FactionSelect card, which players skip past. Slotted a non-italic, body-text line between the faction-name divider and the flavour quote on the LoadingScreen so every match starts by telling the player what their faction does. Random faction gets a sensible fallback since there's no dedicated description for it.

### Tutorial polish pass
First-pass feedback from playing through the tour. A grab-bag of fixes:

- **Splash timing race** — tutorial was popping over the AppLoadingScreen because I'd used a 3s timer after `app-preload-complete` to approximate "splash gone". Replaced with an explicit `app-splash-dismissed` window event fired from AppLoadingScreen's fade-out completion handler; TutorialManager listens for that with a 200ms buffer for DOM to settle.
- **Encyclopedia + Store split** — were one combined step; now two discrete popovers pointing at the respective buttons.
- **Final basics step now highlights Standard mode** — last "You're ready" step spotlights the Standard card instead of floating center, pointing the player directly at the recommended first-run mode. Required a per-card `data-tutorial-target="menu-mode-standard"` tag on the Standard mode card.
- **Drop `mode:standard` auto-primer** — redundant with basics, which already explains Standard.
- **Faction primers trimmed to the tip** — removed the "Arcane: Precision magic — crits and AoE" identity blurb; each faction track is now a single-step practical tip (e.g. "Stack crit towers on high-HP chokes"). Faction identity content will land as an in-game overlay in a later pass.
- **Income step wording** — "+N/w" → "+10/w" (concrete example, the early-game income the player will actually see). Also retargeted that step at the new `status-income` selector specifically rather than the whole status bar.
- **Economy panel step auto-opens the panel** — new `onEnter` hook on `TutorialStep`; the economy-panel step dispatches a `tutorial-open-sidebar-panel` window event, `GameSidebar` listens and sets its local `openPanel` state. Spotlight lands on the panel's actual content instead of a collapsed header.
- **Hero Defense income primer rewritten as shop walkthrough** — was two steps, now eight: intro (with corrected "returns as interest between waves" wording, the old "carries over" was flat wrong), shop overview (auto-opens economy panel), Items, Tomes, Accessories, Abilities, and a start-wave outro. Required wrapping each section of `HeroItemsDOM` in a `data-tutorial-target` div (hero-items / hero-tomes / hero-accessories / hero-abilities) so each step has a discrete spotlight target.

### In-game tutorial system
New players were bouncing off the game because several of its load-bearing mechanics (mazing, income from sends, Frontier buildings, per-faction asymmetry) aren't obvious from the UI. Added a joyride-style overlay that introduces each of these at the moment they become relevant — not all up-front — so the tutorial stays short even though it covers a lot of ground.

Everything is a **track**: `basics`, `income_standard/battle/hero`, `multiplayer`, per-faction primers (×11), per-mode primers (×5). Tracks are self-contained sequences of steps, triggered independently the first time their context is encountered. `basics` auto-starts 3s after the splash dismisses on first load. Mode primers fire on FactionSelect entry, faction primers on the subsequent screens (HeroSelect/CreepFactionSelect/Draft), income primers on GameScene create, the MP primer on LobbyScene/CircleLobbyScene open. Each track fires at most once per player — completion persists in `localStorage` under `td_tutorial_state`. A new `?` button in the menu header opens a list of every track with ✓ badges for completed ones, so anything can be replayed on demand.

Steps can advance by click (next/skip buttons on the popover) or by game event — step schema supports `advanceOn: { event: keyof GameEvents }`, which the TutorialManager wires to GameScene's per-match `EventBus` via `setGameEventBus(bus)` push/clear. GameScene now calls this in `create()` and again with `null` in `shutdown()`. Event-gated steps hide their Next button and don't advance on scrim click — forces the user to actually place the tower / start the wave.

Implementation: `src/systems/Tutorial/` (Manager, Tracks, Targets, Persistence) + `src/ui/tutorial/` (Overlay, Spotlight, Popover, MenuButton, `useTutorial` hook mirroring the `useGameUI` pattern). Spotlight uses a box-shadow cutout with a four-rect click-catcher so the highlighted element stays interactive but the dim scrim is clickable. Popover has auto-flipping placement with viewport clamping. Targets are either CSS selectors (`data-tutorial-target` on TowerDockDOM, StatusBarDOM, GameSidebar, MenuScreen) or Phaser canvas rects converted via the canvas bounding box + internal scale. No third-party tour library — all custom Preact, ~500 lines total.

### Celestial: life gain + Sanctuary actually work now
Both of Celestial's signature defensive mechanics were silently broken.

**`life_on_kill` (Acolyte, Absolution)** never fired. The handler scanned dead creeps for an `hp <= -900` sentinel, but `CreepManager` set the sentinel *after* tower updates and immediately filtered those creeps out of the array — so the proc window never existed. `CreepManager` now exposes a `justDiedCreeps` list populated in `processKills` before the filter, and `life_on_kill` iterates that explicit list instead of scanning for sentinels.

**`leak_absorb` (Sanctuary)** had no consumer. Charges would recharge every 10 waves, but nothing on the leak path ever checked them. `StandardLeakHandler` now queries for Sanctuary towers with charges and consumes one per leak, returning 0 damage (with an event log line).

**Hero Defense mode** gets both adapted to the mode's HP pool: `life_on_kill` heals the base for 5% of max HP per proc (parallels +1 life = 5% of the 20-life pool in Standard); Sanctuary runs a damage shield pool (5% of max base HP per charge) drained by `ArenaManager` before base HP falls, refilled on the 10-wave recharge cadence. New `GameMode.onLifeGain` / `GameMode.absorbDamage` hooks keep the Standard / HD branching clean.

### Destroyed frontier buildings actually go away
Previously, when a mine collapsed from digging too deep it stayed as a red "DESTROYED" row in the frontier panel and its doodad persisted on the map forever. Now:
- `OwnedBuilding` carries a `_doodad` handle (just an object with a `destroy()` method — keeps `FrontierManager` Phaser-free).
- `GameScene.placeFrontierDoodad` returns the Phaser image; `BaseFrontierMode` stashes it on the owned building.
- `FrontierManager.destroyBuilding` tears down the doodad when a dig collapses.
- `syncFrontierToDOM` no longer emits a destroyed entry at all, and the dead "destroyed" styling was removed from `EconomyPanelDOM`.

### Creep inspector migrated from Phaser to DOM
The creep info panel (shown when you click a creep) was the last major in-game UI still rendered by Phaser — a Container with Graphics + 3 Text objects, manually positioned each frame. Now lives in `CreepInfoPanelDOM.tsx` subscribing to a new `selectedCreep: CreepStats` state in `GameUIStore`.

`GameScene` publishes a fresh snapshot each frame while a creep is inspected (~60Hz); `updateSelectedCreep` does a shallow-equal check and skips `notify()` when nothing changed — which is most frames while the creep is just walking. Preact only re-renders on real deltas (HP ticks, armor shred, effect expiry), so the cadence is effectively free.

Desktop: inline collapsible panel in the left sidebar, faction-colored title, boss badge. Phone: floating card above the status bar, sharing the slot with the tower info panel (they're already mutually exclusive). HP gets its own gradient bar on top of the panel — green→amber→red shading based on percent remaining.

Deleted `src/ui/CreepInfoPanel.ts` (149 lines) and its 6 touch points in `GameScene`.

## 2026-04-16

### Project renamed: Tower Defence → Factions
The game is now called **Factions**. User-facing titles updated across HTML, PWA manifest, in-game headers, and server dashboards. Genre phrases like "tower defence" stay as descriptive text. Repo name, directory, `package.json` name, and Vite base path `/tower_defence/` are unchanged — those are tied to the GitHub Pages URL.

### App-startup splash + background icon preheat
New `AppLoadingScreen` shown on first page load: "FACTIONS by Running Man Games" title card with progress bar driven by Phaser's Loader events (0-80%) and an icon preheat phase (80-100%). Minimum 2.5s display so it always feels intentional.

The real win is the preheat: `IconPreheat` walks every tower + hero id via `requestIdleCallback` after BootScene finishes, extracting each idle frame into the DOM data-URL cache. Opening the Store for the first time used to block the main thread for hundreds of ms while `canvas.toDataURL` ran synchronously per icon — now the cache is warm before the splash even dismisses (smoke test: Store opens in ~325ms with 153 cached icons). `SkinPreview` also falls back to a faction-tinted placeholder if an icon isn't ready yet, so the edge case of opening Store faster than the preheat never visibly hangs.

### Mobile tower info no longer hides behind the status bar
On phones, the floating tower-info card had a fixed `bottom: 120px` that only cleared the tower dock — the status bar wraps to 2-3 rows on narrow viewports (~107px on a 400px-wide phone), so its top edge pushed up past the card and painted over the Upgrade/Sell buttons. `GameSidebar` now measures the status bar with a ResizeObserver and positions the card dynamically above it with an 8px gap, regardless of wrap count.

### In-game changelog migrated to DOM, re-keyed by date
The 435-line Phaser `ChangelogScene` is gone. All 24 entries (v1-5 through v28) live in `ChangelogScreen.tsx` as structured DOM, now headed by **date** (derived from the shipping commit of each feature) instead of version number. Phaser scene registration removed, legacy `MenuScene` button rerouted through `UIBridge.show('changelog')`.

### Phaser 4 upgrade
Bumped the engine from **Phaser 3.90 → Phaser 4.0 ("Caladan")**. Two behavioural changes in v4's ESM bundle required code adjustments:

- **Default export removed.** All 21 files that did `import Phaser from 'phaser'` now use `import * as Phaser from 'phaser'`.
- **No more `window.Phaser` global.** v3's UMD wrapper installed Phaser as a side-effect when the module loaded; v4's ESM bundle doesn't. 36 files referenced `Phaser.Math.Clamp`, `Phaser.Textures.FilterMode.NEAREST`, `Phaser.Geom.Rectangle` etc. at runtime via ambient types without importing phaser. Each now imports the namespace explicitly — no load-order dependencies, no magic global.

Everything else was transparent: no custom pipelines, shaders, preFX/postFX, `Phaser.Geom.Point`, `Phaser.Structs.*`, `Math.PI2`, `DynamicTexture`/`RenderTexture`, TileSprite cropping, or removed plugins in the codebase. End-to-end smoke test (Menu → faction select → enemy select → Draft → GameScene) is clean.

### Bug fix: Infernal fiend mobile sprite
The Infernal "Fiend" (`infernal_bomber`) mobile spritesheet had been 404ing for a while — the filename derivation stripped the `infernal_` prefix from the towerId to get `bomber`, but the asset on disk is `fiend_mobile.png` (matching the display name). `SpriteManager` now derives the filename from the sheetKey, which already encodes the correct asset name for every mobile unit.

## 2026-04-15

### UI/UX Rework — Pixel-Indie Clean
Major visual refresh across the entire DOM UI layer. Warm dark plum palette replaces the old pure-black look, with three typefaces (Silkscreen for titles, DM Sans for body, VT323 for stats/data) and a consistent design token system.

- **PWA support** — installable as a standalone app on mobile and desktop. Service worker caches assets for offline play after first load. Tower icon on plum background.
- **Design token system** — new `tokens.css` with full palette (backgrounds, borders, text, jewel-tone accents, faction colors, rarity tiers), spacing scale, and type scale. All shared classes (`.btn`, `.card`, `.ui-section`) auto-updated.
- **Phone gameplay fixes** — floating tower info card above dock instead of full-width sidebar takeover. Status bar wraps on narrow screens. Tower dock scrolls horizontally with snap inertia. 44px minimum tap targets on all interactive elements. Fixed mobile touch passthrough (scrollable overflow no longer blocks Phaser canvas). Canvas now resizes on every viewport change, not just breakpoint crossings.
- **Menu screens refreshed** — GameOverScreen with big VT323 hero numerals for shards/score/level. HeroSelectScreen and DraftScreen cards responsive with `min(260px, 100%)`. Wave count modal capped to viewport. Leaderboard with right-aligned VT323 columns.
- **Contrast pass** — 75% of hardcoded hex colors migrated to semantic tokens. VT323 data font applied to all game panels (waves, economy, sends, essence, hero items). Tablet CSS (601-1200px) fleshed out.
- **BAR_HEIGHT extracted** to config.ts — ResponsiveManager no longer imports Phaser UI files. EventLog stripped to DOM-only facade.
- **4K/ultra-wide** — `.ui-screen` max-width 1800px centered, padding scales with clamp(). Font bumps at 2000px+ and 2800px+.
- **Store roll animation** — strip padding scales with viewport (50vw), reveal synced to CSS `transitionend` instead of drifty setTimeout.
- **Utility CSS classes** — `.row-wrap`, `.row-center`, `.stack`, `.stat-value-lg/md/sm`, `.font-pixel`, `.font-data` for inline-style reduction.
- **Noise/film-grain overlay** on all screen backgrounds for texture.

## 2026-04-14

### Gauntlet Map Updates
- **All 11 gauntlet maps re-imported** from the map editor with expanded structure placements.
- **Iron Foundry (Mechanical)**: 5 → 32 structures — full factory floor build-out.
- **Ancient Grove (Nature)**: 10 → 22 structures.
- **Data Grid (Cypherpunk)**: 11 → 20 structures.
- **Warzone Outpost (Military)**: 11 → 16 structures.
- **Hellscape (Infernal)**: 11 → 15 structures.
- **Hive Tunnels (Aliens)**: 6 → 10 structures.
- **Rift Dimension (Void)**, **Concert Hall (Harmonic)**, **Mind Palace (Psionic)** also expanded.
- Descriptions preserved across the re-import (editor doesn't export them).

### Hero Skins (20 new)
- **Runtime palette-swap system** in `src/systems/PaletteSwap.ts` — generates skinned hero spritesheets on demand from the base hero PNG using HSL transforms (and/or exact hex swaps). Editor-output-compatible for when the skin editor gains hero support.
- **One hero skin per existing tower-skin theme** (20 total): Corrupted/Sandstone/Moonstone/Blood Magic Arcanist · Gilded/Factory Fresh Engineer · Autumn Druid · Whiteout Shadow · Desert Storm/Arctic Warden · Albino Necromancer · Cyber Sakura/Redline/Offline Duelist · Frostfire Berserker · Fallen Paladin · Emerald Monk · Heavy Metal/Neon Rave/Synthwave Ranger.
- **Cost tiering**: common 200 / rare 400 / epic 600 shards (half the tower-pack price since one character vs full faction).
- **Hero skin equipping**: Inventory + Store screens already supported `target: 'hero'` — the new defs slot in automatically.
- **Bug fix**: `Hero.ts` was importing `getHeroSheetKey` from SpriteManager (skin-unaware) instead of resolving the equipped skin. Now uses `ensureHeroSkinTexture()` which lazily generates the palette-swapped spritesheet on first use.

### Test button
- **+5000 Shards (test)** button on main menu for development.

### Bug fixes
- **Mobile unit skins now apply correctly when placed.** Anim frames in `createSpriteAnimations` were always bound to the BASE sheet key, so playing any animation on a skinned mobile unit would reset its texture to the base. Affected every mobile unit skin (rifleman/brawler/heavy/commander Arctic+Desert Storm, alien_swarmling, infernal_bomber). Fix: parallel anim sets per loaded skin variant + per-sprite suffix lookup.
- **Creep sprites no longer linger when killed by DoT effects** (burn, poison). The DoT death branch in `Creep.update()` was destroying graphics but skipping the sprite cleanup that the regular `takeDamage()` path runs.
- **Selecting a tower in Hero Defense no longer throws** `ReferenceError: require is not defined`. Replaced two CommonJS `require()` calls in `GameScene.towerToStats` with proper ESM imports.

### Hero skin pack bundles + rolls
- **Tower-faction packs now bundle the matching hero skin.** Buying e.g. `Gilded Mechanical Pack` also grants `Gilded Engineer`. Pack prices bumped ~50% (common 400→600, rare 800→1200, epic 1200→1800).
- **Hero skins added to the roll pool** at one rarity tier above their tower-pack equivalent (common→rare, rare→epic, epic→legendary). Direct-purchase prices match the bumped tier.
- New `SkinDef.bundles` field in StoreDefinitions; `PlayerInventory.purchaseSkin` grants bundled IDs alongside the main purchase.

### Tower dock skin labels
- **Dock card tooltips now prefix the tower name with the equipped skin theme** — e.g. "Gilded Flame ($100g)" instead of just "Flame ($100g)". New `getThemeLabelFromSuffix(faction, suffix)` helper looks up the human-readable theme label.

### Selected tower range stays visible
- **The range circle now persists for the entire duration a tower is selected** (inspect mode), instead of being wiped any time the pointer moved. `handleHover()` no longer clears `rangeGraphics` when in inspect mode, and the range is redrawn each frame so it tracks moving mobile units.

### Sprite previews on store/inventory/roll cards
- **Store skin cards now show sprite previews.** Tower-faction packs render all of the faction's towers in a row (so you see the whole pack at a glance), per-tower skins show the single tower icon, and hero skins show a hero portrait — all rendered with the skin's palette applied.
- **Roll strip + result reveal show sprites too.** The casino strip cards each preview the skin they represent, and the "NEW SKIN!" reveal card shows a larger preview of what you won.
- **Inventory cards show the same previews.**
- New `SkinPreview` Preact component (`src/ui/components/SkinPreview.tsx`). `getTowerIconUrl` extended with an `overrideSuffix` arg; new `getHeroIconUrl` companion. Hero skin textures are generated lazily via `ensureHeroSkinTextureBySuffix` so previews work even for unowned skins.

## 2026-04-11

### Endless Mode + Streamlined Menu
- **NEW MODE: Endless** — infinite wave scaling, play until you lose. Random creep faction every 10 waves, boss every 10 waves. HP scales cubically beyond wave 50, speed caps at 3x.
- **Merged Sprint/Standard/Marathon** into a single "Standard" mode with wave count picker overlay (Quick 15 / Standard 30 / Extended 100).
- **Menu streamlined** from 8 mode cards to 7. Endless card in orange.
- GameOver shows "Survived X waves" for Endless instead of "Wave X/Y".
- Endless skips creep faction select (auto-random since factions rotate).

### Custom Maps
- **Custom Maps menu**: browse, import, and play user-created maps from the main menu.
- **Map editor integration**: "Open Map Editor" button opens `/editor.html` in a new tab for visual map design.
- **Import from clipboard**: paste a Full Map JSON from the editor to save a custom map.
- **localStorage persistence**: custom maps saved in browser storage, persist between sessions.
- **Multiplayer sync**: host's custom map auto-sent to all peers via WebRTC — works in Versus 1v1 and Circle Co-op.
- **Scene data flow**: `customMapDef` threaded through FactionSelect → Draft → HeroSelect → GameScene.

### Structure Art Rework
- **93 structures** (up from 90) with detailed pixel art across all 11 factions.
- Resized: mushroom ring, tank hangar, landing pad, server farm, speaker stack, music stand, colossus, altar of light, steam boiler, smokestack.
- Replaced: motor pool → military tents, lava font → pentagram, DJ booth → conductor podium.
- Added: infernal skull small (1×1), cyber cable H/V runs.
- All alien structures repainted from purple to green/organic palette.
- 36 structures fully redrawn with 2-4x more detail (batch 3).
- Automated sprite export via Puppeteer (`node scripts/export-sprites.mjs`).

### Terrain Tile Fixes
- Void terrain brightness toned down ~30-40% across all palettes.
- Infernal terrain intensity reduced ~25%, lava pool center tiles merge seamlessly.
- Celestial holy water center tiles merge seamlessly.
- Psionic thought pool center tiles merge seamlessly.
- Harmonic stage block redesigned as 3/4 angle orchestra chairs.
- Harmonic sound pool redesigned as concentric bass wave ripples.

### Map Editor & JSON Maps
- Standalone map editor at `/editor.html` — deployed alongside the game.
- Maps stored as JSON files in `src/data/maps/` (replaced procedural builder functions).
- Editor features: terrain painting with real tileset tiles, structure placement with textures, drag to move, import/export JSON, save to file.
- Structure sprites bake faction ground tiles as background.

## 2026-04-10

### Animated Large Structures
- **90 large multi-tile structures** across all 11 factions (up from 22). Each faction now has 8-10 structures ranging from 2x2 to 12x2 cells.
- **3-4 frame animation** on every structure: brazier flames flicker, radar dishes rotate, neural threads pulse, lava overflows, crystal nexuses refract light, pipe organs play, roulette wheels spin, and dozens more.
- **TerrainManager animation support**: Structures load as spritesheets when animated, with per-structure Phaser animation keys (`struct_anim_{id}`) at 1.5 fps.
- **108 structure placements** across gauntlet maps — every faction homeworld now features 6-11 animated structures woven into the terrain.
- **New structures by faction**: Military (guard tower, ammo bunker, radar dish, tank hangar, landing pad), Psionic (neural loom, stasis pod, synapse hub, psychic beacon, dream chamber), Infernal (bone cage, lava font, demon gate, skull pile, torture rack), Arcane (crystal nexus, rune circle, scrying pool, spell forge, crystal cluster, enchanting table, mana well), Mechanical (gear assembly, steam boiler, conveyor terminal, crane arm, scrap heap, smokestack), Nature (sacred pond, mushroom ring, hollow log, berry bush, stone shrine, waterfall, bee hive), Cypherpunk (server farm, hologram table, cable nest, crypto miner, neon sign, hacker station, firewall node), Celestial (oracle fountain, marble colossus, cloud throne, sun dial, altar of light, angelic statue), Aliens (egg cluster, acid pool, chitin wall, spore vent, cocoon cluster, feeding pit, tunnel mouth), Harmonic (pipe organ, DJ booth, speaker stack, harp, music stand, spotlight rig), Void (rift portal, chaos obelisk, dice altar, roulette wheel, void crystal, card table, fortune teller).

## 2026-04-09

### Faction Gauntlet Mode
- **NEW GAME MODE**: Faction Gauntlet — fight all 10 enemy factions in 10-wave stages across unique homeworld maps. 100 waves total.
- **10 faction homeworld maps**: Crystal Caverns (Arcane), Iron Foundry (Mechanical), Ancient Grove (Nature), Rift Dimension (Void), Warzone Outpost (Military), Hive Tunnels (Aliens), Data Grid (Cypherpunk), Hellscape (Infernal), Sky Citadel (Celestial), Mind Palace (Psionic), Concert Hall (Harmonic).
- **10 custom terrain sprite generators**: Every faction homeworld has unique pixel art terrain with auto-tiled edges (16 NESW variants), animated blocked tiles (lava flow, acid bubbles, scan lines, rune swirls, thought ripples, sound waves, steam vents, enchanted sparkles, burning rubble, void rift energy), and 8 faction-specific ground doodads.
- **Preview screen**: Shows full randomized stage order with faction names, map names, and wave ranges before starting.
- **Stage transitions**: Fade to black → "Stage N: [Faction Name]" banner → fade in new map. Towers destroyed, lives reset to 10, gold reset, frontier persists.
- **Stage scaling**: HP 1x-4x, speed 1x-1.5x, extra count ramp across 10 stages.
- **HUD**: Shows "Stage N/10: [Faction Name]" during gauntlet gameplay.

### Creep Sprites
- **176 unique creature sprites** across all 11 factions — each creep type gets a faction-specific creature design with 4-frame walk cycle + 3-frame death animation.
- **Creep Faction Select**: New screen after faction select lets you choose which enemy faction's creatures you face.
- **Art feedback applied**: Non-directional designs (spiders, embers), gambling motifs (void dice), blood priest, speaker bass drop, brain-dome mages, angel wings, floating musical pips, and more.
- **Hero Defense**: Arena creeps now use faction sprites too.

### Terrain System
- **Themed terrain**: 6 terrain themes (forest, mountain, water, stone, volcanic, generic) with auto-tiled sprites.
- **10 faction terrain themes** for gauntlet maps (circuit, hellscape, arcane_crystal, void_rift, urban, hive, marble, neural, concert).
- **Ground doodads**: ~13% of walkable tiles get scattered decorations (bushes, flowers, pebbles, mushrooms).
- **Animated water + lava**: 3-frame ripple/flow animations.

### Tower Targeting Priority
- **5 targeting modes**: first (closest to exit), closest (to tower), strongest (highest HP), weakest (lowest HP), fastest.
- **17 towers** assigned thematic targeting: snipers → strongest, frost → fastest, chain → closest, gamblers → weakest.
- Targeting mode shown in tower dock tooltip.

### Desktop Zoom + Pan
- **Scroll wheel zoom** toward cursor position, **+/-/⊙ buttons**, max 8x zoom.
- **Middle-click drag** or **left-click drag** (no tower selected) to pan.
- **Dual camera**: UI stays at 1x while game zooms.

### Mobile Improvements
- **Responsive tower bar**: Buttons size to fill available width.
- **Camera fixes**: Viewport clipped above UI bars, elastic bounds, bottom safe margin.
- **Larger tooltips**, encyclopedia text ~25% bigger, gold/lives visible.

### Multiplayer
- **Signaling server** (Cloudflare Workers): Room codes replace clipboard SDP exchange. Host creates room → 4-letter code → joiner types code → auto-connects.
- **Analytics dashboard** at signal.streamingsplats.com: Line charts, faction popularity, world map, game mode tracking.
- **Versus fixes**: Sends go to opponent (not self), wave sync, minimap fades during build, opponent tower sprites.

### Code Quality
- **UILayer**: Centralized UI object factory, eliminated per-frame camera filter hack.
- **PanelBase**: Reusable sidebar panel class with dynamic item management.
- **BaseFrontierMode**: Shared frontier logic, eliminated ~120 lines of duplication.
- **Proper shutdown**: destroy() on all modes/panels, event bus cleared, camera removed.
- **UIScale**: 11 new centralized properties replacing scattered isPhone ternaries.

## 2026-04-07

### Sprite Art System
- **Hybrid sprite rendering**: Factions with pixel art use Phaser Sprites; others use Graphics primitives. Clean migration path per faction.
- **All 11 factions** have complete spritesheets: towers (with per-level upgrade art), projectiles (travel + impact animations), and heroes (directional walk/attack/ability frames).
- **6 mobile unit walk-cycle sheets**: Rifleman, Brawler, Tank, Commander, Swarmling, Fiend — each with 4-direction walk + attack animations.
- **Tower picker icons**: Tower select bar shows sprite icons instead of truncated text labels.
- **Hero select portraits**: Hero picker shows sprite idle frame instead of colored diamond (desktop + phone).
- **Encyclopedia icons**: Tower and hero detail pages display sprite art.
- **Per-level tower art**: Towers visually progress as they upgrade (more detail, glow, particles per level). Extended tower sheets with 4 rows × maxLevels per faction.
- **Sprite preview tool**: `sprites.html` page renders all generators with "Download All (ZIP)" button for batch export.

### Gameplay Balance
- **Heavy Gunner → Tank**: Renamed, rethemed as armored vehicle. Slower (moveSpeed 45), longer range (4.5-6 tiles), fires AoE explosive shells.
- **Brood Mother**: New `commander_aura` — +20% damage, +15% attack speed to Swarmlings within 6 tiles.
- **Firewall buff**: DPS increased to 35, adds 65% slow to creeps crossing the beam.
- **Hero Defense Tomes**: Three new purchasable tomes in the item shop:
  - XP Tome (100g): Grants 50 + level×5 XP
  - Stat Tome (250g+): +5 DMG, +30 HP, +0.1 AS (cost scales +50g per purchase)
  - Interest Tome (200/400/800g): Upgrades interest rate from 2% → 3% → 4% → 5%

### Visual Polish
- **Meteor ground-targeting**: Splash projectiles lock destination at fire time (don't track moving targets). No rotation on splash projectiles.
- **AoE impact scaling**: Splash impacts scale to match AoE radius with NEAREST filtering for crisp pixel art.
- **Flamethrower**: Larger projectile sprite (38px) for visible flame burst.
- **Tower rotation disabled**: Whole-tower rotation looked bad; will revisit with directional sprite art.
- **Mobile unit attack effects**: Melee impact bursts, bullet trails, AoE flash rings for military units.

### UI Fixes
- **Mobile zoom/pan**: Elastic bounds scale properly with zoom level. Pinch anchors to touch midpoint via getWorldPoint().
- **Pause menu**: Centers on screen (not world) — works at any zoom level.
- **Tower tooltip**: Positioned relative to actual bar Y on mobile (not hardcoded desktop value).
- **Send panel**: Expanded to 190px on desktop for T2 sends. Sizing moved to UIScale.
- **Event log**: Text bottom-anchored so newest entries always visible.
- **Creep info panel**: Height now accounts for all stat lines + effects (shield/slow no longer clipped).
- **Scene cleanup**: GameScene shutdown handler destroys towers/creeps/listeners on exit.

## 2026-03-21

### Mobile Phone Support
- **Phone breakpoint** (<600px): New `phone` layout mode in ResponsiveManager. Full 36-col grid preserved (maps require it), Phaser Scale.FIT handles scaling.
- **Pinch-to-zoom**: Two-finger gesture zooms the camera 1x–3x. Phone starts at 1.8x zoom so grid details and text are readable.
- **Drag to pan**: Single-finger drag pans the camera when zoomed. 8px threshold distinguishes taps from pans — no accidental tower placements.
- **Touch input rework**: Clicks deferred to pointerup on touch (after pan detection). Uses `pointer.worldX/worldY` for accurate grid coords at any zoom level.
- **GameControlBar**: Touch buttons for wave start, speed, pause + hero ability buttons (Q/W/E/R/T) with cooldown overlays. Placed below the tower bar.
- **SidebarOverlay full-screen on phone**: Full canvas overlay instead of side panel, larger close button, darker scrim.
- **TowerSelectBar phone sizing**: Smaller buttons (42px vs 52px), tighter padding, no hotkey numbers on phone.
- **HeroSelectScene carousel**: Single-card view on phone with prev/next navigation and dot indicators instead of 3-across.
- **MenuScene responsive**: Map buttons in multi-row grid, 2-column mode cards, smaller difficulty buttons, dynamic Y offsets.
- **FactionSelectScene responsive**: 3-column layout (vs 6), smaller cards (90px vs 140px), condensed text, tower list hidden on phone.
- **Dynamic grid**: Grid, Pathfinding, and InputManager use dynamic `grid.cols` for bounds checking.

### Hero Defense Polish
- **2% interest** on gold at end of each wave — rewards saving for bigger purchases.
- **Stat accessories**: War Gauntlet (+15 dmg, 800g), Heart of Iron (+200 HP, 900g), Rapid Quiver (+25% AS, 1000g), Hawk Eye (+60px range, 1100g).
- **Removed Phase Boots** accessory.
- **Sidebar shows attack speed** (AS: X.XX/s) instead of move speed.
- **In-game changelog** updated to v21 with all Hero Defense changes.

## 2026-03-20

### Hero Defense Enhancement — 8 Features

Major overhaul of Hero Defense mode. Combat is deeper, more responsive, and has real progression now.

**Foundation:**
- **Tower Assists**: Leaked creeps now enter the arena with their current HP instead of full HP. Tower damage finally matters — a half-dead creep is a half-dead arena creep.
- **Floating Damage Numbers**: Pool of 30 text objects that float up and fade. Every hit, heal, crit, ability, and level-up shows colored text (white=normal, yellow=crit, purple=ability, red=hero damage, green=heal, orange=level up). Dodge shows "DODGE" text.

**Progression:**
- **Hero Leveling (1-15)**: Arena kills grant XP (10 normal, 50 boss, 100 elite). Each level gives +15 maxHP, +3 damage, +0.02 attack speed. Milestones: Level 5 = Q cooldown -20%, Level 10 = W effect +30%, Level 15 = E damage +50%. XP bar shown in sidebar.

**Combat Depth:**
- **Ultimate Abilities (R key)**: Warden gets Fortress (invuln 5s + taunt all creeps, 90s CD), Mage gets Meteor Storm (3 meteors × 150 dmg AoE, 120s CD), Shadow gets Death Mark (mark all → 30% bonus damage after 3s, 100s CD). Cooldowns shown in sidebar.
- **Visual Indicators**: Ground-targeted abilities (Blink) enter targeting mode with preview circles. Range ring around hero, crosshair at cursor. Click to cast, same key or ESC to cancel. Death Mark shows purple rings on marked targets. Fortress shows golden invulnerability ring.
- **Arena Creep Waves**: Each TD wave now also spawns 3-6 arena creeps matching the wave composition, independent of leaks. The arena always has action. Count scales with wave number.

**Content & Economy:**
- **Elite Arena Events**: Special enemies at wave milestones. Shield Guardian (wave 10, 8x HP, shields nearby creeps every 8s), Base Charger (wave 20, 12x HP, ignores hero and rushes base), Necromancer (wave 30, 6x HP, resurrects dead creeps every 5s). Orange indicator, 100 XP each.
- **Accessories with Rotating Shop**: 1 accessory slot, 12 accessories total. 3 random offers rotate every 5 waves. Actives use T key (Healing Potion, Phase Boots, Battle Horn). Passives include lifesteal, frost slow, chain lightning, berserker scaling, guardian angel revive, thorns reflect, bonus gold per kill. Buying replaces current accessory.

### Faction Heroes & Melee Balance
- **Each hero belongs to a faction**: Warden=Military, Mage=Arcane, Shadow=Void, Paladin=Celestial, Ranger=Harmonic, Berserker=Infernal, Necromancer=Aliens, Monk=Psionic, Engineer=Mechanical, Duelist=Cypherpunk, Druid=Nature.
- **Faction hero guaranteed**: If you pick a non-random faction, your faction's hero is always one of the 3 offered. Faction name shown on hero cards (highlighted gold for your faction's hero).
- **Melee heroes buffed**: All 6 melee heroes got significant HP increases (+100-150) and innate base armor (2-8). Warden is the tankiest (650 HP, 8 armor), Shadow the lightest melee (420 HP, 3 armor).
- **Hero descriptions updated** to reflect faction identity (e.g. "Void assassin", "Celestial champion", "Psionic adept").

### Hero Level Cap Removed & AoE Accessories
- **No max hero level**: Heroes can now level indefinitely past 15. Each level still queues an upgrade point.
- **3 new splash accessories**: Cleave Axe (900g, 40% splash in 50px), Inferno Blade (1400g, 60% in 70px), Tempest Hammer (2000g, 80% in 90px). Attacks deal % of damage as AoE around the target with an expanding ring VFX.
- **Arena kill gold**: All arena kills now give 0.33x base kill gold (unified for leaked and wave-spawned creeps).

### Ability Visual Effects
- **Full VFX system** for hero abilities: expanding rings for AoE, dash trails, teleport flashes, stun impacts, meteor impacts with shockwaves, chain lightning bolts, execute flashes, buff rings, and death mark detonation effects.
- New `ArenaEffects.ts` module with 7 effect types (circle_expand, circle_pulse, flash, dash_trail, ring, lightning, shockwave), each with proper fade-out and animation.
- Meteor Storm now shows fiery impact circles and shockwaves at each landing zone.
- Chain lightning shows jagged lightning bolts between targets.

### Ability Upgrades via [+] Buttons
- Each level-up point can now be spent on upgrading a specific ability instead of just stats.
- `[+]` buttons appear inline next to each ability (Q/W/E/R) when upgrade points are available.
- Each ability upgrade: +20% damage/effects, -5% cooldown, +10% AoE radius. Upgrade count shown as `+N`.
- Ultimate (R) can be upgraded once unlocked at level 6.

### Healer Creep Balancing
- **Diminishing returns on heal stacking**: Each additional heal source on the same creep per tick is halved (1st=100%, 2nd=50%, 3rd=25%...). 5 stacked healers now give ~194% instead of 500%.
- **Healers receive only 10% healing**: Creeps with heal_aura or flat_heal_aura traits get 90% reduced incoming heals, preventing healer balls from being unkillable.

### Hero Defense Economy Nerf
- TD kill gold reduced to 30% (was 100%) — 10x creep count was generating too much income.
- Wave income halved.
- Arena kill gold reduced to 5% of base (was 10%).
- Boss waves spawn half as many arena creeps.

### Heroes Encyclopedia Page
- New "Heroes" tab in the Encyclopedia with a carousel browser for all 11 heroes.
- Shows hero icon, stats, all abilities (Q/W/E), ultimate (R), cooldowns, and playstyle tags (Melee/Ranged, Fast/Slow, Tanky/Squishy).

### Accessory & Leveling Rework
- **3 accessory slots** (up from 1). No duplicates. Costs increased ~10x (600-2000g) to make them meaningful investments.
- **Skill upgrades on level-up**: Instead of auto-applying stats, each level queues an upgrade choice: +30 HP, +5 damage, +0.05 attack speed, or -10% ability cooldowns. Multiple pending upgrades stack.
- **Ultimate locked until level 6**: R ability grayed out in sidebar until hero reaches level 6, then shows "[R] UNLOCKED!".
- **XP rebalance**: 1 XP per normal kill, 5 per boss, 10 per elite. XP curve = level × 15.

### 8 New Heroes + Random Draft
- **11 heroes total** (up from 3): Warden, Mage, Shadow, Paladin, Ranger, Berserker, Necromancer, Monk, Engineer, Duelist, Druid.
- **Random draft**: Each game offers 3 random heroes to choose from. Reroll button available.
- Hero cards now show ultimate ability (R) in purple alongside Q/W/E abilities.
- New heroes cover all playstyles: tanks (Paladin, Berserker), ranged (Ranger, Engineer), melee DPS (Monk, Duelist), casters (Necromancer, Druid).

### Procedural Random Map Generator
- **New "Random" map option** in the map picker (menu, lobby, versus). Generates a unique map from a seed using chunk-based terrain features.
- **6 layout templates** (classic, dual_entry, siege, gauntlet, diagonal, corridor) define entry/exit positions. The generator picks one randomly and fills terrain procedurally.
- **Terrain feature library**: Lakes (circles), ridges (vertical walls with gaps), pillars (clusters), walls (horizontal with gaps), islands (blocked core + NoBuild ring), and boulder clusters. Features are randomly placed and validated via A* to guarantee all paths remain passable.
- **Difficulty-linked terrain**: Easy maps are open (8-10% blocked), Insane maps are cramped (18-22% blocked) with more NoBuild zones and longer minimum paths. Each difficulty level feels structurally different.
- **Daily seed toggle**: When Random is selected, a "Daily" toggle appears. ON = everyone gets the same map that day (seed = YYYYMMDD). OFF = fresh random seed each game.
- **Versus integration**: Random maps in 1v1 use the existing shared seed mechanism — both players generate identical maps from the same seed.
- **Seed display**: The active seed is shown in the top-right corner during gameplay so players can share/compare maps.
- **Seeded PRNG**: Uses mulberry32 for fast, deterministic generation. Same seed + same difficulty = identical map every time.

## 2026-03-18

### Send Scaling & Tier 2 Sends
- **Send cost scaling**: Send costs now increase +10% per 5 waves (rounded to nearest 5g). Income rewards also scale slightly (+0.5 per 10 waves) to compensate.
- **Tier 2 sends**: 4 new send types that unlock as the game progresses:
  - **Healer Pack** (70g, wave 10+): +2 healers that sustain nearby creeps
  - **Shielded Pack** (80g, wave 10+): +2 shielded creeps (1 dmg/hit cap)
  - **Flying Squad** (90g, wave 15+): +3 flying creeps that bypass the maze
  - **Regen Pack** (100g, wave 20+): +2 regenerators with 2% HP/s regen
- Send panel now shows locked tier 2 sends with unlock wave, and updates costs/availability each wave.
- Hotkeys 1-4 mapped to tier 2 sends (Z/X/C/V remain for tier 1).

### Difficulty Scaling Overhaul
- **Quadratic HP scaling**: Creep HP now scales as `20 + wave*8 + wave²*0.4`. Waves 1-10 feel nearly the same, but wave 20+ creeps have roughly double the old HP (340 vs 180 at wave 20, 620 vs 260 at wave 30). Late game is no longer trivially won.
- **Late-wave themed compositions**: Waves 21+ now have synergistic themes instead of "everything at once" — healer+armored packs (21-22), speed+swarm rushes (23-24), shielded+regen DPS checks (25-26), flying+evasion maze bypasses (27-28), and full mixed chaos (29+).
- **Kill gold decay**: Kill gold decreases by 1 per 10 waves (5g→4g→3g→2g floor). Prevents infinite income snowball in late waves.
- **Hard difficulty tuned up**: Toughness 1.5→2.0, count 1.4→1.6, speed 1.15→1.2, gold mult 0.75→0.6. Hard mode wave 25+ is now genuinely punishing.
- **New Insane difficulty**: Toughness 3.5×, count 2.0×, speed 1.35×, gold 0.4×. Probably not winnable. Bosses get damage-cap shields (40 hits). Armored creeps regenerate. Evasive creeps dodge 45%. Shielded creeps have 40-hit shields. Regenerators heal 5%/s. Good luck.
- **Faster late spawns**: Spawn interval floor lowered from 200ms to 150ms, scaling steeper (wave 30: 240ms vs old 300ms).

### New Creep Type: Regenerator
- **Regenerator**: Heavy armor, 1.8× HP, 0.85× speed, regenerates 2% max HP/s. Appears in waves 25+. On hard mode (toughness ≥ 2.0), regen increases to 3%. Forces sustained DPS rather than burst.
- **Boss regen on hard**: Hard-mode bosses gain 1% HP/s regeneration, making them much more threatening.
- New `regeneration` creep trait with green pulse visual effect when healing.

### Bug Fix: DoT/Beam Rounding
- **Fixed zero-damage DoTs**: At 60fps, per-frame DoT damage (e.g. Virus 10 DPS × 0.016s = 0.16) was rounded to 0 by `Math.round()`. Added accumulator pattern — fractional damage carries between frames, only applied when ≥1 HP. Virus, burn, and poison effects now deal correct damage.
- **Fixed Firewall beam zero damage**: Same rounding bug caused `Math.round(20 * 0.016) = 0`. Removed rounding — beam now applies raw float damage. HP checks (`<= 0`) work fine with floats.

### Responsive Scaling & Tablet Support
- **Dynamic grid offset**: `GRID_OFFSET_X` and `CANVAS_WIDTH` are now dynamic functions (`getGridOffsetX()`, `getCanvasWidth()`) that read from `ResponsiveManager`. On desktop (window >= 1200px), layout is unchanged. On tablet, grid offset is 0 and canvas shrinks to game area only.
- **ResponsiveManager** (`src/systems/ResponsiveManager.ts`): Singleton that detects layout mode from `window.innerWidth`, fires resize events, exposes `isTablet()`, `canvasWidth()`, `gridOffsetX()`.
- **Collapsible sidebar overlay** (`src/ui/SidebarOverlay.ts`): On tablet, sidebar panels (UpcomingWaves, SendPanel, FrontierPanel, EssencePanel, EventLog) slide in/out from the left via a hamburger toggle button. Desktop layout unchanged.
- **Touch input**: Long-press (500ms) triggers right-click callback (sell/upgrade). Added tappable Sell/Upgrade buttons to TowerInfoPanel, tappable Start Wave and Speed buttons to UIOverlay. Works on both desktop and tablet.
- **All scene centering** now uses `getCanvasWidth()` so menus fill the correct canvas size on any layout.
- **GameMode.reparentSidebarPanels()**: Optional method on game modes to move their sidebar panels into the overlay on tablet. All 4 modes (Standard, Battle, HeroDefense, CircleCoop) implement it.
- Added `getContainer()` to UpcomingWaves, EventLog, SendPanel, FrontierPanel, EssencePanel, ItemShopPanel for sidebar reparenting.

### Circle Co-op Fixes
- **Individual gold**: kill credit now tracks which tower dealt the killing blow (`Creep.lastHitCol/Row`). Only the tower owner gets kill gold via `CircleDeathHandler`.
- **Lobby sync fixes**: joiners now correctly receive their player index via targeted messages. Existing joiners are notified when new players connect (P2 knows about P3/P4).
- **3P zone fix**: bottom-half zones now follow Y-shaped diagonal walls correctly instead of dumping all bottom cells into P2's zone.
- **Tower relay fix**: remote tower placements skip economy checks (`TowerManager.placeTower` `free` param) — was silently failing because the host couldn't afford other players' towers.
- **Periodic tower sync**: every 5s each player broadcasts their tower state; other players reconcile any missed placements.
- **Registry cleanup**: stale `circle`/`versus` entries are cleaned from the Phaser registry when switching modes or exiting to menu. Prevents hero defense from thinking it's in co-op.

### Harmonic Conduit Re-emit
- **Conduit-linked aura towers now re-emit inherited buffs to their neighbors.** Previously, if a Quickener's rate aura was shared to an Amplifier via conduit, the Amplifier received the buff but didn't pass it on. Now inherited harmonic buffs re-emit at 50% of received value (35% of original). Linked towers and conduits excluded from re-emit to prevent loops.

## 2026-03-17

### Circle Co-op Mode
- **New multiplayer mode: Circle Co-op** — 2-4 players share one map. Creeps loop through all player zones in a circle. If a creep completes the full loop, shared lives decrease.
- **Zone system**: each player has a colored quadrant/sector where they can build towers. Other zones are visible but not buildable.
- **Shared lives**: all players share a life pool (20). When creeps leak (complete the circle), everyone loses together. Win by surviving all 30 waves.
- **Individual gold**: kill gold goes to the tower owner regardless of which zone the creep was in. Standard frontier buildings available.
- **3 new circle maps**: Circle 2P (left/right halves), Circle 3P (Y-shaped 3 sectors), Circle 4P (4 quadrants with central island).
- **Star topology networking**: host maintains N-1 PeerConnections. All tower operations (place/sell/upgrade) go through host relay to keep all players in sync.
- **Wave sync**: all players must be ready (SPACE) or timer expires before next wave starts. Host is authoritative for shared lives.
- **Player roster UI**: top-right panel shows all players with zone color indicators and ready status.
- **Zone overlay**: your buildable zone is highlighted with a color tint on the grid. Zone colors match player roster.
- **No sends** in co-op (may be added later).
- **New files**: CircleManager, CircleLobbyScene, CircleLeakHandler, CircleCoopMode, CirclePlayerRoster, CircleDeathHandler.
- **Modified files**: Maps (3 circle maps + zone data), WaveDefinitions (circle_coop mode), MessageProtocol (circle messages), GameScene (zone restriction, tower ownership, shared lives sync), MenuScene (co-op button), main.ts (scene registration).

### Hero Defense Mode
- **New game mode: Hero Defense** — split-screen layout with hero arena (top, 400px) and smaller TD grid (bottom, 36×12).
- **3 heroes**: Warden (tank, 500 HP, melee), Mage (mage, 280 HP, ranged), Shadow (assassin, 320 HP, fast melee).
- **Click-to-move hero micro**: click arena to move, click creeps to focus. Q/W/E ability keys with cooldowns.
- **Warden abilities**: Shield Bash (stun 1.5s), War Cry (+40% AS), Ground Slam (AoE 15 dmg + slow).
- **Mage abilities**: Fireball (100+60 splash), Frost Nova (AoE slow), Blink (teleport).
- **Shadow abilities**: Shadow Strike (dash+mark +25% amp), Evasion (100% dodge 2s), Execute (200 dmg if <30% HP).
- **Hero item shop**: 3 slots (Weapon, Armor, Boots) × 3 tiers each. Weapon gives damage/crit, Armor gives flat armor + HP, Boots give speed/dodge.
- **Arena system**: leaked TD creeps spawn at left edge of arena with full HP, walk right toward the Base (10k HP). Hero fights them.
- **Arena creeps fight back**: creeps aggro on the hero (240px range, bosses 360px), chase, and attack in melee. Creeps that reach the base park there and repeatedly attack it.
- **Ranged heroes fire projectiles**: Mage auto-attacks launch visible projectiles that fly to target.
- **10x creep waves**: hero defense spawns 10x the normal creep count with faster spawn intervals for intense arena pressure.
- **Death/Respawn**: hero dies → 10s respawn timer → full HP at arena center. Creeps walk to base unimpeded while dead.
- **Economy**: arena kills award 10% gold (balanced for 10x creep count). Hero heals 20% on wave clear.
- **Hero Select scene**: 3 hero cards with stat breakdowns and ability descriptions. Routes through draft to game.
- **Hero Plains map**: designed for 12-row grid with entry left, exit right. Auto-selected for hero defense mode.
- **Layout system**: `LayoutConfig.ts` returns grid dimensions per mode. Mutable `_gridOffsetY` in config offsets all grid rendering.
- **HeroLeakHandler**: intercepts TD leaks, spawns ArenaCreep with full HP at arena left edge. Returns 0 damage (no life loss).
- **HeroDefenseMode**: GameMode implementation with ItemShopPanel and ArenaManager integration.
- **AbilitySystem**: manages visual effects for hero abilities.
- **Game over screen**: shows hero kills, deaths, K/D ratio, damage dealt, abilities used.
- **Menu**: "Hero Defense" button added to match mode list.
- **Changelog scene**: v16 entry added.
- **11 new files**: LayoutConfig, HeroTypes, HeroItems, Hero, ArenaCreep, ArenaManager, HeroSelectScene, HeroLeakHandler, HeroDefenseMode, ItemShopPanel, AbilitySystem.

### GameMode Interface System
- **Pluggable GameMode interface**: each match mode (Standard, Battle) is a self-contained class implementing `createUI()`, `update()`, `onWaveCleared()`, `canStartWave()`, `handleSend()`.
- **StandardMode**: owns SendPanel, FrontierManager, FrontierPanel, and all frontier actions (overcharge, dig, harvest — both individual and batch).
- **BattleMode**: owns EssencePanel, essence resource registration, generator purchases, and essence sends.
- GameScene delegates to `this.gameMode` instead of inline if/else checks per mode.
- Fixed: `eventLog` was passed to game mode context before being created (was null).
- Fixed: `versus` reference now properly wired into `GameModeContext` after versus initialization.
- Random faction frontier rotation goes through `StandardMode.rotateRandomFrontier()`.
- Removed ~130 lines of mode-specific code from GameScene (now ~1070 lines).

### Dual Economy (Battle) Game Mode
- **New match mode: Battle** — two resources: Gold (towers) + Essence (sends).
- **Essence generators**: buy with gold (Tap 30g/+1/s, Well 80g/+3/s, Conduit 200g/+8/s, Nexus 500g/+20/s). Essence ticks in real-time.
- **Sends cost Essence**: Standard 10e, Fast 15e, Armored 30e, Swarm 8e. Each gives gold income per wave.
- **Compound growth loop**: Gold → Generators → Essence/sec → Sends → Gold income/wave → more Generators or towers.
- EssencePanel replaces Send+Frontier in Battle mode. Shows essence counter, rate, generators, sends.
- Z/X/C/V hotkeys work for essence sends.

### Architecture Decomposition
- **TowerManager** (282 lines): tower placement, selling, upgrades, trait updates, expired cleanup, wave-end processing, brood mother spawning.
- **CreepManager** (120 lines): creep movement, leak/death handling via pluggable interfaces, cleanup, proximity search.
- **WaveController** (88 lines): wave start/clear detection, spawning delegation, callback-driven side effects.
- **Leak/Death handlers**: `LeakHandler` and `DeathHandler` interfaces with `StandardLeakHandler` and `StandardDeathHandler` implementations. Future Hero Defense mode swaps these.
- **ResourceManager** (120 lines): N-resource system with real-time ticking. Gold is default. Battle mode adds Essence.
- GameScene reduced from 1376 to ~1200 lines via extraction.

### Manual Conduit Linking + Encyclopedia + Changelog Viewer
- **Manual Conduit linking**: Conduit no longer auto-links. Click Conduit → press L → click aura towers to link/unlink. Only links different aura types. Max 2-3 links based on level. Visual: colored lines per aura type (red=damage, green=rate, blue=range, magenta=crit). Linked towers show gold outline.
- **Encyclopedia scene**: browse all towers (grouped by faction with traits), creeps (HP/speed/armor/abilities), and frontier buildings. Mouse wheel scrolling, tab switching.
- **In-app Changelog**: scrollable history from v1 to latest on the menu screen.
- **Harmonic aura info**: TowerInfoPanel shows all active Harmonic buffs (+X% DMG, -X% SPD, +X RNG, X% crit) when inspecting a buffed tower.
- **Distinct aura colors**: Amplifier red, Quickener green, Reach blue, Critical Mass magenta. Tower colors and aura circles match.
- **Version SHA** on menu screen (bottom-right, gray).
- Menu has [ Encyclopedia ] and [ Changelog ] buttons.

### Documentation Overhaul
- Updated CLAUDE.md with documentation rules, multiplayer architecture, all current design decisions.
- Updated README.md with 11 factions, 8 maps, multiplayer, all controls.
- Updated FACTIONS.md with all 11 factions including lore quotes, tower tables, and frontier buildings.

### Initial Speed Sync
- Host sends current game speed to joiner on game start (was only synced on TAB press).

### Lobby Faction Grid
- Faction picker in multiplayer lobby now uses a 2-row grid (6 columns) instead of overflowing single row.

### Firewall Beam Visual + Faction Aura Fix
- Firewall towers now draw a cyan beam between linked pairs (redraws each frame).
- Faction speed aura (_faction_rate_buff) shows pink glow on buffed towers.

### 5 New Maps (8 total)
- **Serpentine**: Pre-built snake maze with S-curves. Limited build space.
- **Islands**: 4 build zones separated by no-build rivers.
- **Gauntlet**: 4 entries (all sides), center exit. Hardest map.
- **Spiral**: Concentric walls, entry at corner, exit at center. Long path.
- **Siege**: Mirrored top/bottom halves. Designed for versus.

### Multi-Spawn, Scoreboard Fix, Frontier Rework, Mobile Units, Kamikaze
- Creeps now spawn from ALL entry points (round-robin distribution).
- Scoreboard economy section is now a proper table, positioned dynamically.
- Unique frontier buildings per new faction (Breeding Pool, Crypto Mine, Soul Well, etc.).
- **Alien Swarmling** (15g): cheap mobile melee unit, stackable.
- **Infernal Fiend** (20g): kamikaze — sprints to creep, explodes for 80 AoE, self-destructs.
- Tower lifecycle: expires_after_waves, decay_per_wave, life_on_kill, leak_absorb all wired.

### 5 New Factions (11 total)
- **Spawn Aliens** (7): Spitter, Stinger, Swarm Node, Acid Sprayer, Hive Spire, Swarmling, Overmind. Extreme fire rates, faction speed aura.
- **Cypherpunk** (7): Ping, Firewall (linked beams), Virus (spreading DoT), Backdoor (hack reverse), DDoS (AoE root), Rootkit (mute + shred), Zero Day. Digital warfare.
- **Infernal** (6): Imp (expires), Hellfire (decays), Soul Drain (gold/kill), Fiend (kamikaze), Immolate, Apocalypse. Sacrifice and decay.
- **Celestial** (5): Acolyte (life on kill), Ward (mute mages), Smite (+50% vs boss), Sanctuary (absorb leaks), Absolution. Holy protection.
- **Psionic** (5): Probe (true damage), Mesmer (confusion), Terror (fear aura), Mind Spike (+50% vs mages), Overmind. True damage ignoring armor.
- New traits: true_damage, confuse_on_hit, life_on_kill, mute_mage_aura, leak_absorb, bonus_vs_boss/mage, firewall_link, virus_spread, hack_reverse, expires_after_waves, decay_per_wave, gold_per_kill_range, faction_speed_aura, damage_cap_shield.
- Creep confusion (walk backward), muted (suppress abilities), virus DoT.

### Score Screen Economy Fix
- totalGoldEarned now properly tracked (kill gold, wave income, frontier, tower gold-on-hit).
- totalGoldSpent tracks tower, send, and frontier purchases.

### Resolution + UI Improvements
- 28px tiles, 36x26 grid (1368x808 canvas). Denser playfield.
- Tower bar: 68px tall, 52px buttons. Font sizes +2px across all UI.
- Income display moved to tower bar top-right.

## 2026-03-16

### Multiplayer Polish: Settings, Speed Sync, Chat, Ping, Disconnect, Mirrored Waves
- **Host map/difficulty picker**: host selects map and difficulty in the lobby before faction pick. Joiner sees host's choices via game_start message.
- **Speed sync**: when host changes speed (TAB), a `speed_change` message syncs to joiner. Joiner sees "Host set speed: 2x" in event log.
- **Tower upgrade sync**: `tower_upgraded` message sent when upgrading towers, with new level. Opponent minimap reflects upgrade levels.
- **Opponent wave counter**: `wave_cleared` now includes wave number. Opponent minimap shows accurate wave count.
- **In-game chat**: press ENTER to open a prompt. Messages appear in event log as `[YOU]` and `[OPP]`. Uses `chat` message type.
- **Ping display**: automatic ping/pong every 3 seconds. Latency tracked in VersusManager.
- **Disconnect detection**: if WebRTC connection fails, event log shows "Opponent disconnected!" and game continues as solo. Versus manager detached cleanly.
- **Mirrored waves**: shared seed from host sent via game_start. SpawnManager uses seeded PRNG for deterministic wave shuffle. Both players face identical spawn order.
- Rematch: returns to menu (reconnection via new lobby session).

### Gameplay Fixes: Blossom, Random Frontier, Shielded Creeps, Multiplayer UX
- **Blossom tower** reworked: no damage, no attack. Pure adjacency buff aura. Range 1.5 tiles = adjacent only. Description clarified.
- **Random faction frontier**: 2 random frontier buildings from all faction pools each wave. Rotates on wave clear alongside tower pool. FrontierPanel rebuilds purchase list dynamically.
- **Shielded creep** type: energy shield caps damage to 1 per hit until shield breaks (15 hits, 25 on hard). Mana Drain's strip_shield instantly depletes both HP shields and damage-cap shields. Appears from wave 13+.
- **Meteor** confirmed location-targeted (splash_damage is already location-based — projectile continues to destination if target dies).
- **Multiplayer lobby** reworked: host picks map + difficulty, both players see faction picker after connection. Factions sent via game_start message.
- **Versus wave timer**: 30s countdown auto-starts on game begin and after each wave clear. Status bar shows `[SPACE] Ready (25s)`. Wave starts when both ready OR timer expires.
- **Boss leak** costs 5 lives instead of 1. Event log shows "BOSS leaked! -5 lives".

### Versus Multiplayer (P2P WebRTC)
- **Peer-to-peer multiplayer** — no server required. Uses WebRTC data channels with manual SDP exchange (copy-paste offer/answer codes).
- **Lobby scene**: Host generates offer code (copied to clipboard), Joiner pastes it and generates answer code. Connection established directly between browsers.
- **Sends go to opponent**: in versus mode, your send purchases spawn extra creeps in the opponent's game, not yours. Opponent's sends come to you.
- **30s wave timer**: between waves, both players have 30 seconds to build/send. Press SPACE to vote ready — wave starts when both ready OR timer expires.
- **Opponent minimap**: top-right of game area shows opponent's tower placements, lives, wave count, and ready status with countdown timer.
- **State sync**: tower placed/sold/upgraded, sends purchased, lives updates, wave ready votes. Creep movement is deterministic and simulated locally.
- **VersusManager**: handles connection, message routing, opponent state tracking, wave timing, incoming send queuing.
- Menu has "VERSUS MULTIPLAYER" button leading to the lobby.

### Game Speed Control
- **TAB** cycles through speed: 0x (frozen), 0.5x, **1.0x** (default), 1.5x, 2.0x, 3.0x.
- Speed indicator in bottom-right of HUD: `[TAB] 1.0x`. Red at 0x, yellow at fast speeds.
- Multiplies delta time — all game systems (towers, creeps, spawning, DoTs, traits) scale uniformly.
- Speed 0x acts as a soft pause (UI still responsive, can build/sell).
- Speed logged in event log on change.

### Military Faction, Mobile Unit Towers, Fighter System Removed
- **Military faction** (6 towers): Sandbag (8g wall), Barbed Wire (adjacent slow), Rifleman (mobile ranged), Brawler (mobile melee), Tank (mobile AoE, long range), Commander (750g ultimate, mobile + buff aura).
- **Mobile unit tower trait** (`mobile_unit`): towers that physically move to engage nearby creeps, deal melee/short-range damage, then return to their placement position. Renders as diamond shape with home-position marker when away. Each unit has moveSpeed, engageRange, leashRange, attackCooldown, optional attackSplash.
- **Barbed Wire trait** (`barbed_wire`): passively slows all creeps within 1.5 tiles of the tower.
- **Removed old Fighter system** from all factions. FighterPanel, FighterManager no longer wired in GameScene. Mobile combat is now handled through the tower trait system, giving better UI integration (tooltips, upgrades, stats tracking all work automatically).
- Updated FACTIONS.md with Military faction guide.

### Upcoming Waves, Spore Rework, Score Screen, Heal Mage
- **Upcoming Waves panel** at top of sidebar showing next 3 waves with creep types, counts, and boss markers. Updates on wave start/clear.
- **Spore tower rework**: new `tower_aura_damage` delivery trait — damages all creeps within radius of the tower itself, not the projectile target. True area denial.
- **Score screen** replaces basic game over. Tower performance table (total damage, avg DPS, gold earned, shots, count), economy section (frontier ROI%, send investment, kill efficiency), fun stats (MVP tower, best earner), high scores.
- **Heal Mage** creep: periodic flat heal aura (15 HP/0.8s). Heal scales with difficulty toughness. Rotates into mage pool wave 18+.
- **Difficulty hints in event log**: logs modifier values at game start.
- **StatsTracker** system records per-tower-type damage/gold/shots/time throughout the game.

### Difficulty System, NoBuild Terrain, 7 New Creep Types
- **Difficulty selection** (Easy/Normal/Hard) on menu. Each creep type interprets difficulty individually — armored gets tankier not more numerous, swarms multiply aggressively, bosses get bigger shields on hard.
- **NoBuild terrain**: new cell type — creeps walk through, towers can't build. Visual X pattern. Added to all 3 maps for strategic constraint.
- **7 new creep types** (14 total): Group (burst spawn), Splitter (splits into children on death), Iron Mage (armor aura), Haste Mage (speed aura), Mist Mage (evasion aura), Evasive (25% dodge), Flying (ignores maze).
- New traits: evasion, split_on_death, armor_aura, speed_aura, evasion_aura, flat_heal_aura.
- Flying creeps use direct-line path from entry to exit, bypassing all maze walls.
- SpawnManager handles group burst spawning, flying paths, and split-on-death child spawning.

### Location-Based Projectiles, Ability Scaling, Percentage Modifiers
- **Location-based projectiles**: splash/pierce/aura towers fire at a location, not a unit. If target dies mid-flight, projectile continues to destination and still explodes. Direct damage towers still track.
- **Abilities scale with tower level**: slow duration +15%/lvl, burn DPS +20%/lvl, crit chance +3%/lvl, splash radius +10%/lvl, root chance +3%/lvl, and more.
- **Percentage-based speed modifiers**: adjacency buff and overclock use percentages instead of flat ms values.
- Faction select: removed ultimate markers (gold text, asterisks).

### Major Tower Roster Redesign, Random Faction, Creep Inspection
- **Asymmetric faction sizes**: Mechanical 8, Arcane 7, Nature 6, Void 5 towers. Trimmed towers that didn't fit faction identity.
- **Cost scaling**: 2-3 cheap starters per faction, mid-game towers, 1-2 Ultimates (600-900g). Wide cost variance instead of everything compressed in 20-70g.
- **Per-tower upgrade design**: Thorn has 5 levels, Frost has 0, Gambler has 1. Each path is unique.
- **4 Ultimate towers**: Titan Cannon (800g), Arcane Nova (700g), Elder Treant (600g), Oblivion (900g).
- **Random faction**: replaces Generic. 6 random towers from all factions each wave. Pool rotates on wave clear. Bought towers persist.
- **Creep inspection**: click any creep to see HP, armor, speed, active status effects with durations.
- **Tower tooltips**: hover over tower bar buttons for full stat breakdown.
- Hotkeys expanded to 1-8.

### Tower Expansion (28 Towers), 13 New Traits, Event Log
- Expanded all factions to 7 towers each (later rebalanced to asymmetric).
- 13 new trait handlers: crit_chance, jackpot, pierce_delivery, burn_dot, poison_dot, strip_shield, armor_shred_on_hit, damage_amp_on_hit, root_on_hit, spell_amp, overclock_buff, slow_aura, growth_scaling.
- Extended StatusEffects: burn (flat DPS), poison (% HP DPS), root (full stop), armor_shred (tier reduction), damage_amp (incoming multiplier).
- **Event log** in sidebar: wave starts, clears, tower builds/sells, sends, frontier actions, creep leaks.

### Pause Menu
- Press P for centered pause overlay with Resume and Exit to Menu buttons.

### Tower Inspect Fix, Hover Tooltips
- Fixed tower inspect mode: `enterInspectMode` calling `towerBar.deselect()` no longer triggers `enterNoneMode()`.
- Hover tooltips on tower bar buttons showing name, cost, stats, traits, upgrade count.

### Send System Improvements
- Z/X/C/V hotkeys for send types.
- Adaptive batching: 40 sends clear in ~2.5s instead of 16s.

### Frontier Grouped View
- `[v] Group` toggle: groups same-type buildings with batch action buttons.
- Fixed owned buildings visibility (container rendering order).

### Left Sidebar Layout, Selection Modes, Frontier Fixes
- 300px left sidebar: Sends on top, Frontier below, Event Log at bottom.
- 3-mode selection: Build / Inspect / None. Clicking tower bar toggles selection.
- Frontier: fixed income double-counting, wired overcharge/dig/harvest actions.
- Click-through fix: sidebar clicks don't reach the grid.

### Trait System Refactor
- Core trait architecture: composable behaviors with handler registry and resolution pipeline.
- 5-phase resolution: damage modifiers → delivery → hit effects → fire rate → updates.
- Migrated all tower/creep data to trait arrays.
- Removed all hardcoded `if (ability === ...)` chains from Tower.ts.

### Initial MVP Implementation (Phases 0-7)
- **Phase 0**: Architecture foundation — EventBus, EconomyManager, SpawnManager, InputManager, UIOverlay.
- **Phase 1**: 4 tower types (Arrow/Cannon/Sniper/Slow), 3-level upgrades, status effects, tower selection bar.
- **Phase 2**: 6 creep types, armor/damage type system, data-driven waves, 3 match modes, MenuScene.
- **Phase 3**: 4 factions with unique towers, faction abilities, FactionSelectScene.
- **Phase 4**: Fighter system — autonomous combat units per faction.
- **Phase 5**: Income system, send system, income breakdown display.
- **Phase 6**: Frontier economic side-game with faction-flavored mechanics.
- **Phase 7**: 3 maps, draft modifiers, game over screen, score tracking, pause.
