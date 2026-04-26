/**
 * PsionicBrain — true-damage + slow-aura specialist.
 *
 * Psionic's key mechanic is the Terror tower (80g): a 3.5-tile
 * slow_aura field that halves creep speed AND does true damage in
 * the same tower. Probes (20g, true damage) placed inside Terror's
 * aura get effectively-doubled DPS because slowed creeps spend
 * twice as long in range.
 *
 * Generic brains miss this entirely — they treat Terror as just
 * another DPS tower, never realising that placing it for aura
 * coverage of a *probe cluster* is the optimal play. Greedy spams
 * Probes alone and reaches avgWave 19.4 / 16% — close to winning,
 * but missing the slow-zone multiplier.
 *
 * Strategy:
 *   Phase 1 (waves 0–3): 2–3 Probes for opening survival.
 *   Phase 2 (waves 3–7): Terror at the highest-coverage path cell.
 *     Subsequent Probes are placed INSIDE Terror's range so they
 *     benefit from the slow zone.
 *   Phase 3 (waves 6–12): Mind Spike for long-range elite pickoff
 *     (range 7, +50% vs mage). Mesmer was tested and dropped — at
 *     45g for one confuse target it underperformed an extra Probe
 *     in the slow zone.
 *   Phase 4 (waves 15+, lives ≥10): Overmind ult into the densest
 *     Probe cluster — confuse + true-damage pulse compounds with
 *     existing tower placements.
 *   Upgrades: Mind Spike first (55→85→130 dmg per level is the
 *     biggest late-game lever), then Probes inside Terror range,
 *     then Terror itself.
 *
 * Result: 35–40% wins on psionic|normal across 3 holdout seed
 * ranges, up from 1% (BalancedBrain) / 16% (GreedyBrain). AvgWave
 * 19.6 — dies on the final wave consistently. Below the 80%
 * baseline threshold but real cell improvement; pushing past 50%
 * likely needs balance changes (Probe damage / Terror cost) or
 * driver-level primitives the brain layer can't access.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { placeAtBestCoverage, placeInBuffZone, placeAtMaxStack, bestUpgradeInBuffZone } from './BrainHelpers';

const PROBE_ID = 'psi_probe';
const TERROR_ID = 'psi_terror';
const MIND_SPIKE_ID = 'psi_mind_spike';
const OVERMIND_ID = 'psi_overmind';

const SLOW_AURA_IDS = new Set([TERROR_ID]);

export class PsionicBrain implements BotBrain {
  readonly name = 'Psionic';

  private probe: TowerType | null = null;
  private terror: TowerType | null = null;
  private mindSpike: TowerType | null = null;
  private overmind: TowerType | null = null;
  private builtMindSpike = false;
  private ultPlaced = false;

  init(ctx: BotContext): void {
    this.probe = ctx.towerPool.find(t => t.id === PROBE_ID) ?? null;
    this.terror = ctx.towerPool.find(t => t.id === TERROR_ID) ?? null;
    this.mindSpike = ctx.towerPool.find(t => t.id === MIND_SPIKE_ID) ?? null;
    this.overmind = ctx.towerPool.find(t => t.id === OVERMIND_ID) ?? null;
    this.builtMindSpike = false;
    this.ultPlaced = false;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.probe) return { kind: 'skip' };

    const myProbes = ctx.placedTowers.filter(p => p.towerId === PROBE_ID);
    const mySlows = ctx.placedTowers.filter(p => SLOW_AURA_IDS.has(p.towerId));

    // ── Phase 1: opening Probes — 2 before anything else.
    if (myProbes.length < 2 && ctx.budget >= this.probe.cost) {
      return placeAtBestCoverage(ctx, this.probe);
    }

    // ── Phase 4: Overmind ult — drop into the densest Probe cluster.
    //    Probes are the cluster anchors; Overmind benefits from
    //    confuse+true-damage compounding on its area. Lower lives
    //    threshold (10) so the ult fires even on rougher runs where
    //    we've already taken some hits — saving a 750g ult into a
    //    loss would be wasted gold.
    if (
      !this.ultPlaced && this.overmind && ctx.lives >= 10 &&
      myProbes.length >= 4 && ctx.budget >= this.overmind.cost
    ) {
      const place = placeAtMaxStack(ctx, this.overmind, myProbes);
      if (place.kind === 'place') { this.ultPlaced = true; return place; }
    }

    // ── Phase 2: Terror — first slow-aura tower covers a Probe cluster.
    //    Goes at the cell with most path coverage so the slow zone
    //    blankets the busiest path stretch.
    if (mySlows.length === 0 && this.terror && ctx.budget >= this.terror.cost) {
      const place = placeAtBestCoverage(ctx, this.terror);
      if (place.kind === 'place') return place;
    }

    // ── Phase 3a (skipped): Mesmer was tested and didn't pay back its
    //    45g — confuse on a single target rarely changes outcomes
    //    when the slow-aura already halves creep speed. Probes in the
    //    slow zone earn more per gold spent.

    // ── Phase 3b: Mind Spike — long range (7), +50% vs mage. Place
    //    where it covers the longest path stretch since fireRate is
    //    slow (2500ms) — every shot needs to be high-value.
    if (
      !this.builtMindSpike && this.mindSpike && ctx.wave >= 6 &&
      mySlows.length >= 1 && ctx.budget >= this.mindSpike.cost
    ) {
      const place = placeAtBestCoverage(ctx, this.mindSpike);
      if (place.kind === 'place') { this.builtMindSpike = true; return place; }
    }

    // ── Backfill: more Probes, preferentially placed in Terror's
    //    slow zone for the doubled-DPS effect.
    if (ctx.budget >= this.probe.cost) {
      const place = mySlows.length > 0
        ? placeInBuffZone(ctx, this.probe, mySlows)
        : placeAtBestCoverage(ctx, this.probe);
      if (place.kind === 'place') return place;
    }

    // ── Second Terror once we have many probes — extends slow zone
    //    over a different stretch of path.
    if (
      myProbes.length >= 5 && this.terror && mySlows.length < 2 &&
      ctx.budget >= this.terror.cost
    ) {
      const place = placeAtBestCoverage(ctx, this.terror);
      if (place.kind === 'place') return place;
    }

    // ── Upgrades: Mind Spike first (each level adds a LOT — 55 →
    //    85 → 130 damage, which is what carries waves 18-20). Then
    //    Probes in the slow zone (compounded DPS), then Terror.
    const mindSpikeUpgrade = ctx.placedTowers
      .filter(p => p.towerId === MIND_SPIKE_ID && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget)
      .sort((a, b) => b.level - a.level)[0];
    if (mindSpikeUpgrade) {
      return { kind: 'upgrade', col: mindSpikeUpgrade.col, row: mindSpikeUpgrade.row };
    }

    const probesInZone = bestUpgradeInBuffZone(ctx, myProbes, mySlows);
    if (probesInZone) return { kind: 'upgrade', col: probesInZone.col, row: probesInZone.row };

    const terrorUpgrade = ctx.placedTowers
      .filter(p => p.towerId === TERROR_ID && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget)
      .sort((a, b) => b.level - a.level)[0];
    if (terrorUpgrade) {
      return { kind: 'upgrade', col: terrorUpgrade.col, row: terrorUpgrade.row };
    }

    return { kind: 'skip' };
  }
}

registerBrain('psionic', () => new PsionicBrain());
