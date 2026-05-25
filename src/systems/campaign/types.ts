/**
 * Campaign Extension types — the authoritative schema after the
 * campaign-aspect refactor.
 *
 * See `docs/campaign-aspects-refactor-prd.md` and
 * `docs/adr/0001-campaigns-as-aspect-modules.md`. Glossary in
 * `CONTEXT.md`.
 *
 * Design intent:
 *
 *  - Each Campaign is a single module that exports a
 *    `CampaignExtension<TState, TCfg>`. `TState` is the campaign's
 *    cross-mission persistent state; `TCfg` is the typed payload on
 *    each `MissionEntry.campaign`. Both are opaque at the registry
 *    boundary, fully typed inside the campaign module.
 *
 *  - The shared mission schema (`MissionEntry`) is reduced to
 *    identity + objectives + a discriminated `CoreMissionConfig`
 *    keyed by Base Mode + the typed `campaign: TCfg` payload. The
 *    god-object `MissionOverrides` disappears.
 *
 *  - Per-mission behaviour is expressed via `buildRuntime(ctx, mission)`,
 *    which returns a bundle of optional **Aspects** — narrow role
 *    interfaces each consumed by exactly one engine subsystem.
 *
 *  - Mission State (cross-mission persistent state) and UI Surface
 *    (panels, parametric stories, epilogue) are campaign-wide, not
 *    per-mission, so they live as optional fields on the
 *    `CampaignExtension` itself rather than in `RuntimeAspects`.
 */

import type { FactionId } from '../../data/Factions';
import type { MapId, SuppressionPylonSpec } from '../../data/Maps';
import type { DraftModifier } from '../../data/DraftModifiers';
import type { HeroId } from '../../data/HeroTypes';
import type { DifficultyLevel } from '../../data/Difficulty';
import type { WaveDefinition } from '../../data/WaveDefinitions';
import type { ArchetypeId } from '../../data/campaigns/ArchetypeLabels';
import type { EventBus } from '../EventBus';
import type { Trait } from '../traits/Trait';
/** Source-of-truth union of valid `MissionResult.custom` keys.
 *
 *  Two complementary safety layers protect this bag from typos and
 *  cross-campaign collisions:
 *
 *    1. **This union** (compile-time, reader+writer-side) — any
 *       `r.custom.X` access on a key not in this list is a tsc error.
 *       So is `result.custom = { foo: 1 }` for an unknown `foo`.
 *
 *    2. `customKeys.test.ts` (runtime, writer-side) — scans source
 *       for un-namespaced new keys per the `<factionId>_*` convention.
 *
 *  Adding a new key: append it here AND ensure the customKeys pin test
 *  is satisfied (either by using the `<factionId>_*` prefix or by
 *  adding to GRANDFATHERED with a justification comment).
 *
 *  Why a single union (not per-campaign generics): every reader of
 *  `MissionResult` would otherwise need to know which campaign owns
 *  the result, which doesn't survive the data flowing through
 *  `EventBus.gameWon` / analytics / GameOverScreen. The union is
 *  conservative — keys you don't own are still readable as `undefined`,
 *  but typos fail at compile. */
export type MissionResultCustomKey =
  // arcane
  | 'channelsCompleted' | 'channelsInterrupted' | 'heroDeaths'
  // greenward
  | 'ceremonyClaims' | 'chantInterruptedFastMs' | 'childUnharmed'
  | 'civiliansKilled' | 'distinctCreepUnitsSent' | 'distinctTowerTypesUsed'
  | 'headwaterClaimed' | 'heraldKilled' | 'knightKilled' | 'mercyClaims'
  | 'naveCommittedNonSiege' | 'naveResolvedMode' | 'reservesRemaining'
  | 'reservesSpent' | 'ruinsClaimed' | 'siegeClaims' | 'watcherUnharmed'
  // mech
  | 'attackerLeaks' | 'heroHpMin' | 'sendsBought'
  // void
  | 'hotStreakHit' | 'mirrorWagerWon';

/** Game-end snapshot used to evaluate mission objective predicates.
 *  Moved out of the legacy `CampaignDef.ts` in Phase F so it lives
 *  with the rest of the aspect-runtime types. The runtime contract
 *  between GameScene → MissionRunner.finalize → MissionObjective
 *  predicate / MissionStateAspect.applyMissionResult uses this shape. */
