/**
 * HarmonicBrain — aura-stack specialist.
 *
 * Harmonic's tower set is uniquely shaped: one DPS tower (Resonator)
 * plus four aura towers (Amplifier, Quickener, Reach, Critical Mass)
 * whose buffs *all stack within a radius*. The faction wins by
 * concentrating Resonators in a "buff zone" surrounded by stacked
 * auras, not by spreading single-tower coverage.
 *
 * Generic brains (Greedy, Balanced) misplay this because their
 * adjacency-bonus heuristics check Chebyshev-1 (immediate neighbours
 * only), but harmonic auras have range 4 tiles. A Resonator placed
 * 3 tiles from an Amplifier is fully buffed; a generic brain has no
 * way to know that.
 *
 * Strategy:
 *   Phase 1 (waves 0–4): place 1–2 Resonators on high-coverage cells.
 *   Phase 2 (waves 4–10): saturate aura range around the Resonators —
 *     Amplifier first (cheapest 30g, +20% dmg, stacks), then
 *     Quickener (+15% rate), then Reach if budget permits.
 *   Phase 3 (waves 10+): upgrade Resonators to L4 (32 dmg, range 4),
 *     add Critical Mass (15% crit) once a stable buff zone exists.
 *   Phase 4 (waves 15+, lives stable): Crescendo ult — drop in the
 *     densest buff zone for doubled-aura DPS.
 */
import { BotBrain, BotContext, BotDecision, PlacedTower, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { placeAtBestCoverage, placeInBuffZone, placeAtMaxStack, bestUpgradeInBuffZone } from './BrainHelpers';

const RESONATOR_ID = 'harmonic_resonator';
const AMPLIFIER_ID = 'harmonic_amplifier';
const QUICKENER_ID = 'harmonic_quickener';
const REACH_ID = 'harmonic_reach';
const CRITICAL_MASS_ID = 'harmonic_critical_mass';
const CONDUIT_ID = 'harmonic_conduit';
const CRESCENDO_ID = 'harmonic_crescendo';

const AURA_TOWER_IDS = new Set([AMPLIFIER_ID, QUICKENER_ID, REACH_ID, CRITICAL_MASS_ID]);
/** Build order for aura towers — cheapest first, since stacks of
 *  cheap auras outperform a single expensive one early. */
const AURA_BUILD_ORDER = [AMPLIFIER_ID, AMPLIFIER_ID, QUICKENER_ID, AMPLIFIER_ID, REACH_ID, CRITICAL_MASS_ID];

export class HarmonicBrain implements BotBrain {
  readonly name = 'Harmonic';

  private resonator: TowerType | null = null;
  private crescendo: TowerType | null = null;
  /** Index into AURA_BUILD_ORDER for the next aura tower to place. */
  private auraIdx = 0;
  /** Whether we've placed the ultimate yet (one-shot). */
  private ultPlaced = false;

  init(ctx: BotContext): void {
    this.resonator = ctx.towerPool.find(t => t.id === RESONATOR_ID) ?? null;
    this.crescendo = ctx.towerPool.find(t => t.id === CRESCENDO_ID) ?? null;
    this.auraIdx = 0;
    this.ultPlaced = false;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.resonator) return { kind: 'skip' };

    const myResonators = ctx.placedTowers.filter(p => p.towerId === RESONATOR_ID);
    const myAuras = ctx.placedTowers.filter(p => AURA_TOWER_IDS.has(p.towerId));

    // ── Phase 1: get the first Resonator down before anything else.
    if (myResonators.length === 0 && ctx.budget >= this.resonator.cost) {
      return placeAtBestCoverage(ctx, this.resonator);
    }

    // ── Phase 4: Crescendo ult — only when stable + buff zone formed.
    if (
      !this.ultPlaced && this.crescendo && ctx.lives >= 15 && myAuras.length >= 3 &&
      ctx.budget >= this.crescendo.cost
    ) {
      const place = placeAtMaxStack(ctx, this.crescendo, myAuras);
      if (place.kind === 'place') {
        this.ultPlaced = true;
        return place;
      }
    }

    // ── Phase 2: saturate auras around the existing Resonator(s).
    // Place each next aura WITHIN AURA RANGE of an existing Resonator,
    // not just on a high-coverage cell. Auras with no Resonator in
    // range are wasted gold.
    if (this.auraIdx < AURA_BUILD_ORDER.length) {
      const nextAuraId = AURA_BUILD_ORDER[this.auraIdx];
      const auraType = ctx.towerPool.find(t => t.id === nextAuraId);
      if (auraType && ctx.budget >= auraType.cost) {
        const place = placeInBuffZone(ctx, auraType, myResonators);
        if (place.kind === 'place') {
          this.auraIdx++;
          return place;
        }
      }
    }

    // ── Phase 3: more Resonators if we have spare gold and some
    // aura coverage already. Each new Resonator should land inside
    // the existing buff zone (within aura range of ≥1 aura).
    if (
      myResonators.length < 4 && myAuras.length >= 2 &&
      ctx.budget >= this.resonator.cost * 2 // keep a buffer for next aura
    ) {
      const place = placeInBuffZone(ctx, this.resonator, myAuras);
      if (place.kind === 'place') return place;
    }

    // ── Upgrades: prefer the Resonator with the most auras in range
    // (compounded bonus per upgrade level).
    const upgrade = this.upgradeBestResonator(ctx, myResonators, myAuras);
    if (upgrade.kind === 'upgrade') return upgrade;

    // ── Fallback: top up with whatever the cheapest tower we can
    // afford is, placed in the buff zone if possible.
    const cheapestPool = [...ctx.towerPool]
      .filter(t => t.id !== CRESCENDO_ID && t.cost <= ctx.budget)
      .sort((a, b) => a.cost - b.cost);
    if (cheapestPool.length > 0) {
      const t = cheapestPool[0];
      const inZone = placeInBuffZone(ctx, t, [...myResonators, ...myAuras]);
      if (inZone.kind === 'place') return inZone;
      const anywhere = placeAtBestCoverage(ctx, t);
      if (anywhere.kind === 'place') return anywhere;
    }

    return { kind: 'skip' };
  }

  private upgradeBestResonator(
    ctx: BotContext, resonators: PlacedTower[], auras: PlacedTower[],
  ): BotDecision {
    const target = bestUpgradeInBuffZone(ctx, resonators, auras);
    if (!target) return { kind: 'skip' };
    return { kind: 'upgrade', col: target.col, row: target.row };
  }
}

registerBrain('harmonic', () => new HarmonicBrain());
