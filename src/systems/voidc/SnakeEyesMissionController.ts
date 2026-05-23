/**
 * SnakeEyesMissionController — the Snake Eyes campaign's per-mission
 * runtime owner. Implements the `LifecycleAspect` interface and is
 * constructed by `SNAKE_EYES_EXTENSION.buildRuntime`. Holds the
 * mission-scoped state that doesn't belong in persistent
 * `CampaignState`:
 *
 *   - The active `Pactbook` instance (3 drawn Wagers + selection)
 *   - The per-mission leak counter (consumed by the missionState
 *     aspect's `applyMissionResult` to compute the Debt surcharge)
 *   - The Wager mission-start one-shot flag (so onMissionStart fires
 *     exactly once after the player accepts in PactbookPanel)
 *   - The mutable Wager flag bag (carries `WagerMissionFlags` returned
 *     by `onMissionStart` and updated by `onWaveCleared`)
 *   - Per-wave leak-count snapshot (for the on-wave-cleared `leaked`
 *     boolean — see `onWaveStartedHook` / `onWaveClearedHook`)
 *
 * Architectural rationale (see ADR-0001, ADR-0003): every campaign's
 * per-mission runtime state lives in a controller class that IS the
 * Lifecycle aspect. Module globals for runtime state are forbidden
 * by ADR-0003. Cross-DOM consumers reach the controller via
 * `getActiveSnakeEyesController()` — typed `instanceof` narrowing
 * over `MissionRunner.getCurrentRuntime()`.
 */
import { Pactbook, type Wager } from './Pactbook';
import {
  applyDebtDelta,
  applyLeaks,
  applyWinPaydown,
  getSnakeEyesState,
  PAYDOWN_BASE,
  PAYDOWN_PER_DIVERGENCE,
} from './DebtTracker';
import {
  getWagerEffect,
  type WagerEffectContext,
  type WagerEffectHandler,
  type WagerMissionFlags,
} from './WagerEffects';
import {
  CollectorBehavior,
  type CollectorTargetTower,
} from './CollectorBehavior';
import type { Trait } from '../traits/Trait';
import type { LifecycleAspect, MissionResult } from '../campaign/types';
import { MissionRunner } from '../missions/MissionRunner';

/** Minimal contract for the per-frame creep snapshot the controller
 *  iterates to find live Collectors. Real Creep has many more fields;
 *  the controller only reads these four. */
export interface CollectorCreepRef {
  id: number;
  creepTypeId: string;
  col: number;
  row: number;
}

/** Minimal tower contract the controller's `tickCollectors` accepts.
 *  No `id` field — towers don't have a stable numeric id; the
 *  controller synthesises one from the array index for
 *  `CollectorBehavior.tick`, then maps back to the live tower ref
 *  when invoking the disable callback. */
export interface TickCollectorsTower {
  col: number;
  row: number;
  alive?: boolean;
}

/** Callback signature for applying a Collector disable event to a
 *  tower. Caller (GameScene) receives the live tower reference and
 *  writes `tower._disabledRemaining = durationMs / 1000` — the
 *  existing Stormcaller-stun mechanism doubles as the Collector-token
 *  disable. Typed as the minimal contract so the controller stays
 *  unit-testable without a real Tower. */
export type CollectorDisableFn<T extends TickCollectorsTower = TickCollectorsTower> = (
  tower: T,
  durationMs: number,
) => void;

export interface SnakeEyesMissionControllerOptions {
  /** Optional deterministic RNG. Defaults to Math.random — tests
   *  inject a seeded sequence. The RNG is held for both Pactbook
   *  draws AND for Wager-effect onMissionStart hooks (e.g.
   *  Coin Flip rolls 50/50 using this source). */
  rng?: () => number;
  /** Mission idx (0..9). Threaded into the WagerEffectContext so
   *  mission-gated handlers can branch (e.g. wagers that change
   *  behaviour after M5 once the player has more Debt headroom). */
  missionIdx?: number;
}

