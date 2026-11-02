/**
 * LearnedScorer — MLP placement scorer trained on Alex's Hard-win replays.
 * 
 * Replaces hand-coded scorers (coverageCell, leftHalfCell, etc.) with a
 * learned model that predicts where Alex would place a tower.
 * 
 * Models are trained per-faction via ml/train_placement.py and exported
 * to playtest/models/scorer-<faction>.json.
 */

import { BotContext } from '../src/systems/bots/BotBrain';
import { TowerType } from '../src/data/TowerTypes';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Cell {
  col: number;
  row: number;
}

interface LayerWeights {
  weights: number[][];  // [out_dim][in_dim]
  bias: number[];
}

interface ScorerModel {
  faction: string;
  input_dim: number;
  layers: LayerWeights[];  // 3 layers: input->64, 64->32, 32->1
}

const COLS = 36;
const ROWS = 26;

export class LearnedScorer {
  private models = new Map<string, ScorerModel>();
  private enabledFactions = new Set<string>();

  constructor(factions?: string[]) {
    // Load models for specified factions (or all if not specified)
    const modelDir = join(dirname(fileURLToPath(import.meta.url)), 'models');
    const toLoad = factions ?? ['void', 'cypherpunk', 'military', 'psionic', 
                                 'mechanical', 'harmonic', 'aliens', 'chaos'];
    for (const faction of toLoad) {
      const path = join(modelDir, `scorer-${faction}.json`);
      if (existsSync(path)) {
        try {
          const data = JSON.parse(readFileSync(path, 'utf-8')) as ScorerModel;
          this.models.set(faction, data);
          this.enabledFactions.add(faction);
        } catch {
          // Skip unloadable models
        }
      }
    }
  }

  hasModel(faction: string): boolean {
    return this.enabledFactions.has(faction);
  }

  /**
   * Score a candidate cell for placing a tower.
   * Returns 0-1 score (higher = more like Alex's choice).
   */
  score(ctx: BotContext, cell: Cell, tower: TowerType): number {
    const faction = ctx.faction as string;
    const model = this.models.get(faction);
    if (!model) return 0.5;  // fallback: neutral score
    
    const feats = this.extractFeatures(ctx, cell, tower);
    return this.forward(model, feats);
  }

  /**
   * Scorer function compatible with WishlistItem scorer signature.
   * Returns the best-scoring cell, or null if none score above threshold.
   */
  scorerFn(ctx: BotContext, tower: TowerType, threshold = 0.3): Cell | null {
    if (!this.hasModel(ctx.faction as string)) return null;
    
    let best: Cell | null = null;
    let bestScore = threshold;
    
    for (const c of ctx.candidateCells) {
      const s = this.score(ctx, c, tower);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return best;
  }

  private extractFeatures(ctx: BotContext, cell: Cell, tower: TowerType): number[] {
    const feats: number[] = [];
    const { col, row } = cell;
    const board = ctx.placedTowers.map(p => ({
      towerId: p.towerId, col: p.col, row: p.row
    }));
    
    // Cell features (must match train_placement.py cell_features)
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
      
      const same = board.filter(b => b.towerId === tower.id);
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
    
    // Board features (must match train_placement.py board_features)
    feats.push((ctx.wave ?? 0) / 20.0);
    feats.push(Math.min(board.length / 100.0, 1.0));
    
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
      // ReLU for hidden layers, sigmoid for output
      if (i < model.layers.length - 1) {
        x = out.map(v => Math.max(0, v));
        // Note: dropout is disabled at inference time
      } else {
        x = out.map(v => 1 / (1 + Math.exp(-v)));
      }
    }
    return x[0];
  }
}