export interface MissionResult {
  won: boolean;
  wave: number;
  durationMs: number;
  livesRemaining: number;
  livesStart: number;
  goldRemaining: number;
  goldEarned: number;
  towerCount: number;
  /** No leaks, no continues. */
  perfectRun: boolean;
  /** Custom counters mode-specific archetypes write here. Keys are
   *  typed (see `MissionResultCustomKey` above) so reader and writer
   *  typos fail at compile. Value type is a union — a field that one
   *  campaign writes as a `number` could be written as
   *  `null | undefined` by a different campaign (or absent entirely).
   *  Use `(r.custom.x as number ?? 0)` patterns, never
   *  `r.custom.x === true` — that fails on string-encoded payloads. */
  custom: Partial<Record<MissionResultCustomKey, number | boolean | null | string>>;
}

// ─── Base Modes ─────────────────────────────────────────────
// The engine-level shape of a mission. See CONTEXT.md ("Base Mode")
// for what does and doesn't qualify. Heist and base_defense are
// Map Topologies, NOT base modes — they reuse the standard engine
// with different map entry/exit layouts.

export type BaseMode = 'standard' | 'hero_defense' | 'circle_coop' | 'attacker';

// ─── Mission Restrictions ───────────────────────────────────
// Identical shape to legacy `MissionRestrictions`. Kept on
// CoreMissionConfig because they're engine-level (input model
// concerns), not campaign-specific.

export interface MissionRestrictions {
  allowedFactions?: FactionId[];
  allowedTowerIds?: string[];
  maxTowers?: number;
  noWalls?: boolean;
  noSends?: boolean;
  noFrontier?: boolean;
  forceHeroId?: HeroId;
}

// ─── Core Mission Config (discriminated by Base Mode) ───────
// Engine-level knobs that exist regardless of campaign. The
// discriminant `mode` makes mutually-exclusive fields structural —
// e.g. `attackerEssencePerWave` only exists on the attacker
// variant, no runtime guard needed.

/** Fields common to every Base Mode. */
interface CoreMissionConfigBase {
  /** Map id. Required — campaigns ship with bespoke faction-themed maps. */
  mapId: MapId;
  /** Wave count override. Tutorial archetypes use small numbers;
   *  final showdowns use 30+. */
  waveCount?: number;
  /** Difficulty override. Default 'normal'. */
  difficulty?: DifficultyLevel;
  /** Starting gold delta. */
  goldStart?: number;
  /** Starting gold multiplier (0.5 = "half cost / half gold"). */
  goldStartMult?: number;
  /** Lives override. */
  lives?: number;
  /** Mission-bound modifier (e.g. lava-tile environment). */
  modifier?: DraftModifier;
  /** Faction the player commands. Defaults via campaign's
   *  `defaultPlayerFaction`, then player's currently-selected faction. */
  faction?: FactionId;
  /** Creep faction. Defaults to the campaign's faction. */
  creepFaction?: FactionId;
  /** Restriction set (towers, sends, frontier). */
  restrictions?: MissionRestrictions;
  /** Per-mission wave script. Replaces the global generator. */
  waveScript?: WaveDefinition[];
  /** Force a specific terrain theme regardless of the map's authored one. */
  mapThemeOverride?: string;
  /** Auto-chain waves: N seconds between waves; undefined = manual. */
  autoChainWaves?: number;
  /** Multiplier applied to creep kill-gold. <1 reduces income. */
  killGoldMult?: number;
}

/** Standard base mode — defender tower defence with the player commanding. */
export interface StandardConfig extends CoreMissionConfigBase {
  mode: 'standard';
}

/** Hero defense — the player owns a single named hero on the field. */
export interface HeroDefenseConfig extends CoreMissionConfigBase {
  mode: 'hero_defense';
  heroId: HeroId;
}

/** Circle co-op — the player + bots share defence around a centre point. */
export interface CircleCoopConfig extends CoreMissionConfigBase {
  mode: 'circle_coop';
  /** Extra multiplier applied on top of the team-size formula. 1.0 = none. */
  coopCreepCountMult?: number;
}

