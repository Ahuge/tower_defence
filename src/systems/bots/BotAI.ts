/**
 * BotAI — driver for CPU players. Used in two modes:
 *
 *   - Circle Co-op (host-side): one driver owns 1-3 bots, each with
 *     its own zone on a shared grid. Placements go through the
 *     human-path TowerManager so all game systems treat bot towers
 *     like any other tower.
 *
 *   - 1v1 Versus (simulated-peer): one driver owns a single bot on
 *     a private grid. Placements synthesize `tower_placed` /
 *     `tower_upgraded` / `tower_sold` messages into the local
 *     VersusManager so the existing 1v1 opponent pipeline
 *     (OpponentSimulation, minimap, send-flow) works unchanged.
 *
 * Responsibilities (the "hard mechanics" layer):
 *   1. Cheap. Per-frame work is bounded — each bot decides at most
 *      once per `BASE_COOLDOWN_MS` interval, staggered per-bot.
 *   2. Safe. Never places on a cell it doesn't have in its candidate
 *      set, never violates `Grid.canPlaceTower`, never spends
 *      beyond budget.
 *   3. Brain-agnostic. Owns cooldown, budget, candidate-cell
 *      maintenance, and the place/upgrade/sell + broadcast
 *      pipeline. What tower goes where is delegated to a
 *      `BotBrain` per bot (see BotBrain.ts).
 */
import { TowerType, getTowerType } from '../../data/TowerTypes';
import { FactionId, FACTIONS } from '../../data/Factions';
import { Grid } from '../Grid';
import { PathPoint } from '../Pathfinding';
import { EconomyManager } from '../EconomyManager';
import { EventBus } from '../EventBus';
import { BotBrain, BotContext, Cell, PlacedTower, createBrain } from './BotBrain';
// Side-effect imports: register available brains in BRAIN_REGISTRY.
// New brains need to be imported here (or elsewhere pulled in at
// module-load time) to surface in lookups.
import './brains/DumbBrain';
import './brains/BalancedBrain';
import './brains/AttackerDefenderBrain';

/** One bot slot's per-frame state. */
interface BotState {
  playerIndex: number;
  faction: FactionId;
  brain: BotBrain;
  /** Precomputed cost-sorted list of tower types this bot can build. */
  towerPool: TowerType[];
  /** Cells currently legal for this bot to build on. In Circle
   *  Co-op this is the bot's zone; in 1v1 Versus it's every
   *  placeable cell on the CPU's private grid. Pruned lazily. */
  candidateCells: Cell[];
  /** Cheapest tower cost — used as the "is this bot able to spend
   *  at all?" gate before calling the brain. */
  cheapestCost: number;
  /** Time remaining until the next decision attempt, in ms. */
  cooldown: number;
  /** Towers this bot has successfully placed, for upgrade/sell
   *  scoring. Kept in sync with the scene via the driver's own
   *  placement callback — the scene is not the source of truth. */
  placed: PlacedTower[];
  /** Cumulative gold-per-wave bonus this bot has bought through
   *  sends / frontier. Paid out at each `creditWaveClear` on top of
   *  the standard EconomyManager wave-clear bonus. */
  incomeBonus: number;
  /**
   * Each bot gets its own full EconomyManager + EventBus, identical
   * to what the human player uses. Same class, same subscriptions,
   * same starting-gold / kill-reward / wave-clear-bonus semantics.
   * Future income sources (interest, frontier payout, etc.) added
   * through the event bus flow through to bots automatically with
   * no bot-side code changes — no drift between human and CPU
   * economic rules.
   */
  events: EventBus;
  economy: EconomyManager;
}

/** Callback the driver invokes to actually place a tower. The scene
 *  owns the placement/broadcast logic; the bot just announces
 *  intent. The driver has already deducted the tower cost from the
 *  bot's private gold pool before this fires. Returns true if the
 *  placement succeeded. On true, the scene must also tell the driver
 *  the authoritative `upgradeCost` and `sellValue` so the bot can
 *  reason about its own towers afterward. */
export interface PlaceResult {
  ok: boolean;
  upgradeCost: number;
  sellValue: number;
  /** Branch ids available at the newly-placed tower's first
   *  upgrade point. Empty for linear towers. */
  upgradeBranches?: string[];
  /** Per-branch cost map, keyed by branch id. */
  branchUpgradeCosts?: Record<string, number>;
}
export type BotPlaceCallback = (playerIndex: number, col: number, row: number, towerType: TowerType) => PlaceResult;