export class SnakeEyesMissionController implements LifecycleAspect {
  private readonly _pactbook: Pactbook;
  private readonly _rng: () => number;
  private readonly _missionIdx: number;
  /** Debt at the moment the controller was constructed — i.e. AFTER
   *  the missionState aspect's `tickBetweenMissions` applied the
   *  interest tick. Captured for M8's star-3 "Debt ≤ Debt at mission
   *  start" objective: predicate compares this to `getSnakeEyesState().debt`
   *  at finalize time. */
  private readonly _debtAtStart: number;
  private _leakCount: number = 0;
  /** Per-wave snapshot of `_leakCount` taken at `onWaveStartedHook`.
   *  Used by `onWaveClearedHook` to derive the `leaked` flag passed
   *  to the Wager handler. Resets every wave start. */
  private _leakCountAtWaveStart: number = 0;
  /** Mission-wide Wager flag bag. Mutated by `applyMissionStartEffects`
   *  (initial seed from handler.onMissionStart) and `onWaveClearedHook`
   *  (handler.onWaveCleared returns a new bag). Read by any system
   *  that gates on a wager-set flag (e.g. the free-sell path for
   *  Sleeve Card reads `flags.sleeve_card_available`). */
  private _flags: WagerMissionFlags = {};
  /** True once `applyMissionStartEffects` has run. Guards against a
   *  second call from GameScene re-init / hot reload paths. */
  private _missionStartApplied: boolean = false;

  constructor(opts: SnakeEyesMissionControllerOptions = {}) {
    this._rng = opts.rng ?? Math.random;
    this._missionIdx = opts.missionIdx ?? 0;
    this._pactbook = new Pactbook({ rng: this._rng });
    this._pactbook.draw();
    // Capture the debt-at-start snapshot AFTER tickBetweenMissions
    // (which applied the interest tick) and AFTER applyDynamicOverrides
    // — both run before this controller is constructed in buildRuntime.
    // The snapshot is consumed by M8's star-3 predicate at finalize time.
    this._debtAtStart = getSnakeEyesState().debt;
  }

  // ─── Pactbook accessors ──────────────────────────────────────────

  getPactbook(): Pactbook {
    return this._pactbook;
  }

  getActiveWager(): Wager | null {
    return this._pactbook.getSelected();
  }

  isPactbookResolved(): boolean {
    return this._pactbook.isResolved();
  }

  // ─── Wager handler accessors ────────────────────────────────────

  /** Returns the registered handler for the active Wager, or null if
   *  no wager is accepted, the wager has no registered effect, or
   *  the player declined. Centralises the "active wager → handler"
   *  lookup so callers don't repeat it. */
  getWagerHandler(): WagerEffectHandler | null {
    const wager = this.getActiveWager();
    if (!wager) return null;
    return getWagerEffect(wager.effectId);
  }

  /** Builds a fresh `WagerEffectContext` for handler calls. The
   *  context is rebuilt each call so hooks always see the controller's
   *  current `_rng` and `_missionIdx` — both immutable today but
   *  rebuilding keeps the contract explicit. */
  getWagerContext(): WagerEffectContext {
    return { rng: this._rng, missionIdx: this._missionIdx };
  }

  /** Read-only view of the current Wager flag bag. Mutators MUST go
   *  through `setFlags` so the controller stays the single owner of
   *  the bag (test isolation hazard otherwise). */
  getFlags(): Readonly<WagerMissionFlags> {
    return this._flags;
  }

  /** Replace the flag bag wholesale. Caller passes the bag returned
   *  by a handler hook (`onMissionStart` returning `{ flags }`, or
   *  `onWaveCleared` returning a new map). Internal — gameplay
   *  aspects call this via `applyMissionStartEffects` /
   *  `onWaveClearedHook` rather than directly. */
  setFlags(next: WagerMissionFlags): void {
    this._flags = { ...next };
  }

  /** Convenience: read a single flag without exposing the whole bag.
   *  Used by GameScene paths that gate on a specific wager flag (e.g.
   *  the sell path reading `sleeve_card_available`). Returns
   *  undefined when the key is absent. */
  getFlag(key: string): number | string | boolean | undefined {
    return this._flags[key];
  }

