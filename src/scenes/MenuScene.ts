import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId, MAPS, MAP_ORDER } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { getDailySeed } from '../data/MapGenerator';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';

interface ModeCard {
  label: string;
  desc: string;
  accent: number;      // border color
  action: () => void;
}

export class MenuScene extends Phaser.Scene {
  private selectedMap: MapId = 'plains';
  private selectedDifficulty: DifficultyLevel = 'normal';
  private dailySeed: boolean = true;
  private dailyToggle: Phaser.GameObjects.Text | null = null;
  private mapButtons: { btn: Phaser.GameObjects.Graphics; id: MapId; x: number; y: number; w: number; h: number }[] = [];
  private diffButtons: { btn: Phaser.GameObjects.Graphics; id: DifficultyLevel; x: number; y: number; w: number; h: number }[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const ph = UIScale.isPhone;

    this.add.text(cx, ph ? 30 : 40, 'TOWER DEFENCE', {
      fontSize: UIScale.font(36), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Map selection
    this.add.text(cx, ph ? 80 : 95, 'Select Map', {
      fontSize: UIScale.font(14), color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const isPhone = ph;
    const mapBtnW = isPhone ? 100 : 140;
    const mapGap = isPhone ? 4 : 10;
    const cols = isPhone ? Math.floor((getCanvasWidth() - 12) / (mapBtnW + mapGap)) : MAP_ORDER.length;
    const mapTotalW = Math.min(MAP_ORDER.length, cols) * mapBtnW + (Math.min(MAP_ORDER.length, cols) - 1) * mapGap;
    const mapStartX = cx - mapTotalW / 2;
    const mapRowH = isPhone ? 52 : 48;

    for (let i = 0; i < MAP_ORDER.length; i++) {
      const mapId = MAP_ORDER[i];
      const map = MAPS[mapId];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = mapStartX + col * (mapBtnW + mapGap);
      const y = (isPhone ? 98 : 112) + row * mapRowH;
      const h = isPhone ? 44 : 40;

      const btn = this.add.graphics();
      this.mapButtons.push({ btn, id: mapId, x, y, w: mapBtnW, h });

      const nameColor = mapId === 'random' ? '#ff44ff' : '#ffffff';
      this.add.text(x + mapBtnW / 2, y + 10, map.name, {
        fontSize: UIScale.font(13), color: nameColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x + mapBtnW / 2, y + 28, map.description.substring(0, 24), {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + mapBtnW / 2, y + h / 2, mapBtnW, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedMap = mapId;
        this.drawMapButtons();
        this.updateDailyToggle();
      });
    }

    this.drawMapButtons();

    // Daily seed toggle (visible when Random map selected)
    // Extra Y offset for phone multi-row maps
    const mapRows = Math.ceil(MAP_ORDER.length / cols);
    const phoneYShift = isPhone ? (mapRows - 1) * mapRowH : 0;

    this.dailyToggle = this.add.text(cx, (isPhone ? 142 : 154) + phoneYShift, '', {
      fontSize: UIScale.font(9), color: '#ff44ff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.dailyToggle.on('pointerdown', () => {
      this.dailySeed = !this.dailySeed;
      this.updateDailyToggle();
    });
    this.updateDailyToggle();

    // Difficulty selection
    this.add.text(cx, (isPhone ? 162 : 177) + phoneYShift, 'Difficulty', {
      fontSize: UIScale.font(14), color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const diffs: { id: DifficultyLevel; label: string; color: string }[] = [
      { id: 'easy', label: 'Easy', color: '#44ff44' },
      { id: 'normal', label: 'Normal', color: '#ffaa44' },
      { id: 'hard', label: 'Hard', color: '#ff4444' },
      { id: 'insane', label: 'Insane', color: '#ff00ff' },
    ];
    const diffBtnW = isPhone ? 70 : 90;
    const diffGap = isPhone ? 4 : 8;
    const diffH = isPhone ? 36 : 28;
    const diffTotalW = diffs.length * diffBtnW + (diffs.length - 1) * diffGap;
    const diffStartX = cx - diffTotalW / 2;

    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const x = diffStartX + i * (diffBtnW + diffGap);
      const y = (isPhone ? 178 : 192) + phoneYShift;
      const h = diffH;

      const btn = this.add.graphics();
      this.diffButtons.push({ btn, id: d.id, x, y, w: diffBtnW, h });

      this.add.text(x + diffBtnW / 2, y + h / 2, d.label, {
        fontSize: UIScale.font(14), color: d.color, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + diffBtnW / 2, y + h / 2, diffBtnW, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedDifficulty = d.id;
        this.drawDiffButtons();
      });
    }

    this.drawDiffButtons();

    // === Mode selection — 2x3 grid ===
    const modeHeaderY = isPhone ? 220 + phoneYShift : 234 + phoneYShift;
    this.add.text(cx, modeHeaderY, 'Select Mode', {
      fontSize: UIScale.font(14), color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const goFaction = (mode: MatchMode) => {
      const seed = this.selectedMap === 'random'
        ? (this.dailySeed ? getDailySeed() : Math.floor(Math.random() * 999999999))
        : 0;
      this.scene.start('FactionSelectScene', {
        mode, map: this.selectedMap, difficulty: this.selectedDifficulty,
        randomSeed: seed, dailySeed: this.dailySeed,
      });
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

    const modeCols = isPhone ? 2 : 3;
    const cardW = isPhone ? Math.floor((getCanvasWidth() - 16) / modeCols - 4) : 200;
    const cardH = isPhone ? 56 : 56;
    const gapX = isPhone ? 4 : 12;
    const gapY = isPhone ? 4 : 10;
    const gridW = modeCols * cardW + (modeCols - 1) * gapX;
    const gridStartX = cx - gridW / 2;
    const gridStartY = modeHeaderY + 20;

    for (let i = 0; i < modes.length; i++) {
      const m = modes[i];
      const mCol = i % modeCols;
      const mRow = Math.floor(i / modeCols);
      const x = gridStartX + mCol * (cardW + gapX);
      const y = gridStartY + mRow * (cardH + gapY);

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

      this.add.text(x + 10, y + (isPhone ? 8 : 12), m.label, {
        fontSize: UIScale.font(15), color: '#ffffff', fontFamily: 'monospace',
      });

      this.add.text(x + 10, y + (isPhone ? 30 : 34), m.desc, {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
        wordWrap: { width: cardW - 16 },
      });

      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => drawCard(true));
      zone.on('pointerout', () => drawCard(false));
      zone.on('pointerdown', () => m.action());
    }

    // Multiplayer note
    const modeRows = Math.ceil(modes.length / modeCols);
    this.add.text(cx, gridStartY + modeRows * (cardH + gapY) - 2, 'Multiplayer modes use P2P WebRTC — no server required', {
      fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Encyclopedia + Changelog buttons
    const bottomRowY = gridStartY + modeRows * (cardH + gapY) + 18;
    const encBtn = this.add.text(cx - 120, bottomRowY, '[ Encyclopedia ]', {
      fontSize: UIScale.font(13), color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    encBtn.on('pointerdown', () => this.scene.start('EncyclopediaScene'));
    encBtn.on('pointerover', () => encBtn.setColor('#bbddff'));
    encBtn.on('pointerout', () => encBtn.setColor('#88aacc'));

    const logBtn = this.add.text(cx + 120, bottomRowY, '[ Changelog ]', {
      fontSize: UIScale.font(13), color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    logBtn.on('pointerdown', () => this.scene.start('ChangelogScene'));
    logBtn.on('pointerover', () => logBtn.setColor('#bbddff'));
    logBtn.on('pointerout', () => logBtn.setColor('#88aacc'));

    // Version SHA
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    this.add.text(getCanvasWidth() - 8, totalH - 8, `v${__GIT_SHA__}`, {
      fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
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
      const isRandom = mb.id === 'random';
      if (mb.id === this.selectedMap) {
        mb.btn.fillStyle(isRandom ? 0x3a2a3a : 0x444444, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(2, isRandom ? 0xff44ff : 0xffffff, 1);
        mb.btn.strokeRect(mb.x, mb.y, mb.w, mb.h);
      } else {
        mb.btn.fillStyle(0x2a2a2a, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(1, isRandom ? 0x884488 : 0x555555, 0.6);
        mb.btn.strokeRect(mb.x, mb.y, mb.w, mb.h);
      }
    }
  }

  private updateDailyToggle(): void {
    if (!this.dailyToggle) return;
    if (this.selectedMap === 'random') {
      const seed = getDailySeed();
      this.dailyToggle.setVisible(true);
      this.dailyToggle.setText(
        this.dailySeed ? `[ Daily: ON — seed ${seed} ]` : '[ Daily: OFF — random seed ]'
      );
      this.dailyToggle.setColor(this.dailySeed ? '#ffaa44' : '#886688');
    } else {
      this.dailyToggle.setVisible(false);
    }
  }
}