/** Upgrade callback: returns new level + next upgrade cost + sell
 *  value + branch info so the driver can track them.
 *  `branchId` (if set) picks a specific upgrade branch; the scene
 *  is responsible for passing it through to `tower.upgrade()`. */
export interface UpgradeResult {
  ok: boolean;
  newLevel: number;
  nextUpgradeCost: number;
  sellValue: number;
  upgradeBranches?: string[];
  branchUpgradeCosts?: Record<string, number>;
}
export type BotUpgradeCallback = (playerIndex: number, col: number, row: number, branchId?: string | null) => UpgradeResult;

/** Sell callback: returns the refund amount. */
export type BotSellCallback = (playerIndex: number, col: number, row: number) => number;

/** Send callback: spends nothing here — the driver debits the bot's
 *  economy with the provided cost — the scene is responsible for
 *  actually queueing the creeps on the opponent and applying the
 *  income bonus. Returns true on success. */
export type BotSendCallback = (playerIndex: number, sendOptionId: string, cost: number, income: number) => boolean;

/** Frontier / economy building purchase callback. Mirrors send. */
export type BotFrontierCallback = (playerIndex: number, buildingId: string, cost: number) => boolean;

/** Post-purchase frontier action — overcharge / dig / harvest a
 *  building the bot already owns. Targets either a single owned
 *  index (`idx`) or all-of-type (`defId`). Returns true on success;
 *  the scene handles the gold credit / dormancy / collapse logic
 *  same as the human flow. */
export type BotFrontierActionCallback = (
  playerIndex: number,
  action: 'overcharge' | 'dig' | 'harvest',
  target: { idx?: number; defId?: string },
) => boolean;

/** Per-decision context suppliers for sends and frontier. Returns
 *  empty arrays in modes where the system doesn't apply (Circle
 *  Co-op has no sends; pure-tutorial has no frontier). Called per
 *  decide() — cheap enough, always up-to-date. */
export type SendOptionsSupplier = () => { id: string; cost: number; income: number; unlocked: boolean }[];
export type FrontierOptionsSupplier = () => { id: string; cost: number; income: number }[];

/** Fresh-decide cadence, milliseconds. Kept at 4s per the current
 *  tuning — longer feels passive, shorter feels twitchy. */
const BASE_COOLDOWN_MS = 4000;

export class BotAI {
  private bots: BotState[] = [];
  private grid: Grid;
  private placeCallback: BotPlaceCallback;
  private upgradeCallback: BotUpgradeCallback | null;
  private sellCallback: BotSellCallback | null;
  private sendCallback: BotSendCallback | null = null;
  private frontierCallback: BotFrontierCallback | null = null;
  private frontierActionCallback: BotFrontierActionCallback | null = null;
  private sendOptionsSupplier: SendOptionsSupplier | null = null;
  private frontierOptionsSupplier: FrontierOptionsSupplier | null = null;
  private betweenWavesSupplier: (() => boolean) | null = null;
  /** Suppliers for state that mutates between bot ticks — kept as
   *  closures so the driver doesn't hoard a whole-GameScene reference
   *  (keeps the bot module loosely coupled and easier to test). */
  private getWave: () => number;
  private getLives: () => number;
  private getAllPaths: () => (PathPoint[] | null)[];
  private cellsDirty: boolean = true;

  constructor(
    grid: Grid,
    placeCallback: BotPlaceCallback,
    waveSupplier: () => number,
    livesSupplier: () => number,
    allPathsSupplier: () => (PathPoint[] | null)[],
    upgradeCallback: BotUpgradeCallback | null = null,
    sellCallback: BotSellCallback | null = null,
  ) {
    this.grid = grid;
    this.placeCallback = placeCallback;
    this.upgradeCallback = upgradeCallback;
    this.sellCallback = sellCallback;
    this.getWave = waveSupplier;
    this.getLives = livesSupplier;
    this.getAllPaths = allPathsSupplier;
  }

