/**
 * PlacementAdvisor — tutorial-style overlay that scores every empty cell
 * with the learned placement model and shows the player where the model
 * would build.
 *
 * Browser-compatible twin of playtest/LearnedScorer (which uses node:fs
 * and only runs in the headless harness). Models are loaded on demand via
 * dynamic JSON import — one ~217KB chunk per faction.
 *
 * The advisor is purely visual: it never places towers itself. Clicking a
 * highlighted cell in build mode goes through the normal tryBuildTower
 * path, so affordability / zone / path gates all still apply.
 */
import * as Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridLeftX, gridY } from '../config';

const COLS = GRID_COLS;
const ROWS = GRID_ROWS;

/** Live game state the advisor reads through a provider (fresh each call). */
export interface AdvisorContext {
  faction: string | null;
  wave: number;
  placedTowers: AdvisorTower[];
  /** True when the cell is a legal placement target right now. */
  isCandidateCell: (col: number, row: number) => boolean;
  /** Tower type being scored (selected dock tower, or first in dock). */
  towerTypeId: string | null;
  /** Display name of towerTypeId, or null when no tower is selected. */
  towerName: string | null;
  /** Current gold (economy.gold). */
  gold: number;
  /** Current lives. */
  lives: number;
  /** Base cost of towerTypeId, or null when no tower is selected. */
  towerCost: number | null;
  /** All active creep paths ({col,row} points), or null when unknown. */
  allPaths: ({ col: number; row: number }[] | null)[] | null;
}

/** A placed tower, with the default (linear) upgrade option pre-resolved
 *  so the advisor can score upgrades without touching Tower internals. */
export interface AdvisorTower {
  towerId: string;
  name: string;
  col: number;
  row: number;
  level: number;
  damage: number;
  /** ms between shots. */
  fireRate: number;
  /** Cost of the default next upgrade, or null when maxed. */
  upgradeCost: number | null;
  /** Stats after the default next upgrade, or null when maxed. */
  nextDamage: number | null;
  /** ms between shots after the default next upgrade. */
  nextFireRate: number | null;
}

interface LayerWeights {
  weights: number[][];
  bias: number[];
}

interface ScorerModel {
  faction: string;
  input_dim: number;
  layers: LayerWeights[];
}

export interface ScoredCell {
  col: number;
  row: number;
  score: number;
}

/** One advisor recommendation — either a new placement or an upgrade
 *  of an existing tower, ranked together by score. */
export interface AdvisorRecommendation {
  kind: 'place' | 'upgrade';
  col: number;
  row: number;
  score: number;
  /** For upgrades: the tower id being upgraded. */
  towerId?: string;
  /** Display name of the tower (placement: the tower being scored;
   *  upgrade: the tower being upgraded). Shown in the label. */
  towerName?: string;
}

/** Score below which a cell is not drawn at all. */
const DRAW_THRESHOLD = 0.15;
/** When the best placement AND best upgrade both score below this,
 *  the advisor recommends saving gold instead of spending it. */
const SAVE_THRESHOLD = 0.4;
/**
 * HEURISTIC (not learned): upgrade value is DPS gained per gold,
 * scaled so ~0.2 DPS/gold scores 1.0. Cheap early upgrades score
 * high; expensive late upgrades score low. A learned upgrade model
 * would need upgrade-decision data we don't have yet — this is a
 * placeholder that ranks upgrades against placements on the same
 * 0–1 scale. Tune freely.
 */
const UPGRADE_VALUE_SCALE = 0.2;

/**
 * HEURISTIC upgrade value (pure, exported for tests): DPS gained per
 * gold, scaled so ~0.2 DPS/gold scores 1.0. Returns -1 for a DPS
 * downgrade (never recommend). See UPGRADE_VALUE_SCALE.
 */
export function scoreUpgradeValue(dpsBefore: number, dpsAfter: number, cost: number): number {
  const gain = dpsAfter - dpsBefore;
  if (gain <= 0) return -1;
  return Math.min(1, Math.max(0, (gain / cost) / UPGRADE_VALUE_SCALE));
}

/** Order-stable board signature (pure, exported for tests): tower
 *  count + each tower's position, type, and level. Any placement,
 *  upgrade, sell, or branch changes it. */
