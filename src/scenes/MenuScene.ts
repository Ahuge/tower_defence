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
    const s = UIScale.current;
    const ph = UIScale.isPhone;

    let yPos = UIScale.y(40);
    this.add.text(cx, yPos, 'TOWER DEFENCE', {
      fontSize: s.fontHuge, color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Map selection
    yPos += UIScale.y(55);
    this.add.text(cx, yPos, 'Select Map', {
      fontSize: s.fontHeading, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    yPos += UIScale.y(20);

    const mapBtnW = s.mapBtnW;
    const mapGap = UIScale.isPhone ? 6 : 10;
    const cols = ph ? Math.floor((getCanvasWidth() - 12) / (mapBtnW + mapGap)) : MAP_ORDER.length;
    const mapTotalW = Math.min(MAP_ORDER.length, cols) * mapBtnW + (Math.min(MAP_ORDER.length, cols) - 1) * mapGap;
    const mapStartX = cx - mapTotalW / 2;

    for (let i = 0; i < MAP_ORDER.length; i++) {
      const mapId = MAP_ORDER[i];
      const map = MAPS[mapId];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = mapStartX + col * (mapBtnW + mapGap);
      const y = yPos + row * s.mapRowH;

      const btn = this.add.graphics();
      this.mapButtons.push({ btn, id: mapId, x, y, w: mapBtnW, h: s.mapBtnH });

      const nameColor = mapId === 'random' ? '#ff44ff' : '#ffffff';
      this.add.text(x + mapBtnW / 2, y + s.mapBtnH / 2, map.name, {
        fontSize: s.fontBody, color: nameColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + mapBtnW / 2, y + s.mapBtnH / 2, mapBtnW, s.mapBtnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selectedMap = mapId;
        this.drawMapButtons();
        this.updateDailyToggle();
      });
    }

    this.drawMapButtons();

    const mapRows = Math.ceil(MAP_ORDER.length / cols);
    yPos += mapRows * s.mapRowH + s.sectionGap;

    // Daily seed toggle
    this.dailyToggle = this.add.text(cx, yPos, '', {
      fontSize: s.fontSmall, color: '#ff44ff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.dailyToggle.on('pointerdown', () => {
      this.dailySeed = !this.dailySeed;
      this.updateDailyToggle();
    });
    this.updateDailyToggle();
    yPos += UIScale.y(22);

    // Difficulty selection
    this.add.text(cx, yPos, 'Difficulty', {
      fontSize: s.fontHeading, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    yPos += UIScale.y(18);

    const diffs: { id: DifficultyLevel; label: string; color: string }[] = [
      { id: 'easy', label: 'Easy', color: '#44ff44' },
      { id: 'normal', label: 'Normal', color: '#ffaa44' },
      { id: 'hard', label: 'Hard', color: '#ff4444' },
      { id: 'insane', label: 'Insane', color: '#ff00ff' },
    ];
    const diffBtnW = s.diffBtnW;
    const diffGap = 8;
    const diffH = s.diffBtnH;
    const diffTotalW = diffs.length * diffBtnW + (diffs.length - 1) * diffGap;
    const diffStartX = cx - diffTotalW / 2;

    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const x = diffStartX + i * (diffBtnW + diffGap);
      const y = yPos;
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

    // === Mode selection ===
    yPos += diffH + s.sectionGap;
    this.add.text(cx, yPos, 'Select Mode', {
      fontSize: s.fontHeading, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    yPos += UIScale.y(20);

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
      { label: 'Faction Gauntlet', desc: '100 waves — fight all factions',  accent: 0xff4444, action: () => goFaction('gauntlet') },
      { label: 'Versus 1v1',       desc: 'P2P competitive — sends attack',  accent: 0xff8844, action: () => this.scene.start('LobbyScene') },
      { label: 'Circle Co-op',     desc: '2-4 players — shared map',        accent: 0x44aaff, action: () => this.scene.start('CircleLobbyScene') },
    ];

    const modeCols = ph ? 2 : 3;
    const cardW = UIScale.isPhone ? Math.floor((getCanvasWidth() - 16) / modeCols - 4) : 200;
    const cardH = s.modeBtnH;
    const gapX = UIScale.isPhone ? 6 : 12;
    const gapY = UIScale.isPhone ? 8 : 10;
    const gridW = modeCols * cardW + (modeCols - 1) * gapX;
    const gridStartX = cx - gridW / 2;
    const gridStartY = yPos;

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

      this.add.text(x + 10, y + UIScale.y(12), m.label, {
        fontSize: UIScale.font(15), color: '#ffffff', fontFamily: 'monospace',
      });

      this.add.text(x + 10, y + UIScale.y(34), m.desc, {
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

    // Encyclopedia + Custom Maps + Changelog buttons
    const bottomRowY = gridStartY + modeRows * (cardH + gapY) + 18;
    const encBtn = this.add.text(cx - 180, bottomRowY, '[ Encyclopedia ]', {
      fontSize: UIScale.font(13), color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    encBtn.on('pointerdown', () => this.scene.start('EncyclopediaScene'));
    encBtn.on('pointerover', () => encBtn.setColor('#bbddff'));
    encBtn.on('pointerout', () => encBtn.setColor('#88aacc'));

    const customBtn = this.add.text(cx, bottomRowY, '[ Custom Maps ]', {
      fontSize: UIScale.font(13), color: '#aa8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    customBtn.on('pointerdown', () => this.scene.start('CustomMapScene'));
    customBtn.on('pointerover', () => customBtn.setColor('#ddbb66'));
    customBtn.on('pointerout', () => customBtn.setColor('#aa8844'));

    const logBtn = this.add.text(cx + 180, bottomRowY, '[ Changelog ]', {
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
