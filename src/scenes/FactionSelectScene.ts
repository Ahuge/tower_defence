import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { TOWER_TYPES } from '../data/TowerTypes';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export type RtsMapSize = 'small' | 'medium' | 'large';

export class FactionSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private mapId: MapId = 'plains';
  private difficulty: DifficultyLevel = 'normal';
  private randomSeed: number = 0;
  private dailySeed: boolean = false;
  private rtsMapSize: RtsMapSize = 'medium';

  constructor() {
    super('FactionSelectScene');
  }

  init(data: { mode: MatchMode; map?: MapId; difficulty?: DifficultyLevel; randomSeed?: number; dailySeed?: boolean }): void {
    this.matchMode = data.mode;
    this.mapId = data.map || 'plains';
    this.difficulty = data.difficulty || 'normal';
    this.randomSeed = data.randomSeed ?? 0;
    this.dailySeed = data.dailySeed ?? false;
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const ph = UIScale.isPhone;

    this.add.text(cx, 30, 'Choose Your Faction', {
      fontSize: UIScale.font(28), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    let topOffset = 0;

    // Map size selector for Base Defence mode
    if (this.matchMode === 'base_defence') {
      topOffset = 50;
      this.add.text(cx, 60, 'Map Size', {
        fontSize: UIScale.font(14), color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const sizes: { id: RtsMapSize; label: string; desc: string }[] = [
        { id: 'small', label: 'Small', desc: '3×3 chunks' },
        { id: 'medium', label: 'Medium', desc: '5×4 chunks' },
        { id: 'large', label: 'Large', desc: '7×6 chunks' },
      ];
      const btnW = 100;
      const btnGap = 8;
      const totalW = sizes.length * btnW + (sizes.length - 1) * btnGap;
      const startX = cx - totalW / 2;
      const sizeButtons: { g: Phaser.GameObjects.Graphics; id: RtsMapSize; x: number }[] = [];

      for (let i = 0; i < sizes.length; i++) {
        const sz = sizes[i];
        const bx = startX + i * (btnW + btnGap);
        const by = 78;
        const g = this.add.graphics();
        sizeButtons.push({ g, id: sz.id, x: bx });

        this.add.text(bx + btnW / 2, by + 10, sz.label, {
          fontSize: UIScale.font(13), color: '#ffffff', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.add.text(bx + btnW / 2, by + 26, sz.desc, {
          fontSize: UIScale.font(9), color: '#888888', fontFamily: 'monospace',
        }).setOrigin(0.5);

        const zone = this.add.zone(bx + btnW / 2, by + 16, btnW, 34).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.rtsMapSize = sz.id;
          drawSizeButtons();
        });
      }

      const drawSizeButtons = () => {
        for (const sb of sizeButtons) {
          sb.g.clear();
          const selected = sb.id === this.rtsMapSize;
          sb.g.fillStyle(selected ? 0x444444 : 0x2a2a2a, 1);
          sb.g.fillRect(sb.x, 78, btnW, 34);
          sb.g.lineStyle(2, selected ? 0xff4444 : 0x555555, selected ? 1 : 0.5);
          sb.g.strokeRect(sb.x, 78, btnW, 34);
        }
      };
      drawSizeButtons();
    }

    const isPhone = ph;
    const s = UIScale.current;
    const fCols = s.factionCols;
    const cardW = isPhone ? Math.floor((getCanvasWidth() - 16) / fCols - 4) : s.factionCardW;
    const cardH = s.factionCardH;
    const gap = UIScale.isPhone ? 4 : 6;
    const BASE_DEFENCE_FACTIONS: FactionId[] = ['military', 'mechanical', 'arcane', 'nature', 'infernal', 'void'];
    const factions = this.matchMode === 'base_defence' ? BASE_DEFENCE_FACTIONS : FACTION_ORDER;
    const cols = fCols;
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
      const y = UIScale.y(55) + topOffset + row * (cardH + gap);

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, cardH);

      // Color strip
      card.fillStyle(faction.primaryColor, 0.6);
      card.fillRect(x, y, cardW, 6);

      // Name
      this.add.text(x + cardW / 2, y + UIScale.y(22), faction.name, {
        fontSize: UIScale.font(16), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Tower count badge
      const tCount = faction.towerIds.length > 0 ? `${faction.towerIds.length} towers` : '6/wave';
      this.add.text(x + cardW / 2, y + UIScale.y(40), tCount, {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Description
      this.add.text(x + 8, y + UIScale.y(55), faction.description, {
        fontSize: UIScale.font(10), color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: { width: cardW - 12 },
      });

      // Tower list (skip on phone — cards too small)
      if (isPhone) { /* skip tower list */ } else {
      const towerY = y + 100;
      if (factionId === 'random') {
        this.add.text(x + 8, towerY, 'Each wave: 6 random\ntowers from all factions.\nBought towers persist.\nAdapt to what you get.', {
          fontSize: UIScale.font(10), color: '#cccccc', fontFamily: 'monospace',
          lineSpacing: 4,
        });
      } else {
        this.add.text(x + 8, towerY - 4, 'Towers:', {
          fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
        });
        let ty = towerY + 10;
        for (const tid of faction.towerIds) {
          const t = TOWER_TYPES[tid];
          if (!t) continue;
          const label = `${t.name} (${t.cost}g)`;
          this.add.text(x + 12, ty, label, {
            fontSize: UIScale.font(10), color: '#cccccc', fontFamily: 'monospace',
          });
          ty += 13;
        }
      }
      } // end if !isPhone tower list

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
        const sceneData: any = { mode: this.matchMode, faction: factionId, map: this.mapId, difficulty: this.difficulty, randomSeed: this.randomSeed, dailySeed: this.dailySeed };
        if (this.matchMode === 'hero_defense') {
          this.scene.start('HeroSelectScene', sceneData);
        } else if (this.matchMode === 'base_defence') {
          sceneData.rtsMapSize = this.rtsMapSize;
          this.scene.start('BaseDefenceScene', sceneData);
        } else {
          this.scene.start('DraftScene', sceneData);
        }
      });
    }
  }
}
