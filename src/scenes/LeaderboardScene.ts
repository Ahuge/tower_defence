import Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { LeaderboardAPI, LeaderboardEntry } from '../systems/LeaderboardAPI';
import { goToMenu } from '../ui/navigation';

export class LeaderboardScene extends Phaser.Scene {
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;
  private contentContainer: Phaser.GameObjects.Container | null = null;
  private contentAreaY: number = 0;
  private contentAreaH: number = 0;

  constructor() {
    super('LeaderboardScene');
  }

  create(data?: { highlightWave?: number; highlightName?: string }): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();

    this.scrollY = 0;

    // Background
    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    // Title
    this.add.text(cx, UIScale.space(25), 'LEADERBOARD', {
      fontSize: UIScale.font(28), color: '#ffcc44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(UIScale.space(50), UIScale.space(25), '[ Back ]', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => goToMenu());
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));

    // Scrollable content area
    this.contentAreaY = UIScale.space(65);
    this.contentAreaH = totalH - UIScale.space(75);

    const mask = this.add.graphics();
    mask.fillRect(0, this.contentAreaY, getCanvasWidth(), this.contentAreaH);
    const maskGeo = mask.createGeometryMask();

    this.contentContainer = this.add.container(0, this.contentAreaY);
    this.contentContainer.setMask(maskGeo);

    // Loading text
    const loadingText = this.add.text(cx, UIScale.space(80), 'Loading scores...', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(loadingText);

    // Fetch scores
    LeaderboardAPI.getScores('endless', 50).then((scores) => {
      this.contentContainer?.removeAll(true);
      if (scores.length === 0) {
        this.showEmpty();
        return;
      }
      this.buildScoreList(scores, data);
    }).catch(() => {
      this.contentContainer?.removeAll(true);
      this.showError();
    });

    // Scroll with mouse wheel
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.updateScroll(this.scrollY - deltaY * 0.5);
    });

    // Touch drag scrolling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.updateScroll(this.dragStartScrollY + dy);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
  }

  private updateScroll(newY: number): void {
    this.scrollY = Phaser.Math.Clamp(
      newY,
      -(this.contentHeight - this.contentAreaH + 20),
      0,
    );
    this.contentContainer?.setY(this.contentAreaY + this.scrollY);
  }

  private showEmpty(): void {
    if (!this.contentContainer) return;
    const cx = getCanvasWidth() / 2;
    this.contentContainer.add(
      this.add.text(cx, UIScale.space(80), 'No scores yet. Be the first!', {
        fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5)
    );
    this.contentHeight = UIScale.space(160);
  }

  private showError(): void {
    if (!this.contentContainer) return;
    const cx = getCanvasWidth() / 2;
    this.contentContainer.add(
      this.add.text(cx, UIScale.space(80), 'Failed to load leaderboard.\nCheck your connection and try again.', {
        fontSize: UIScale.font(14), color: '#ff4444', fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5)
    );
    this.contentHeight = UIScale.space(160);
  }

  private buildScoreList(scores: LeaderboardEntry[], data?: { highlightWave?: number; highlightName?: string }): void {
    if (!this.contentContainer) return;
    const cx = getCanvasWidth() / 2;
    const marginL = UIScale.space(40);
    const rowH = UIScale.space(20);

    // Column positions
    const colRank = marginL;
    const colName = marginL + UIScale.space(50);
    const colWave = marginL + UIScale.space(210);
    const colFaction = marginL + UIScale.space(310);
    const colDiff = marginL + UIScale.space(460);

    let y = UIScale.space(10);

    // Subtitle
    this.contentContainer.add(
      this.add.text(cx, y, 'Endless Mode  --  Top 50', {
        fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5)
    );
    y += UIScale.space(24);

    // Header
    const headerColor = '#666666';
    const headerFont = UIScale.font(11);
    const headers: [number, string][] = [
      [colRank, '#'],
      [colName, 'Name'],
      [colWave, 'Wave'],
      [colFaction, 'Faction'],
      [colDiff, 'Difficulty'],
    ];
    for (const [hx, label] of headers) {
      this.contentContainer.add(
        this.add.text(hx, y, label, {
          fontSize: headerFont, color: headerColor, fontFamily: 'monospace',
        })
      );
    }
    y += UIScale.space(6);

    // Divider
    const divG = this.add.graphics();
    divG.lineStyle(1, 0x444444, 0.5);
    divG.lineBetween(marginL, y, getCanvasWidth() - marginL, y);
    this.contentContainer.add(divG);
    y += UIScale.space(8);

    // Rows
    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      const rank = i + 1;

      // Highlight the player's own score if just submitted
      const isHighlight = data?.highlightName && data?.highlightWave
        && entry.name === data.highlightName
        && entry.wave === data.highlightWave;

      const rowColor = isHighlight ? '#ffcc44' : rank <= 3 ? '#ffaa44' : '#cccccc';
      const rankStr = rank <= 3 ? ['1st', '2nd', '3rd'][rank - 1] : `${rank}.`;

      const fields: [number, string][] = [
        [colRank, rankStr],
        [colName, entry.name.length > 16 ? entry.name.slice(0, 15) + '...' : entry.name],
        [colWave, `Wave ${entry.wave}`],
        [colFaction, entry.faction],
        [colDiff, entry.difficulty],
      ];

      for (const [fx, text] of fields) {
        this.contentContainer.add(
          this.add.text(fx, y, text, {
            fontSize: UIScale.font(12), color: rowColor, fontFamily: 'monospace',
          })
        );
      }

      // Highlight bar behind the row
      if (isHighlight) {
        const highlightBar = this.add.graphics();
        highlightBar.fillStyle(0xffcc44, 0.08);
        highlightBar.fillRect(marginL - UIScale.space(4), y - UIScale.space(2), getCanvasWidth() - marginL * 2 + UIScale.space(8), rowH);
        this.contentContainer.add(highlightBar);
      }

      y += rowH;
    }

    y += UIScale.space(20);
    this.contentHeight = y;
  }
}
