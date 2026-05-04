/**
 * CampaignDef — schema for a per-faction 10-mission campaign.
 *
 * A campaign is *played against* its faction (the player's tower kit
 * faces this faction's creeps + bosses on bespoke maps in the
 * faction's tileset). Beating all 10 missions unlocks playing AS
 * that faction (the unlock route paid for via Shards in Plan 5).
 *
 * Missions are configurations, not net-new modes. Each mission picks
 * a `MissionArchetype` (Standard, BossRush, Speedrun, Frugal, ...)
 * that wraps an existing MatchMode with overrides. Plans 11/12/13
 * later add new archetypes (BaseDefense, Attacker, Heist) without
 * changing this schema.
 *
 * Star ratings (1-3): 1 = win, 2 = win + objective met, 3 = perfect
 * run (objective + stricter condition). Per-mission objectives
 * declared as predicates evaluated at game-end.
 */

import type { MatchMode, WaveDefinition } from '../WaveDefinitions';
import type { FactionId } from '../Factions';
import type { MapId } from '../Maps';
import type { DraftModifier } from '../DraftModifiers';
import type { HeroId } from '../HeroTypes';
import type { DifficultyLevel } from '../Difficulty';

/** Game-end snapshot used to evaluate mission objective predicates. */
export interface MissionResult {
  won: boolean;
  wave: number;
  durationMs: number;
  livesRemaining: number;
  livesStart: number;
  goldRemaining: number;
  goldEarned: number;
  towerCount: number;
  perfectRun: boolean; // no leaks, no continues
  /** Custom counters that mode-specific archetypes can write. */
  custom: { [key: string]: number | boolean };
}

/** Predicate evaluated at game-end. Receives the result snapshot,
 *  returns true if the star objective was met. */
export type MissionObjective = (r: MissionResult) => boolean;

/** Restrictions applied at game start. The mission framework reads
 *  these and either pre-configures GameScene or surfaces them to UI
 *  (e.g. "only Arcane towers available"). */
export interface MissionRestrictions {
  /** If set, only towers from these factions are placeable. Defaults
   *  to "all unlocked factions". */
  allowedFactions?: FactionId[];
  /** If set, only these specific tower ids are placeable (overrides
   *  allowedFactions). Used for "no walls" / "Bolt only" missions. */
  allowedTowerIds?: string[];
  /** Max simultaneously-placed towers (excluding walls). Frugal-style. */
  maxTowers?: number;
  /** Block placement of any tower whose `noBuild` trait is wall-like. */
  noWalls?: boolean;
  /** Forbid all sends. Some missions remove the income lever. */
  noSends?: boolean;
  /** Forbid frontier purchases. */
  noFrontier?: boolean;
  /** Lock a single hero (hero defense missions). */
  forceHeroId?: HeroId;
}

/** Story can be a literal string (v1) or a function that reads campaign
 *  state and the last mission result (v2 — see ParametricStory.ts). */
export type MissionStory<TState = unknown> =
  | string
  | ((ctx: { state: TState; lastResult: MissionResult | null }) => string);

/** v2 hook: mutate per-faction campaign state at mission end. Receives
 *  the final mission result + the prior state, returns the new state.
 *  Pure function — no side effects beyond returning the new value. */
export type CampaignStateUpdater<TState = unknown> = (
  result: MissionResult,
  prevState: TState,
) => TState;

/** v2 hook: read campaign state at mission start to override mission
 *  config (e.g. boss HP scales with prior ore-token tally). Merges
 *  into archetype defaults + per-mission overrides at runtime. */
export type DynamicOverrides<TState = unknown> = (
  state: TState,
) => Partial<MissionOverrides>;

/** A single mission inside a campaign. */
export interface MissionDef<TState = unknown> {
  /** Stable id within the campaign. Used for save state + analytics. */
  id: string;
  /** Display order in the lobby (0..9). */
  idx: number;
  /** Display name (e.g. "Crystal Outskirts"). */
  name: string;
  /** Two-paragraph story beat shown in the pre-mission modal. v2 may
   *  pass a function reading current campaign state. */
  story: MissionStory<TState>;
  /** Archetype id (see MissionArchetypes.ts). Resolves to base mode + defaults. */
  archetype: MissionArchetypeId;
  /** Per-mission overrides on top of the archetype. */
  overrides: MissionOverrides;
  /** v2: read campaign state at start to compute additional overrides
   *  (e.g. scale boss HP from prior mission's ore tally). Merged on top
   *  of archetype + static overrides. */
  dynamicOverrides?: DynamicOverrides<TState>;
  /** v2: write to campaign state at end. No-op for v1 missions. */
  stateUpdater?: CampaignStateUpdater<TState>;
  /** Star objectives. Star 1 is always "win the match" — we don't
   *  re-declare it here. Stars 2 and 3 are optional bonus goals. */
  objectives: {
    star2?: { label: string; predicate: MissionObjective };
    star3?: { label: string; predicate: MissionObjective };
  };
}