  /** Set / overwrite a single flag. Used to "consume" a one-shot
   *  flag (e.g. set `sleeve_card_available` to false after the
   *  player uses it). */
  setFlag(key: string, value: number | string | boolean): void {
    this._flags = { ...this._flags, [key]: value };
  }

  // ─── Wager hook dispatchers ─────────────────────────────────────

  /** Modify kill gold via the active handler. Returns `baseGold`
   *  unchanged when no wager is active or the handler doesn't
   *  implement the hook. Called from the gameplay-side gold pipeline
   *  (see `StandardDeathHandler`'s optional `goldTransform`). */
  modifyCreepKillGold(baseGold: number): number {
    const handler = this.getWagerHandler();
    if (!handler?.modifyCreepKillGold) return baseGold;
    return handler.modifyCreepKillGold(this.getWagerContext(), baseGold);
  }

  /** Per-tower trait injection at spawn. Returns extra traits from
   *  the active wager handler (or empty array). Called from the
   *  gameplay aspect's `onTowerPlaced` handler, which looks up the
   *  tower via `TowerManager.getTowerAt` and pushes these onto
   *  `tower.traits`. */
  getTraitsForTower(towerTypeId: string): Trait[] {
    const handler = this.getWagerHandler();
    if (!handler?.getTraitsForTower) return [];
    return handler.getTraitsForTower(towerTypeId);
  }

  /** Snapshot the current leak count so `onWaveClearedHook` can
   *  derive the `leaked` boolean. Called from the gameplay aspect's
   *  `onWaveStarted`. Idempotent — calling multiple times within
   *  a single wave just resets the snapshot. */
  onWaveStartedHook(_waveNum: number): void {
    this._leakCountAtWaveStart = this._leakCount;
  }

  /** Per-wave Wager hook. Derives `leaked` from the leak-count delta
   *  since `onWaveStartedHook` and forwards to the handler's
   *  `onWaveCleared`. Persists any returned flag bag. Called from
   *  the gameplay aspect's `onWaveCleared`. */
  onWaveClearedHook(_waveNum: number): void {
    const handler = this.getWagerHandler();
    if (!handler?.onWaveCleared) return;
    const leaked = this._leakCount > this._leakCountAtWaveStart;
    const next = handler.onWaveCleared(this.getWagerContext(), leaked, this._flags);
    if (next && typeof next === 'object') {
      this._flags = next;
    }
  }

  // ─── Mission lifecycle ──────────────────────────────────────────

  /** Apply the active wager's `onMissionStart` one-shot side effects.
   *  Called by GameScene at scene-create-time AFTER the scene's
   *  economy has been initialised with starting gold. Idempotent —
   *  subsequent calls no-op (guarded by `_missionStartApplied`).
   *
   *  Effects:
   *    - `goldDelta` → `economy.addGold(delta)` (negative reduces).
   *    - `debtDelta` → `applyDebtDelta(delta)` (DebtTracker module).
   *    - `flags` → wholesale-replaces the controller's flag bag.
   *
   *  `economy` is passed in (not captured in the ctor) so the
   *  controller doesn't hold a long-lived scene reference — the scene
   *  reference lives for exactly the duration of this call. */
  applyMissionStartEffects(economy: { addGold(amount: number): void }): void {
    if (this._missionStartApplied) return;
    this._missionStartApplied = true;
    const handler = this.getWagerHandler();
    if (!handler?.onMissionStart) return;
    const result = handler.onMissionStart(this.getWagerContext());
    if (!result) return;
    if (typeof result.goldDelta === 'number' && result.goldDelta !== 0) {
      economy.addGold(result.goldDelta);
    }
    if (typeof result.debtDelta === 'number' && result.debtDelta !== 0) {
      applyDebtDelta(result.debtDelta);
    }
    if (result.flags) {
      this._flags = { ...this._flags, ...result.flags };
    }
  }

