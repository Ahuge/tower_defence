/**
 * StrategistBrain — faction-agnostic parameterized strategy.
 *
 * The "knowledge" half of the learning system: expert strategy encoded
 * as structure, with every judgment call exposed as a tunable knob.
 * An evolution strategy (playtest/evolve.mts, reusing the repo's
 * BrainSearchManager) then converges the knobs per faction.
 *
 * Encoded expert knowledge (from playtesting + the user's expertise):
 *  - Maze with CHEAP damaging towers early (psionic: Probe 20g; the
 *    "maze weaker towers" insight). Never maze with 0-damage towers.
 *  - Slow online ASAP — it multiplies all other DPS.
 *  - Linkers (cypherpunk Firewall, harmonic Conduit) are placed in
 *    PAIRS within link range; a lone linker does nothing. The user
 *    rates Firewall "amazing" — it gets its own build priority.
 *  - Anti-shield before boss waves (where the faction has one).
 *  - Anti-air splash on the flyer corridor when flying approaches
 *    (flyers ignore the maze; run-1 lesson).
 *  - Upgrades before expansion loses (run-1 lesson): only first-level
 *    upgrades until the board has width.
 *  - Panic early (lives<=13): spend everything, stop saving.
 *
 * Every role resolves from the faction's towerPool, so factions with
 * missing roles (no slow, no splash, no linker) simply skip those
 * steps — the brain never crashes on a thin roster.
 */
import type { BotBrain, BotContext, BotDecision, Cell } from '../src/systems/bots/BotBrain';
import type { TowerType } from '../src/data/TowerTypes';
import { groupByRole } from '../src/data/TowerRoles';
import { hasTrait } from '../src/systems/traits/Trait';

/**
 * WishlistItem — a single strategic intent.
 *
 * The brain owns WHAT it wants (tower, role, priority). The scorer
 * owns WHERE (cell selection). If the scorer vetoes (low confidence),
 * the brain falls through to the next wishlist item.
 *
 * Stolen from PR #68's MazingBrain pattern: separate strategic intent
 * from spatial intent.
 */
interface WishlistItem {
  tower: TowerType;
  /** Max copies of this tower in the wishlist. */
  maxCount: number;
  /** Higher = earlier in the wishlist. */
  priority: number;
  /** Cell scorer for this item. Returns null if vetoed. */
  scorer: (ctx: BotContext, tower: TowerType) => Cell | null;
  /** Minimum path coverage for confidence. Below this, veto. */
  minCoverage?: number;
}
import { bestMazeCell, pathCellsWithinRange } from '../src/systems/bots/MazePlanner';
import type { PathPoint } from '../src/systems/Pathfinding';

export interface StrategistParams {
  /** Maze-extending placements prioritized before pure coverage. */
  mazeTowers: number;
  /** Have a slow tower by this wave (0 = second tower). */
  slowByWave: number;
  /** Have AoE (splash) online by this wave. */
  aoeByWave: number;
  /** Have a sniper (longest-range single) by this wave. */
  sniperByWave: number;
  /** Second slow tower by this wave. */
  secondSlowByWave: number;
  /** Big burst AoE by this wave. */
  burstByWave: number;
  /** Only first-level upgrades until this many towers stand. */
  expandFirst: number;
  /** Cap on cheap-DPS fill towers. */
  maxCheap: number;
  /** Lives <= this: panic, spend everything. */
  panicLives: number;
  /** Ultimate needs this many towers standing. */
  ultTowers: number;
  /** Ultimate needs this many lives. */
  ultLives: number;
  /** Start saving for the ultimate at this wave. */
  ultSaveByWave: number;
  /** Gold held back from upgrades for the next tower buy. */
  upgradeReserve: number;
  /** 0 = cheapest DPS when filling, 1 = most expensive. */
  expensiveBias: number;
  /** Linker pairs (firewall/conduit) to build. */
  linkerPairs: number;
  /** 1 = fill DPS inside slow-aura zones when they exist. */
  buffZone: number;
  /** 1 = upgrade the sniper (long-range single) before cheap DPS. */
  sniperUpgFirst: number;
  /** Have a support-aura tower by this wave. */
  supportByWave: number;
  /** Cap on support-aura towers. */
  maxSupport: number;
  /** 1 = place anti-air splash when flying approaches. */
  aaEnabled: number;
  /** Harmonic: target resonator (DPS core) count — "a few, upgraded hard". */
  harmonicResonators: number;
  /** Harmonic: target total aura count (reach+amplifier+quickener). */
  harmonicAuras: number;
}

export const DEFAULT_STRATEGIST_PARAMS: StrategistParams = {
  mazeTowers: 4,
  slowByWave: 0,
  aoeByWave: 4,
  sniperByWave: 6,
  secondSlowByWave: 8,
  burstByWave: 12,
  expandFirst: 10,
  maxCheap: 8,
  panicLives: 13,
  ultTowers: 6,
  ultLives: 15,
  ultSaveByWave: 16,
  upgradeReserve: 40,
  expensiveBias: 0.3,
  linkerPairs: 2,
  aaEnabled: 1,
  buffZone: 1,
  sniperUpgFirst: 0,
  supportByWave: 5,
  maxSupport: 2,
  harmonicResonators: 4,
  harmonicAuras: 12,
};

interface Roles {
  cheapDps?: TowerType;
  dpsPool: TowerType[];      // damage>0, cost ascending
  splash?: TowerType;        // cheapest dps-splash
  slow?: TowerType;          // cheapest slow applicator
  sniper?: TowerType;        // longest-range dps-single
  antiShield?: TowerType;    // strip_shield
  burst?: TowerType;         // priciest dps-splash (if != splash)
  ultimate?: TowerType;      // priciest attacker
  linker?: TowerType;        // firewall_link / conduit_link
  linkRange: number;
  support?: TowerType;       // ally-buff aura (swarm node etc.)
  // Harmonic-specific: the three aura types, resolved separately so the
  // brain can stack them in the expert order (reach first — it compounds
  // the other auras' radii — then amplifier, then quickener).
  reach?: TowerType;         // range_aura
  amplifier?: TowerType;     // damage_aura
  quickener?: TowerType;     // rate_aura
  // Mech-specific: wall for maze construction.
  wall?: TowerType;          // cheap maze filler (mech_wall)
  // Psionic-specific: mesmer (confuse) is core on Hard, not optional.
  mesmer?: TowerType;        // confuse_on_hit
  terror?: TowerType;        // slow_aura
}

