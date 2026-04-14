import Phaser from 'phaser';
import { MatchMode } from '../data/WaveDefinitions';
import { FactionId } from '../data/Factions';
import { MapId, MapDefinition } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { HeroId } from '../data/HeroTypes';
import { UIBridge } from '../ui/UIBridge';

/** Thin shell — redirects to DOM UI. Kept so other scenes can scene.start('DraftScene'). */
export class DraftScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private faction: FactionId | null = null;
  private mapId: MapId = 'plains';
  private difficulty: DifficultyLevel = 'normal';
  private heroId: HeroId | null = null;
  private randomSeed: number = 0;
  private dailySeed: boolean = false;
  private creepFaction: FactionId | null = null;
  private customMapDef: MapDefinition | null = null;
  private waveCount?: number;

  constructor() { super('DraftScene'); }

  init(data: { mode: MatchMode; faction: FactionId | null; map: MapId; difficulty?: DifficultyLevel; heroId?: HeroId; randomSeed?: number; dailySeed?: boolean; creepFaction?: FactionId; customMapDef?: MapDefinition; waveCount?: number }): void {
    this.matchMode = data.mode;
    this.faction = data.faction;
    this.mapId = data.map;
    this.difficulty = data.difficulty || 'normal';
    this.heroId = data.heroId ?? null;
    this.randomSeed = data.randomSeed ?? 0;
    this.dailySeed = data.dailySeed ?? false;
    this.creepFaction = data.creepFaction ?? null;
    this.customMapDef = data.customMapDef ?? null;
    this.waveCount = data.waveCount;
  }

  create(): void {
    UIBridge.showDraft({
      mode: this.matchMode, faction: this.faction, map: this.mapId, difficulty: this.difficulty,
      heroId: this.heroId, randomSeed: this.randomSeed, dailySeed: this.dailySeed,
      creepFaction: this.creepFaction ?? undefined, customMapDef: this.customMapDef ?? undefined, waveCount: this.waveCount,
    });
  }
}
