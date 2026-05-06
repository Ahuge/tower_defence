import * as Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT, TOWER_BAR_HEIGHT } from '../config';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId, MAPS, MAP_ORDER } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { getDailySeed } from '../data/MapGenerator';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { UIBridge } from '../ui/UIBridge';

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
  private waveCountOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const s = UIScale.current;
    const ph = UIScale.isPhone;

    let yPos = UIScale.y(40);
    this.add.text(cx, yPos, 'FACTIONS', {
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
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = mapStartX + col * (mapBtnW + mapGap);
      const y = yPos + row * s.mapRowH;

      const btn = this.add.graphics();
      this.mapButtons.push({ btn, id: mapId, x, y, w: mapBtnW, h: s.mapBtnH });

      const nameColor = mapId === 'random' ? '#ff44ff' : mapId === 'custom' ? '#ffaa22' : '#ffffff';
      const displayName = mapId === 'custom' ? 'Custom' : (MAPS[mapId]?.name ?? mapId);
      this.add.text(x + mapBtnW / 2, y + s.mapBtnH / 2, displayName, {
        fontSize: s.fontBody, color: nameColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + mapBtnW / 2, y + s.mapBtnH / 2, mapBtnW, s.mapBtnH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (mapId === 'custom') {
          this.scene.start('CustomMapScene');
          return;
        }
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

    const goFaction = (mode: MatchMode, waveCount?: number) => {
      const seed = this.selectedMap === 'random'
        ? (this.dailySeed ? getDailySeed() : Math.floor(Math.random() * 999999999))
        : 0;
      this.scene.start('FactionSelectScene', {
        mode, map: this.selectedMap, difficulty: this.selectedDifficulty,
        randomSeed: seed, dailySeed: this.dailySeed, waveCount,
      });
    };

    const modes: ModeCard[] = [
      { label: 'Standard',         desc: 'Classic tower defence',           accent: 0x44cc44, action: () => this.showWaveCountOverlay(goFaction) },
      { label: 'Essence',          desc: 'Dual economy — Gold + Essence',   accent: 0xddaa22, action: () => goFaction('battle') },
      { label: 'Hero Defense',     desc: 'Control a hero in the arena',     accent: 0xff44aa, action: () => goFaction('hero_defense') },
      { label: 'Faction Gauntlet', desc: '100 waves — fight all factions',  accent: 0xff4444, action: () => goFaction('gauntlet') },
      { label: 'Endless',          desc: 'Infinite scaling — play until you fall', accent: 0xff6622, action: () => goFaction('endless') },
      { label: 'Versus 1v1',       desc: 'P2P competitive — sends attack',  accent: 0xff8844, action: () => UIBridge.show('lobby') },
      { label: 'Circle Co-op',     desc: '2-4 players — shared map',        accent: 0x44aaff, action: () => UIBridge.show('circle-lobby') },
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

    // Encyclopedia + Leaderboard + Changelog buttons
    const bottomRowY = gridStartY + modeRows * (cardH + gapY) + 18;
    const bottomSpacing = ph ? 160 : 130;
    const encBtn = this.add.text(cx - bottomSpacing, bottomRowY, '[ Encyclopedia ]', {
      fontSize: UIScale.font(13), color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    encBtn.on('pointerdown', () => this.scene.start('EncyclopediaScene'));
    encBtn.on('pointerover', () => encBtn.setColor('#bbddff'));
    encBtn.on('pointerout', () => encBtn.setColor('#88aacc'));

    const lbBtn = this.add.text(cx, bottomRowY, '[ Leaderboard ]', {
      fontSize: UIScale.font(13), color: '#ffcc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lbBtn.on('pointerdown', () => this.scene.start('LeaderboardScene'));
    lbBtn.on('pointerover', () => lbBtn.setColor('#ffeeaa'));
    lbBtn.on('pointerout', () => lbBtn.setColor('#ffcc44'));

    const logBtn = this.add.text(cx + bottomSpacing, bottomRowY, '[ Changelog ]', {
      fontSize: UIScale.font(13), color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    logBtn.on('pointerdown', () => UIBridge.show('changelog'));
    logBtn.on('pointerover', () => logBtn.setColor('#bbddff'));
    logBtn.on('pointerout', () => logBtn.setColor('#88aacc'));

    // Version SHA
    const totalH = GAME_HEIGHT + 28 + TOWER_BAR_HEIGHT;
    this.add.text(getCanvasWidth() - 8, totalH - 8, `v${__GIT_SHA__}`, {
      fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(1, 1);
  }

  private showWaveCountOverlay(goFaction: (mode: MatchMode, waveCount?: number) => void): void {
    if (this.waveCountOverlay) return;

    const canvasW = getCanvasWidth();
    const totalH = GAME_HEIGHT + 28 + TOWER_BAR_HEIGHT;

    const container = this.add.container(0, 0);
    container.setDepth(1000);

    // Semi-transparent dark background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, canvasW, totalH);
    container.add(bg);

    // Click-outside to dismiss
    const bgZone = this.add.zone(canvasW / 2, totalH / 2, canvasW, totalH).setInteractive();
    bgZone.on('pointerdown', () => this.dismissWaveCountOverlay());
    container.add(bgZone);

    // Panel dimensions
    const panelW = UIScale.isPhone ? 800 : 420;
    const panelH = UIScale.isPhone ? 400 : 260;
    const panelX = (canvasW - panelW) / 2;
    const panelY = (totalH - panelH) / 2;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x1e1e28, 1);
    panel.fillRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(2, 0xccaa44, 0.8);
    panel.strokeRect(panelX, panelY, panelW, panelH);
    container.add(panel);

    // Block clicks on panel from reaching bgZone
    const panelZone = this.add.zone(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH).setInteractive();
    container.add(panelZone);

    // Title
    const title = this.add.text(canvasW / 2, panelY + UIScale.y(28), 'Select Wave Count', {
      fontSize: UIScale.font(18), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(title);

    // Wave count options
    const options: { label: string; waves: number; desc: string }[] = [
      { label: 'Quick', waves: 15, desc: '15 waves' },
      { label: 'Standard', waves: 30, desc: '30 waves' },
      { label: 'Extended', waves: 100, desc: '100 waves' },
    ];

    const btnW = UIScale.isPhone ? 220 : 120;
    const btnH = UIScale.isPhone ? 100 : 70;
    const btnGap = UIScale.isPhone ? 16 : 12;
    const totalBtnW = options.length * btnW + (options.length - 1) * btnGap;
    const btnStartX = canvasW / 2 - totalBtnW / 2;
    const btnY = panelY + UIScale.y(70);

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const bx = btnStartX + i * (btnW + btnGap);
      const by = btnY;

      const btnGfx = this.add.graphics();
      const drawBtn = (hover: boolean) => {
        btnGfx.clear();
        btnGfx.fillStyle(hover ? 0x3a3a44 : 0x2a2a33, 1);
        btnGfx.fillRect(bx, by, btnW, btnH);
        btnGfx.lineStyle(2, hover ? 0xffffff : 0xccaa44, hover ? 1 : 0.6);
        btnGfx.strokeRect(bx, by, btnW, btnH);
        // Accent strip
        btnGfx.fillStyle(0x44cc44, hover ? 0.9 : 0.5);
        btnGfx.fillRect(bx, by, 4, btnH);
      };
      drawBtn(false);
      container.add(btnGfx);

      const labelText = this.add.text(bx + btnW / 2, by + UIScale.y(20), opt.label, {
        fontSize: UIScale.font(14), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(labelText);

      const descText = this.add.text(bx + btnW / 2, by + UIScale.y(42), opt.desc, {
        fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(descText);

      const btnZone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
      btnZone.on('pointerover', () => drawBtn(true));
      btnZone.on('pointerout', () => drawBtn(false));
      btnZone.on('pointerdown', () => {
        this.dismissWaveCountOverlay();
        goFaction('standard', opt.waves);
      });
      container.add(btnZone);
    }

    // Cancel button
    const cancelY = btnY + btnH + UIScale.y(24);
    const cancelText = this.add.text(canvasW / 2, cancelY, '[ Cancel ]', {
      fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelText.on('pointerover', () => cancelText.setColor('#ffffff'));
    cancelText.on('pointerout', () => cancelText.setColor('#888888'));
    cancelText.on('pointerdown', () => this.dismissWaveCountOverlay());
    container.add(cancelText);

    this.waveCountOverlay = container;
  }

  private dismissWaveCountOverlay(): void {
    if (this.waveCountOverlay) {
      this.waveCountOverlay.destroy();
      this.waveCountOverlay = null;
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
      const isRandom = mb.id === 'random';
      const isCustom = mb.id === 'custom';
      if (mb.id === this.selectedMap) {
        mb.btn.fillStyle(isRandom ? 0x3a2a3a : 0x444444, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(2, isRandom ? 0xff44ff : 0xffffff, 1);
        mb.btn.strokeRect(mb.x, mb.y, mb.w, mb.h);
      } else {
        mb.btn.fillStyle(isCustom ? 0x2a2210 : 0x2a2a2a, 1);
        mb.btn.fillRect(mb.x, mb.y, mb.w, mb.h);
        mb.btn.lineStyle(1, isCustom ? 0xaa8822 : isRandom ? 0x884488 : 0x555555, 0.6);
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
