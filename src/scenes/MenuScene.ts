import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId, MAPS, MAP_ORDER } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';

interface ModeCard {
  label: string;
  desc: string;
  accent: number;      // border color
  action: () => void;
}

export class MenuScene extends Phaser.Scene {
  private selectedMap: MapId = 'plains';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private mapButtons: { btn: Phaser.GameObjects.Graphics; id: MapId; x: number; y: number; w: number; h: number }[] = [];
  private diffButtons: { btn: Phaser.GameObjects.Graphics; id: DifficultyLevel; x: number; y: number; w: number; h: number }[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;

    this.add.text(cx, 40, 'TOWER DEFENCE', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Map selection
    this.add.text(cx, 95, 'Select Map', {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
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
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
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
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const diffs: { id: DifficultyLevel; label: string; color: string }[] = [
      { id: 'easy', label: 'Easy', color: '#44ff44' },
      { id: 'normal', label: 'Normal', color: '#ffaa44' },
      { id: 'hard', label: 'Hard', color: '#ff4444' },
      { id: 'insane', label: 'Insane', color: '#ff00ff' },
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
        fontSize: '14px', color: d.color, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + diffBtnW / 2, y + h / 2, diffBtnW, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedDifficulty = d.id;
        this.drawDiffButtons();
      });
    }

    this.drawDiffButtons();

    // === Mode selection — 2x3 grid ===
    this.add.text(cx, 222, 'Select Mode', {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const goFaction = (mode: MatchMode) => {
      this.scene.start('FactionSelectScene', { mode, map: this.selectedMap, difficulty: this.selectedDifficulty });
    };

    const modes: ModeCard[] = [
      { label: 'Sprint',          desc: '15 waves — quick game',            accent: 0x44cc44, action: () => goFaction('sprint') },
      { label: 'Standard',        desc: '30 waves — full experience',       accent: 0x44cc44, action: () => goFaction('standard') },
      { label: 'Marathon',         desc: 'Endless — infinite scaling',       accent: 0x44cc44, action: () => goFaction('marathon') },
      { label: 'Battle',           desc: 'Dual economy — Gold + Essence',   accent: 0xddaa22, action: () => goFaction('battle') },
      { label: 'Hero Defense',     desc: 'Control a hero in the arena',     accent: 0xff44aa, action: () => goFaction('hero_defense') },
      { label: 'Versus 1v1',       desc: 'P2P competitive — sends attack',  accent: 0xff8844, action: () => this.scene.start('LobbyScene') },
      { label: 'Circle Co-op',     desc: '2-4 players — shared map',        accent: 0x44aaff, action: () => this.scene.start('CircleLobbyScene') },
    ];

    const cols = 3;
    const cardW = 200;
    const cardH = 56;
    const gapX = 12;
    const gapY = 10;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const gridStartX = cx - gridW / 2;
    const gridStartY = 242;

    for (let i = 0; i < modes.length; i++) {
      const m = modes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridStartX + col * (cardW + gapX);
      const y = gridStartY + row * (cardH + gapY);

      const card = this.add.graphics();
      const drawCard = (hover: boolean) => {
        card.clear();
        card.fillStyle(hover ? 0x3a3a44 : 0x2a2a33, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(2, hover ? 0xffffff : m.accent, hover ? 1 : 0.6);
        card.strokeRect(x, y, cardW, cardH);
        // Accent strip on left
        card.fillStyle(m.accent, hover ? 0.9 : 0.5);
        card.fillRect(x, y, 4, cardH);
      };
      drawCard(false);

      this.add.text(x + 14, y + 12, m.label, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'monospace',
      });

      this.add.text(x + 14, y + 34, m.desc, {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      });

      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => drawCard(true));
      zone.on('pointerout', () => drawCard(false));
      zone.on('pointerdown', () => m.action());
    }

    // Multiplayer note
    this.add.text(cx, gridStartY + 3 * (cardH + gapY) - 2, 'Multiplayer modes use P2P WebRTC — no server required', {
      fontSize: '10px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Encyclopedia + Changelog buttons
    const bottomRowY = gridStartY + 3 * (cardH + gapY) + 18;
    const encBtn = this.add.text(cx - 120, bottomRowY, '[ Encyclopedia ]', {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    encBtn.on('pointerdown', () => this.scene.start('EncyclopediaScene'));
    encBtn.on('pointerover', () => encBtn.setColor('#bbddff'));
    encBtn.on('pointerout', () => encBtn.setColor('#88aacc'));

    const logBtn = this.add.text(cx + 120, bottomRowY, '[ Changelog ]', {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    logBtn.on('pointerdown', () => this.scene.start('ChangelogScene'));
    logBtn.on('pointerover', () => logBtn.setColor('#bbddff'));
    logBtn.on('pointerout', () => logBtn.setColor('#88aacc'));

    // Version SHA
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    this.add.text(getCanvasWidth() - 8, totalH - 8, `v${__GIT_SHA__}`, {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(1, 1);
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