/** Attacker — the player commands the creep waves; the CPU defends. */
export interface AttackerConfig extends CoreMissionConfigBase {
  mode: 'attacker';
  /** Per-wave essence budget the attacker spends in the composer.
   *  When undefined, GameScene falls back to the non-composer attacker
   *  path (legacy parity — Mech M8 ships without a budget). */
  attackerEssencePerWave?: number;
  /** Palette faction for the attacker's send menu. */
  attackerPaletteFaction?: FactionId | 'coalition';
  /** Number of leaks needed for the player (attacker) to win. */
  attackerLeakThreshold?: number;
  /** Defender-AI difficulty. */
  attackerDefenderDifficulty?: 'easy' | 'normal' | 'hard';
  /** Per-wave defender prep order. */
  attackerPrepOrder?: string[];
  /** Additive income growth per wave. */
  attackerEssenceGrowthPerWave?: number;
  /** Carryover cap as a multiple of the current wave's income. */
  attackerEssenceCarryoverMult?: number;
  /** Max Reinforcement Camps the player can build this mission. */
  attackerCampMax?: number;
  /** Essence cost to build one camp. */
  attackerCampCost?: number;
  /** Permanent income each camp adds to every subsequent wave. */
  attackerCampIncome?: number;
}

/** Engine-level mission config, discriminated by base mode. */
export type CoreMissionConfig =
  | StandardConfig
  | HeroDefenseConfig
  | CircleCoopConfig
  | AttackerConfig;

// ─── Mission Entry ──────────────────────────────────────────
// A single Mission inside a Campaign. Reduced from the legacy
// `MissionDef` to identity + objectives + CoreMissionConfig +
// typed campaign payload.

export type MissionObjective = (r: MissionResult) => boolean;

/** Story can be a literal or a function reading campaign state. */
export type MissionStory<TState = unknown> =
  | string
  | ((ctx: { state: TState; lastResult: MissionResult | null }) => string);

export interface MissionEntry<TCfg = unknown, TState = unknown> {
  /** Stable id within the campaign. */
  id: string;
  /** Display order in the lobby (0..9). */
  idx: number;
  /** Display name. */
  name: string;
  /** Two-paragraph story beat for the pre-mission modal. */
  story: MissionStory<TState>;
  /** Star objectives. Star 1 is always "win"; star 2/3 optional. */
  objectives: {
    star2?: { label: string; predicate: MissionObjective };
    star3?: { label: string; predicate: MissionObjective };
  };
  /** Engine-level config (Base Mode-discriminated). */
  core: CoreMissionConfig;
  /** Typed campaign-specific payload. Opaque to the registry; the
   *  campaign module reads it inside its aspects. */
  campaign: TCfg;
  /** Display archetype id — e.g. `'interrupt'`, `'boss_rush'`, `'speedrun'`,
   *  `'final_arcane'`. Used by the campaign lobby to render the mission
   *  card's subtitle + blurb. Source-of-truth union lives in
   *  `src/data/campaigns/ArchetypeLabels.ts`. Distinct from the engine-
   *  level `core.mode`: many missions are `'standard'` mode but show
   *  different archetype labels in the UI. Typed as `ArchetypeId` (const
   *  union) so a typo like `'frugol'` fails at tsc rather than silently
   *  falling back to `'standard'`. */
  archetypeId: ArchetypeId;
  /** When true, the lobby renders the mission as unimplemented and
   *  `MissionRunner.startV2` is expected to refuse the launch (e.g.
   *  Snake Eyes M10 until the Counterfactual controller lands).
   *  Defaults to false. */
  unlaunchable?: boolean;
}

// ─── Aspects ────────────────────────────────────────────────
// Six narrow role interfaces. A Campaign Extension exposes any
// subset.

/** Setup — per-mission, one-shot. Mutates the world at scene init.
 *  Receives a WorldMutator that knows how to install pre-placed
 *  towers, suppression pylons, summoning circles, workshops, ruin
 *  cells, etc. Undo is the world mutator's responsibility (each
 *  mutation records itself so shutdown can roll back). */
export interface SetupAspect {
  install(world: WorldMutator): void;
}

/** Lifecycle — per-mission, per-frame loop + cleanup. Hosts
 *  campaign-specific controllers (Sabotage, GreenwardMission, etc.). */
export interface LifecycleAspect {
  update(deltaMs: number): void;
  shutdown(): void;
}

/** Gameplay — per-mission, subscribes to game events. The
 *  EventBusBridge auto-subscribes at scene init and auto-unsubscribes
 *  at shutdown. Handlers are typed-per-event; an extension implements
 *  only the events it needs. Signatures mirror `EventBus.GameEvents`
 *  so the bridge is a 1:1 forward — campaigns don't need to know how
 *  the engine emits, only what arrives. */