export function boardSignature(towers: AdvisorTower[]): string {
  if (towers.length === 0) return 'empty';
  const sorted = [...towers].sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return sorted.map(t => `${t.col},${t.row},${t.towerId},${t.level}`).join('|');
}

/**
 * Label layout (pure, exported for tests): given label anchor points
 * (cell centres) and label widths, shift colliding labels vertically
 * until clear. Labels are ~7px/char monospace — wider than a 28px
 * cell — so horizontally adjacent top-3 cells overlap badly without
 * this. Returns the final centre for each label, in input order.
 */
export function layoutAdvisorLabels(
  items: { cx: number; cy: number; w: number }[],
  gridTop: number,
): { x: number; y: number }[] {
  const LABEL_H = 15;
  const STEP = 14;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  return items.map(({ cx, cy, w }) => {
    let y = cy;
    for (let attempt = 0; attempt < 6; attempt++) {
      const box = { x0: cx - w / 2, x1: cx + w / 2, y0: y - LABEL_H / 2, y1: y + LABEL_H / 2 };
      const collides = placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
      const offGrid = box.y0 < gridTop;
      if (!collides && !offGrid) {
        placed.push(box);
        return { x: cx, y };
      }
      // Shift up while there's room above the grid; otherwise down.
      y += (y - LABEL_H / 2 - STEP >= gridTop) ? -STEP : STEP;
    }
    placed.push({ x0: cx - w / 2, x1: cx + w / 2, y0: y - LABEL_H / 2, y1: y + LABEL_H / 2 });
    return { x: cx, y };
  });
}
/** Score bands for the heatmap. */
const BANDS = [
  { min: 0.7, color: 0x22cc66, label: 'high' },
  { min: 0.4, color: 0xddbb22, label: 'mid' },
  { min: DRAW_THRESHOLD, color: 0xcc3322, label: 'low' },
] as const;

/** Dynamic loaders — one code-split chunk per faction, loaded on demand. */
const MODEL_LOADERS: Record<string, () => Promise<{ default: ScorerModel }>> = {
  void: () => import('../../playtest/models/scorer-void.json'),
  cypherpunk: () => import('../../playtest/models/scorer-cypherpunk.json'),
  military: () => import('../../playtest/models/scorer-military.json'),
  psionic: () => import('../../playtest/models/scorer-psionic.json'),
  mechanical: () => import('../../playtest/models/scorer-mechanical.json'),
  harmonic: () => import('../../playtest/models/scorer-harmonic.json'),
  aliens: () => import('../../playtest/models/scorer-aliens.json'),
  chaos: () => import('../../playtest/models/scorer-chaos.json'),
  arcane: () => import('../../playtest/models/scorer-arcane.json'),
  nature: () => import('../../playtest/models/scorer-nature.json'),
  infernal: () => import('../../playtest/models/scorer-infernal.json'),
  celestial: () => import('../../playtest/models/scorer-celestial.json'),
};

export class PlacementAdvisor {
  private scene: Phaser.Scene;
  private getCtx: () => AdvisorContext;
  private onMessage: (msg: string) => void;

  private heatGraphics: Phaser.GameObjects.Graphics;
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private scoreTexts: Phaser.GameObjects.Text[] = [];

  private model: ScorerModel | null = null;
  private modelFaction: string | null = null;
  private modelMissing = false;
  private warnedDimMismatch = false;
  private loading = false;
  private enabled = false;
  private topRecs: AdvisorRecommendation[] = [];
  private saveRecommended = false;
  private lastScoredTower: string | null = null;
  private lastScoredTowerName: string | null = null;
  private lastScoredWave = -1;
  /** Board signature (count + per-tower col/row/id/level) from the
   *  last refresh. Replaces the old placed-count gate: placements,
   *  upgrades, sells, and branches all change the signature, so a
   *  refresh can never be skipped after the board changes. */
  private lastScoredSignature: string | null = null;

