/**
 * BotBrain — pluggable decision-making strategy for Circle Co-op
 * CPU players. The surrounding driver (`CircleBotAI`) handles all the
 * mechanical concerns: cooldown scheduling, fair-share gold reserve,
 * candidate-cell maintenance, actual tower placement + broadcast. A
 * brain only answers one question: *given this context, what should
 * I do this placement opportunity?*
 *
 * Split this way so different competency tiers (Dumb, Balanced,
 * Aggressive, Wave-Reactive, …) can share all the scaffolding and
 * only diverge in their `decide()` logic. New brains plug in by
 * implementing `BotBrain` and registering via `BRAIN_REGISTRY`.
 */
import { TowerType } from '../../data/TowerTypes';
import { FactionId } from '../../data/Factions';

/** `{col, row}` tuple. Local copy since `Pos` isn't exported from
 *  `Maps.ts` and we want to avoid circular dependencies from the
 *  bots module back into map data. */
export interface Cell { col: number; row: number; }

/** Everything a brain might reasonably want to know when it's
 *  asked to decide. Fields are read-only from the brain's POV —
 *  mutating them has no effect since the driver passes snapshots. */
export interface BotContext {
  /** This bot's player-index slot in the Circle Co-op lobby. */
  playerIndex: number;
  /** Faction assigned at lobby start. Never changes mid-match. */
  faction: FactionId;
  /** Empty, in-zone cells that currently pass `Grid.canPlaceTower`.
   *  The driver filters stale cells before each decide() call, so
   *  the brain can treat this as a live list. */
  candidateCells: Cell[];
  /** Tower types available to this bot, pre-sorted by cost ASC. */
  towerPool: TowerType[];
  /** Gold this bot may spend this decision. Already accounts for
   *  the fair-share reserve the driver holds back for humans, so a
   *  brain can greedily spend up to `budget` without starving the
   *  team. */
  budget: number;
  /** Current wave number (1-based). 0 before the first wave starts. */
  wave: number;
  /** Shared life pool at this moment. Brains can use this to shift
   *  into "panic mode" when the team is at low lives. */
  lives: number;
}

/** A brain's response. Either place a specific tower at a specific
 *  cell, or skip this opportunity (cooldown still advances so the
 *  brain retries later). */
export type BotDecision =
  | { kind: 'place'; col: number; row: number; type: TowerType }
  | { kind: 'skip' };

export interface BotBrain {
  /** Human-readable name used in the lobby UI and event log. */
  readonly name: string;
  /** Optional setup hook. Fires once at match start — the brain can
   *  precompute any per-match derived state (e.g., a priority list
   *  of tower types for this faction). */
  init?(ctx: BotContext): void;
  /** The hot path. Called on every placement opportunity (after the
   *  driver's cooldown fires and budget is available). */
  decide(ctx: BotContext): BotDecision;
}

/** Factory signature — brains are constructed fresh per bot so
 *  they can carry mutable per-bot state if needed. */
export type BrainFactory = () => BotBrain;

/** Registry of available brain factories. Add new brains by
 *  importing them here and extending this record. The key is the
 *  stable id used in lobby UI dropdowns / save data. */
export const BRAIN_REGISTRY: Record<string, BrainFactory> = {};

export function registerBrain(id: string, factory: BrainFactory): void {
  BRAIN_REGISTRY[id] = factory;
}

/** Resolve a brain by id. Returns null (not undefined) if unknown —
 *  callers should fall back to the default brain rather than crash. */
export function createBrain(id: string): BotBrain | null {
  const factory = BRAIN_REGISTRY[id];
  return factory ? factory() : null;
}
