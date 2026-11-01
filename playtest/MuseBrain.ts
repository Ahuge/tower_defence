/**
 * MuseBrain — the playtest agent's strategy for Arcane / Standard / Normal.
 *
 * This is *my* game plan, encoded as a BotBrain so the headless harness
 * (src/headless/HeadlessMatch.ts) can execute it: observe (BotContext) →
 * decide (one BotDecision) → act (the driver applies it), exactly the
 * autopilot loop. Every decision is traced to playtest/trace.jsonl.
 *
 * Strategy ("precision + control"):
 *  1. Maze early: Bolt towers double as maze walls (Arcane has no Wall).
 *     Extend the path with bestMazeCell while the gain is real.
 *  2. Slow is king: one Frost early (65% slow, 2.5s) multiplies every
 *     tower's effective DPS. Second Frost only in panic.
 *  3. AoE vs packs: Storm online by wave ~4-5, second Storm mid-game.
 *  4. Boss tech: Mana Drain (strips shields) placed before a boss wave.
 *  5. Single-target: Focus (long range, crits) from wave ~6.
 *  6. Upgrades: Bolt L1→L2 is the best gold-per-DPS in the roster;
 *     upgrade DPS before buying wide.
 *  7. Late: Meteor for clumps, Arcane Nova if stable (lives>=15).
 *  8. Economy: skip frontier (prior runs show it never pays back in a
 *     ≤30-wave match). No sends exist in headless standard.
 *  9. Panic (lives<=13): stop saving, spend everything on DPS + slow.
 * Run-1 lessons (died wave 19, 900g unspent):
 *  - Upgrades before expansion loses: only first-level upgrades until
 *    10 towers stand; new towers beat taller towers.
 *  - Wave 18-19 introduces healer + evasion mage + flying + heal mage
 *    within two waves. Answers: Meteor burst, a second Frost, and a
 *    dedicated anti-air Storm on the flyers' straight-line corridor
 *    (they ignore the maze).
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BotBrain, BotContext, BotDecision, Cell } from '../src/systems/bots/BotBrain';
import type { TowerType } from '../src/data/TowerTypes';
import { bestMazeCell, pathCellsWithinRange } from '../src/systems/bots/MazePlanner';
import type { PathPoint } from '../src/systems/Pathfinding';

const TRACE = join(dirname(fileURLToPath(import.meta.url)), 'trace.jsonl');

const BOLT = 'arcane_bolt';
const FROST = 'arcane_frost';
const STORM = 'arcane_storm';
const FOCUS = 'arcane_focus';
const DRAIN = 'arcane_drain';
const METEOR = 'arcane_meteor';
const NOVA = 'arcane_nova';

const PANIC_LIVES = 13;
const NOVA_MIN_LIVES = 15;
const UPGRADE_RESERVE = 40;
const EXPAND_FIRST_TOWERS = 10;

function trace(row: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(TRACE), { recursive: true });
    appendFileSync(TRACE, JSON.stringify(row) + '\n');
  } catch { /* tracing must never break the match */ }
}

export class MuseBrain implements BotBrain {
  readonly name = 'Muse (playtest)';
  private pool = new Map<string, TowerType>();
  private lastWave = -1;
  private aaPlaced = false;

  init(ctx: BotContext): void {
    for (const t of ctx.towerPool) this.pool.set(t.id, t);
    try { mkdirSync(dirname(TRACE), { recursive: true }); } catch {}
  }

  private tower(id: string): TowerType | undefined {
    return this.pool.get(id);
  }

  private mainPath(ctx: BotContext): PathPoint[] {
    return ctx.allPaths.find((p): p is PathPoint[] => !!p && p.length > 0) ?? [];
  }

