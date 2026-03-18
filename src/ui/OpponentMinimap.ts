import { GRID_COLS, GRID_ROWS, TILE_SIZE, GAME_HEIGHT, gridLeftX, getCanvasWidth } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { TOWER_TYPES } from '../data/TowerTypes';

export class OpponentMinimap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private boardGraphics: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private labelText: Phaser.GameObjects.Text;
  private versus: VersusManager;
  private onToggleView: () => void;
  private showingOpponent: boolean = true;

  private readonly mapW = 200;
  private readonly mapH = 130;
  private readonly cellW: number;
  private readonly cellH: number;

  constructor(scene: Phaser.Scene, versus: VersusManager, onToggleView: () => void) {
    this.scene = scene;
    this.versus = versus;
    this.onToggleView = onToggleView;
    this.cellW = this.mapW / GRID_COLS;
    this.cellH = this.mapH / GRID_ROWS;

    const x = getCanvasWidth() - this.mapW - 10;
    const y = 6;

    this.container = scene.add.container(x, y).setDepth(29);

    // Background + click zone
    const bg = scene.add.graphics();
    bg.fillStyle(0x111111, 0.9);
    bg.fillRect(0, 0, this.mapW, this.mapH + 30);
    bg.lineStyle(1, 0xff4444, 0.6);
    bg.strokeRect(0, 0, this.mapW, this.mapH + 30);
    this.container.add(bg);

    // Clickable zone to toggle view
    const zone = scene.add.zone(this.mapW / 2, (this.mapH + 30) / 2, this.mapW, this.mapH + 30);
    this.container.add(zone);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.showingOpponent = !this.showingOpponent;
      this.onToggleView();
    });

    this.labelText = scene.add.text(4, 2, 'OPPONENT (click to swap)', {
      fontSize: '10px', color: '#ff6666', fontFamily: 'monospace',
    });
    this.container.add(this.labelText);

    this.boardGraphics = scene.add.graphics();
    this.container.add(this.boardGraphics);

    this.statusText = scene.add.text(4, this.mapH + 14, '', {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(this.statusText);

    this.timerText = scene.add.text(this.mapW - 4, 2, '', {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.timerText);
  }

  /** Set which view the minimap shows */
  setShowingOpponent(val: boolean): void {
    this.showingOpponent = val;
  }

  update(myTowers?: { col: number; row: number; color: number }[]): void {
    const g = this.boardGraphics;
    g.clear();

    const offsetY = 12;

    g.fillStyle(0x2d2d2d, 1);
    g.fillRect(0, offsetY, this.mapW, this.mapH);

    if (this.showingOpponent) {
      // Draw opponent's towers
      this.labelText.setText('OPPONENT (click to swap)');
      this.labelText.setColor('#ff6666');
      for (const t of this.versus.opponentTowers) {
        const towerDef = TOWER_TYPES[t.towerId];
        const color = towerDef?.color ?? 0xffffff;
        g.fillStyle(color, 0.8);
        g.fillRect(t.col * this.cellW, t.row * this.cellH + offsetY, this.cellW, this.cellH);
      }
      this.statusText.setText(`Lives: ${this.versus.opponentLives}  Wave: ${this.versus.opponentWave}`);
    } else {
      // Draw my towers (minimap of own board)
      this.labelText.setText('YOUR BOARD (click to swap)');
      this.labelText.setColor('#44ff44');
      if (myTowers) {
        for (const t of myTowers) {
          g.fillStyle(t.color, 0.8);
          g.fillRect(t.col * this.cellW, t.row * this.cellH + offsetY, this.cellW, this.cellH);
        }
      }
      this.statusText.setText('Viewing opponent\'s full board');
    }

    if (this.versus.waveTimerActive) {
      const secs = this.versus.getWaveTimerSeconds();
      const readyStr = this.versus.opponentReady ? ' [READY]' : '';
      this.timerText.setText(`${secs}s${readyStr}`);
    } else {
      this.timerText.setText('');
    }
  }
}