export interface GameplayAspect {
  onTowerPlaced?(col: number, row: number, towerId: string): void;
  onTowerSold?(col: number, row: number): void;
  onCreepKilled?(creepId: number, gold: number): void;
  onCreepReached?(creepId: number): void;
  onCreepSpawned?(creepTypeId: string): void;
  onWaveStarted?(waveNum: number): void;
  onWaveCleared?(waveNum: number): void;
  onGoldChanged?(amount: number, newTotal: number): void;
  onLivesChanged?(newLives: number): void;
  onGameOver?(): void;
  onGameWon?(): void;
}

/** Intercept — per-mission, consumes player input before the
 *  default handler. Each handler returns `true` if it consumed the
 *  action (suppressing the default behaviour) or `false` to let the
 *  default run. */
export interface InterceptAspect {
  onCellClick?(col: number, row: number): boolean;
  onCellHover?(col: number, row: number): boolean;
  onTowerClick?(towerId: string): boolean;
}

/** Mission State — per-campaign (one instance ever, not per-mission).
 *  Owns the typed Campaign State lifecycle: read state, transform a
 *  Mission Entry via dynamic overrides at start, write state at end,
 *  tick between missions. `applyDynamicOverrides` returns a NEW
 *  `MissionEntry` (wholesale rewrite — more powerful than the old
 *  `Partial<MissionOverrides>` merge, and authors must be explicit). */
export interface MissionStateAspect<TState, TCfg = unknown> {
  /** Defaults used on first read after install. */
  defaults: TState;
  /** Read current state from the persistent store; falls back to
   *  `defaults` if the slot is empty. */
  read(): TState;
  /** Write new state to the persistent store. */
  write(next: TState): void;
  /** Transform a mission entry at start using current state. Return
   *  the original entry unchanged when no dynamic adjustment applies. */
  applyDynamicOverrides(state: TState, entry: MissionEntry<TCfg, TState>): MissionEntry<TCfg, TState>;
  /** Update state at mission end using the result. */
  applyMissionResult(state: TState, result: MissionResult): TState;
  /** Update state in the gap between two missions (e.g. Greenward
   *  Wildwood reserves regen `+10`, Snake Eyes' +50g Debt interest
   *  charge). Runs after the prior `applyMissionResult` and before
   *  the next mission's `applyDynamicOverrides`. Receives the
   *  upcoming `MissionEntry` so the implementation can branch on
   *  `entry.idx` (e.g. Snake Eyes' Collector-cancellation check
   *  needs to know which mission is about to start).
   *
   *  Note: most implementations ignore `entry` — it's there for the
   *  rare case where between-mission state transforms need to read
   *  the upcoming mission's id / idx / campaign payload to decide.
   *  Greenward's regen, for instance, doesn't care which mission
   *  is next.
   *
   *  Contract: the returned state is **authoritative** — `MissionRunner.
   *  startV2` calls `write(returned)` after this. Implementations
   *  MAY have side effects on the persistent slot during the call
   *  (e.g. Snake Eyes' `applyMissionStart` writes through the
   *  DebtTracker module's mutator and returns `getSnakeEyesState()`
   *  to satisfy the contract); the subsequent `write(returned)` is
   *  idempotent in that case. Implementations SHOULD prefer being
   *  pure (mutate-and-return like Greenward's regen) — purity makes
   *  the function trivially testable and keeps the persistent-slot
   *  write a single, predictable event. Side-effecting impls are
   *  acceptable when they delegate to a pre-existing module-level
   *  mutator that has its own test coverage. */
  tickBetweenMissions?(state: TState, entry: MissionEntry<TCfg, TState>): TState;
}

/** UI Surface — per-campaign. Provides state panels, parametric
 *  story text, end-of-campaign epilogue text, and the M10-win ending
 *  panel rendered above the mission summary on GameOverScreen. */