  /** Wire send / frontier purchase support. Called by 1v1 CPU-
   *  opponent setup (and future co-op economy modes). Passing null
   *  suppliers disables the corresponding decision kind — brains
   *  will see empty `sendOptions` / `frontierOptions` lists and
   *  simply won't pick those decisions. */
  setMetaCallbacks(opts: {
    sendCb?: BotSendCallback | null;
    frontierCb?: BotFrontierCallback | null;
    frontierActionCb?: BotFrontierActionCallback | null;
    sendOpts?: SendOptionsSupplier | null;
    frontierOpts?: FrontierOptionsSupplier | null;
    betweenWaves?: (() => boolean) | null;
  }): void {
    if (opts.sendCb !== undefined) this.sendCallback = opts.sendCb;
    if (opts.frontierCb !== undefined) this.frontierCallback = opts.frontierCb;
    if (opts.frontierActionCb !== undefined) this.frontierActionCallback = opts.frontierActionCb;
    if (opts.sendOpts !== undefined) this.sendOptionsSupplier = opts.sendOpts;
    if (opts.frontierOpts !== undefined) this.frontierOptionsSupplier = opts.frontierOpts;
    if (opts.betweenWaves !== undefined) this.betweenWavesSupplier = opts.betweenWaves;
  }

  /**
   * Credit a bot for a creep kill. Routes through the bot's own
   * EventBus so its EconomyManager picks up the gold via the same
   * 'creepKilled' listener that the human's economy uses. Kill
   * counts themselves are tracked by the death handler — there's
   * a single source of truth for per-player kills so rosters show
   * consistent numbers for humans and CPUs.
   */
  creditKill(playerIndex: number, gold: number): void {
    const bot = this.bots.find(b => b.playerIndex === playerIndex);
    if (!bot) return;
    bot.events.emit('creepKilled', 0, gold);
  }

  /** Re-emit the wave-clear and wave-start events on each bot's
   *  own event bus so their EconomyManagers respond exactly like
   *  the human's: wave-clear bonus added, currentWave tracked for
   *  killGold scaling. GameScene fans these out from the shared
   *  bus; adding a new income source to EconomyManager.ts applies
   *  to bots for free. */
  creditWaveClear(waveNum: number): void {
    for (const bot of this.bots) {
      bot.events.emit('waveCleared', waveNum);
      // Pay out accumulated income bonus from frontier + sends on
      // top of the standard wave-clear bonus the economy already
      // added in response to the event above.
      if (bot.incomeBonus > 0) bot.economy.addGold(bot.incomeBonus);
    }
  }

  /** Grow this bot's per-wave income bonus. Called by the scene
   *  immediately after a successful frontier / send purchase so
   *  the next wave-clear tick pays out the increase. */
  addIncomeBonus(playerIndex: number, amount: number): void {
    const bot = this.bots.find(b => b.playerIndex === playerIndex);
    if (bot) bot.incomeBonus += amount;
  }

  /** Deposit gold directly into a bot's economy. Used for per-hit
   *  gold bonuses (`gold_on_hit`, `jackpot`) that `TowerManager`
   *  collects off bot-owned towers — these don't go through the
   *  `creepKilled` event path since they're triggered by *hits*,
   *  not deaths. */
  creditGold(playerIndex: number, amount: number): void {
    const bot = this.bots.find(b => b.playerIndex === playerIndex);
    if (bot) bot.economy.addGold(amount);
  }
  creditWaveStart(waveNum: number): void {
    for (const bot of this.bots) bot.events.emit('waveStarted', waveNum);
  }

  /** Snapshot of each bot's gold pool (reads from their EconomyManager). */
  getBotGold(): Map<number, number> {
    const m = new Map<number, number>();
    for (const b of this.bots) m.set(b.playerIndex, b.economy.gold);
    return m;
  }

  /** Read-only view of this bot's currently-placed towers. Used by
   *  1v1 Versus to keep OpponentSimulation's grid in sync after
   *  upgrades/sells. */
  getPlacedTowers(playerIndex: number): PlacedTower[] {
    const bot = this.bots.find(b => b.playerIndex === playerIndex);
    return bot ? bot.placed.slice() : [];
  }