  // ─── Leak counter ────────────────────────────────────────────────

  recordLeak(): void {
    this._leakCount += 1;
  }

  consumeLeakCount(): number {
    const c = this._leakCount;
    this._leakCount = 0;
    return c;
  }

  // ─── Collector (M8) ─────────────────────────────────────────────
  // The Collector is M8's boss creep: slow, doesn't damage lives,
  // periodically lobs "tokens" that temporarily disable player
  // towers. Defeating it sets state.collectorDefeatedAt so the next
  // mission's interest charge is cancelled. Per-creep behavior lives
  // in CollectorBehavior; this map tracks active instances keyed by
  // creep id.
  //
  // Lifecycle is reactive (not event-driven on spawn) so the controller
  // doesn't need a spawn callback: tickCollectors lazy-creates a
  // behavior the first time it sees a void_collector creep. Kills go
  // through onCollectorMaybeKilled (fires DebtTracker.markCollectorDefeated
  // via behavior.onDefeated); leaks go through onCollectorMaybeReached
  // (silent removal — leaking the Collector is NOT a defeat).
  private readonly _collectors: Map<number, CollectorBehavior> = new Map();

  /** Per-frame tick: ensures each live void_collector creep has an
   *  active CollectorBehavior, ticks each one with the creep's current
   *  position + the player's towers, and applies any disable event via
   *  the supplied `disableFn`. Called from GameScene's update loop via
   *  the instanceof-narrowed Snake Eyes block.
   *
   *  `towers` is the player's full tower list; the behavior picks the
   *  nearest live one in range (Chebyshev cells) per token cooldown.
   *  `disableFn(towerId, durationMs)` is the side-effect application
   *  — kept as a callback so the controller stays unit-testable
   *  without a scene reference. */
  tickCollectors<T extends TickCollectorsTower>(
    now: number,
    towers: readonly T[],
    creeps: readonly CollectorCreepRef[],
    disableFn: CollectorDisableFn<T>,
  ): void {
    // Synthesize CollectorBehavior's required `id` from the array
    // index. The behavior returns the same index back inside
    // `event.towerId`, which we map back to the live tower ref.
    // Indexes are stable for the duration of a single tick — callers
    // mustn't mutate the towers list between tick + disable callbacks.
    const synth: CollectorTargetTower[] = towers.map((t, i) => ({
      id: i, col: t.col, row: t.row, alive: t.alive,
    }));
    for (const creep of creeps) {
      if (creep.creepTypeId !== 'void_collector') continue;
      let behavior = this._collectors.get(creep.id);
      if (!behavior) {
        behavior = new CollectorBehavior();
        this._collectors.set(creep.id, behavior);
      }
      const event = behavior.tick(now, { col: creep.col, row: creep.row }, synth);
      if (event) {
        const target = towers[event.towerId];
        if (target) disableFn(target, event.disableDurationMs);
      }
    }
  }

  /** Event handler — the gameplay aspect's `onCreepKilled(creepId)`
   *  dispatches here. If the killed creep was a tracked Collector,
   *  mark it defeated (writes `state.collectorDefeatedAt` via
   *  `markCollectorDefeated` inside `behavior.onDefeated`) and remove
   *  from the map. No-op for non-Collector creeps. */
  onCollectorMaybeKilled(creepId: number): void {
    const behavior = this._collectors.get(creepId);
    if (!behavior) return;
    behavior.onDefeated(this._missionIdx);
    this._collectors.delete(creepId);
  }

  /** Event handler — the gameplay aspect's `onCreepReached(creepId)`
   *  dispatches here. If the Collector leaked, remove from the map
   *  WITHOUT marking it defeated (leaking the Collector is a loss,
   *  not a win). No-op for non-Collector creeps. */
  onCollectorMaybeReached(creepId: number): void {
    this._collectors.delete(creepId);
  }

