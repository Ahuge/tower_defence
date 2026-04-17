import * as Phaser from 'phaser';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId, MapDefinition } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { UIBridge } from '../ui/UIBridge';

/** Thin shell — redirects to DOM UI. Kept so other scenes can scene.start('FactionSelectScene'). */
export class FactionSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private mapId: MapId = 'plains';
  private difficulty: DifficultyLevel = 'normal';
  private randomSeed: number = 0;
  private dailySeed: boolean = false;
  private customMapDef: MapDefinition | null = null;
  private waveCount?: number;

  constructor() { super('FactionSelectScene'); }

  init(data: { mode: MatchMode; map?: MapId; difficulty?: DifficultyLevel; randomSeed?: number; dailySeed?: boolean; customMapDef?: MapDefinition; waveCount?: number }): void {
    this.matchMode = data.mode;
    this.mapId = data.map || 'plains';
    this.difficulty = data.difficulty || 'normal';
    this.randomSeed = data.randomSeed ?? 0;
    this.dailySeed = data.dailySeed ?? false;
    this.customMapDef = data.customMapDef ?? null;
    this.waveCount = data.waveCount;
  }

  create(): void {
    UIBridge.showFactionSelect({
      mode: this.matchMode, map: this.mapId, difficulty: this.difficulty,
      randomSeed: this.randomSeed, dailySeed: this.dailySeed,
      customMapDef: this.customMapDef ?? undefined, waveCount: this.waveCount,
    });
  }
}
