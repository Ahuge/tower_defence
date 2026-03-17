import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId, MAPS, MAP_ORDER } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class MenuScene extends Phaser.Scene {
  private selectedMap: MapId = 'plains';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private mapButtons: { btn: Phaser.GameObjects.Graphics; id: MapId; x: number; y: number; w: number; h: number }[] = [];
  private diffButtons: { btn: Phaser.GameObjects.Graphics; id: DifficultyLevel; x: number; y: number; w: number; h: number }[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 40, 'TOWER DEFENCE', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Map selection
    this.add.text(cx, 95, 'Select Map', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const mapBtnW = 140;
    const mapGap = 10;
    const mapTotalW = MAP_ORDER.length * mapBtnW + (MAP_ORDER.length - 1) * mapGap;
    const mapStartX = cx - mapTotalW / 2;

    for (let i = 0; i < MAP_ORDER.length; i++) {
      const mapId = MAP_ORDER[i];
      const map = MAPS[mapId];
      const x = mapStartX + i * (mapBtnW + mapGap);
      const y = 112;
      const h = 40;

      const btn = this.add.graphics();
      this.mapButtons.push({ btn, id: mapId, x, y, w: mapBtnW, h });

      this.add.text(x + mapBtnW / 2, y + 10, map.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x + mapBtnW / 2, y + 28, map.description.substring(0, 24), {
        fontSize: '8px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + mapBtnW / 2, y + h / 2, mapBtnW, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedMap = mapId;
        this.drawMapButtons();
      });
    }

    this.drawMapButtons();

    // Difficulty selection
    this.add.text(cx, 165, 'Difficulty', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const diffs: { id: DifficultyLevel; label: string; color: string }[] = [
      { id: 'easy', label: 'Easy', color: '#44ff44' },
      { id: 'normal', label: 'Normal', color: '#ffaa44' },
      { id: 'hard', label: 'Hard', color: '#ff4444' },
    ];
    const diffBtnW = 90;
    const diffGap = 8;
    const diffTotalW = diffs.length * diffBtnW + (diffs.length - 1) * diffGap;
    const diffStartX = cx - diffTotalW / 2;

    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const x = diffStartX + i * (diffBtnW + diffGap);
      const y = 180;
      const h = 28;

      const btn = this.add.graphics();
      this.diffButtons.push({ btn, id: d.id, x, y, w: diffBtnW, h });

      this.add.text(x + diffBtnW / 2, y + h / 2, d.label, {
        fontSize: '12px', color: d.color, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + diffBtnW / 2, y + h / 2, diffBtnW, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedDifficulty = d.id;
        this.drawDiffButtons();
      });
    }

    this.drawDiffButtons();

    // Mode selection
    this.add.text(cx, 220, 'Select Match Mode', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const modes: { mode: MatchMode; label: string; desc: string; y: number }[] = [
      { mode: 'sprint', label: 'Sprint (15 waves)', desc: 'Quick game, fewer creep types', y: 250 },
      { mode: 'standard', label: 'Standard (30 waves)', desc: 'Full experience, all creep types', y: 320 },
      { mode: 'marathon', label: 'Marathon (Endless)', desc: 'Infinite scaling, how far can you go?', y: 390 },
    ];

    // Multiplayer button
    const mpBtn = this.add.text(cx, 450, '[ VERSUS MULTIPLAYER ]', {
      fontSize: '14px', color: '#ff8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    mpBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    mpBtn.on('pointerover', () => mpBtn.setColor('#ffbb77'));
    mpBtn.on('pointerout', () => mpBtn.setColor('#ff8844'));

    this.add.text(cx, 468, 'P2P — no server required', {
      fontSize: '9px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    for (const m of modes) {
      const btn = this.add.graphics();
      btn.fillStyle(0x333333, 1);
      btn.fillRect(cx - 150, m.y - 10, 300, 50);
      btn.lineStyle(2, 0x555555, 1);
      btn.strokeRect(cx - 150, m.y - 10, 300, 50);

      this.add.text(cx, m.y + 5, m.label, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(cx, m.y + 25, m.desc, {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, m.y + 15, 300, 50).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(0x444444, 1);
        btn.fillRect(cx - 150, m.y - 10, 300, 50);
        btn.lineStyle(2, 0xffffff, 1);
        btn.strokeRect(cx - 150, m.y - 10, 300, 50);
      });
      zone.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(0x333333, 1);
        btn.fillRect(cx - 150, m.y - 10, 300, 50);
        btn.lineStyle(2, 0x555555, 1);
        btn.strokeRect(cx - 150, m.y - 10, 300, 50);
      });
      zone.on('pointerdown', () => {
        this.scene.start('FactionSelectScene', { mode: m.mode, map: this.selectedMap, difficulty: this.selectedDifficulty });
      });
    }
  }

  private drawDiffButtons(): void {
    for (const db of this.diffButtons) {
      db.btn.clear();
      if (db.id === this.selectedDifficulty) {
        db.btn.fillStyle(0x444444, 1);
        db.btn.fillRect(db.x, db.y, db.w, db.h);
        db.btn.lineStyle(2, 0xffffff, 1);
        db.btn.strokeRect(db.x, db.y, db.w, db.h);
      } else {
        db.btn.fillStyle(0x2a2a2a, 1);
        db.btn.fillRect(db.x, db.y, db.w, db.h);
        db.btn.lineStyle(1, 0x555555, 0.6);
        db.btn.strokeRect(db.x, db.y, db.w, db.h);
      }
    }
  }

  private drawMapButtons(): void {
    for (const mb of this.mapButtons) {
      mb.btn.clear();
      if (mb.id === this.selectedMap) {
        mb.btn.fillStyle(0x444444, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(2, 0xffffff, 1);
        mb.btn.strokeRect(mb.x, mb.y, mb.w, mb.h);
      } else {
        mb.btn.fillStyle(0x2a2a2a, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(1, 0x555555, 0.6);
        mb.btn.strokeRect(mb.x, mb.y, mb.w, mb.h);
      }
    }
  }
}
