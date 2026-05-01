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

import type { MatchMode } from '../WaveDefinitions';
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

/** A single mission inside a campaign. */
export interface MissionDef {
  /** Stable id within the campaign. Used for save state + analytics. */
  id: string;
  /** Display order in the lobby (0..9). */
  idx: number;
  /** Display name (e.g. "Crystal Outskirts"). */
  name: string;
  /** Two-paragraph story beat shown in the pre-mission modal. */
  story: string;
  /** Archetype id (see MissionArchetypes.ts). Resolves to base mode + defaults. */
  archetype: MissionArchetypeId;
  /** Per-mission overrides on top of the archetype. */
  overrides: MissionOverrides;
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
}

/** The 10-mission campaign. */
export interface CampaignDef {
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
  missions: MissionDef[];
  /** Cosmetic banner / lobby art id (theme tile pack key). */
  bannerId?: string;
  /** Audio loop id for the lobby. */
  audioLoopId?: string;
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
  // Plans 11/12/13 — placeholder ids; archetype configs land with those plans.
  | 'base_defense'
  | 'attacker'
  | 'heist';