  /** Register a bot slot. `brainId` defaults to 'dumb'; pass a
   *  different id (e.g. 'balanced') to upgrade individual bots
   *  without touching the driver. Falls back to DumbBrain if the
   *  id is unknown. */
  addBot(playerIndex: number, faction: FactionId, zoneCells: Cell[], brainId: string = 'dumb'): void {
    const factionDef = FACTIONS[faction];
    if (!factionDef) return;

    const pool = factionDef.towerIds
      .map(id => { try { return getTowerType(id); } catch { return null; } })
      .filter((t): t is TowerType => !!t)
      .sort((a, b) => a.cost - b.cost);
    if (pool.length === 0) return;

    const brain = createBrain(brainId) ?? createBrain('dumb');
    if (!brain) return; // should never hit — 'dumb' is always registered.

    // Each bot spins up its own EventBus + EconomyManager. The
    // manager subscribes to 'creepKilled', 'waveCleared', and
    // 'waveStarted' on its own bus — identical to the human's
    // economy wiring — so adding a new economy event type applies
    // uniformly to both players.
    const events = new EventBus();
    const economy = new EconomyManager(events);

    const state: BotState = {
      playerIndex,
      faction,
      brain,
      towerPool: pool,
      candidateCells: zoneCells.slice(),
      cheapestCost: pool[0].cost,
      // Stagger initial cooldowns so bots don't all fire on frame 1.
      cooldown: Math.random() * BASE_COOLDOWN_MS,
      placed: [],
      incomeBonus: 0,
      events,
      economy,
    };
    this.bots.push(state);

    // Optional brain init hook — brains can precompute anything
    // faction-specific here. Pass a seed context; live context for
    // decide() is built per-tick below.
    brain.init?.({
      playerIndex,
      faction,
      candidateCells: state.candidateCells,
      towerPool: pool,
      budget: 0,
      wave: 0,
      lives: 0,
      grid: this.grid,
      allPaths: [],
      placedTowers: [],
      sendOptions: [],
      frontierOptions: [],
      betweenWaves: false,
    });
  }

  /** Signal that a cell's placeability may have changed — typically
   *  after any tower placement, bot or human. The next tick refilters
   *  candidate lists. Cheap flag-and-check; no work until tick runs. */
  invalidate(): void {
    this.cellsDirty = true;
  }