const LINK_TRAITS = ['firewall_link', 'conduit_link'];
// Slow applicators: classic slows, roots, reverses, and linker beams
// (cypherpunk Firewall's beam is a 50% slow — the faction's core control).
const SLOW_TRAITS = ['slow_on_hit', 'slow_aura', 'barbed_wire', 'root_on_hit', 'hack_reverse'];
// Support auras: buff nearby allied towers (aliens Swarm Node's +20%
// fire rate is the faction's core synergy — a 0-damage tower that
// naive DPS filters ignore, the same trap as the firewall).
const SUPPORT_AURAS = ['faction_speed_aura', 'commander_aura', 'damage_aura',
  'rate_aura', 'range_aura', 'crit_aura', 'tower_aura_damage'];

export class StrategistBrain implements BotBrain {
  readonly name = 'Strategist (playtest)';
  readonly params: StrategistParams;
  private roles: Roles = { dpsPool: [], linkRange: 8 };
  private aaDone = false;
  private pendingLinker: Cell | null = null;

  constructor(params?: Partial<StrategistParams>) {
    this.params = { ...DEFAULT_STRATEGIST_PARAMS, ...(params ?? {}) };
  }

  init(ctx: BotContext): void {
    const pool = ctx.towerPool;
    const grouped = groupByRole(pool);
    // Walls are maze filler, not DPS — exclude from the damage pool
    // (mech_wall at 8g would otherwise shadow the real cheap DPS).
    const dps = pool.filter(t => t.damage > 0 && !t.id.includes('wall')).sort((a, b) => a.cost - b.cost);
    const splash = dps.filter(t => hasTrait(t.traits, 'splash_damage')).sort((a, b) => a.cost - b.cost);
    const single = dps.filter(t => !hasTrait(t.traits, 'splash_damage'));
    const slowCands = pool.filter(t =>
      SLOW_TRAITS.some(id => hasTrait(t.traits, id)) || grouped.slow.includes(t));
    const linkCands = pool.filter(t => LINK_TRAITS.some(id => hasTrait(t.traits, id)));
    const linkTrait = linkCands[0]?.traits.find(t => LINK_TRAITS.includes(t.id)) as
      { linkRange?: number } | undefined;
    const supportCands = pool.filter(t => SUPPORT_AURAS.some(id => hasTrait(t.traits, id)));
    this.roles = {
      dpsPool: dps,
      cheapDps: dps[0],
      splash: splash[0],
      slow: slowCands.sort((a, b) => a.cost - b.cost)[0],
      sniper: [...single].sort((a, b) => b.range - a.range)[0],
      antiShield: dps.find(t => hasTrait(t.traits, 'strip_shield')),
      burst: splash.length > 1 ? splash[splash.length - 1] : undefined,
      ultimate: dps[dps.length - 1],
      linker: linkCands.sort((a, b) => a.cost - b.cost)[0],
      linkRange: linkTrait?.linkRange ?? 8,
      support: supportCands.sort((a, b) => a.cost - b.cost)[0],
      reach: pool.filter(t => hasTrait(t.traits, 'range_aura')).sort((a, b) => a.cost - b.cost)[0],
      amplifier: pool.filter(t => hasTrait(t.traits, 'damage_aura')).sort((a, b) => a.cost - b.cost)[0],
      quickener: pool.filter(t => hasTrait(t.traits, 'rate_aura')).sort((a, b) => a.cost - b.cost)[0],
      wall: pool.filter(t => t.id.includes('wall')).sort((a, b) => a.cost - b.cost)[0],
      mesmer: pool.filter(t => hasTrait(t.traits, 'confuse_on_hit')).sort((a, b) => a.cost - b.cost)[0],
      terror: pool.filter(t => hasTrait(t.traits, 'slow_aura')).sort((a, b) => a.cost - b.cost)[0],
    };
    // Sniper must differ from the cheap DPS to be a distinct step.
    if (this.roles.sniper && this.roles.cheapDps && this.roles.sniper.id === this.roles.cheapDps.id) {
      this.roles.sniper = undefined;
    }
    if (this.roles.burst && this.roles.splash && this.roles.burst.id === this.roles.splash.id) {
      this.roles.burst = undefined;
    }
  }

  // -- helpers ---------------------------------------------------------

  private mainPath(ctx: BotContext): PathPoint[] {
    return ctx.allPaths.find((p): p is PathPoint[] => !!p && p.length > 0) ?? [];
  }

  private coverageCell(ctx: BotContext, tower: TowerType): Cell | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  private mazeCell(ctx: BotContext): Cell | null {
    const m = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    return m && m.gain > 0 ? { col: m.col, row: m.row } : null;
  }