/** Overrides applied to GameScene init beyond what the archetype provides. */
export interface MissionOverrides {
  /** Faction the player commands. Defaults to the player's currently
   *  unlocked-and-selected faction. Most missions leave this open. */
  faction?: FactionId;
  /** Map id. Required — campaigns ship with bespoke faction-themed maps. */
  mapId: MapId;
  /** Wave count override. Tutorial archetypes use small numbers; final
   *  showdowns use 30+. */
  waveCount?: number;
  /** Difficulty override. Default 'normal'. */
  difficulty?: DifficultyLevel;
  /** Starting gold delta. Frugal missions use negative values via
   *  `goldStartMult` instead. */
  goldStart?: number;
  /** Starting gold multiplier (0.5 = "half cost / half gold"). */
  goldStartMult?: number;
  /** Lives override. Mission deaths roll back to lobby (no continues). */
  lives?: number;
  /** Mission-bound modifier (e.g. lava-tile environment). */
  modifier?: DraftModifier;
  /** Hero locked for hero-defense missions. */
  heroId?: HeroId;
  /** Creep faction (the faction we're fighting against). Defaults to
   *  the campaign's faction. */
  creepFaction?: FactionId;
  /** Restriction set (towers, sends, frontier). */
  restrictions?: MissionRestrictions;
  /** v2: per-mission wave script. Replaces the global wave generator
   *  for this mission. Lets a campaign drop a Sigil into wave 3 or a
   *  Scribe trio at wave 6 without polluting other modes' waves. */
  waveScript?: WaveDefinition[];
  /** Pre-placed towers spawned at scene init. Used by the Arcane
   *  Coalition campaign to gift the player a Frost (or two) at fixed
   *  locations on M1 and M2 — the player builds their maze around it
   *  to teach the interrupt verb before Frost is buildable at M3.
   *  Tower types not in `restrictions.allowedTowerIds` are still
   *  pre-placeable; they just can't be added to or replaced. */
  prePlacedTowers?: { towerId: string; col: number; row: number }[];
  /** Force a specific terrain theme regardless of the map's authored
   *  one. Lets the Arcane campaign render serpentine / islands /
   *  fortress etc. with the arcane-crystal tileset for visual
   *  cohesion, without requiring bespoke arcane-themed copies of
   *  every map. Theme id matches `TerrainTheme.ts` keys ('arcane_crystal',
   *  'factory', 'ancient_grove', etc.). */
  mapThemeOverride?: string;
  /** Auto-chain waves: when set, the game starts the next wave
   *  automatically `autoChainWaves` seconds after the previous one
   *  clears. Used by speedrun-style missions to enforce relentless
   *  pace — no Next-Wave button required. Undefined = manual
   *  next-wave (default). */
  autoChainWaves?: number;
  /** Multiplier applied to creep kill-gold. <1 reduces income;
   *  combined with a higher goldStart, gives speedrun missions a
   *  bursty start-with-everything-spend-it-down feel. Default 1.0. */
  killGoldMult?: number;
  /** Plan 12 v2: per-wave essence budget the attacker spends in the
   *  composer. Required for `archetype: 'attacker'` v2 missions; ignored
   *  otherwise. */
  attackerEssencePerWave?: number;
  /** Plan 12 v2: which palette to use. Defaults to 'coalition' (the
   *  Arcane-campaign neutral kit). Future faction campaigns will register
   *  their own palettes and reference them here. */
  attackerPaletteFaction?: FactionId | 'coalition';
}

/** The 10-mission campaign. */
export interface CampaignDef<TState = unknown> {
  /** Faction this campaign targets — the faction the player fights
   *  against AND unlocks by completing. */
  factionId: FactionId;
  /** Display name, e.g. "Arcane Reckoning". */
  name: string;
  /** Long-form intro shown when the campaign lobby first opens. */
  intro: string;
  /** Long-form outro shown after the final mission win. */
  outro: string;
  /** 10 missions in order. Mission N+1 unlocks when mission N is won
   *  (any star count). Replays of completed missions are allowed. */
  missions: MissionDef<TState>[];
  /** Cosmetic banner / lobby art id (theme tile pack key). */
  bannerId?: string;
  /** Audio loop id for the lobby. */
  audioLoopId?: string;
  /** v2: initial campaign state used on first read after install.
   *  Required for any campaign that uses stateUpdater / dynamicOverrides
   *  / parametric stories. v1 campaigns leave this undefined. */
  initialState?: TState;
  /** Campaign-wide terrain theme override applied to every mission's
   *  map. Lets the Arcane campaign render every mission in
   *  arcane-crystal tileset for visual cohesion without bespoke
   *  arcane-themed copies of every map. Per-mission `mapThemeOverride`
   *  takes precedence when both are set. */
  defaultMapThemeOverride?: string;
}

/** Star count earned (0 = not attempted, 1-3 = stars). */
export type StarCount = 0 | 1 | 2 | 3;

// ─── Archetype IDs ──────────────────────────────────────────
// Plan 10 v1 ships the archetypes that reuse existing MatchModes.
// Plans 11/12/13 add the new ones (BaseDefense, Attacker, Heist).

export type MissionArchetypeId =
  | 'standard'            // Standard with override knobs
  | 'boss_rush'           // 5-10 boss-only waves
  | 'speedrun'            // Standard at fixed speed cap, fastest-clear objective
  | 'frugal'              // Standard with goldStartMult + maxTowers
  | 'hero_vs_boss'        // Hero Defense vs a single bespoke faction NPC boss
  | 'coop_with_bot'       // Circle co-op with a bot ally on the player's side
  | 'final_showdown'      // Standard 30 on the campaign's flagship map
  | 'restriction'         // Standard with allowedTowerIds / noWalls / etc.
  // Plans 11/12/13.
  | 'base_defense'
  | 'attacker'
  | 'heist'
  // Phase 0 v2 archetypes — registered as stubs; gameplay lands with
  // Plans A (Arcane Counterspell) and B (Mech Cascade).
  | 'interrupt'                    // Plan A: caster-channel disruption
  | 'interrupt_combo'              // Plan A: chain-stun on adjacent casters
  | 'interrupt_cascade'            // Plan A: completed casts permadebuff towers
  | 'attacker_role_reversal'       // Plan B: Foundry Floor / Assembly Strike I+II
  | 'boss_rush_visible_assembly';  // Plan B: walker bosses spawn missing parts
