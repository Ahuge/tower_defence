# Plan — Campaign #3: "The Greenward" (Nature)

**Status:** Active planning, ready for execution.
**Owner:** Alex
**Trigger:** Two campaigns shipped (Arcane Reckoning, Iron Cascade). Bag-of-flags v2 refactor merged (PR #73) so campaign-specific behaviors can hang off the trait pipeline without touching `Tower.ts`. Time for the third campaign.

---

## Brief

Ten-mission narrative campaign for the Nature faction. Polish target: at or above the two existing campaigns. Quality means it feels uniquely fun (mechanics that exist only here), gives genuine challenge (no 3-star clear without focus), and pulls the player back for replay. Player is locked into the Nature tower kit throughout (`defaultPlayerFaction: 'nature'`), matching the Iron Cascade pattern.

Two campaign-unique gameplay systems. Final mission must feel epic but distinct from "kill the boss tower" — both prior finales ended that way.

All narrative writing reviewed by a professional-writer agent per CLAUDE.md convention; three blind-comparison versions for every major creative choice (lore foundation, finale concept).

---

## Lore foundation

**The Greenward.** Marra Greenward argued against the pact and lost the vote. Now she is the one bound to execute it.

The kingdoms south of the Wildwood are dying — their fields salt, their cities still, their queens silent. The forest will spread south. Stone will learn to root. The promise is a kindness and a terror both. The cities the Wildwood was promised are not empty: **the Inheritors** moved in when the queens fell. Some hold a banner. Some hold a worse thing entirely.

Marra walks south one settlement at a time, until she reaches **Caer Lythen, the Sun-Cathedral** — and decides, at its overgrown threshold, what the forest will be when it arrives.

### Named cast

- **Marra Greenward** — POV, the Druid who lost the vote, bound to execute the pact.
- **The Inheritors** — antagonist class; things that moved into empty thrones.
- **The Heron of Eadwin** — recurring named figure. Silhouette glimpsed from M3 onward; never close until M10. Three-fate finale figure.
- **Cethric the Crow-Priest** — M4 Mercy Watcher. Returns in M8 as a body in the court antechamber.
- **Erion of the Inner Council** — M6 coop bot-Druid. The only Druid who voted yes that Marra still speaks to.
- **Caer Wenna** — the player's Elder Treant after it persists across two missions. By Act III she has a name; she dies between M7 and M8 from the cost of the long road.
- **Hennel the Child** — M6 Tarrenford civilian who hands Marra a flower. Counterpoint to the M8 Stillborn Court Child.

### Tone

Terse-narrative medieval-fantasy. Match Arcane Reckoning + Iron Cascade register. Each mission story is 1-2 paragraphs: situation, then kit/tool. Avoid flowery diction unless it earns its place.

---

## Two unique gameplay systems

### 1. Consecration Modes (signature)

Each mission has 1-3 **ruin tiles** that must be claimed. Each ruin is locked to one of three modes:

- **Ceremony** — place a Blossom adjacent to the ruin; hold the channel for ~10s without the Blossom taking damage. The ruin consecrates.
- **Siege** — kill the defending Inheritor creeps. The ruin consecrates automatically when the last defender falls.
- **Mercy** — a "Watcher" creep sits on or near the ruin. Kill every non-Watcher in the area without touching the Watcher. The ruin consecrates; the Watcher remains.

Mode distribution across the 10 missions: **Ceremony 7 / Siege 7 / Mercy 5** (Mercy gets rehearsal in M3 / M4 / M7 / M8 before the M10 Nave-choice).

**Consecrated ruins** count toward star objectives and give passive boons (gold gen + adjacent-tower attack speed). The campaign-wide tally of which modes Marra favoured **gates the M10 Nave choice** — Ceremony-leaning unlocks the Ceremony ending; Mercy-leaning unlocks Mercy; else Siege fallback.

### 2. Wildwood Reserves (supporting)

A second persistent campaign resource. Starts at 100 at M1. Each Nature tower placed in a mission costs gold **and** a fraction of Reserves (cheap towers cost 2-3, expensive towers 8-12). Reserves regen ~10% between missions and **never recover fully**. Late missions naturally feel strained.

Surfaced as a sap-meter in the campaign-lobby state panel (via existing `CampaignStatePanelRegistry`) and a smaller HUD readout in-mission. If Reserves hit 0 mid-mission, no more tower placement until the next mission (the player must hold with what's already on the board).

**Reserves zero in M10's Courtyard** narrows the Nave: only Siege is available; Ceremony and Mercy lock. Failure as the campaign's thesis, not as game-over.

### Caer Wenna (the tower-grief beat)

The player's Elder Treant persists across missions via `PersistedTowerState`. By the time the same Elder has appeared in two missions (e.g. M5 and M6), her growth-stacked stats are non-trivial; she has, in effect, a personality. In M7 (Wedding-Stone, frugal), she **cannot be re-placed** — Reserves cannot spare her. The error message reads: *"Caer Wenna has grown old. The grove cannot spare her again."*

She is referenced once more in M8's intro: *"The eastern slope where Wenna stood is quiet now."* Mechanical failure becomes character.

### The Heron of Eadwin (recurring face)

Four states across four missions:
1. **M3** — silhouette on the inn's chimney. Does not move. No interaction.
2. **M6** — perched on the chapel roof in Tarrenford. Watches.
3. **M8** — **escalation:** walks the Stillborn Court behind the Child. He does not stand on roofs anymore.
4. **M10** — full creep, at the cathedral altar. Three fates depending on Marra's mode-lean.

---

## Arc skeleton (10 missions, three acts)

### Act I — The Border (M1-M3)

**M1 — The Boundary Stones** *(interrupt; 1 Ceremony)*
Marra steps over the boundary stones at sunrise. The pact is invoked. Tutorial Ceremony at a wayshrine where the grain pilgrims left is two hundred winters deep. Inheritors absent.
*Star 2:* Wayshrine claimed. *Star 3:* Blossom took no damage during the channel.

**M2 — The Salt Meadow** *(restriction: Bramble + Root only; 2 Ceremony + 1 Siege)*
The meadow turned saline four summers back. Nothing planted here will live more than a season. Three ruins: two shepherds' cairns + one barrow with a Road-Walker den.
*Star 2:* All three ruins claimed. *Star 3:* ≥70% Reserves remaining at mission end.

**M3 — The Circle at Eadwin** *(interrupt; 1 Siege + 1 Mercy. **Heron silhouette introduced.**)*
The inn-village. The hearth still burns; the old innkeeper still sits at it; Road-Walkers chant in the square. Above the inn, a heron stands on the chimney.
*Star 2:* Both ruins claimed + Watcher (old woman) unharmed. *Star 3:* Star 2 + chant interrupted within first 60s.

### Act II — The Salt Roads (M4-M7)

**M4 — The Road of Crows** *(interrupt, Mercy variant; 1 Mercy + 1 Ceremony. **Cethric the Crow-Priest.**)*
A crow-priest sits cross-legged at a marsh crossroads. Messenger Inheritors come to him and leave. Not a splash of damage may touch him.
*Star 2:* Watcher unharmed. *Star 3:* Star 2 + Reserves spent ≤80.

**M5 — The Dry River** *(speedrun; 1 timed Ceremony + 2 Siege)*
> "The river is going salt as Marra watches. By the time the sun touches the high stones it will be brine, and every grove drinking from it downstream will brown in their season. The headwater is a four-pool ladder upstream — she has minutes, not hours, to sing it clean. Two ruins lie between her and it, Inheritor-held; she has no time to be quiet about either."
*Star 2:* Headwater Ceremony completed. *Star 3:* Star 2 + mission ≤6 minutes.

**M6 — Tarrenford** *(coop_with_bot — Erion partners; 3 Ceremony. **Heron on chapel roof.**)*
Forty-seven people still live here. The chapel, the well, the wheat field — each a slow song. Hennel the Child gives Marra a flower at the gate. The Heron watches.
*Star 2:* All three ruins claimed. *Star 3:* Star 2 + no civilian deaths.

**M7 — Wedding-Stone** *(frugal; 1 Mercy + 1 Siege. **Caer Wenna refusal. Send-saplings mini-mechanic.**)*
A wedding turned to stone forty winters ago. Read the bride among her own livery; do not touch her. *"She had argued for the long road. This is the long road."* The mini-mechanic: a one-time "send the saplings" action burns a Reserves chunk to skip a wave — plants M9 as Marra's choice.
*Star 2:* Watcher (bride) unharmed. *Star 3:* Star 2 + ≤2 distinct tower types used.

### Act III — The Sun-Cathedral (M8-M10)

**M8 — The Stillborn Court** *(boss_rush; 1 Siege + 1 Mercy. **Heron walks. Cethric's body referenced. Caer Wenna acknowledged.**)*
Three courtiers: Knight, Herald, Child. Two die; the Child does not. The Heron walks the court behind her. *"The eastern slope where Wenna stood is quiet now."*
*Star 2:* Knight and Herald killed. *Star 3:* Star 2 + Child takes no damage from any source (AoE-positioning puzzle).

**M9 — The Last Garden** *(attacker; 1 Siege, attacker mode)*
> "The watchtower on the Caer Lythen road is built of grove-wood. Marra has walked past it nine times. Today she stops, turns, and opens the Wildwood the other way — saplings, vipers, brambles pulled out of the soil and walked forward in their own roots. The forest does not defend today."
*Star 2:* Won. *Star 3:* Star 2 + ≥3 different Nature creep-units sent.

**M10 — Caer Lythen, the Sun-Cathedral** *(final_greenward — three setpieces.)*

**Intro:** *"Marra Greenward stands at the cathedral gate at dusk. The grain at the cathedral threshold is two hundred winters deep — and there is a Tarrenford courier at the postern, with a letter still warm. The Sun-Cathedral was meant to face east, but its façade has turned toward the Wildwood across all those winters. Inside, the Heron of Eadwin waits at the altar. He has been waiting for her since Eadwin. He has not been waiting alone."*

- **Setpiece 1 — Courtyard** *(always Siege, ≤5 waves, tight)*
  The cathedral's outer guard must fall. Caer Wenna's absence is mechanically punishing here — there is a wave that the player would normally have walked past with the Elder placed; without her, it bites.

- **Setpiece 2 — Nave** *(the choice, gated)*
  Player's mode-lean tally (surfaced in HUD from M7) gates which paths are available:
  - **Ceremony lean** (≥3 Ceremony-favoured): place a Blossom at the altar; the Heron watches but does not strike; hold the long channel as the nave fills with light. Heron's line: *"You sang it kindly. I will lie here."*
  - **Mercy lean** (≥3 Mercy successes): the Heron IS the Watcher. Defend the nave from his court without touching him; he kneels at the end. Heron's line: *"You spared the watchers. I was the last of them."*
  - **Siege lean / fallback**: the Heron leads his last court. A fight. Heron's line: *"Then we both go honest into the wood."*
  - **Reserves-zero override**: if Reserves were burned dry in the Courtyard, only Siege is available regardless of mode-lean. The Nave narrows.

- **Setpiece 3 — Throne** *(fixed defense, the consequence)*
  The world reacts. Meteorological + ecological hostility pushes back against the consecrated cathedral. Survive the world's response. The forest holds.

**Final tableau** — three static illustrated end-cards (TSX-generated), one per path:
- *Ceremony:* Sun-Cathedral crowned in vines, light through stained glass.
- *Mercy:* The Heron asleep on the throne, the cathedral preserved around him.
- *Siege:* The cathedral hollow, the forest entire.

Each ending has a 2-3 sentence outro paragraph in `greenward.texts.ts`. No canonical "best" — Reserves cost itself argues for Mercy (gentlest path = lowest Reserves drain) as the NG+ pursuit.

*Star 2:* Won. *Star 3:* Star 2 + Nave committed to Ceremony or Mercy (no Siege fallback).

---

## Sprite + system manifest

### Art deliverables

| Asset | Count | File / location |
|---|---|---|
| Inheritor creep variants | 9 | `greenward_campaign_sprites.tsx` → `public/assets/arena/` |
| Named Watchers | 4 | Old Woman, Cethric, Stone Bride, Heron (4 states) |
| Inheritor defender CPU towers (M9) | 3 | Reuse Mech sabotage destructible-tower system, Inheritor skin |
| Maps | 10 | JSON via `/editor.html` → `src/data/maps/` |
| New terrain palettes | 4 | Salt-meadow tint, marsh, drying-river (animated), cathedral interior |
| UI: Wildwood Reserves meter | 1 | Lobby panel + mission HUD |
| UI: Mode-lean heraldic emblems | 3 | Lobby HUD from M7 |
| UI: Ruin-tile mode overlays | 3 | Per-mode visual marker on map grid |
| UI: Mercy AoE-warning overlay | 1 | Tower-range red-tint over Watcher cells |
| End tableaux | 3 | Static illustrated end-cards (TSX-generated) |
| Erion bot-Druid avatar | 1 | M6 coop partner |

All sprite generation via the established TSX convention: new file `greenward_campaign_sprites.tsx` at repo root + render script `scripts/render_greenward_campaign_sprites.ts`.

### Code systems

| System | New file | Risk |
|---|---|---|
| ConsecrationManager | `src/systems/greenward/ConsecrationManager.ts` | **High** — central new gameplay |
| WildwoodReserves | `src/systems/greenward/WildwoodReserves.ts` | Low — small `PlayerProfile.campaignState` extension |
| ModeLeanTracker | `src/systems/greenward/ModeLeanTracker.ts` | Low |
| PersistedTowerState (Caer Wenna) | `src/systems/greenward/PersistedTowerState.ts` | Medium — new cross-mission state |
| MercyWatcher | `src/systems/greenward/MercyWatcher.ts` | Medium — UI integration |
| HeronSpawner | `src/systems/greenward/HeronSpawner.ts` | Low — mostly sprite work |
| Inheritor creep types | `src/data/InheritorCreeps.ts` | Low — data |
| `final_greenward` archetype | extension of `src/data/campaigns/MissionArchetypes.ts` | Medium — most bespoke archetype yet |
| Greenward campaign data | `src/data/campaigns/greenward.ts` + `greenward.texts.ts` | Low |
| Greenward traits | `src/systems/greenward/GreenwardTraits.ts` | Low — uses bag-of-flags v2 pipeline |
| GreenwardStatePanel | `src/ui/campaign/GreenwardStatePanel.tsx` | Low — single registration in `CampaignStatePanelRegistry` |

### Existing systems reused (themed, not rebuilt)

| Existing | How used |
|---|---|
| Restriction archetype | M2 (Bramble + Root only) |
| Speedrun archetype | M5 (timer + early-clear bonus) |
| Coop_with_bot archetype | M6 (Erion bot Druid) |
| Frugal archetype | M7 (Reserves clamp) |
| Boss-rush archetype | M8 (Knight/Herald/Child cycle) |
| Attacker archetype | M9 (player commands Nature creeps) |
| Interrupt archetype | M1, M3, M4 (Ceremony channel = interrupt) |
| Mech sabotage Damageable contract | M9 Inheritor defender towers |
| Bag-of-flags v2 trait pipeline | ALL new mission state via traits (no fields on `Tower.ts`) |
| CampaignStatePanelRegistry | Greenward registers `GreenwardStatePanel` (Reserves + mode-lean) |
| `/editor.html` map editor | All 10 new map JSONs |

---

## Execution plan (~22 commits, four phases)

Each commit gates on `npx tsc --noEmit` clean + full unit suite green + applicable e2e green.

### Phase 1 — Foundation (4 commits)
1. `docs/greenward-campaign-plan.md` (this doc)
2. Campaign skeleton: `final_greenward` archetype stub, empty `greenward.ts/.texts.ts` that compiles
3. WildwoodReserves system + `PlayerProfile.campaignState` extension + tests
4. PersistedTowerState (Caer Wenna) + tests

### Phase 2 — Core systems (5 commits)
5. ConsecrationManager primitives (Ceremony / Siege / Mercy) + tests
6. MercyWatcherSystem + AoE-warning UI + tests
7. ModeLeanTracker + GreenwardStatePanel + lobby HUD integration
8. HeronSpawner + Heron sprite states (4)
9. Inheritor creep types + `greenward_campaign_sprites.tsx` + render script

### Phase 3 — Missions (10 commits, 1 per mission)
10. M1 — The Boundary Stones
11. M2 — The Salt Meadow
12. M3 — The Circle at Eadwin (Heron M3, Old Woman)
13. M4 — The Road of Crows (Cethric)
14. M5 — The Dry River
15. M6 — Tarrenford (Erion bot, Hennel the Child, civilians)
16. M7 — Wedding-Stone (Caer Wenna refusal, send-saplings option)
17. M8 — The Stillborn Court (Knight/Herald/Child, Heron walks)
18. M9 — The Last Garden (attacker, defender towers)
19. M10 — Caer Lythen, the Sun-Cathedral (three setpieces, Nave branching)

### Phase 4 — Polish (3 commits)
20. Three M10 ending tableaux + integration
21. E2E Playwright spec (Greenward smoke + happy-path through all 3 endings)
22. CHANGELOG + README + FACTIONS.md + balance pass

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ConsecrationManager scope | High | The most novel system. Spike commit 5 in isolation; validate with one early mission before all 10 land. |
| `final_greenward` three-setpiece archetype | Medium | The most bespoke mission archetype yet. Land the framework in commit 19 with all three setpieces functional but only Siege path open; layer Ceremony/Mercy on top once Siege works end-to-end. |
| Caer Wenna persistence depth | Medium | Cross-mission tower state hasn't existed before. Test thoroughly in commit 4. |
| Mode-lean gating UI | Medium | Players must understand their tally before the M10 Nave or it's a gotcha. Surface in commit 7 (lobby panel), reinforce in mid-mission cards from M7. |
| Scope creep on sprites | Medium | 9 Inheritor variants + 4 Watchers + 3 defender towers + 3 endings is the largest sprite ask of any campaign. Bake-script automation matters. Maintain a "v1 = procedural OK" stance per project memory; bespoke art lands later. |

## Safety nets

- Full unit suite (645+ tests) + the bag-of-flags v2 damage/render pipelines exercised by every new trait.
- E2E spec at commit 21 asserts state through the M10 nave-branching, not just gameplay completion — catches mode-lean regressions.
- Each mission commit is self-contained; M10 doesn't require M9 to ship.
- The two-system focus (Consecration + Reserves) means systems work is front-loaded in Phase 2 — missions in Phase 3 are mostly content + map data + tests.

## Effort estimate

22 commits, 4-6 focused sessions with `/goal` driving execution. Higher upper bound than the bag-of-flags PR (10 commits) because campaigns are content-heavy: 10 missions × story prose + balance + map design adds up.