  /** Per-frame tick. `delta` is milliseconds since last frame. */
  tick(delta: number): void {
    if (this.bots.length === 0) return;

    if (this.cellsDirty) {
      for (const b of this.bots) {
        b.candidateCells = b.candidateCells.filter(c => this.grid.canPlaceTower(c.col, c.row));
      }
      this.cellsDirty = false;
    }

    const wave = this.getWave();
    const lives = this.getLives();

    for (const b of this.bots) {
      b.cooldown -= delta;
      if (b.cooldown > 0) continue;
      b.cooldown += BASE_COOLDOWN_MS;

      // Read from the bot's own EconomyManager — same source of
      // truth as b.economy.spend() below, so there's never any
      // divergence between "what the brain sees as budget" and
      // "what we can actually spend".
      const budget = b.economy.gold;

      const sendOptions = this.sendOptionsSupplier?.() ?? [];
      const frontierOptions = this.frontierOptionsSupplier?.() ?? [];
      const betweenWaves = this.betweenWavesSupplier?.() ?? false;

      // The bot can still do something even when below the cheapest
      // tower cost — sell-to-reinvest needs zero budget, upgrades
      // only need upgradeCost, sends/frontier only need their own
      // costs. Gate on the overall minimum affordable action.
      const minUpgradeCost = b.placed
        .map(p => p.upgradeCost)
        .filter(c => c > 0)
        .reduce<number>((min, c) => Math.min(min, c), Infinity);
      const minSendCost = sendOptions.filter(o => o.unlocked).map(o => o.cost).reduce<number>((m, c) => Math.min(m, c), Infinity);
      const minFrontierCost = frontierOptions.map(o => o.cost).reduce<number>((m, c) => Math.min(m, c), Infinity);
      const minActionCost = Math.min(b.cheapestCost, minUpgradeCost, minSendCost, minFrontierCost);
      const hasSellable = b.placed.length > 0;
      const canDoAnything = b.candidateCells.length > 0 || hasSellable || minUpgradeCost !== Infinity
        || minSendCost !== Infinity || minFrontierCost !== Infinity;
      if (!canDoAnything) continue;
      if (budget < minActionCost && !hasSellable) continue;

      const ctx: BotContext = {
        playerIndex: b.playerIndex,
        faction: b.faction,
        candidateCells: b.candidateCells,
        towerPool: b.towerPool,
        budget,
        wave,
        lives,
        grid: this.grid,
        allPaths: this.getAllPaths(),
        placedTowers: b.placed.slice(),
        sendOptions,
        frontierOptions,
        betweenWaves,
      };

      const decision = b.brain.decide(ctx);

      switch (decision.kind) {
        case 'place': {
          // Belt-and-braces: defend against a misbehaving brain that
          // picks a cell outside the candidate set or a too-expensive
          // tower. Silently skip rather than crash the match.
          if (decision.type.cost > budget) continue;
          const cellOK = b.candidateCells.some(c => c.col === decision.col && c.row === decision.row);
          if (!cellOK) continue;
          if (!this.grid.canPlaceTower(decision.col, decision.row)) continue;
          const cost = decision.type.cost;
          if (!b.economy.spend(cost)) continue;
          const result = this.placeCallback(b.playerIndex, decision.col, decision.row, decision.type);
          if (result.ok) {
            b.candidateCells = b.candidateCells.filter(c => !(c.col === decision.col && c.row === decision.row));
            b.placed.push({
              col: decision.col, row: decision.row,
              towerId: decision.type.id, level: 1,
              upgradeCost: result.upgradeCost,
              upgradeBranches: result.upgradeBranches ?? [],
              branchUpgradeCosts: result.branchUpgradeCosts ?? {},
              sellValue: result.sellValue,
            });
            this.cellsDirty = true;
          } else {
            b.economy.addGold(cost);
          }
          break;
        }

        case 'upgrade': {
          if (!this.upgradeCallback) continue;
          const owned = b.placed.find(p => p.col === decision.col && p.row === decision.row);
          if (!owned || owned.upgradeCost <= 0) continue;
          // Pick the right cost for the chosen branch (default is
          // owned.upgradeCost). Brains that pass an unknown branch
          // fall back to the default cost.
          const branchId = decision.branch ?? null;
          const pickedCost = branchId && owned.branchUpgradeCosts[branchId] !== undefined
            ? owned.branchUpgradeCosts[branchId]
            : owned.upgradeCost;
          if (pickedCost > budget) continue;
          if (!b.economy.spend(pickedCost)) continue;
          const spent = pickedCost;
          const result = this.upgradeCallback(b.playerIndex, decision.col, decision.row, branchId);
          if (result.ok) {
            owned.level = result.newLevel;
            owned.upgradeCost = result.nextUpgradeCost;
            owned.upgradeBranches = result.upgradeBranches ?? [];
            owned.branchUpgradeCosts = result.branchUpgradeCosts ?? {};
            owned.sellValue = result.sellValue;
          } else {
            b.economy.addGold(spent);
          }
          break;
        }

        case 'sell': {
          if (!this.sellCallback) continue;
          const idx = b.placed.findIndex(p => p.col === decision.col && p.row === decision.row);
          if (idx < 0) continue;
          const refund = this.sellCallback(b.playerIndex, decision.col, decision.row);
          if (refund <= 0) continue;
          b.economy.addGold(refund);
          b.placed.splice(idx, 1);
          // The cell may now be placeable again on the next tick.
          this.cellsDirty = true;
          break;
        }

        case 'send': {
          if (!this.sendCallback) continue;
          const opt = sendOptions.find(o => o.id === decision.sendOptionId);
          if (!opt || !opt.unlocked || opt.cost > budget) continue;
          if (!b.economy.spend(opt.cost)) continue;
          const ok = this.sendCallback(b.playerIndex, opt.id, opt.cost, opt.income);
          if (!ok) b.economy.addGold(opt.cost);
          break;
        }

        case 'frontier': {
          if (!this.frontierCallback) continue;
          const opt = frontierOptions.find(o => o.id === decision.buildingId);
          if (!opt || opt.cost > budget) continue;
          if (!b.economy.spend(opt.cost)) continue;
          const ok = this.frontierCallback(b.playerIndex, opt.id, opt.cost);
          if (!ok) b.economy.addGold(opt.cost);
          break;
        }

        case 'frontierManage': {
          // Post-purchase action — the scene already manages gold
          // credit / dormancy / collapse via the existing
          // handleFrontierAction handlers, so the driver just
          // forwards intent. No spend on this side.
          if (!this.frontierActionCallback) continue;
          const target: { idx?: number; defId?: string } = {};
          if (decision.idx !== undefined) target.idx = decision.idx;
          if (decision.defId) target.defId = decision.defId;
          if (target.idx === undefined && !target.defId) continue;
          this.frontierActionCallback(b.playerIndex, decision.action, target);
          break;
        }

        case 'skip':
        default:
          break;
      }
    }
  }
}

// Backwards-compat alias. Keeps existing `import { CircleBotAI }`
// sites in GameScene working until they migrate to the new name.
export { BotAI as CircleBotAI };