  /** Cell on the flyers' straight-line corridor (they ignore the maze). */
  private aaCell(ctx: BotContext): Cell | null {
    const { entry, exit } = ctx.grid as unknown as {
      entry: { col: number; row: number }; exit: { col: number; row: number };
    };
    if (!entry || !exit || ctx.candidateCells.length === 0) return null;
    const dx = exit.col - entry.col, dy = exit.row - entry.row;
    const len2 = dx * dx + dy * dy || 1;
    let best: Cell | null = null, bestD = Infinity;
    for (const c of ctx.candidateCells) {
      const t = Math.max(0, Math.min(1, ((c.col - entry.col) * dx + (c.row - entry.row) * dy) / len2));
      const px = entry.col + t * dx - c.col, py = entry.row + t * dy - c.row;
      const d = px * px + py * py;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  private place(ctx: BotContext, t: TowerType | undefined, cell: Cell | null): BotDecision {
    if (!t || !cell || ctx.budget < t.cost) return { kind: 'skip' };
    return { kind: 'place', col: cell.col, row: cell.row, type: t };
  }

  private count(ctx: BotContext, t: TowerType | undefined): number {
    if (!t) return 0;
    return ctx.placedTowers.filter(p => p.towerId === t.id).length;
  }

  /** DPS fill pick: expensiveBias interpolates cheapest→priciest. */
  private fillTower(): TowerType | undefined {
    const pool = this.roles.dpsPool.filter(t => t !== this.roles.linker);
    if (pool.length === 0) return undefined;
    const idx = Math.round(this.params.expensiveBias * (pool.length - 1));
    return pool[Math.max(0, Math.min(pool.length - 1, idx))];
  }

  private bestUpgrade(ctx: BotContext, budget: number, firstLevelOnly: boolean): BotDecision | null {
    const sniperFirst = this.params.sniperUpgFirst >= 1;
    const prio = (id: string) => {
      const r = this.roles;
      if (sniperFirst && r.sniper && id === r.sniper.id) return 0;
      if (r.cheapDps && id === r.cheapDps.id) return sniperFirst ? 1 : 0;
      if (r.splash && id === r.splash.id) return sniperFirst ? 2 : 1;
      if (r.sniper && id === r.sniper.id) return sniperFirst ? 3 : 2;
      return 4;
    };
    const cands = ctx.placedTowers
      .filter(t => t.upgradeCost > 0 && t.upgradeCost <= budget && (!firstLevelOnly || t.level === 1))
      .sort((a, b) => prio(a.towerId) - prio(b.towerId) || a.upgradeCost - b.upgradeCost);
    if (cands.length === 0) return null;
    return { kind: 'upgrade', col: cands[0].col, row: cands[0].row };
  }

  // -- the strategy ----------------------------------------------------

  decide(ctx: BotContext): BotDecision {
    return this.choose(ctx);
  }

  /**
   * Walk a wishlist: for each item (priority order), ask the scorer
   * for a cell. If the scorer vetoes (null or low coverage), fall
   * through to the next item. Returns the first placeable decision,
   * or skip if all vetoed.
   *
   * This separates strategic intent (the wishlist) from spatial
   * intent (the scorer) — PR #68's pattern.
   */
  private walkWishlist(ctx: BotContext, wishlist: WishlistItem[]): BotDecision {
    const n = (t: TowerType | undefined) => this.count(ctx, t);
    // Sort by priority (higher first)
    const sorted = [...wishlist].sort((a, b) => b.priority - a.priority);
    for (const item of sorted) {
      if (n(item.tower) >= item.maxCount) continue;
      if ((item.tower.cost ?? 999) > ctx.budget) continue;
      const cell = item.scorer(ctx, item.tower);
      if (!cell) continue; // vetoed: no cell
      // Confidence check: does the cell cover enough path?
      if (item.minCoverage !== undefined) {
        const path = this.mainPath(ctx);
        const coverage = pathCellsWithinRange(cell, path, item.tower.range);
        if (coverage < item.minCoverage) continue; // vetoed: low confidence
      }
      const d = this.place(ctx, item.tower, cell);
      if (d.kind !== 'skip') return d;
    }
    return { kind: 'skip' };
  }

  private choose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    // Harmonic plays a different game: exit gauntlet + multiplicative
    // aura stacking (user's expert knowledge). Dedicated path below.
    if (ctx.faction === 'harmonic' && (r.reach || r.amplifier || r.quickener)) {
      return this.harmonicChoose(ctx);
    }
    // Mech: wall-maze + turret spam (entry kill-box, ramp_up clustering).
    if (ctx.faction === 'mechanical' && r.wall && r.cheapDps) {
      return this.mechChoose(ctx);
    }
    // Aliens: spitter-width (cheap spam, acid for armor).
    if (ctx.faction === 'aliens' && r.cheapDps) {
      return this.aliensChoose(ctx);
    }
    // Psionic: confuse-trap (mesmer corridor + terror slow + probe spam).
    if (ctx.faction === 'psionic' && r.mesmer && r.terror) {
      return this.psionicChoose(ctx);
    }
    // Void: siphon spam (economy gamble — weak early, pays off via +gold per hit).
    if (ctx.faction === 'void' && r.cheapDps) {
      return this.voidChoose(ctx);
    }
    // Cypherpunk: firewall kill-corridors (position CC around firewall zones).
    if (ctx.faction === 'cypherpunk' && r.linker) {
      return this.cypherpunkChoose(ctx);
    }
    // Military: sniper/artillery coordination (mobile precision + static fire base).
    if (ctx.faction === 'military' && r.wall) {
      return this.militaryChoose(ctx);
    }
    if (!r.cheapDps) return { kind: 'skip' }; // no damage at all: nothing to do

    const bossSoon = (ctx.upcomingWaves ?? []).some(w => w.isBoss);
    const flyingSoon = (ctx.upcomingWaves ?? []).some(w =>
      w.groups.some(g => /flying/i.test(g.creepType)));
    const panic = ctx.lives <= p.panicLives;
    const n = (t: TowerType | undefined) => this.count(ctx, t);

    // Mid-wave: only upgrades, and only in panic.
    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    // Urgent (panic) mode: run the normal build with every timing gate
    // lifted and no savings held back — buy core tech the moment it is
    // affordable instead of dribbling gold into filler.
    const urgent = panic;
    const gate = (w: number) => urgent || ctx.wave >= w;

    // 1. Opener: maze with cheap damaging towers (never 0-damage).
    if (ctx.placedTowers.length === 0) {
      return this.place(ctx, r.cheapDps, this.mazeCell(ctx) ?? this.coverageCell(ctx, r.cheapDps));
    }
    // 2. Linker pairs FIRST (firewall/conduit): they are the faction's
    //    core when present — a lone linker does nothing, so the pair
    //    is placed as a unit with the beam lying along the path.
    {
      const d = this.linkerStep(ctx);
      if (d.kind !== 'skip') return d;
    }
    // 3. Slow online.
    if (r.slow && n(r.slow) === 0 && gate(p.slowByWave)) {
      const d = this.place(ctx, r.slow, this.coverageCell(ctx, r.slow));
      if (d.kind !== 'skip') return d;
    }
    // 4. Boss tech.
    if (bossSoon && r.antiShield && n(r.antiShield) === 0) {
      const d = this.place(ctx, r.antiShield, this.coverageCell(ctx, r.antiShield));
      if (d.kind !== 'skip') return d;
    }
    // 5. AoE online.
    if (r.splash && n(r.splash) === 0 && gate(p.aoeByWave)) {
      const d = this.place(ctx, r.splash, this.coverageCell(ctx, r.splash));
      if (d.kind !== 'skip') return d;
    }
    // 5b. Support aura (swarm node etc.): placed to cover the DPS
    //     cluster, never for path coverage.
    if (r.support && n(r.support) < p.maxSupport && gate(p.supportByWave)) {
      const d = this.place(ctx, r.support, this.supportCell(ctx, r.support));
      if (d.kind !== 'skip') return d;
    }
    // 6. Sniper.
    if (r.sniper && n(r.sniper) === 0 && gate(p.sniperByWave)) {
      const d = this.place(ctx, r.sniper, this.coverageCell(ctx, r.sniper));
      if (d.kind !== 'skip') return d;
    }
    // 7. Second slow.
    if (r.slow && n(r.slow) < 2 && gate(p.secondSlowByWave)) {
      const d = this.place(ctx, r.slow, this.coverageCell(ctx, r.slow));
      if (d.kind !== 'skip') return d;
    }
    // 8. Anti-air splash on the flyer corridor.
    if (p.aaEnabled >= 1 && flyingSoon && !this.aaDone && r.splash) {
      const cell = this.aaCell(ctx);
      if (cell && ctx.budget >= r.splash.cost) {
        this.aaDone = true;
        return this.place(ctx, r.splash, cell);
      }
    }
    // 9. Upgrades: width before height.
    {
      const up = this.bestUpgrade(ctx, ctx.budget - (urgent ? 0 : p.upgradeReserve),
        ctx.placedTowers.length < p.expandFirst);
      if (up) return up;
    }
    // 10. Burst AoE late.
    if (r.burst && n(r.burst) === 0 && gate(p.burstByWave)) {
      const d = this.place(ctx, r.burst, this.coverageCell(ctx, r.burst));
      if (d.kind !== 'skip') return d;
    }
    // 11. Ultimate: save only when stable (never save in urgent mode).
    if (r.ultimate && n(r.ultimate) === 0 && (urgent || ctx.wave >= p.ultSaveByWave) &&
        ctx.lives >= p.ultLives && ctx.placedTowers.length >= p.ultTowers &&
        ctx.budget >= r.ultimate.cost) {
      return this.place(ctx, r.ultimate, this.coverageCell(ctx, r.ultimate));
    }
    // 12. Fill: maze-extending DPS, then coverage. In urgent mode, hold
    //     gold for unbuilt core tech (slow/splash/linkers) instead of
    //     ping-spamming into a wall — the old death spiral.
    const corePending = (r.slow && n(r.slow) === 0) || (r.splash && n(r.splash) === 0) ||
      (r.linker && p.linkerPairs > 0 && n(r.linker) < p.linkerPairs * 2);
    const fill = this.fillTower();
    if (fill && n(r.cheapDps) < p.maxCheap && !(urgent && corePending)) {
      // Slow-zone first: DPS inside an aura gets the slow multiplier.
      // Then maze extension with cheap towers, then plain coverage.
      const bz = p.buffZone >= 1 ? this.buffZoneCell(ctx, fill) : null;
      const mz = !bz && ctx.placedTowers.length < p.mazeTowers ? this.mazeCell(ctx) : null;
      const d = this.place(ctx, fill, bz ?? mz ?? this.coverageCell(ctx, fill));
      if (d.kind !== 'skip') return d;
    }
    return { kind: 'skip' };
  }

  /**
   * Harmonic exit-gauntlet strategy (expert knowledge from the user's
   * Hard-mode recordings).
   *
   * The faction's identity is multiplicative aura stacking with no cap:
   * Amplifier (+damage), Quickener (+fire rate), Reach (+range) — and
   * Reach compounds the OTHER auras' radii (two-pass trait system), so
   * it goes first to grow the stacking field. The DPS core is a FEW
   * resonators ("weak alone, powerful with auras"), upgraded hard,
   * sitting inside the stacked field. On low-gold difficulties the
   * cluster anchors at the EXIT (creeps walk the whole map taking chip
   * damage, die in the kill zone) and expands backward as waves harden.
   */
  private harmonicChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const n = (t: TowerType | undefined) => this.count(ctx, t);
    const panic = ctx.lives <= p.panicLives;

    // Mid-wave: only upgrades, and only in panic.
    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const dps = r.cheapDps; // resonator
    const auraCount = n(r.reach) + n(r.amplifier) + n(r.quickener);

    // 1. Anchor the DPS core at the exit: a few resonators.
    if (dps && n(dps) < p.harmonicResonators) {
      const d = this.place(ctx, dps, this.exitCell(ctx, dps));
      if (d.kind !== 'skip') return d;
    }
    // 2. Aura stack, expert order: REACH first (compounds every other
    //    aura's radius), then AMPLIFIER (damage), then QUICKENER (rate).
    //    Multiplicative with no cap — count is the damage scaler.
    if (r.reach && n(r.reach) < Math.ceil(p.harmonicAuras / 3)) {
      const d = this.place(ctx, r.reach, this.exitCell(ctx, r.reach));
      if (d.kind !== 'skip') return d;
    }
    if (r.amplifier && n(r.amplifier) < Math.ceil(p.harmonicAuras / 3)) {
      const d = this.place(ctx, r.amplifier, this.exitCell(ctx, r.amplifier));
      if (d.kind !== 'skip') return d;
    }
    if (r.quickener && n(r.quickener) < Math.floor(p.harmonicAuras / 3)) {
      const d = this.place(ctx, r.quickener, this.exitCell(ctx, r.quickener));
      if (d.kind !== 'skip') return d;
    }
    // 3. Upgrades: the resonators inside the stacked field are the
    //    damage — height before width. Keep only a small reserve so
    //    gold compounds into the core instead of idling.
    {
      const up = this.bestUpgrade(ctx, ctx.budget - 30, false);
      if (up) return up;
    }
    // 4. More auras past the initial targets — no cap on the stacking.
    const auraTypes = [r.reach, r.amplifier, r.quickener].filter(Boolean) as TowerType[];
    for (const a of auraTypes) {
      const d = this.place(ctx, a, this.exitCell(ctx, a));
      if (d.kind !== 'skip') return d;
    }
    // 5. Backward expansion: extend the kill zone toward mid-map.
    if (dps) {
      const d = this.place(ctx, dps, this.coverageCell(ctx, dps));
      if (d.kind !== 'skip') return d;
    }
    return { kind: 'skip' };
  }