  /** Cell with the most path cells in tower range (best DPS spot). */
  private bestCoverageCell(ctx: BotContext, tower: TowerType): Cell | null {
    const path = this.mainPath(ctx);
    if (path.length === 0 || ctx.candidateCells.length === 0) return null;
    let best: Cell | null = null;
    let bestScore = -1;
    for (const c of ctx.candidateCells) {
      const s = pathCellsWithinRange(c, path, tower.range);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore > 0 ? best : null;
  }

  /** Cell that most extends the maze (or null when saturated). */
  private mazeCell(ctx: BotContext): Cell | null {
    const m = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    return m && m.gain > 0 ? { col: m.col, row: m.row } : null;
  }

  /**
   * Anti-air cell: flyers ignore the maze and fly the entry→exit
   * straight line, so the AA tower wants to sit on that corridor,
   * not on the maze path. Nearest candidate to the line wins.
   */
  private aaCell(ctx: BotContext): Cell | null {
    const { entry, exit } = ctx.grid as unknown as {
      entry: { col: number; row: number }; exit: { col: number; row: number };
    };
    if (!entry || !exit || ctx.candidateCells.length === 0) return null;
    const dx = exit.col - entry.col, dy = exit.row - entry.row;
    const len2 = dx * dx + dy * dy || 1;
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const c of ctx.candidateCells) {
      const t = Math.max(0, Math.min(1, ((c.col - entry.col) * dx + (c.row - entry.row) * dy) / len2));
      const px = entry.col + t * dx - c.col, py = entry.row + t * dy - c.row;
      const d = px * px + py * py;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  private place(ctx: BotContext, id: string, cell: Cell | null): BotDecision {
    const t = this.tower(id);
    if (!t || !cell) return { kind: 'skip' };
    return { kind: 'place', col: cell.col, row: cell.row, type: t };
  }

  decide(ctx: BotContext): BotDecision {
    if (ctx.wave !== this.lastWave) {
      this.lastWave = ctx.wave;
      trace({ ev: 'wave', wave: ctx.wave, lives: ctx.lives, budget: ctx.budget,
              towers: ctx.placedTowers.length });
    }

    const d = this.choose(ctx);
    trace({ ev: 'decide', wave: ctx.wave, lives: ctx.lives, budget: ctx.budget,
            betweenWaves: ctx.betweenWaves, kind: d.kind,
            ...(d.kind === 'place' ? { tower: (d as { type: TowerType }).type.id, col: (d as { col: number }).col, row: (d as { row: number }).row } : {}),
            ...(d.kind === 'upgrade' ? { col: (d as { col: number }).col, row: (d as { row: number }).row } : {}) });
    return d;
  }

  private choose(ctx: BotContext): BotDecision {
    const bolt = this.tower(BOLT)!;
    const frost = this.tower(FROST)!;
    const storm = this.tower(STORM)!;
    const focus = this.tower(FOCUS)!;
    const drain = this.tower(DRAIN)!;
    const meteor = this.tower(METEOR)!;
    const nova = this.tower(NOVA)!;

    const counts = new Map<string, number>();
    for (const t of ctx.placedTowers) counts.set(t.towerId, (counts.get(t.towerId) ?? 0) + 1);
    const n = (id: string) => counts.get(id) ?? 0;

    const bossSoon = (ctx.upcomingWaves ?? []).some(w => w.isBoss);
    const swarmSoon = (ctx.upcomingWaves ?? []).some(w =>
      w.groups.some(g => /swarm/i.test(g.creepType) || g.count >= 12));
    const flyingSoon = (ctx.upcomingWaves ?? []).some(w =>
      w.groups.some(g => /flying/i.test(g.creepType)));
    const panic = ctx.lives <= PANIC_LIVES;
    const reserve = panic ? 0 : UPGRADE_RESERVE;

    // --- Mid-wave: only touch upgrades in panic; otherwise hold the plan.
    if (!ctx.betweenWaves) {
      if (panic) {
        const up = this.bestUpgrade(ctx, ctx.budget);
        if (up) return up;
      }
      return { kind: 'skip' };
    }

    // --- Between waves: spend the budget until nothing useful is affordable.
    // 1. First tower ever: maze-extending Bolt.
    if (ctx.placedTowers.length === 0) {
      return this.place(ctx, BOLT, this.mazeCell(ctx) ?? this.bestCoverageCell(ctx, bolt));
    }
    // 2. Slow online ASAP — it multiplies all other DPS.
    if (n(FROST) === 0 && ctx.budget >= frost.cost) {
      return this.place(ctx, FROST, this.bestCoverageCell(ctx, frost));
    }
    // 3. Boss tech before the boss arrives.
    if (bossSoon && n(DRAIN) === 0 && ctx.budget >= drain.cost) {
      return this.place(ctx, DRAIN, this.bestCoverageCell(ctx, drain));
    }
    // 4. Panic: everything into DPS + slow, no saving.
    if (panic) {
      if (ctx.budget >= storm.cost && n(STORM) < 4) return this.place(ctx, STORM, this.bestCoverageCell(ctx, storm));
      if (ctx.budget >= frost.cost && n(FROST) < 2) return this.place(ctx, FROST, this.bestCoverageCell(ctx, frost));
      if (ctx.budget >= bolt.cost) return this.place(ctx, BOLT, this.mazeCell(ctx) ?? this.bestCoverageCell(ctx, bolt));
      const up = this.bestUpgrade(ctx, ctx.budget);
      if (up) return up;
      return { kind: 'skip' };
    }
    // 5. AoE online early; second Storm for pack waves.
    if (n(STORM) === 0 && ctx.wave >= 3 && ctx.budget >= storm.cost) {
      return this.place(ctx, STORM, this.bestCoverageCell(ctx, storm));
    }
    if (swarmSoon && n(STORM) < 2 && ctx.budget >= storm.cost) {
      return this.place(ctx, STORM, this.bestCoverageCell(ctx, storm));
    }
    // 6. Single-target sniper from wave 6.
    if (n(FOCUS) === 0 && ctx.wave >= 6 && ctx.budget >= focus.cost) {
      return this.place(ctx, FOCUS, this.bestCoverageCell(ctx, focus));
    }
    // 6b. Second Frost for slow coverage from wave 8.
    if (n(FROST) < 2 && ctx.wave >= 8 && ctx.budget >= frost.cost) {
      return this.place(ctx, FROST, this.bestCoverageCell(ctx, frost));
    }
    // 6c. Anti-air: flyers ignore the maze — a Storm on their corridor
    //     before they arrive (first flying wave is 19).
    if (flyingSoon && !this.aaPlaced && ctx.budget >= storm.cost) {
      const cell = this.aaCell(ctx);
      if (cell) { this.aaPlaced = true; return this.place(ctx, STORM, cell); }
    }
    // 7. Upgrades: only first-level upgrades until the board has real
    //    width (run-1 lesson: 13 tall towers < 18 wide ones). Bolt
    //    L1→L2 remains the best gold-per-DPS in the roster.
    {
      const up = this.bestUpgrade(ctx, ctx.budget - reserve,
        ctx.placedTowers.length < EXPAND_FIRST_TOWERS);
      if (up) return up;
    }
    // 8. Second Storm / Meteor for the late game.
    if (n(STORM) < 2 && ctx.wave >= 10 && ctx.budget >= storm.cost) {
      return this.place(ctx, STORM, this.bestCoverageCell(ctx, storm));
    }
    if (n(METEOR) === 0 && ctx.wave >= 12 && ctx.budget >= meteor.cost) {
      return this.place(ctx, METEOR, this.bestCoverageCell(ctx, meteor));
    }
    // 9. Ultimate if stable: real DPS base + lives buffer + the gold.
    if (n(NOVA) === 0 && ctx.wave >= 16 && ctx.lives >= NOVA_MIN_LIVES &&
        ctx.placedTowers.length >= 6 && ctx.budget >= nova.cost) {
      return this.place(ctx, NOVA, this.bestCoverageCell(ctx, nova));
    }
    // 10. Fill maze with Bolts while the path keeps growing; fall back to
    //     pure coverage once the maze is saturated (never sit on gold).
    if (ctx.budget >= bolt.cost && n(BOLT) < 8) {
      const cell = this.mazeCell(ctx) ?? this.bestCoverageCell(ctx, bolt);
      if (cell) return this.place(ctx, BOLT, cell);
    }
    // 11. Early game: never save — a third/fourth tower now beats a
    //     Storm later. (Reached only when the Bolt cap or maze logic
    //     above passed.)
    if (ctx.wave < 4 && ctx.budget >= bolt.cost) {
      const cell = this.bestCoverageCell(ctx, bolt);
      if (cell) return this.place(ctx, BOLT, cell);
    }
    return { kind: 'skip' };
  }

  /** Cheapest meaningful upgrade first: Bolt > Storm > Focus > others. */
  private bestUpgrade(ctx: BotContext, budget: number, firstLevelOnly = false): BotDecision | null {
    const prio = (id: string) =>
      id === BOLT ? 0 : id === STORM ? 1 : id === FOCUS ? 2 : id === DRAIN ? 3 : 4;
    const cands = ctx.placedTowers
      .filter(t => t.upgradeCost > 0 && t.upgradeCost <= budget &&
        (!firstLevelOnly || t.level === 1))
      .sort((a, b) => prio(a.towerId) - prio(b.towerId) || a.upgradeCost - b.upgradeCost);
    if (cands.length === 0) return null;
    const t = cands[0];
    return { kind: 'upgrade', col: t.col, row: t.row };
  }
}
