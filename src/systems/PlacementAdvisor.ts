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
  placedTowers: { towerId: string; col: number; row: number }[];
  /** True when the cell is a legal placement target right now. */
  isCandidateCell: (col: number, row: number) => boolean;
  /** Tower type being scored (selected dock tower, or first in dock). */
  towerTypeId: string | null;
  /** Current gold (economy.gold). */
  gold: number;
  /** Current lives. */
  lives: number;
  /** Base cost of towerTypeId, or null when no tower is selected. */
  towerCost: number | null;
  /** All active creep paths ({col,row} points), or null when unknown. */
  allPaths: ({ col: number; row: number }[] | null)[] | null;
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

/** Score below which a cell is not drawn at all. */
const DRAW_THRESHOLD = 0.15;
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
  private topCells: ScoredCell[] = [];
  private lastScoredTower: string | null = null;
  private lastScoredWave = -1;
  private lastScoredCount = -1;

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
    return this.topCells;
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
   * Re-score every candidate cell and redraw. Cheap (~936 forward passes
   * of a 10k-param MLP) — safe to call on state changes. Pass force to
   * redraw even when nothing changed (e.g. after enabling).
   */
  refresh(force = false): void {
    if (!this.enabled || !this.model) return;
    const ctx = this.getCtx();
    const towerId = ctx.towerTypeId;
    if (!towerId) return;
    // Stale models (old 13-feature set) would produce NaN — guard instead
    // of drawing garbage. Retrain + re-export to fix.
    if (this.model.input_dim !== 17) {
      if (!this.warnedDimMismatch) {
        this.warnedDimMismatch = true;
        this.onMessage(`Placement Advisor: ${this.modelFaction} model is the old 13-feature version — retrain and re-export to use the advisor.`);
      }
      return;
    }
    const placedCount = ctx.placedTowers.length;
    // Note: gold/lives are NOT part of the gate — they change constantly
    // mid-wave as creeps die. Re-scoring on every gold change would be
    // wasteful; the decision points (placement, wave, tower switch) are
    // what matter, and gold/lives are read fresh at each of those.
    if (!force && towerId === this.lastScoredTower && ctx.wave === this.lastScoredWave && placedCount === this.lastScoredCount) {
      return; // nothing the model sees has changed
    }
    this.lastScoredTower = towerId;
    this.lastScoredWave = ctx.wave;
    this.lastScoredCount = placedCount;

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
    this.topCells = scored.slice(0, 3);
    this.drawHeat(scored);
    this.drawTopLabels();
  }

  /** Called every frame from GameScene.update — pulses the top-3 outline. */
  update(timeMs: number): void {
    if (!this.enabled || this.topCells.length === 0) return;
    const alpha = 0.55 + 0.45 * Math.sin(timeMs / 280);
    this.pulseGraphics.clear();
    this.pulseGraphics.lineStyle(2, 0xffffff, alpha);
    for (const cell of this.topCells) {
      this.pulseGraphics.strokeRect(
        gridLeftX(cell.col) + 1, gridY(cell.row) - TILE_SIZE / 2 + 1,
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
    this.topCells.forEach((cell, i) => {
      const label = this.scene.add.text(
        gridLeftX(cell.col) + TILE_SIZE / 2,
        gridY(cell.row),
        `${i + 1} · ${cell.score.toFixed(2)}`,
        { fontSize: '11px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#00000088', padding: { x: 2, y: 1 } },
      ).setOrigin(0.5).setDepth(18);
      this.scoreTexts.push(label);
    });
  }

  private clear(): void {
    this.heatGraphics.clear();
    this.pulseGraphics.clear();
    for (const t of this.scoreTexts) t.destroy();
    this.scoreTexts = [];
    this.topCells = [];
    this.lastScoredTower = null;
    this.lastScoredWave = -1;
    this.lastScoredCount = -1;
  }

  destroy(): void {
    this.clear();
    this.heatGraphics.destroy();
    this.pulseGraphics.destroy();
  }

  /**
   * Same 17 features as train_gpu.py (FEATURE_NAMES), in the same order.
   * Must stay in sync with playtest/LearnedScorer.extractFeatures.
   *   0-7   position + region one-hots
   *   8-10  board context (min dist, 3x3 density, same-type dist)
   *   11    distance to creep path / 20
   *   12-13 wave / 20, tower count / 100
   *   14    gold / 500
   *   15    tower cost / 500
   *   16    lives / 20
   */
  private extractFeatures(ctx: AdvisorContext, col: number, row: number, towerId: string): number[] {
    const feats: number[] = [];
    const board = ctx.placedTowers;
    feats.push(col / COLS);
    feats.push(row / ROWS);
    feats.push(col < 12 ? 1.0 : 0.0);
    feats.push(col >= 12 && col < 24 ? 1.0 : 0.0);
    feats.push(col >= 24 ? 1.0 : 0.0);
    feats.push(row < 9 ? 1.0 : 0.0);
    feats.push(row >= 9 && row < 17 ? 1.0 : 0.0);
    feats.push(row >= 17 ? 1.0 : 0.0);

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

    // Distance to the creep path (index 11). On plains the path runs the
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
    feats.push(Math.min(ctx.gold / 500.0, 1.0));
    feats.push(Math.min((ctx.towerCost ?? 50) / 500.0, 1.0));
    feats.push(Math.min(ctx.lives / 20.0, 1.0));
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