  constructor(
    scene: Phaser.Scene,
    getCtx: () => AdvisorContext,
    onMessage: (msg: string) => void,
  ) {
    this.scene = scene;
    this.getCtx = getCtx;
    this.onMessage = onMessage;
    // Depth 18: below range circle (19), hover (20), ghost (21).
    this.heatGraphics = scene.add.graphics().setDepth(18);
    this.pulseGraphics = scene.add.graphics().setDepth(18);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getTopCells(): ScoredCell[] {
    return this.topRecs
      .filter(r => r.kind === 'place')
      .map(r => ({ col: r.col, row: r.row, score: r.score }));
  }

  /** Top recommendations (placements + upgrades mixed, ranked by score). */
  getTopRecommendations(): AdvisorRecommendation[] {
    return this.topRecs;
  }

  /** The upgrade recommendation at (col,row), if that cell is in the top list. */
  getTopUpgradeAt(col: number, row: number): AdvisorRecommendation | null {
    return this.topRecs.find(r => r.kind === 'upgrade' && r.col === col && r.row === row) ?? null;
  }

  /** True when the best placement AND best upgrade are both too weak
   *  to be worth the gold — the advisor recommends saving instead. */
  isSaveRecommended(): boolean {
    return this.enabled && this.saveRecommended;
  }

  /** Enable/disable the overlay. Loads the faction model on first enable. */
  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
      return;
    }
    const ctx = this.getCtx();
    if (!ctx.faction) {
      this.onMessage('Placement Advisor: no faction in this match.');
      this.enabled = false;
      return;
    }
    if (this.modelFaction !== ctx.faction) {
      await this.loadModel(ctx.faction);
    }
    if (!this.model) {
      this.enabled = false;
      return;
    }
    this.refresh(true);
  }

  private async loadModel(faction: string): Promise<void> {
    const loader = MODEL_LOADERS[faction];
    if (!loader) {
      if (!this.modelMissing) {
        this.onMessage(`Placement Advisor: no trained model for ${faction} yet.`);
        this.modelMissing = true;
      }
      this.model = null;
      this.modelFaction = null;
      return;
    }
    if (this.loading) return;
    this.loading = true;
    try {
      const mod = await loader();
      this.model = mod.default;
      this.modelFaction = faction;
      this.modelMissing = false;
    } catch {
      this.onMessage(`Placement Advisor: failed to load the ${faction} model.`);
      this.model = null;
      this.modelFaction = null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Re-score every candidate cell and upgrade, and redraw. Cheap
   * (~936 forward passes of a 10k-param MLP + a handful of upgrade
   * scores) — safe to call on state changes. Pass force to redraw
   * even when nothing changed (e.g. after enabling).
   */
  refresh(force = false): void {
    if (!this.enabled || !this.model) return;
    const ctx = this.getCtx();
    const towerId = ctx.towerTypeId;
    if (!towerId) return;
    // Stale models (old 17-feature set) would produce NaN — guard instead
    // of drawing garbage. Retrain + re-export to fix.
    if (this.model.input_dim !== 11) {
      if (!this.warnedDimMismatch) {
        this.warnedDimMismatch = true;
        this.onMessage(`Placement Advisor: ${this.modelFaction} model is the old 17-feature version — retrain and re-export to use the advisor.`);
      }
      return;
    }
    // Board signature: count + per-tower (col,row,id,level). Catches
    // placements, upgrades, sells, and branches — the old count-only
    // gate missed upgrades entirely (count doesn't change) and, worse,
    // the provider used to read a stale tower list so the count never
    // moved at all. Gold/lives are NOT part of the gate — they change
    // constantly mid-wave as creeps die; the decision points
    // (placement, upgrade, wave, tower switch) are what matter, and
    // gold/lives are read fresh at each of those.
    const signature = boardSignature(ctx.placedTowers);
    if (!force && towerId === this.lastScoredTower && ctx.wave === this.lastScoredWave && signature === this.lastScoredSignature) {
      return; // nothing the model sees has changed
    }
    this.lastScoredTower = towerId;
    this.lastScoredTowerName = ctx.towerName;
    this.lastScoredWave = ctx.wave;
    this.lastScoredSignature = signature;

    const recs: AdvisorRecommendation[] = [];

    // Placements: score every legal empty cell with the learned model.
    const scored: ScoredCell[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!ctx.isCandidateCell(col, row)) continue;
        const feats = this.extractFeatures(ctx, col, row, towerId);
        const score = this.forward(this.model, feats);
        if (score >= DRAW_THRESHOLD) scored.push({ col, row, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    for (const s of scored) recs.push({ kind: 'place', col: s.col, row: s.row, score: s.score });

    // Upgrades: heuristic DPS-gain-per-gold for each affordable
    // upgradeable tower. (Not learned — see UPGRADE_VALUE_SCALE.)
    for (const t of ctx.placedTowers) {
      if (t.upgradeCost === null || t.nextDamage === null || t.nextFireRate === null) continue;
      if (t.upgradeCost > ctx.gold) continue; // unaffordable
      const dpsBefore = t.damage / (t.fireRate / 1000);
      const dpsAfter = t.nextDamage / (t.nextFireRate / 1000);
      const score = scoreUpgradeValue(dpsBefore, dpsAfter, t.upgradeCost);
      if (score < 0) continue; // DPS downgrade — never recommend
      recs.push({ kind: 'upgrade', col: t.col, row: t.row, score, towerId: t.towerId, towerName: t.name });
    }

    recs.sort((a, b) => b.score - a.score);
    this.topRecs = recs.slice(0, 3);
    // Save when nothing on offer is worth the gold: the best
    // placement and the best upgrade are both below threshold.
    const bestPlace = scored.length > 0 ? scored[0].score : 0;
    const bestUpgrade = Math.max(0, ...recs.filter(r => r.kind === 'upgrade').map(r => r.score));
    this.saveRecommended = bestPlace < SAVE_THRESHOLD && bestUpgrade < SAVE_THRESHOLD;

    this.drawHeat(scored);
    this.drawTopLabels();
  }

  /** Called every frame from GameScene.update — pulses the top-3 outline. */
  update(timeMs: number): void {
    if (!this.enabled || this.topRecs.length === 0) return;
    const alpha = 0.55 + 0.45 * Math.sin(timeMs / 280);
    this.pulseGraphics.clear();
    for (const rec of this.topRecs) {
      // Upgrades pulse cyan; placements pulse white.
      const color = rec.kind === 'upgrade' ? 0x33aaff : 0xffffff;
      this.pulseGraphics.lineStyle(2, color, alpha);
      this.pulseGraphics.strokeRect(
        gridLeftX(rec.col) + 1, gridY(rec.row) - TILE_SIZE / 2 + 1,
        TILE_SIZE - 2, TILE_SIZE - 2,
      );
    }
  }

  private drawHeat(scored: ScoredCell[]): void {
    this.heatGraphics.clear();
    for (const cell of scored) {
      const band = BANDS.find(b => cell.score >= b.min);
      if (!band) continue;
      // Alpha scales with score so the best cells glow brightest.
      const alpha = 0.12 + 0.28 * cell.score;
      this.heatGraphics.fillStyle(band.color, alpha);
      this.heatGraphics.fillRect(
        gridLeftX(cell.col), gridY(cell.row) - TILE_SIZE / 2,
        TILE_SIZE, TILE_SIZE,
      );
    }
  }

  private drawTopLabels(): void {
    for (const t of this.scoreTexts) t.destroy();
    this.scoreTexts = [];
    // Labels name the tower being scored — "1 · Gambler 0.62" — so
    // the recommendation is actionable even when the player hasn't
    // noticed which dock tower is selected. Monospace ~6.6px/char.
    const CHAR_W = 6.6;
    const items = this.topRecs.map((rec, i) => {
      const text = rec.kind === 'upgrade'
        ? `↑ UPG ${rec.towerName ?? ''} ${rec.score.toFixed(2)}`.trim()
        : `${i + 1} · ${this.lastScoredTowerName ?? ''} ${rec.score.toFixed(2)}`.trim();
      return {
        text,
        color: rec.kind === 'upgrade' ? '#88ccff' : '#ffffff',
        cx: gridLeftX(rec.col) + TILE_SIZE / 2,
        cy: gridY(rec.row),
        w: text.length * CHAR_W + 4,
      };
    });
    const positions = layoutAdvisorLabels(
      items.map(it => ({ cx: it.cx, cy: it.cy, w: it.w })),
      gridY(0) - TILE_SIZE / 2,
    );
    items.forEach((it, i) => {
      const label = this.scene.add.text(
        positions[i].x,
        positions[i].y,
        it.text,
        { fontSize: '11px', color: it.color, fontFamily: 'monospace', backgroundColor: '#00000088', padding: { x: 2, y: 1 } },
      ).setOrigin(0.5).setDepth(18);
      this.scoreTexts.push(label);
    });
  }

  private clear(): void {
    this.heatGraphics.clear();
    this.pulseGraphics.clear();
    for (const t of this.scoreTexts) t.destroy();
    this.scoreTexts = [];
    this.topRecs = [];
    this.saveRecommended = false;
    this.lastScoredTower = null;
    this.lastScoredTowerName = null;
    this.lastScoredWave = -1;
    this.lastScoredSignature = null;
  }

  destroy(): void {
    this.clear();
    this.heatGraphics.destroy();
    this.pulseGraphics.destroy();
  }

  /**
   * Same 11 features as train_gpu.py (FEATURE_NAMES), in the same order.
   * Must stay in sync with playtest/LearnedScorer.extractFeatures.
   *   0-1   position (col / 36, row / 26)
   *   2-4   board context (min dist, 3x3 density, same-type dist)
   *   5     distance to creep path / 20
   *   6-7   wave / 20, tower count / 100
   *   8     gold / 1000
   *   9     tower cost / 500
   *   10    lives / 100
   *
   * Region one-hots removed 2026-11-06 (redundant with col/row).
   */
  private extractFeatures(ctx: AdvisorContext, col: number, row: number, towerId: string): number[] {
    const feats: number[] = [];
    const board = ctx.placedTowers;
    feats.push(col / COLS);
    feats.push(row / ROWS);

    if (board.length > 0) {
      let minDist = Infinity;
      for (const b of board) {
        const d = Math.hypot(col - b.col, row - b.row);
        if (d < minDist) minDist = d;
      }
      feats.push(Math.min(minDist / 10.0, 1.0));

      let nearby = 0;
      for (const b of board) {
        if (Math.abs(b.col - col) <= 1 && Math.abs(b.row - row) <= 1) nearby++;
      }
      feats.push(Math.min(nearby / 5.0, 1.0));

      const same = board.filter(b => b.towerId === towerId);
      if (same.length > 0) {
        let d = Infinity;
        for (const b of same) {
          const dist = Math.hypot(col - b.col, row - b.row);
          if (dist < d) d = dist;
        }
        feats.push(Math.min(d / 10.0, 1.0));
      } else {
        feats.push(1.0);
      }
    } else {
      feats.push(1.0, 0.0, 1.0);
    }

    // Distance to the creep path (index 5). On plains the path runs the
    // full row 13, so min distance to a path point equals |row - 13| —
    // exactly what train_gpu.py computes. Fall back to that when paths
    // aren't available yet.
    let pathDist = Math.abs(row - 13) / 20.0;
    if (ctx.allPaths) {
      let minPath = Infinity;
      for (const path of ctx.allPaths) {
        if (!path) continue;
        for (const p of path) {
          const d = Math.hypot(col - p.col, row - p.row);
          if (d < minPath) minPath = d;
        }
      }
      if (minPath !== Infinity) pathDist = minPath / 20.0;
    }
    feats.push(Math.min(pathDist, 1.0));

    feats.push(ctx.wave / 20.0);
    feats.push(Math.min(board.length / 100.0, 1.0));
    feats.push(Math.min(ctx.gold / 1000.0, 1.0));
    feats.push(Math.min((ctx.towerCost ?? 50) / 500.0, 1.0));
    feats.push(Math.min(ctx.lives / 100.0, 1.0));
    return feats;
  }

  private forward(model: ScorerModel, feats: number[]): number {
    let x = feats;
    for (let i = 0; i < model.layers.length; i++) {
      const layer = model.layers[i];
      const out: number[] = [];
      for (let j = 0; j < layer.bias.length; j++) {
        let sum = layer.bias[j];
        for (let k = 0; k < x.length; k++) {
          sum += x[k] * layer.weights[j][k];
        }
        out.push(sum);
      }
      if (i < model.layers.length - 1) {
        x = out.map(v => Math.max(0, v)); // ReLU; dropout disabled at inference
      } else {
        x = out.map(v => 1 / (1 + Math.exp(-v))); // Sigmoid
      }
    }
    return x[0];
  }
}
