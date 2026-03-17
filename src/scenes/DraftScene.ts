import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { DraftModifier, getRandomModifiers } from '../data/DraftModifiers';
import { MatchMode } from '../data/WaveDefinitions';
import { FactionId } from '../data/Factions';
import { MapId } from '../data/Maps';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class DraftScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private faction: FactionId | null = null;
  private mapId: MapId = 'plains';

  constructor() {
    super('DraftScene');
  }

  init(data: { mode: MatchMode; faction: FactionId | null; map: MapId }): void {
    this.matchMode = data.mode;
    this.faction = data.faction;
    this.mapId = data.map;
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const modifiers = getRandomModifiers(3);

    this.add.text(cx, 60, 'Choose a Modifier', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 100, 'Pick one to apply for this game', {
      fontSize: '12px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    for (let i = 0; i < modifiers.length; i++) {
      const mod = modifiers[i];
      const x = cx - 200 + i * 200;
      const y = 160;
      const w = 180;
      const h = 100;

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x - w / 2, y, w, h);
      card.lineStyle(2, 0xffaa44, 0.8);
      card.strokeRect(x - w / 2, y, w, h);

      this.add.text(x, y + 15, mod.name, {
        fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x, y + 45, mod.description, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
        wordWrap: { width: w - 16 },
        align: 'center',
      }).setOrigin(0.5);

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
        });
      });
    }

    // Skip option
    this.add.text(cx, 300, '[ Skip - No modifier ]', {
      fontSize: '12px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('GameScene', {
          mode: this.matchMode,
          faction: this.faction,
          map: this.mapId,
          modifier: null,
        });
      })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#aaaaaa'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#666666'); });
  }
}