  /** Was the Collector defeated this mission? Reads through DebtTracker's
   *  persistent state — `collectorDefeatedAt === this._missionIdx`
   *  iff the player killed the Collector this run. Consumed by M8's
   *  star-2 / star-3 predicates. Safe to call at finalize time
   *  (predicates run BEFORE the next mission's applyMissionStart
   *  clears the flag). */
  wasCollectorDefeatedThisMission(): boolean {
    const state = getSnakeEyesState();
    return state.collectorDefeatedAt === this._missionIdx;
  }

  /** Debt at the moment this mission started (post-interest tick).
   *  Consumed by M8's star-3 predicate to compare against current
   *  Debt at finalize. Stable for the lifetime of this controller
   *  instance — never mutates. */
  getDebtAtStart(): number {
    return this._debtAtStart;
  }

  /** Test-only inspection of the active Collector map. Real callers
   *  should treat the map as private. */
  _getActiveCollectorCountForTest(): number {
    return this._collectors.size;
  }

  // ─── Mission-end resolution ─────────────────────────────────────

  /** Resolve the active wager at mission end. Updates the cross-
   *  mission Pactbook tally (succeeded / failed) and applies win-
   *  paydown for accepted wagers on victory. The paydown is the base
   *  amount (PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE × tier) multiplied
   *  by the handler's `getPaydownMultiplier(result)` if it implements
   *  one. Inverted Stakes (T3) returns 2 on perfect-run / 0 on any
   *  leak; default (omitted) = 1. Returns the accepted Wager (for
   *  analytics) or null if there was none. */
  resolveWagerAtMissionEnd(result: MissionResult): Wager | null {
    const accepted = this._pactbook.getSelected();
    if (!accepted) return null;
    this._pactbook.resolveOutcome(result);
    if (result.won) {
      const handler = this.getWagerHandler();
      const mult = handler?.getPaydownMultiplier?.(result) ?? 1;
      if (mult !== 1) {
        // Custom multiplier: bypass DebtTracker.applyWinPaydown
        // (which doesn't take a multiplier param) and compute +
        // apply the scaled paydown via applyDebtDelta.
        const base = PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE * accepted.tier;
        const scaled = Math.round(-base * mult);
        if (scaled !== 0) applyDebtDelta(scaled);
      } else {
        applyWinPaydown(accepted.tier);
      }
    }
    return accepted;
  }

  /** Apply the leak surcharge based on the counter. Pure delegation
   *  to `DebtTracker.applyLeaks`; lives on the controller so the
   *  missionState aspect doesn't have to know about `applyLeaks`
   *  directly — it just talks to the controller. */
  applyLeakSurcharge(): void {
    const count = this.consumeLeakCount();
    if (count > 0) applyLeaks(count);
  }

  // ─── LifecycleAspect ────────────────────────────────────────────

  /** No per-frame work today. Reserved for future mid-mission wager
   *  effects that need a tick (e.g. streak timers, debuff auras). */
  update(_deltaMs: number): void {}

  /** Scene tear-down. The controller doesn't own any GameScene-owned
   *  resources (no graphics objects, no event subscriptions — those
   *  are handled by the gameplay aspect via EventBusBridge). Pactbook
   *  state, flag bag, and counters are discarded with the instance. */
  shutdown(): void {
    // No-op for now; placeholder so the contract is explicit.
  }
}

/** Typed accessor for DOM-land consumers (LoadingScreen). Reads the
 *  active campaign runtime from `MissionRunner` and narrows the
 *  `lifecycle` aspect with `instanceof`. Returns null if:
 *    - No mission is in flight, OR
 *    - The active mission's runtime isn't a Snake Eyes one (e.g. the
 *      player is in a different campaign).
 *
 *  This replaces the prior `getMissionPactbook()` module-global
 *  accessor and gives the type checker something to verify at every
 *  consumption site. */
export function getActiveSnakeEyesController(): SnakeEyesMissionController | null {
  const runtime = MissionRunner.getCurrentRuntime();
  if (runtime?.lifecycle instanceof SnakeEyesMissionController) {
    return runtime.lifecycle;
  }
  return null;
}