export interface UISurfaceAspect<TState = unknown> {
  /** Pre-mission story text. Defaults to the literal `mission.story`
   *  string when not provided. When provided, runs every time the
   *  modal opens so parametric strings reflect current state. */
  parametricStory?(
    mission: MissionEntry<unknown, TState>,
    ctx: { state: TState; lastResult: MissionResult | null },
  ): string;
  /** End-of-campaign epilogue text. Stitched from final-state at
   *  campaign completion (e.g. Snake Eyes' `EpilogueComposer`). */
  epilogue?(state: TState): string;
  /** State panel registrations rendered in the campaign lobby. */
  panels?: CampaignStatePanel<TState>[];
  /** M10-win ending panel rendered ABOVE the regular mission summary
   *  on `GameOverScreen`. Receives a minimal `CampaignEndingContext`
   *  (won + missionIdx + the result's `custom` bag) so the panel can
   *  read mission-specific fields (e.g. Greenward's `naveResolvedMode`
   *  from `custom`). Returns null/undefined to skip the panel; renders
   *  the returned VNode otherwise.
   *
   *  Replaces the prior `archetypeId === 'final_X'` branching in
   *  GameOverScreen — each new campaign with a custom M10 ending
   *  populates this field, no shared-file edit needed. */
  endingPanel?(ctx: CampaignEndingContext): unknown;
}

/** Minimal context passed to `UISurfaceAspect.endingPanel`. Structural
 *  subset of `MissionResultSummary`; lives in `types.ts` to keep the
 *  UI Surface interface engine-layer-pure (no import from `scenes/`).
 *  GameOverScreen builds one of these from its `MissionResultSummary`
 *  when invoking the per-campaign ending panel. */
export interface CampaignEndingContext {
  won: boolean;
  missionIdx: number;
  custom: Readonly<{ [key: string]: number | boolean | null | string }>;
}

/** A state-panel surface rendered in the campaign lobby. The render
 *  return is typed as `unknown` so this generic interface stays
 *  framework-agnostic; the lobby (`CampaignLobbyScreen`) narrows to
 *  the Preact `ComponentChildren` shape at the consumption site. Each
 *  campaign exposes its panels via `CampaignExtension.ui.panels`. */
export interface CampaignStatePanel<TState = unknown> {
  id: string;
  render(state: TState): unknown;
}

// ─── Runtime bundle ─────────────────────────────────────────
// What `buildRuntime` returns: the per-mission aspect bundle.
// Mission State and UI Surface live on the extension itself, NOT
// here, because they're campaign-wide.

export interface RuntimeAspects {
  setup?: SetupAspect;
  lifecycle?: LifecycleAspect;
  gameplay?: GameplayAspect;
  intercept?: InterceptAspect;
  /** Late-init scene-handle attach. Runs AFTER setup + gameplay-bridge
   *  + every subsystem is up. The two payoffs this exists for:
   *
   *    1. **Event handlers that need scene refs.** The `GameplayAspect`
   *       bridge forwards `EventBus` events to typed handlers, but the
   *       bridge can't pass `TowerManager` / `EconomyManager` refs —
   *       so a handler that wants to "apply this trait to the tower
   *       that was just placed" has nowhere to reach them from. The
   *       Snake Eyes wager-trait listener is the canonical example
   *       (per-tower trait injection on `towerPlaced`).
   *
   *    2. **One-shot scene-side effects keyed off the controller.**
   *       Snake Eyes' `applyMissionStartEffects(economy)` credits the
   *       player with the wager's `goldDelta`. Needs `economy` for one
   *       call; nothing else.
   *
   *  Return a detach function (or void). The detach runs in
   *  `GameScene.shutdown` BEFORE the EventBus is cleared, so any
   *  per-listener `bus.off` inside it has a live bus to talk to. */
  attach?(handles: SceneHandles): (() => void) | void;
}

/** Narrow scene-handle bundle passed to `RuntimeAspects.attach`.
 *
 *  Intentionally narrow — only the methods one or more shipped
 *  aspects actually call. Growing this interface is fine when a new
 *  campaign needs a new handle; the deliberate friction is that you
 *  have to come HERE (and to `GameScene`'s adapter that builds it)
 *  to do so. That visibility is the point: campaign code can't
 *  reach random scene internals via a `GameScene` reference, only
 *  the surface exposed here.
 *
 *  The shapes below are structural duck types — they don't import
 *  `EconomyManager` / `TowerManager` / `Tower` directly so the type
 *  surface stays decoupled from the engine class hierarchy. The
 *  adapter in `GameScene.create` is the one place where the structural
 *  match becomes nominal. */
