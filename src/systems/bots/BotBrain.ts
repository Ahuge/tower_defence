/**
 * BotBrain — pluggable decision-making strategy for CPU players.
 * Used by the Circle Co-op shared-grid driver and the 1v1 Versus
 * simulated-peer driver (both implemented via `BotAI`). The driver
 * handles all the mechanical concerns: cooldown scheduling, fair-
 * share gold reserve, candidate-cell maintenance, actual tower
 * placement/upgrade/sell + broadcast. A brain only answers one
 * question: *given this context, what should I do this decision
 * opportunity?*
 *
 * Split this way so different competency tiers (Dumb, Balanced,
 * Aggressive, Wave-Reactive, …) can share all the scaffolding and
 * only diverge in their `decide()` logic. New brains plug in by
 * implementing `BotBrain` and registering via `BRAIN_REGISTRY`.
 */
import { TowerType } from '../../data/TowerTypes';
import { FactionId } from '../../data/Factions';
import { Grid } from '../Grid';
import { PathPoint } from '../Pathfinding';
import { WaveDefinition } from '../../data/WaveDefinitions';

/** `{col, row}` tuple. Local copy since `Pos` isn't exported from
 *  `Maps.ts` and we want to avoid circular dependencies from the
 *  bots module back into map data. */
export interface Cell { col: number; row: number; }

/** Snapshot of a tower this bot has previously placed. The driver
 *  refreshes this list each decide() call from its own ledger so
 *  brains don't need to track placements themselves. `upgradeCost`
 *  is 0 when the tower is max level; brains should treat that as
 *  "not upgradable right now" rather than calling it for free. */
export interface PlacedTower {
  col: number;
  row: number;
  towerId: string;
  level: number;
  /** Cost of the next upgrade, in gold. 0 if the tower is at
   *  max level — brains should skip upgrade decisions on these.
   *  When `upgradeBranches` is non-empty, this is the DEFAULT
   *  path's cost; per-branch costs are available in
   *  `branchUpgradeCosts`. */
  upgradeCost: number;
  /** Branch ids available at this tower's current upgrade point,
   *  excluding the default path. Empty for linear upgrades or
   *  max-level towers. Drives branch picking in the brain. */
  upgradeBranches: string[];
  /** Per-branch upgrade cost. Keyed by branch id. Populated when
   *  `upgradeBranches` is non-empty so the brain can afford-check
   *  before picking. */
  branchUpgradeCosts: Record<string, number>;
  /** Gold refunded if the tower is sold this frame. */
  sellValue: number;
}

/** Everything a brain might reasonably want to know when it's
 *  asked to decide. Fields are read-only from the brain's POV —
 *  mutating them has no effect since the driver passes snapshots. */
export interface BotContext {
  /** This bot's player-index slot in the lobby (Circle) or 1 for
   *  the synthetic opponent in 1v1 Versus. */
  playerIndex: number;
  /** Faction assigned at lobby start. Never changes mid-match. */
  faction: FactionId;
  /** Empty cells currently legal for this bot to place on. In
   *  Circle Co-op this is zone-restricted; in 1v1 Versus this is
   *  the full grid. Driver filters stale cells before each
   *  decide() call, so the brain can treat it as a live list. */
  candidateCells: Cell[];
  /** Tower types available to this bot, pre-sorted by cost ASC. */
  towerPool: TowerType[];
  /** Gold this bot may spend this decision. Already accounts for
   *  the fair-share reserve the driver holds back for humans (in
   *  Circle Co-op) — brains can greedily spend up to `budget`. */
  budget: number;
  /** Current wave number (1-based). 0 before the first wave starts. */
  wave: number;
  /** Life pool at this moment (shared pool in Circle Co-op, this
   *  bot's private pool in 1v1 Versus). Brains can use this to
   *  shift into "panic mode" when under pressure. */
  lives: number;
  /** Live grid reference — brains that need pathfinding (maze
   *  planning, DPS-coverage scoring) use this. Cell state mutates
   *  frame-to-frame; treat it as read-mostly. */
  grid: Grid;
  /** All active creep paths. In Circle Co-op with waypoints, each
   *  entry is a full waypoint-chained path; in standard modes, one
   *  entry per entry×exit combination. Null entries are unreachable
   *  spawners — filter before use. */
  allPaths: (PathPoint[] | null)[];
  /** Towers this bot currently owns on the board. Empty before the
   *  first successful placement. Brains use this to choose upgrade
   *  or sell targets. */
  placedTowers: PlacedTower[];
  /** Send options available to this bot this decision. Empty in
   *  modes that don't support sends (Circle Co-op); otherwise the
   *  driver pre-filters to cost-sorted, wave-unlock-respected
   *  options so brains just pick an id. */
  sendOptions: SendOptionInfo[];
  /** Frontier buildings currently available for purchase. Empty in
   *  modes that don't support frontier. Cost-sorted ascending. */
  frontierOptions: FrontierOptionInfo[];
  /** Whether it is currently between waves — most sends/frontier
   *  purchases are only valid here. Brains can trust this flag
   *  instead of reasoning about wave state. */
  betweenWaves: boolean;
  /** Optional — the next few wave definitions so wave-reactive
   *  brains can bias tower picks toward counters for upcoming
   *  creep types (e.g. splash vs. swarm, pierce vs. armored).
   *  Driver may omit when wave data isn't readily available;
   *  brains MUST behave correctly when this is empty/undefined. */
  upcomingWaves?: WaveDefinition[];
}

/** Catalog entry the driver gives the brain so it can decide what
 *  to buy from the meta economy — sends and frontier buildings. */
export interface SendOptionInfo {
  id: string;
  cost: number;
  income: number;
  unlocked: boolean;
}
export interface FrontierOptionInfo {
  id: string;
  cost: number;
  income: number;
}

/** A brain's response. One of:
 *   - `place`: build a specific tower at a specific cell
 *   - `upgrade`: level up a tower this bot already owns
 *   - `sell`: tear down one of this bot's towers (gold is refunded)
 *   - `send`: buy a send option (1v1 only — queues creeps on opp.)
 *   - `frontier`: buy a frontier / economy building (permanent income)
 *   - `skip`: do nothing; cooldown still advances and the brain
 *             retries on the next tick
 */
export type BotDecision =
  | { kind: 'place'; col: number; row: number; type: TowerType }
  /** Divergent upgrade paths: `branch` picks a non-default branch.
   *  Omit / null for the default (linear) path. */
  | { kind: 'upgrade'; col: number; row: number; branch?: string | null }
  | { kind: 'sell'; col: number; row: number }
  | { kind: 'send'; sendOptionId: string }
  | { kind: 'frontier'; buildingId: string }
  /** Post-purchase frontier action — overcharge/dig/harvest a
   *  building the bot already owns. Targets either a single owned
   *  index (`idx`) or all of a defId at once (`defId`); exactly
   *  one of those should be set. Driver routes these to the
   *  per-mode handleFrontierAction / handleFrontierBatchAction
   *  callbacks via the registered frontierActionCb. */
  | { kind: 'frontierManage'; action: 'overcharge' | 'dig' | 'harvest'; defId?: string; idx?: number }
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
