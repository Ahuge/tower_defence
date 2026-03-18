import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TOWER_TYPES } from '../data/TowerTypes';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class FactionSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private mapId: MapId = 'plains';
  private difficulty: DifficultyLevel = 'normal';

  constructor() {
    super('FactionSelectScene');
  }

  init(data: { mode: MatchMode; map?: MapId; difficulty?: DifficultyLevel }): void {
    this.matchMode = data.mode;
    this.mapId = data.map || 'plains';
    this.difficulty = data.difficulty || 'normal';
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 30, 'Choose Your Faction', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const cardW = 140;
    const cardH = 280;
    const gap = 6;
    const factions = FACTION_ORDER;
    const cols = 6;
    const rows = Math.ceil(factions.length / cols);

    for (let i = 0; i < factions.length; i++) {
      const factionId = factions[i];
      const faction = FACTIONS[factionId];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = row < rows - 1 ? cols : factions.length - (rows - 1) * cols;
      const rowW = rowCount * cardW + (rowCount - 1) * gap;
      const rowStartX = cx - rowW / 2;
      const x = rowStartX + col * (cardW + gap);
      const y = 55 + row * (cardH + gap);

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, cardH);

      // Color strip
      card.fillStyle(faction.primaryColor, 0.6);
      card.fillRect(x, y, cardW, 6);

      // Name
      this.add.text(x + cardW / 2, y + 22, faction.name, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Tower count badge
      const tCount = faction.towerIds.length > 0 ? `${faction.towerIds.length} towers` : '6/wave';
      this.add.text(x + cardW / 2, y + 40, tCount, {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Description
      this.add.text(x + 8, y + 55, faction.description, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: { width: cardW - 16 },
      });

      // Tower list
      const towerY = y + 100;
      if (factionId === 'random') {
        this.add.text(x + 8, towerY, 'Each wave: 6 random\ntowers from all factions.\nBought towers persist.\nAdapt to what you get.', {
          fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
          lineSpacing: 4,
        });
      } else {
        this.add.text(x + 8, towerY - 4, 'Towers:', {
          fontSize: '10px', color: '#666666', fontFamily: 'monospace',
        });
        let ty = towerY + 10;
        for (const tid of faction.towerIds) {
          const t = TOWER_TYPES[tid];
          if (!t) continue;
          const label = `${t.name} (${t.cost}g)`;
          this.add.text(x + 12, ty, label, {
            fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
          });
          ty += 13;
        }
      }

      // Click zone
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(0x333333, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(3, faction.primaryColor, 1);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 0.8);
        card.fillRect(x, y, cardW, 6);
      });
      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x222222, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(2, faction.primaryColor, 0.8);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 0.6);
        card.fillRect(x, y, cardW, 6);
      });
      zone.on('pointerdown', () => {
        if (this.matchMode === 'hero_defense') {
          this.scene.start('HeroSelectScene', { mode: this.matchMode, faction: factionId, map: this.mapId, difficulty: this.difficulty });
        } else {
          this.scene.start('DraftScene', { mode: this.matchMode, faction: factionId, map: this.mapId, difficulty: this.difficulty });
        }
      });
    }
  }
}