export interface SceneHandles {
  /** Add or subtract gold. Negative subtracts. Used by Wager
   *  `onMissionStart.goldDelta` and similar one-shot economy effects. */
  economy: { addGold(amount: number): void };
  /** Look up the live tower at a grid cell, or null if the cell is
   *  empty. The returned shape exposes only `traits` for mutation;
   *  campaigns wanting other tower mutations should add narrow
   *  methods here rather than widening this type to the full Tower
   *  class (which would tempt access to private fields). */
  towerMgr: {
    getTowerAt(col: number, row: number): { traits: Trait[] } | null;
  };
  /** The runtime event bus. Already wired to the `GameplayAspect`
   *  handlers via `attachGameplayAspect`; available here for
   *  attach-time listeners that need scene-side context the bridge
   *  can't pass (e.g. Snake Eyes' towerPlaced wager-trait injection
   *  reads `towerMgr` AND subscribes to the event). */
  eventBus: EventBus;
}

// ─── World mutator ──────────────────────────────────────────
// Helper interface passed to Setup aspects. Each method records its
// mutation in a `mutations[]` list so `shutdown` can undo cleanly.
// Phase B implements the concrete `WorldMutator` against `GameScene`;
// the type here is the interface aspects program against.

export interface PrePlacedTowerSpec {
  towerId: string;
  col: number;
  row: number;
}

export interface SummoningCircleSpec {
  col: number;
  row: number;
  /** Phase C may add per-circle config (charge requirement etc.). */
}

export interface WorkshopSpec {
  col: number;
  row: number;
  /** Workshop train cost (gold). Default 150g. */
  trainCost?: number;
  /** Workshop cooldown between trains (ms). Default 5000. */
  trainCooldownMs?: number;
}

export interface DestructibleTowerSpec {
  towerId: string;
  col: number;
  row: number;
  hp?: number;
  ownerIndex?: number;
}

export interface ActionInterceptHandle {
  /** Detach the intercept. Called automatically on Setup undo. */
  release(): void;
}

/** Shape of a Greenward ruin spec at the host boundary. Duplicated
 *  from `systems/greenward/ConsecrationManager.ts` so the WorldMutator
 *  infra doesn't import campaign-specific code. */
export interface RuinSpecLike {
  id: string;
  col: number;
  row: number;
  mode: 'ceremony' | 'siege' | 'mercy';
}

/**
 * WorldMutator — install* helpers that aspect Setup methods call.
 *
 * Two flavours of install methods coexist by design (see
 * `docs/adr/0002-deferred-worldmutator-god-object.md`):
 *
 *   - **Campaign-specific atomic installs** (`installMechSabotage`,
 *     `installArcaneFinale`, `installGreenwardRules`,
 *     `installPrePlacedTowers`, `installSuppressionPylons`) —
 *     the canonical pattern. Each takes a single rich rules object
 *     and the host atomically constructs the controller + render +
 *     send-path overrides + DOM listeners. ADR-0002 accepts this as
 *     the pattern; campaigns whose finale controller doesn't
 *     decompose cleanly into narrow primitives should add a new
 *     `install<Campaign>Rules` method here without ceremony.
 *
 *   - **Narrow primitives** (`installSummoningCircles`,
 *     `installDestructibleTowers`, `installWorkshop`, `applyRuinCells`,
 *     `registerActionIntercept`, `setSendPathOverride`) — latent
 *     infrastructure with no current callers. None of the four
 *     shipped campaigns found them useful in practice. Preserved so a
 *     future campaign that genuinely decomposes can use them; will
 *     be deleted if no campaign adopts them by ~campaign #7.
 *
 * Future campaign #5+: pick the atomic install path by default; fall
 * back to narrow-primitive composition only if your controller's deps
 * decompose cleanly across 2-3 calls.
 */
