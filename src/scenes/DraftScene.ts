import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { DraftModifier, getRandomModifiers } from '../data/DraftModifiers';
import { MatchMode } from '../data/WaveDefinitions';
import { FactionId } from '../data/Factions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { HeroId } from '../data/HeroTypes';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';

export class DraftScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private faction: FactionId | null = null;
  private mapId: MapId = 'plains';
  private difficulty: DifficultyLevel = 'normal';
  private heroId: HeroId | null = null;
  private randomSeed: number = 0;
  private dailySeed: boolean = false;
  private creepFaction: FactionId | null = null;

  constructor() {
    super('DraftScene');
  }

  init(data: { mode: MatchMode; faction: FactionId | null; map: MapId; difficulty?: DifficultyLevel; heroId?: HeroId; randomSeed?: number; dailySeed?: boolean; creepFaction?: FactionId }): void {
    this.matchMode = data.mode;
    this.faction = data.faction;
    this.mapId = data.map;
    this.difficulty = data.difficulty || 'normal';
    this.heroId = data.heroId ?? null;
    this.randomSeed = data.randomSeed ?? 0;
    this.dailySeed = data.dailySeed ?? false;
    this.creepFaction = data.creepFaction ?? null;
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const modifiers = getRandomModifiers(3);
    const isPhone = UIScale.isPhone;

    this.add.text(cx, UIScale.y(60), 'Choose a Modifier', {
      fontSize: UIScale.font(24), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, UIScale.y(100), 'Pick one to apply for this game', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Phone: 2 columns (top row 2, bottom row 1 centered); Desktop: 3 across
    const cols = isPhone ? 2 : 3;
    const w = isPhone ? Math.floor((getCanvasWidth() - 24) / cols - 4) : 180;
    const h = UIScale.y(100);
    const gap = UIScale.space(10);
    const startY = UIScale.y(160);

    for (let i = 0; i < modifiers.length; i++) {
      const mod = modifiers[i];
      let x: number;
      let y: number;

      if (isPhone) {
        const row = Math.floor(i / cols);
        const colIdx = i % cols;
        const itemsInRow = Math.min(cols, modifiers.length - row * cols);
        const rowWidth = itemsInRow * w + (itemsInRow - 1) * gap;
        x = cx - rowWidth / 2 + colIdx * (w + gap) + w / 2;
        y = startY + row * (h + gap);
      } else {
        x = cx - 200 + i * 200;
        y = startY;
      }

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x - w / 2, y, w, h);
      card.lineStyle(2, 0xffaa44, 0.8);
      card.strokeRect(x - w / 2, y, w, h);

      this.add.text(x, y + UIScale.y(15), mod.name, {
        fontSize: UIScale.font(14), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x, y + UIScale.y(45), mod.description, {
        fontSize: UIScale.font(14), color: '#cccccc', fontFamily: 'monospace',
        wordWrap: { width: w - 20 },
        align: 'center',
      }).setOrigin(0.5, 0);

      const zone = this.add.zone(x, y + h / 2, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(0x333333, 1);
        card.fillRect(x - w / 2, y, w, h);
        card.lineStyle(3, 0xffffff, 1);
        card.strokeRect(x - w / 2, y, w, h);
      });
      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x222222, 1);
        card.fillRect(x - w / 2, y, w, h);
        card.lineStyle(2, 0xffaa44, 0.8);
        card.strokeRect(x - w / 2, y, w, h);
      });
      zone.on('pointerdown', () => {
        this.scene.start('GameScene', {
          mode: this.matchMode,
          faction: this.faction,
          map: this.mapId,
          modifier: mod,
          difficulty: this.difficulty,
          heroId: this.heroId,
          randomSeed: this.randomSeed,
          dailySeed: this.dailySeed,
          creepFaction: this.creepFaction ?? undefined,
        });
      });
    }

    // Skip option — position after last row of cards
    const totalRows = isPhone ? Math.ceil(modifiers.length / cols) : 1;
    const skipY = isPhone ? startY + totalRows * (h + gap) + 10 : 300;

    this.add.text(cx, skipY, '[ Skip - No modifier ]', {
      fontSize: UIScale.font(14), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('GameScene', {
          mode: this.matchMode,
          faction: this.faction,
          map: this.mapId,
          modifier: null,
          difficulty: this.difficulty,
          heroId: this.heroId,
          randomSeed: this.randomSeed,
          dailySeed: this.dailySeed,
          creepFaction: this.creepFaction ?? undefined,
        });
      })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#aaaaaa'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#666666'); });
  }
}