  /**
   * Cell maximizing coverage of the path's EXIT segment (last ~8 path
   * cells). The harmonic gauntlet anchors here: creeps arrive
   * pre-damaged and die inside the stacked aura field.
   */
  private exitCell(ctx: BotContext, tower: TowerType): Cell | null {
    return this.exitZoneCell(ctx, tower, 8);
  }

  /**
   * Cell maximizing coverage of the last N path cells. Wider zones
   * (e.g. 16) suit exit-anchored width strategies like aliens'
   * spitter spam (user's zone: cols 20-35).
   */
  private exitZoneCell(ctx: BotContext, tower: TowerType, n: number): Cell | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    const exitSeg = path.slice(Math.max(0, path.length - n));
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      const s = pathCellsWithinRange(c, exitSeg, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  /**
   * Cell maximizing coverage of the path's ENTRY segment (first ~8 path
   * cells). The mech kill-box anchors here: walls maze the entry,
   * turrets cluster for ramp_up focus fire.
   */
  private entryCell(ctx: BotContext, tower: TowerType): Cell | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    const entrySeg = path.slice(0, 8);
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      const s = pathCellsWithinRange(c, entrySeg, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  /**
   * Mech wall-maze strategy (expert knowledge from user's Hard recordings).
   *
   * The faction's game: cheap walls (8g) maze the ENTRY, turrets cluster
   * for ramp_up (fire rate ramps on same target — focus fire compounds).
   * Shredders for armor, flamethrowers on the path. On Hard, the wall
   * count goes up (dedicated maze pieces, not turret-walls).
   */
  private mechChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const turret = r.cheapDps; // mech_turret
    const wall = r.wall;
    const shredCands = (ctx.towerPool ?? []).filter(t => hasTrait(t.traits, 'armor_shred_on_hit'));
    const shredderT = shredCands.sort((a, b) => a.cost - b.cost)[0];

    // Wishlist: turrets (DPS) → walls (maze, w9+) → shredders (armor).
    const wishlist: WishlistItem[] = [];
    if (turret) wishlist.push({
      tower: turret, maxCount: 30, priority: 3,
      scorer: (c, t) => this.entryCell(c, t),
      minCoverage: 2,
    });
    if (wall && ctx.wave >= 9) wishlist.push({
      tower: wall, maxCount: 8, priority: 2,
      scorer: (c, t) => this.mazeCell(c) ?? this.entryCell(c, t),
      // Walls don't need coverage — they're maze structure.
    });
    if (shredderT) wishlist.push({
      tower: shredderT, maxCount: 3, priority: 1,
      scorer: (c, t) => this.entryCell(c, t),
      minCoverage: 2,
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // Piercer branches: upgrade L1 turrets to L2 via the piercer
    // branch (true_damage + ramp_up). Prefer piercer over plain L2.
    {
      const l1turret = ctx.placedTowers.find(t =>
        t.towerId === turret?.id && t.level === 1 &&
        (t.upgradeCost ?? 999) <= ctx.budget);
      if (l1turret) {
        return { kind: 'upgrade', col: l1turret.col, row: l1turret.row, branch: 'piercer' };
      }
    }
    // Upgrades: turrets first (the DPS core).
    {
      const up = this.bestUpgrade(ctx, ctx.budget - 30, false);
      if (up) return up;
    }
    // More turrets past 30 if gold allows (no veto).
    if (turret) {
      const d2 = this.place(ctx, turret, this.entryCell(ctx, turret) ?? this.coverageCell(ctx, turret));
      if (d2.kind !== 'skip') return d2;
    }
    return { kind: 'skip' };
  }

  /**
   * Aliens spitter-width strategy (expert knowledge from user's Hard win).
   *
   * 88 spitters (12g, 3dmg, 250ms). The game is WIDTH, not height:
   * drown the map in cheap fast attackers, acid for armor shred,
   * swarm node for the fire-rate aura. Minimal upgrades.
   */
  private aliensChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const spitter = r.cheapDps; // alien_spitter
    const acidCands = (ctx.towerPool ?? []).filter(t => hasTrait(t.traits, 'armor_shred_on_hit'));
    const acid = acidCands.sort((a, b) => a.cost - b.cost)[0];
    const swarmNode = r.support; // alien_swarm_node (faction_speed_aura)

    // Wishlist: spitters (width) → acid (armor) → swarm node (aura).
    // EXIT-focused wide zone (user's spitters: cols 20-35).
    const wishlist: WishlistItem[] = [];
    if (spitter) wishlist.push({
      tower: spitter, maxCount: 999, priority: 3, // no cap — width is the strategy
      scorer: (c, t) => this.exitZoneCell(c, t, 16) ?? this.coverageCell(c, t),
      minCoverage: 2,
    });
    if (acid) wishlist.push({
      tower: acid, maxCount: 5, priority: 2,
      scorer: (c, t) => this.exitZoneCell(c, t, 16) ?? this.coverageCell(c, t),
      minCoverage: 2,
    });
    if (swarmNode) wishlist.push({
      tower: swarmNode, maxCount: 1, priority: 1,
      scorer: (c, t) => this.supportCell(c, t),
      // Support doesn't need path coverage — it buffs towers.
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // Minimal upgrades (user did 7 in 144 turns).
    {
      const up = this.bestUpgrade(ctx, ctx.budget - 50, true); // first-level only
      if (up) return up;
    }
    return { kind: 'skip' };
  }

  /**
   * Psionic confuse-trap strategy (expert knowledge from user's Hard win).
   *
   * Mesmer (confuse: creep walks backward) + Terror (50% slow aura)
   * creates a ping-pong trap: creeps oscillate in place instead of
   * advancing. Probes (true_damage, ignores armor) grind them down.
   * Mesmer is CORE on Hard (34 in user's win), not the luxury the
   * Normal specialist claimed.
   */
  private psionicChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const probe = r.cheapDps; // psi_probe (true_damage)
    const mesmer = r.mesmer;   // psi_mesmer (confuse)
    const terror = r.terror;   // psi_terror (slow_aura)

    // Wishlist: strategic intent (WHAT), scorer owns WHERE.
    // Priority order: probes (DPS core) → mesmers (trap) → terrors (slow).
    const wishlist: WishlistItem[] = [];
    if (probe) wishlist.push({
      tower: probe, maxCount: 60, priority: 3,
      scorer: (c, t) => this.leftHalfCell(c, t) ?? this.coverageCell(c, t),
      minCoverage: 2,
    });
    if (mesmer) wishlist.push({
      tower: mesmer, maxCount: 30, priority: 2,
      // Interleave with probes: Alex's win has mesmers avg 1.0 tiles from nearest probe
      scorer: (c, t) => this.adjacentToProbeCell(c, t),
      minCoverage: 2,
    });
    if (terror) wishlist.push({
      tower: terror, maxCount: 7, priority: 1,
      scorer: (c, t) => this.leftHalfCell(c, t) ?? this.coverageCell(c, t),
      minCoverage: 3, // slow needs good coverage to matter
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // 4. Minimal upgrades (user did 8 in 141 turns) — control > DPS.
    {
      const up = this.bestUpgrade(ctx, ctx.budget - 50, true);
      if (up) return up;
    }
    // 5. More probes past 60 (no max, no veto — fill gaps).
    if (probe) {
      const d2 = this.place(ctx, probe, this.coverageCell(ctx, probe));
      if (d2.kind !== 'skip') return d2;
    }
    return { kind: 'skip' };
  }

  /**
   * Void: siphon spam. Alex's Hard win: 151 siphons, 55 rifts, 0 upgrades.
   * Siphons are "a gamble early" — weak but pay off via 40% chance of +2g
   * per hit. Pure spam, no upgrades. Rifts teleport creeps backward.
   */
  private voidChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    // Find siphon and rift in the pool
    const pool = ctx.towerPool;
    const siphon = pool.find(t => t.id === 'void_siphon');
    const rift = pool.find(t => t.id === 'void_rift');
    const gambler = pool.find(t => t.id === 'void_gambler');

    const wishlist: WishlistItem[] = [];
    // Siphons: the core — spam them (Alex: 151 in a win, 0 upgrades)
    if (siphon) wishlist.push({
      tower: siphon, maxCount: 150, priority: 3,
      scorer: (c, t) => this.coverageCell(c, t),
      minCoverage: 2,
    });
    // Rifts: teleport utility (Alex: 55)
    if (rift) wishlist.push({
      tower: rift, maxCount: 55, priority: 2,
      scorer: (c, t) => this.coverageCell(c, t),
      minCoverage: 2,
    });
    // Gamblers: economy boost (Alex: 7)
    if (gambler) wishlist.push({
      tower: gambler, maxCount: 7, priority: 1,
      scorer: (c, t) => this.coverageCell(c, t),
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // No upgrades — pure spam per Alex's win (0 upgrades in 220 turns)
    // Fill remaining budget with more siphons
    if (siphon) {
      const d2 = this.place(ctx, siphon, this.coverageCell(ctx, siphon));
      if (d2.kind !== 'skip') return d2;
    }
    return { kind: 'skip' };
  }

  /**
   * Cypherpunk: firewall kill-corridors. Alex's Hard win: 43 pings,
   * 4 firewalls, 8 ddos, 8 backdoor, 5 zeroday. "Firewall is the star,
   * but we are making kill corridors and placing towers that slow, stun
   * or reverse the creeps so they stay in that kill corridor."
   * Positioning is everything — CC around firewall zones.
   */
  private cypherpunkChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const pool = ctx.towerPool;
    const ping = pool.find(t => t.id === 'cyber_ping');
    const firewall = r.linker; // cyber_firewall has firewall_link trait
    const ddos = pool.find(t => t.id === 'cyber_ddos');
    const backdoor = pool.find(t => t.id === 'cyber_backdoor');

    const wishlist: WishlistItem[] = [];
    // Firewalls first — they're the star, everything positions around them
    if (firewall) wishlist.push({
      tower: firewall, maxCount: 4, priority: 4,
      scorer: (c, t) => this.corridorCell(c, t),
      minCoverage: 3,
    });
    // Pings: the DPS backbone (Alex: 43, avg 2.4 tiles from firewall)
    if (ping) wishlist.push({
      tower: ping, maxCount: 43, priority: 3,
      scorer: (c, t) => this.nearFirewallCell(c, t),
      minCoverage: 2,
    });
    // DDoS/backdoor: CC to keep creeps in the corridor
    if (ddos) wishlist.push({
      tower: ddos, maxCount: 8, priority: 2,
      scorer: (c, t) => this.nearFirewallCell(c, t),
    });
    if (backdoor) wishlist.push({
      tower: backdoor, maxCount: 8, priority: 1,
      scorer: (c, t) => this.nearFirewallCell(c, t),
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // Minimal upgrades (Alex: 2 in 286 turns)
    {
      const up = this.bestUpgrade(ctx, ctx.budget - 50, true);
      if (up) return up;
    }
    return { kind: 'skip' };
  }

  /**
   * Cell maximizing coverage of the firewall corridor — for cypherpunk,
   * we want towers clustered around firewall positions to keep creeps
   * in the kill zone. Falls back to general coverage.
   */
  private corridorCell(ctx: BotContext, tower: TowerType): Cell | null {
    // For now, use coverage-based placement. Future: track firewall
    // positions and bias toward them.
    return this.coverageCell(ctx, tower);
  }

  /**
   * Military: sniper/artillery coordination. Alex's Hard win with new
   * towers: 33 sandbags, 13 riflemen, 10 snipers, 7 artillery, 5 heavies.
   * "Artillery is a savior, snipers are great leak support."
   * Sniper: mobile precision (80 dmg, range 9). Artillery: static fire
   * base (stun + vulnerable).
   */
  private militaryChoose(ctx: BotContext): BotDecision {
    const p = this.params, r = this.roles;
    const panic = ctx.lives <= p.panicLives;

    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget, false);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    const pool = ctx.towerPool;
    const sandbag = r.wall; // 4g, cheapest wall
    const rifleman = pool.find(t => t.id === 'mil_rifleman');
    const sniper = pool.find(t => t.id === 'mil_sniper');
    const artillery = pool.find(t => t.id === 'mil_artillery');
    const heavy = pool.find(t => t.id === 'mil_heavy');

    const wishlist: WishlistItem[] = [];
    // Sandbags: maze foundation (Alex: 33, cheapest wall in game)
    if (sandbag) wishlist.push({
      tower: sandbag, maxCount: 33, priority: 4,
      scorer: (c, t) => this.mazeCell(c),
    });
    // Riflemen: early cheap DPS (Alex: 13)
    if (rifleman) wishlist.push({
      tower: rifleman, maxCount: 13, priority: 3,
      scorer: (c, t) => this.coverageCell(c, t),
      minCoverage: 2,
    });
    // Snipers: mobile precision, leak support (Alex: 10)
    if (sniper) wishlist.push({
      tower: sniper, maxCount: 10, priority: 2,
      scorer: (c, t) => this.coverageCell(c, t),
      minCoverage: 2,
    });
    // Artillery: static fire base, stun + vulnerable (Alex: 7, "savior")
    // Clustered together: Alex's at (7,8), (9,10), (9,8), (7,6)
    if (artillery) wishlist.push({
      tower: artillery, maxCount: 7, priority: 1,
      scorer: (c, t) => this.artilleryClusterCell(c, t),
      minCoverage: 3, // needs good coverage for the AoE to matter
    });

    const d = this.walkWishlist(ctx, wishlist);
    if (d.kind !== 'skip') return d;

    // Heavies as backup (Alex: 5)
    if (heavy && ctx.budget >= (heavy.cost ?? 999)) {
      const d2 = this.place(ctx, heavy, this.coverageCell(ctx, heavy));
      if (d2.kind !== 'skip') return d2;
    }
    return { kind: 'skip' };
  }

  /**
   * Cell in the LEFT HALF of the map (cols 0-18) maximizing path
   * coverage. The psionic trap corridor lives here: mesmer band +
   * terror slow zones + probe spam, all in the left-mid field.
   */
  private leftHalfCell(ctx: BotContext, tower: TowerType): Cell | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    const leftCells = ctx.candidateCells.filter(c => c.col <= 18);
    if (leftCells.length === 0) return this.coverageCell(ctx, tower);
    let best: Cell | null = null, bestScore = -1;
    for (const c of leftCells) {
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  /**
   * Cell adjacent to an existing probe (for mesmer interleaving).
   * Alex's psionic win: mesmers average 1.0 tiles from nearest probe.
   * Places mesmers to interleave with the probe base for permanent trap.
   */
  private adjacentToProbeCell(ctx: BotContext, tower: TowerType): Cell | null {
    // Find existing probes
    const probes = ctx.placedTowers.filter(p => p.towerId.includes('probe'));
    if (probes.length === 0) return this.leftHalfCell(ctx, tower);
    // Find candidate cells within 2 tiles of a probe, maximizing path coverage
    const path = this.mainPath(ctx);
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      // Check if within 2 tiles of any probe
      const nearProbe = probes.some(p => 
        Math.abs(p.col - c.col) <= 2 && Math.abs(p.row - c.row) <= 2
      );
      if (!nearProbe) continue;
      // Also in left half (psionic corridor)
      if (c.col > 18) continue;
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best ?? this.leftHalfCell(ctx, tower);
  }

  /**
   * Cell near existing firewalls (for cypherpunk kill-corridor).
   * Alex's win: pings average 2.4 tiles from nearest firewall.
   * Firewalls at (35,7), (27,7), (34,13), (26,13) form a rectangle.
   */
  private nearFirewallCell(ctx: BotContext, tower: TowerType): Cell | null {
    const firewalls = ctx.placedTowers.filter(p => 
      p.towerId.includes('firewall')
    );
    if (firewalls.length === 0) return this.coverageCell(ctx, tower);
    const path = this.mainPath(ctx);
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      // Within 4 tiles of a firewall (Alex: max 4.2, avg 2.4)
      const nearFW = firewalls.some(f =>
        Math.hypot(f.col - c.col, f.row - c.row) <= 4
      );
      if (!nearFW) continue;
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best ?? this.coverageCell(ctx, tower);
  }

  /**
   * Cell for artillery cluster (military fire base).
   * Alex's win: artillery at (7,8), (9,10), (9,8), (7,6) — tight cluster.
   * Places new artillery within 3 tiles of existing artillery.
   */
  private artilleryClusterCell(ctx: BotContext, tower: TowerType): Cell | null {
    const artys = ctx.placedTowers.filter(p => 
      p.towerId.includes('artillery')
    );
    if (artys.length === 0) return this.coverageCell(ctx, tower);
    const path = this.mainPath(ctx);
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      const nearArty = artys.some(a =>
        Math.hypot(a.col - c.col, a.row - c.row) <= 3
      );
      if (!nearArty) continue;
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best ?? this.coverageCell(ctx, tower);
  }

  /**
   * Path cells lying along the beam segment a→b (within 0.6 cells).
   * A longitudinal beam — lying ALONG the path — keeps creeps inside
   * the damage+slow zone for seconds; a perpendicular beam only
   * grazes them. This is the core of the firewall/conduit strategy.
   */
  private beamOverlap(a: Cell, b: Cell, path: PathPoint[]): number {
    const dx = b.col - a.col, dy = b.row - a.row;
    const len2 = dx * dx + dy * dy;
    const R = this.roles.linkRange;
    if (len2 < 4 || len2 > R * R) return -1; // too close or out of link range
    let n = 0;
    for (const p of path) {
      const t = ((p.col - a.col) * dx + (p.row - a.row) * dy) / len2;
      if (t < 0 || t > 1) continue;
      const px = a.col + t * dx - p.col, py = a.row + t * dy - p.row;
      if (px * px + py * py <= 0.36) n++;
    }
    return n;
  }

  /**
   * Find the best linker PAIR as a unit: the two cells whose beam
   * covers the most path. If a lone linker already stands (odd
   * count), anchor the search on it.
   */
  private findLinkerPair(ctx: BotContext, linker: TowerType): { a: Cell; b: Cell } | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    // Towers placed ON the path reroute it — invalidating the beam
    // geometry we score against. Pair candidates must be off-path so
    // the beam they form actually survives placement.
    const onPath = new Set(path.map(p => `${p.col},${p.row}`));
    const scored = ctx.candidateCells
      .filter(c => !onPath.has(`${c.col},${c.row}`))
      .map(c => ({ c, s: pathCellsWithinRange(c, path, linker.range) }))
      .filter(x => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, 40);
    if (scored.length === 0) return null;
    let best: { a: Cell; b: Cell } | null = null, bestScore = 0;
    const existing = ctx.placedTowers.filter(t => t.towerId === linker.id);
    if (existing.length % 2 === 1) {
      const a = { col: existing[existing.length - 1].col, row: existing[existing.length - 1].row };
      for (const { c } of scored) {
        const s = this.beamOverlap(a, c, path);
        if (s > bestScore) { bestScore = s; best = { a, b: c }; }
      }
      return best;
    }
    const cands = scored.map(x => x.c);
    const offPath = ctx.candidateCells.filter(c => !onPath.has(`${c.col},${c.row}`));
    for (const a of cands) {
      for (const b of offPath) {
        if (a.col === b.col && a.row === b.row) continue;
        const s = this.beamOverlap(a, b, path);
        if (s > bestScore) { bestScore = s; best = { a, b }; }
      }
    }
    return best;
  }

  /**
   * Towers on the board projecting an aura worth clustering DPS in:
   * slow auras (creeps longer in range) and support auras (allied
   * fire-rate/damage buffs). Generic across factions.
   */
  private auraAnchors(ctx: BotContext): { col: number; row: number; range: number }[] {
    const out: { col: number; row: number; range: number }[] = [];
    for (const pt of ctx.placedTowers) {
      const def = ctx.towerPool.find(t => t.id === pt.towerId);
      if (!def) continue;
      if (hasTrait(def.traits, 'slow_aura') || SUPPORT_AURAS.some(id => hasTrait(def.traits, id))) {
        out.push({ col: pt.col, row: pt.row, range: def.range });
      }
    }
    return out;
  }

  /**
   * Best cell for a support tower: maximizes the number of allied
   * DPS towers inside its aura. Support goes where the army is,
   * not where the path is.
   */
  private supportCell(ctx: BotContext, support: TowerType): Cell | null {
    if (ctx.candidateCells.length === 0) return null;
    const dpsIds = new Set(ctx.towerPool.filter(t => t.damage > 0).map(t => t.id));
    const dps = ctx.placedTowers.filter(p => dpsIds.has(p.towerId));
    if (dps.length === 0) return null;
    let best: Cell | null = null, bestScore = -1;
    for (const c of ctx.candidateCells) {
      let n = 0;
      for (const d of dps) {
        const dx = d.col - c.col, dy = d.row - c.row;
        if (dx * dx + dy * dy <= support.range * support.range) n++;
      }
      if (n > bestScore) { bestScore = n; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  /**
   * Best cell inside a slow-aura zone: DPS placed here gets the
   * slow multiplier (creeps spend longer in range). Scored by zone
   * overlap first, path coverage second.
   */
  private buffZoneCell(ctx: BotContext, tower: TowerType): Cell | null {
    const anchors = this.auraAnchors(ctx);
    if (anchors.length === 0 || ctx.candidateCells.length === 0) return null;
    const path = this.mainPath(ctx);
    let best: Cell | null = null, bestScore = -Infinity;
    for (const c of ctx.candidateCells) {
      let n = 0;
      for (const a of anchors) {
        const dx = a.col - c.col, dy = a.row - c.row;
        if (dx * dx + dy * dy <= a.range * a.range) n++;
      }
      if (n === 0) continue;
      const cov = path.length ? pathCellsWithinRange(c, path, tower.range) : 0;
      const s = n * 100 + cov;
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best;
  }

  /** One linker-pair build step: places 'a', remembers 'b' for next call. */
  private linkerStep(ctx: BotContext): BotDecision {
    const r = this.roles, p = this.params;
    if (!r.linker || p.linkerPairs <= 0) return { kind: 'skip' };
    if (this.count(ctx, r.linker) >= p.linkerPairs * 2) return { kind: 'skip' };
    if (this.pendingLinker) {
      const cell = this.pendingLinker;
      this.pendingLinker = null;
      return this.place(ctx, r.linker, cell);
    }
    const pair = this.findLinkerPair(ctx, r.linker);
    if (!pair) return { kind: 'skip' };
    this.pendingLinker = pair.b;
    return this.place(ctx, r.linker, pair.a);
  }
}