export interface WorldMutator {
  /** Install one or more pre-placed towers on the grid. */
  installPrePlacedTowers(towers: PrePlacedTowerSpec[]): void;
  /** Install Suppression Pylon devices. Each pylon is registered with
   *  the suppression manager (consumed by `mech_pylon_vent_armor`). */
  installSuppressionPylons(pylons: SuppressionPylonSpec[]): void;
  /** Install summoning circles (Arcane M10 finale). */
  installSummoningCircles(circles: SummoningCircleSpec[]): void;
  /** Install destructible CPU towers (M10 finales — destroy-to-win). */
  installDestructibleTowers(towers: DestructibleTowerSpec[]): void;
  /** Install a Workshop (Mech M10 — trains Raider squad). */
  installWorkshop(spec: WorkshopSpec): void;
  /** Mech M10 sabotage — atomic install of SabotageController + render
   *  + DOM listeners + send-path reverse. The host reads workshop /
   *  destructibles / entries / exits from its mapDef; the aspect just
   *  declares "this mission is sabotage" with the rules. */
  installMechSabotage(rules: import('./WorldMutator').MechSabotageRulesShape): void;
  /** Arcane M10 finale — atomic install of FinaleController + summoning
   *  circles + destructible towers + send-path reverse. Host reads
   *  summoning circles / destructibles / entries / exits from mapDef. */
  installArcaneFinale(rules: import('./WorldMutator').ArcaneFinaleRulesShape): void;
  /** Greenward — install per-mission Consecration runtime + (when
   *  finale) the three-setpiece controller. `MissionStateAspect.
   *  tickBetweenMissions` has already applied reserves regen before
   *  this runs — host MUST NOT regen reserves itself. */
  installGreenwardRules(rules: { ruins: RuinSpecLike[] }, isFinale: boolean): void;
  /** Mark grid cells as ruins (Greenward consecration tracker). */
  applyRuinCells(cells: Array<{ col: number; row: number; mode?: string }>): void;
  /** Register a click-intercept on a specific cell. The handler runs
   *  before the default tower-placement handler; returning true
   *  consumes the click. */
  registerActionIntercept(
    cell: { col: number; row: number },
    handler: () => boolean,
  ): ActionInterceptHandle;
  /** Override the send path (heist / base-defence map topologies). */
  setSendPathOverride(spec: {
    entries?: Array<{ col: number; row: number }>;
    exits?: Array<{ col: number; row: number }>;
  }): void;
}

// ─── Campaign context (passed to buildRuntime) ──────────────
// Read-only view of the world the runtime is being built into.
// Aspects use this to read state at install time (e.g. a Setup
// aspect reading current campaign state to decide how many pylons
// to install).

export interface CampaignCtx<TState = unknown> {
  factionId: FactionId;
  missionIdx: number;
  /** Current campaign state at the moment `buildRuntime` runs (after
   *  `applyDynamicOverrides`, before the mission starts). Aspects
   *  capture by reference if they need to react to live state — but
   *  cross-mission state mutation is the Mission State aspect's job. */
  state: TState;
}

// ─── Campaign Extension ─────────────────────────────────────
// The single module per Campaign. Exposes mission list + typed
// Campaign State + optional Mission State / UI Surface aspects +
// a `buildRuntime` factory for per-mission Aspects.

export interface CampaignExtension<TState, TCfg> {
  /** Faction this campaign targets — the faction the player fights
   *  AGAINST and unlocks by completing. */
  factionId: FactionId;
  /** Display name (e.g. "Arcane Reckoning"). */
  name: string;
  /** Long-form intro shown when the campaign lobby first opens. */
  intro: string;
  /** Long-form outro after the final mission win. May be a literal or
   *  read state. The UI Surface's `epilogue(state)` takes precedence
   *  when present. */
  outro: string;
  /** Cosmetic banner / lobby art id. */
  bannerId?: string;
  /** Audio loop id for the lobby. */
  audioLoopId?: string;
  /** Initial campaign state used on first read after install. */
  initialState: TState;
  /** Campaign-wide terrain theme override applied to every mission. */
  defaultMapThemeOverride?: string;
  /** Campaign-wide player tower-kit faction (e.g. Mech campaign uses
   *  `arcane` throughout — Vael's POV). Per-mission `core.faction`
   *  takes precedence; missions that omit it inherit this default. */
  defaultPlayerFaction?: FactionId;
  /** 10 missions in order. */
  missions: MissionEntry<TCfg, TState>[];
  /** Optional cross-mission state aspect. */
  missionState?: MissionStateAspect<TState, TCfg>;
  /** Optional UI Surface aspect. */
  ui?: UISurfaceAspect<TState>;
  /** Per-mission factory: returns the Aspect bundle for the mission
   *  being launched. Called by `MissionRunner` immediately before the
   *  GameScene starts. */
  buildRuntime(
    ctx: CampaignCtx<TState>,
    mission: MissionEntry<TCfg, TState>,
  ): RuntimeAspects;
}

// ─── Star count (re-exported for convenience) ──────────────
export type StarCount = 0 | 1 | 2 | 3;
