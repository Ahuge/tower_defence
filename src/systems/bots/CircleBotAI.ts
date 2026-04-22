/**
 * CircleBotAI — host-side driver for CPU players in Circle Co-op.
 *
 * Responsibilities (the "hard mechanics" layer):
 *   1. Cheap. Per-frame work is bounded — each bot decides at most
 *      once per `BASE_COOLDOWN_MS` interval, staggered per-bot.
 *   2. Fair. Reserves `RESERVE_PER_HUMAN × humanCount` gold for
 *      humans before a bot spends anything.
 *   3. Safe. Never places on a cell outside the bot's zone, never
 *      violates `Grid.canPlaceTower`, never spends beyond budget.
 *
 * Brain-agnostic: the driver owns cooldown, budget, candidate-cell
 * maintenance, and the actual placement + broadcast pipeline. What
 * tower goes where is delegated to a `BotBrain` per bot — swap in
 * different brains for different competency tiers (see BotBrain.ts).
 */
import { TowerType, getTowerType } from '../../data/TowerTypes';
import { FactionId, FACTIONS } from '../../data/Factions';
import { Grid } from '../Grid';
import { EconomyManager } from '../EconomyManager';
import { PathPoint } from '../Pathfinding';
import { BotBrain, BotContext, Cell, createBrain } from './BotBrain';
// Side-effect imports: register available brains in BRAIN_REGISTRY.
// New brains need to be imported here (or elsewhere pulled in at
// module-load time) to surface in lookups.
import './brains/DumbBrain';
import './brains/BalancedBrain';

/** One bot slot's per-frame state. */
interface BotState {
  playerIndex: number;
  faction: FactionId;
  brain: BotBrain;
  /** Precomputed cost-sorted list of tower types this bot can build. */
  towerPool: TowerType[];
  /** In-zone, initially-empty cells. The driver prunes cells that
   *  become non-placeable lazily (on the next tick after
   *  `invalidate()` is called). */
  candidateCells: Cell[];
  /** Cheapest tower cost — used as the "is this bot able to spend
   *  at all?" gate before calling the brain. */
  cheapestCost: number;
  /** Time remaining until the next decision attempt, in ms. */
  cooldown: number;
}

/** Callback the driver invokes to actually place a tower. The scene
 *  owns the placement/broadcast logic; the bot just announces
 *  intent. Returns true if the placement succeeded (grid + economy
 *  accepted it) so the driver can remove the cell from candidates. */
export type BotPlaceCallback = (playerIndex: number, col: number, row: number, towerType: TowerType) => boolean;

/** Fresh-decide cadence, milliseconds. Kept at 4s per the current
 *  tuning — longer feels passive, shorter feels twitchy. */
const BASE_COOLDOWN_MS = 4000;

/** Gold reserved per human player at all times. A bot only spends
 *  if `sharedGold > RESERVE_PER_HUMAN × humanCount + cheapestCost`.
 *  Tuned so each human always has enough for a mid-tier tower. */
const RESERVE_PER_HUMAN = 75;

export class CircleBotAI {
  private bots: BotState[] = [];
  private economy: EconomyManager;
  private grid: Grid;
  private humanCount: number;
  private placeCallback: BotPlaceCallback;
  /** Suppliers for state that mutates between bot ticks — kept as
   *  closures so the driver doesn't hoard a whole-GameScene reference
   *  (keeps the bot module loosely coupled and easier to test). */
  private getWave: () => number;
  private getLives: () => number;
  private getAllPaths: () => (PathPoint[] | null)[];
  private cellsDirty: boolean = true;

  constructor(
    economy: EconomyManager,
    grid: Grid,
    humanCount: number,
    placeCallback: BotPlaceCallback,
    waveSupplier: () => number,
    livesSupplier: () => number,
    allPathsSupplier: () => (PathPoint[] | null)[],
  ) {
    this.economy = economy;
    this.grid = grid;
    this.humanCount = humanCount;
    this.placeCallback = placeCallback;
    this.getWave = waveSupplier;
    this.getLives = livesSupplier;
    this.getAllPaths = allPathsSupplier;
  }

  /** Register a bot slot. `brainId` defaults to 'dumb'; pass a
   *  different id (e.g. 'balanced', once that brain exists) to
   *  upgrade individual bots without touching the driver. Falls
   *  back to DumbBrain if the id is unknown. */
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

    const state: BotState = {
      playerIndex,
      faction,
      brain,
      towerPool: pool,
      candidateCells: zoneCells.slice(),
      cheapestCost: pool[0].cost,
      // Stagger initial cooldowns so bots don't all fire on frame 1.
      cooldown: Math.random() * BASE_COOLDOWN_MS,
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

      if (b.candidateCells.length === 0) continue;

      // Budget gate. If we can't afford even the cheapest tower
      // without breaking the human reserve, skip — no point calling
      // into the brain only to have it return skip.
      const reserve = RESERVE_PER_HUMAN * this.humanCount;
      const budget = this.economy.gold - reserve;
      if (budget < b.cheapestCost) continue;

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
      };

      const decision = b.brain.decide(ctx);
      if (decision.kind !== 'place') continue;

      // Belt-and-braces: defend against a misbehaving brain that
      // picks a cell outside the candidate set or a too-expensive
      // tower. Silently skip rather than crash the match.
      if (decision.type.cost > budget) continue;
      const cellOK = b.candidateCells.some(c => c.col === decision.col && c.row === decision.row);
      if (!cellOK) continue;
      if (!this.grid.canPlaceTower(decision.col, decision.row)) continue;

      if (this.placeCallback(b.playerIndex, decision.col, decision.row, decision.type)) {
        // Remove the placed cell from candidates so nobody picks it
        // again, and mark the set dirty for neighbouring-path
        // invalidation on the next tick.
        b.candidateCells = b.candidateCells.filter(c => !(c.col === decision.col && c.row === decision.row));
        this.cellsDirty = true;
      }
    }
  }
}
